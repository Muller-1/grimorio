/**
 * Medidor da API (ADR-016): o que acontece por dentro, sem serviço externo.
 *
 * - Por rota (o padrão, ex.: `GET /api/v1/characters/:id`): pedidos, códigos de resposta, tempo
 *   em faixas (dá p50, p95 e p99) e bytes enviados.
 * - Do processo: CPU usada e o limite do contêiner (quando dá para ler), quanto o event loop
 *   ficou ocupado e atrasado, memória, pedidos em andamento e a fila por conexões com o banco.
 * - Pedido que passa de 1 s vira aviso no log ("pedido lento").
 * - A cada minuto com movimento, uma linha "resumo do minuto" no log. É o que aparece nos Logs
 *   do Render sem instalar nada.
 * - `GET /metrics` devolve os contadores em JSON, só com `METRICS_TOKEN`
 *   (`Authorization: Bearer …`). Sem o token configurado, a rota não existe.
 *
 * Os contadores só crescem desde que a API subiu; quem lê de tempos em tempos (o teste de carga,
 * o `pnpm monitor`) subtrai duas leituras com `diffSnapshots`.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import {
  bucketIndex,
  diffSnapshots,
  emptyBuckets,
  type IntervalSummary,
  type MetricsSnapshot,
  type RouteCounters,
} from '@grimorio/shared/metrics';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { buildInfo } from '../build-info';

export const METRICS_PATH = '/metrics';
/** Acima disso o pedido vai para o log como "pedido lento". */
export const SLOW_REQUEST_MS = 1_000;

export interface MetricsOptions {
  /** Intervalo da amostra do processo (atraso do event loop, fila do banco). */
  sampleEveryMs?: number;
  /** Intervalo do "resumo do minuto" no log. 0 desliga. */
  summaryEveryMs?: number;
}

export interface MetricsRecorder {
  snapshot(): MetricsSnapshot;
}

declare module 'fastify' {
  interface FastifyInstance {
    metrics: MetricsRecorder;
  }
}

/** Lê um arquivo pequeno do sistema (cgroup). Fora de um contêiner Linux, devolve `null`. */
function readSmall(path: string): string | null {
  try {
    return readFileSync(path, 'utf8').trim();
  } catch {
    return null;
  }
}

/** Limite de CPU do contêiner: cgroup v2 (`cpu.max`) ou v1 (`cfs_quota_us`/`cfs_period_us`). */
export function cpuLimitFrom(cpuMax: string | null, quota?: string | null, period?: string | null) {
  if (cpuMax) {
    const [max, per] = cpuMax.split(/\s+/);
    if (max && max !== 'max' && per) return Number(max) / Number(per);
    return null;
  }
  if (quota && period && Number(quota) > 0) return Number(quota) / Number(period);
  return null;
}

/** Quantas vezes o contêiner foi parado por falta de CPU (cgroup v2 ou v1). */
export function throttlingFrom(cpuStat: string | null) {
  if (!cpuStat) return null;
  const values = new Map<string, number>();
  for (const line of cpuStat.split('\n')) {
    const [key, value] = line.trim().split(/\s+/);
    if (key && value) values.set(key, Number(value));
  }
  const periods = values.get('nr_periods');
  const throttled = values.get('nr_throttled');
  if (periods === undefined || throttled === undefined) return null;
  const usec = values.get('throttled_usec');
  const nsec = values.get('throttled_time');
  const ms = usec !== undefined ? usec / 1000 : nsec !== undefined ? nsec / 1e6 : null;
  return { periods, throttled, ms };
}

function readContainer() {
  const cpuLimitCores = cpuLimitFrom(
    readSmall('/sys/fs/cgroup/cpu.max'),
    readSmall('/sys/fs/cgroup/cpu/cpu.cfs_quota_us'),
    readSmall('/sys/fs/cgroup/cpu/cpu.cfs_period_us'),
  );
  const throttling = throttlingFrom(
    readSmall('/sys/fs/cgroup/cpu.stat') ?? readSmall('/sys/fs/cgroup/cpu/cpu.stat'),
  );
  const memMax =
    readSmall('/sys/fs/cgroup/memory.max') ??
    readSmall('/sys/fs/cgroup/memory/memory.limit_in_bytes');
  const memoryLimitBytes = memMax && /^\d+$/.test(memMax) ? Number(memMax) : null;
  // Sem limite, o cgroup v1 devolve um número gigante.
  return {
    cpuLimitCores,
    throttling,
    memoryLimitBytes: memoryLimitBytes && memoryLimitBytes < 2 ** 50 ? memoryLimitBytes : null,
  };
}

/** Comparação em tempo constante (o tamanho do token também não vaza). */
function bearerMatches(header: unknown, token: string): boolean {
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return false;
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(header.slice('Bearer '.length)), digest(token));
}

/** Versão curta do resumo, para caber numa linha de log. */
export function logLine(s: IntervalSummary) {
  const pct = (value: number | null) => (value === null ? null : Math.round(value * 100));
  return {
    pedidos: s.appRequests,
    porSegundo: s.perSecond,
    erros5xx: s.errors5xx,
    limitados429: s.rateLimited,
    p95ms: s.p95Ms,
    maisLenta: s.slowest,
    cpuDoLimitePct: pct(s.cpuOfLimit),
    cpuCortadaPct: pct(s.throttledShare),
    loopOcupadoPct: pct(s.loopBusy),
    atrasoLoopP99ms: s.lagP99Ms,
    memoriaMB: s.rssMB,
    filaBancoPct: pct(s.poolQueueShare),
    kbEnviados: Math.round(s.bytes / 1024),
  };
}

const metricsPlugin: FastifyPluginAsync<MetricsOptions> = async (app, options) => {
  const sampleEveryMs = options.sampleEveryMs ?? 100;
  const summaryEveryMs = options.summaryEveryMs ?? 60_000;
  const startedAt = performance.now();
  const routes = new Map<string, RouteCounters>();
  const lagBuckets = emptyBuckets();
  const open = new WeakSet<FastifyRequest>();
  let total = 0;
  let inFlight = 0;
  let inFlightSum = 0;
  let samples = 0;
  let samplesWithQueue = 0;
  let queueSum = 0;

  const snapshot = (): MetricsSnapshot => {
    const cpu = process.cpuUsage();
    const loop = performance.eventLoopUtilization();
    const memory = process.memoryUsage();
    const container = readContainer();
    const pool = app.db.poolStats?.() ?? null;
    return {
      uptimeMs: Math.round(performance.now() - startedAt),
      at: app.ports.clock.now().toISOString(),
      commit: app.env.APP_COMMIT ?? buildInfo.commit,
      process: {
        cpuUserMs: cpu.user / 1000,
        cpuSystemMs: cpu.system / 1000,
        cpuLimitCores: container.cpuLimitCores,
        throttledPeriods: container.throttling?.throttled ?? null,
        totalPeriods: container.throttling?.periods ?? null,
        throttledMs: container.throttling?.ms ?? null,
        loopActiveMs: loop.active,
        loopIdleMs: loop.idle,
        lagBuckets: [...lagBuckets],
        rssBytes: memory.rss,
        heapUsedBytes: memory.heapUsed,
        memoryLimitBytes: container.memoryLimitBytes,
      },
      requests: { total, inFlight, inFlightSum },
      db: {
        poolMax: pool?.max ?? null,
        poolTotal: pool?.total ?? null,
        poolIdle: pool?.idle ?? null,
        poolWaiting: pool?.waiting ?? null,
        samples,
        samplesWithQueue,
        queueSum,
      },
      routes: Object.fromEntries(
        [...routes].map(([key, r]) => [
          key,
          { ...r, codes: { ...r.codes }, buckets: [...r.buckets] },
        ]),
      ),
    };
  };
  app.decorate('metrics', { snapshot } satisfies MetricsRecorder);

  // Amostra do processo: o atraso do timer mede quanto o event loop ficou travado (cálculo
  // pesado ou CPU cortada pelo limite do contêiner).
  let expected = performance.now() + sampleEveryMs;
  const sampler = setInterval(() => {
    const now = performance.now();
    lagBuckets[bucketIndex(Math.max(0, now - expected))]! += 1;
    expected = now + sampleEveryMs;
    samples += 1;
    inFlightSum += inFlight;
    const waiting = app.db.poolStats?.().waiting ?? 0;
    if (waiting > 0) samplesWithQueue += 1;
    queueSum += waiting;
  }, sampleEveryMs);
  sampler.unref();

  let lastSummary: MetricsSnapshot | null = null;
  const summarizer =
    summaryEveryMs > 0
      ? setInterval(() => {
          const next = snapshot();
          const summary = diffSnapshots(lastSummary, next);
          lastSummary = next;
          // Só o monitor chamando /health não é movimento: não suja o log.
          if (summary.appRequests > 0)
            app.log.info({ resumo: logLine(summary) }, 'resumo do minuto');
        }, summaryEveryMs)
      : null;
  summarizer?.unref();

  app.addHook('onClose', async () => {
    clearInterval(sampler);
    if (summarizer) clearInterval(summarizer);
  });

  app.addHook('onRequest', async (request) => {
    // Quem lê as métricas não entra na conta (senão "em andamento" nunca seria 0).
    if (request.routeOptions.url === METRICS_PATH) return;
    open.add(request);
    inFlight += 1;
  });

  const finish = (request: FastifyRequest) => {
    if (!open.delete(request)) return false;
    inFlight = Math.max(0, inFlight - 1);
    return true;
  };
  app.addHook('onRequestAbort', async (request) => {
    finish(request);
  });

  app.addHook('onResponse', async (request, reply) => {
    if (!finish(request)) return;
    const pattern = request.routeOptions.url;
    const key = `${request.method} ${pattern ?? '(sem rota)'}`;
    const ms = reply.elapsedTime;
    let route = routes.get(key);
    if (!route) {
      route = { count: 0, codes: {}, buckets: emptyBuckets(), totalMs: 0, maxMs: 0, bytes: 0 };
      routes.set(key, route);
    }
    const code = String(reply.statusCode);
    route.count += 1;
    route.codes[code] = (route.codes[code] ?? 0) + 1;
    route.buckets[bucketIndex(ms)]! += 1;
    route.totalMs += ms;
    route.maxMs = Math.max(route.maxMs, ms);
    route.bytes += Number(reply.getHeader('content-length') ?? 0) || 0;
    total += 1;
    if (ms >= SLOW_REQUEST_MS) {
      request.log.warn({ rota: key, status: reply.statusCode, ms: Math.round(ms) }, 'pedido lento');
    }
  });

  const token = app.env.METRICS_TOKEN;
  if (token) {
    app.get(METRICS_PATH, async (request, reply) => {
      if (!bearerMatches(request.headers.authorization, token)) {
        reply.callNotFound();
        return reply;
      }
      reply.header('cache-control', 'no-store');
      return snapshot();
    });
  }
};

export const metrics = fp(metricsPlugin, { name: 'metrics' });
