// Ponto de entrada próprio (`@grimorio/shared/metrics`): o site nunca importa isto.

/**
 * Métricas da API (ADR-016): o formato e as contas que todo mundo faz com ele.
 *
 * A API guarda contadores que só crescem desde que subiu (`MetricsSnapshot`). Para saber "o que
 * aconteceu nos últimos N segundos", lê-se duas vezes e subtrai-se (`diffSnapshots`). É assim que
 * a própria API escreve o "resumo do minuto" no log e que o teste de carga acompanha o servidor.
 *
 * Fica em `shared`, sem nada do Node, para a API, o teste de carga e o `pnpm monitor` usarem as
 * mesmas faixas de tempo e o mesmo cálculo de percentil.
 */

/** Faixas de tempo (ms): um pedido de 42 ms conta na faixa "até 50". Acima de 60 s, na última. */
export const LATENCY_BUCKETS_MS = [
  1, 2, 3, 5, 7, 10, 15, 20, 30, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000,
  7500, 10000, 15000, 30000, 60000,
] as const;

/** Rotas de sistema: não contam como "movimento" (o monitor externo chama /health sozinho). */
export const SYSTEM_ROUTES = ['GET /health', 'GET /ready', 'GET /version', 'GET /api/v1/status'];

export function bucketIndex(ms: number): number {
  for (let i = 0; i < LATENCY_BUCKETS_MS.length; i++) {
    if (ms <= LATENCY_BUCKETS_MS[i]!) return i;
  }
  return LATENCY_BUCKETS_MS.length - 1;
}

export function emptyBuckets(): number[] {
  return LATENCY_BUCKETS_MS.map(() => 0);
}

/**
 * Percentil aproximado: o limite da faixa em que cai o pedido da posição p%. Ex.: p95 = 300
 * quer dizer "95% dos pedidos levaram até 300 ms". `null` quando não há pedidos.
 */
export function percentileFromBuckets(buckets: readonly number[], p: number): number | null {
  let total = 0;
  for (const n of buckets) total += n;
  if (total === 0) return null;
  const rank = Math.max(1, Math.ceil((p / 100) * total));
  let seen = 0;
  const last = LATENCY_BUCKETS_MS.length - 1;
  for (let i = 0; i < buckets.length; i++) {
    seen += buckets[i] ?? 0;
    if (seen >= rank) return LATENCY_BUCKETS_MS[Math.min(i, last)]!;
  }
  return LATENCY_BUCKETS_MS[last]!;
}

export interface RouteCounters {
  count: number;
  /** Respostas por código, ex.: `{ "200": 90, "409": 2 }`. */
  codes: Record<string, number>;
  buckets: number[];
  totalMs: number;
  maxMs: number;
  /** Bytes enviados (corpo das respostas). É o que conta na banda de saída do Render. */
  bytes: number;
}

export interface MetricsSnapshot {
  /** Milissegundos desde que a API subiu. */
  uptimeMs: number;
  at: string;
  commit: string;
  process: {
    cpuUserMs: number;
    cpuSystemMs: number;
    /** Limite de CPU do contêiner (0,1 no Render grátis), quando dá para ler. */
    cpuLimitCores: number | null;
    /** Períodos em que o contêiner bateu no limite de CPU e ficou parado esperando. */
    throttledPeriods: number | null;
    totalPeriods: number | null;
    throttledMs: number | null;
    /** Tempo acumulado em que o event loop esteve ocupado ou parado esperando trabalho. */
    loopActiveMs: number;
    loopIdleMs: number;
    /** Atraso do event loop medido a cada 100 ms, nas mesmas faixas dos pedidos. */
    lagBuckets: number[];
    rssBytes: number;
    heapUsedBytes: number;
    memoryLimitBytes: number | null;
  };
  requests: {
    total: number;
    inFlight: number;
    /** Soma dos pedidos em andamento em cada amostra (÷ amostras = média). */
    inFlightSum: number;
  };
  db: {
    poolMax: number | null;
    poolTotal: number | null;
    poolIdle: number | null;
    poolWaiting: number | null;
    /** Amostras (a cada 100 ms), quantas tinham pedido na fila por uma conexão e a soma da fila. */
    samples: number;
    samplesWithQueue: number;
    queueSum: number;
  };
  /** Por rota: "GET /api/v1/characters/:id". Endereço desconhecido entra como "(sem rota)". */
  routes: Record<string, RouteCounters>;
}

export interface RouteInterval {
  count: number;
  codes: Record<string, number>;
  p50Ms: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
  avgMs: number | null;
  bytes: number;
}

/** O que aconteceu entre duas leituras. */
export interface IntervalSummary {
  seconds: number;
  /** Todos os pedidos (com os de sistema). */
  requests: number;
  /** Só os pedidos do site (sem /health e afins). */
  appRequests: number;
  perSecond: number;
  codes: Record<string, number>;
  errors5xx: number;
  rateLimited: number;
  p50Ms: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
  /** A rota com o pior p95 (com pelo menos 5 pedidos no intervalo). */
  slowest: { route: string; p95Ms: number; count: number } | null;
  routes: Record<string, RouteInterval>;
  bytes: number;
  /** Núcleos de CPU usados em média (0,1 = 10% de um núcleo). */
  cpuCores: number;
  /** Fração do limite do contêiner (1 = no teto). */
  cpuOfLimit: number | null;
  /** Fração dos períodos em que a CPU foi cortada pelo limite. */
  throttledShare: number | null;
  /** 0 a 1: quanto do tempo o event loop passou ocupado (perto de 1 = API saturada). */
  loopBusy: number | null;
  lagP99Ms: number | null;
  rssMB: number;
  memoryOfLimit: number | null;
  avgInFlight: number | null;
  /** Fração do tempo com pedido esperando conexão com o banco. */
  poolQueueShare: number | null;
  avgPoolQueue: number | null;
}

const ZERO_ROUTE: RouteCounters = {
  count: 0,
  codes: {},
  buckets: [],
  totalMs: 0,
  maxMs: 0,
  bytes: 0,
};

function subtractCodes(a: Record<string, number>, b: Record<string, number>) {
  const out: Record<string, number> = {};
  for (const [code, n] of Object.entries(a)) {
    const delta = n - (b[code] ?? 0);
    if (delta > 0) out[code] = delta;
  }
  return out;
}

function subtractBuckets(a: readonly number[], b: readonly number[]): number[] {
  return a.map((n, i) => Math.max(0, n - (b[i] ?? 0)));
}

function addInto(target: Record<string, number>, source: Record<string, number>) {
  for (const [key, n] of Object.entries(source)) target[key] = (target[key] ?? 0) + n;
}

const ratio = (part: number, whole: number) => (whole > 0 ? part / whole : null);
const round = (value: number, digits = 3) => Number(value.toFixed(digits));

/**
 * Diferença entre duas leituras. Sem a anterior (ou se a API reiniciou no meio, o que zera os
 * contadores), conta desde que a API subiu.
 */
export function diffSnapshots(
  prev: MetricsSnapshot | null,
  next: MetricsSnapshot,
): IntervalSummary {
  const base = prev && prev.uptimeMs <= next.uptimeMs ? prev : null;
  const seconds = Math.max(0.001, (next.uptimeMs - (base?.uptimeMs ?? 0)) / 1000);

  const routes: Record<string, RouteInterval> = {};
  const codes: Record<string, number> = {};
  let all = Array.from({ length: LATENCY_BUCKETS_MS.length }, () => 0);
  let requests = 0;
  let appRequests = 0;
  let bytes = 0;
  let slowest: IntervalSummary['slowest'] = null;
  for (const [route, now] of Object.entries(next.routes)) {
    const before = base?.routes[route] ?? ZERO_ROUTE;
    const count = now.count - before.count;
    if (count <= 0) continue;
    const buckets = subtractBuckets(now.buckets, before.buckets);
    const routeCodes = subtractCodes(now.codes, before.codes);
    const routeBytes = Math.max(0, now.bytes - before.bytes);
    const p95 = percentileFromBuckets(buckets, 95);
    routes[route] = {
      count,
      codes: routeCodes,
      p50Ms: percentileFromBuckets(buckets, 50),
      p95Ms: p95,
      p99Ms: percentileFromBuckets(buckets, 99),
      avgMs: round((now.totalMs - before.totalMs) / count, 1),
      bytes: routeBytes,
    };
    requests += count;
    if (!SYSTEM_ROUTES.includes(route)) appRequests += count;
    bytes += routeBytes;
    addInto(codes, routeCodes);
    all = all.map((n, i) => n + (buckets[i] ?? 0));
    if (count >= 5 && p95 !== null && (!slowest || p95 > slowest.p95Ms)) {
      slowest = { route, p95Ms: p95, count };
    }
  }

  const p = next.process;
  const b = base?.process;
  const cpuMs = p.cpuUserMs + p.cpuSystemMs - ((b?.cpuUserMs ?? 0) + (b?.cpuSystemMs ?? 0));
  const cpuCores = Math.max(0, cpuMs / (seconds * 1000));
  const periods =
    p.totalPeriods !== null && p.throttledPeriods !== null
      ? {
          total: p.totalPeriods - (b?.totalPeriods ?? 0),
          throttled: p.throttledPeriods - (b?.throttledPeriods ?? 0),
        }
      : null;
  const active = p.loopActiveMs - (b?.loopActiveMs ?? 0);
  const idle = p.loopIdleMs - (b?.loopIdleMs ?? 0);
  const lag = subtractBuckets(p.lagBuckets, b?.lagBuckets ?? []);
  const samples = next.db.samples - (base?.db.samples ?? 0);
  const inFlightSum = next.requests.inFlightSum - (base?.requests.inFlightSum ?? 0);
  const withQueue = next.db.samplesWithQueue - (base?.db.samplesWithQueue ?? 0);
  const queueSum = next.db.queueSum - (base?.db.queueSum ?? 0);
  const hasPool = next.db.poolMax !== null;

  let errors5xx = 0;
  for (const [code, n] of Object.entries(codes)) if (code.startsWith('5')) errors5xx += n;

  return {
    seconds: round(seconds, 1),
    requests,
    appRequests,
    perSecond: round(requests / seconds, 2),
    codes,
    errors5xx,
    rateLimited: codes['429'] ?? 0,
    p50Ms: percentileFromBuckets(all, 50),
    p95Ms: percentileFromBuckets(all, 95),
    p99Ms: percentileFromBuckets(all, 99),
    slowest,
    routes,
    bytes,
    cpuCores: round(cpuCores),
    cpuOfLimit: p.cpuLimitCores ? round(cpuCores / p.cpuLimitCores) : null,
    throttledShare: periods ? round(ratio(periods.throttled, periods.total) ?? 0) : null,
    loopBusy: active + idle > 0 ? round(active / (active + idle)) : null,
    lagP99Ms: percentileFromBuckets(lag, 99),
    rssMB: round(p.rssBytes / 1024 / 1024, 1),
    memoryOfLimit: p.memoryLimitBytes ? round(p.rssBytes / p.memoryLimitBytes) : null,
    avgInFlight: samples > 0 ? round(inFlightSum / samples, 2) : null,
    poolQueueShare: hasPool && samples > 0 ? round(withQueue / samples) : null,
    avgPoolQueue: hasPool && samples > 0 ? round(queueSum / samples, 2) : null,
  };
}
