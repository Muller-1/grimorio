/**
 * `pnpm monitor` (ADR-016): confere de uma vez se o site publicado está funcionando, peça por
 * peça, e diz qual delas falhou. São poucos pedidos (como abrir o site uma vez).
 *
 *   pnpm monitor
 *   pnpm monitor --site=https://grimorio.net.br --api=https://grimorio-api-k28f.onrender.com
 *   METRICS_TOKEN=… pnpm monitor      também mostra os números da API (/metrics)
 *
 * Também dá para usar MONITOR_SITE e MONITOR_API no lugar das opções.
 */
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { diffSnapshots, type MetricsSnapshot } from '@grimorio/shared/metrics';

const DEFAULT_SITE = 'https://grimorio.gustavomullercavalheiro2.workers.dev';
const DEFAULT_API = 'https://grimorio-api-k28f.onrender.com';
/** A API grátis do Render pode estar dormindo: até ~1 min para acordar. */
const WAKE_TIMEOUT_MS = 90_000;

interface Check {
  name: string;
  ok: boolean;
  ms: number;
  detail: string;
}

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((a) => a.startsWith(prefix))?.slice(prefix.length);
}

async function get(url: string, headers: Record<string, string> = {}, timeoutMs = 20_000) {
  const started = performance.now();
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
    const text = await res.text();
    return { status: res.status, text, ms: performance.now() - started };
  } catch (error) {
    const reason =
      (error as Error).name === 'TimeoutError' ? 'sem resposta a tempo' : 'falha de rede';
    return { status: 0, text: reason, ms: performance.now() - started };
  }
}

function json<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function localCommit(ref: string): string | null {
  try {
    return execFileSync('git', ['rev-parse', '--short=7', ref], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

async function main() {
  const site = (arg('site') ?? process.env.MONITOR_SITE ?? DEFAULT_SITE).replace(/\/+$/, '');
  const api = (arg('api') ?? process.env.MONITOR_API ?? DEFAULT_API).replace(/\/+$/, '');
  const token = process.env.METRICS_TOKEN;
  const checks: Check[] = [];
  const add = (name: string, ok: boolean, ms: number, detail: string) =>
    checks.push({ name, ok, ms, detail });

  console.log(`Conferindo ${site} (site) e ${api} (API)…\n`);

  const home = await get(`${site}/`);
  add(
    'Site: página inicial',
    home.status === 200 && home.text.includes('data-prerendered'),
    home.ms,
    home.status === 200 ? 'servida pela Cloudflare' : `respondeu ${home.status || home.text}`,
  );
  const dice = await get(`${site}/dados`);
  add('Site: /dados', dice.status === 200, dice.ms, `respondeu ${dice.status || dice.text}`);

  const health = await get(`${api}/health`, {}, WAKE_TIMEOUT_MS);
  add(
    'API: está de pé (/health)',
    health.status === 200,
    health.ms,
    health.status !== 200
      ? `respondeu ${health.status || health.text}`
      : health.ms > 10_000
        ? `estava dormindo; acordou em ${Math.round(health.ms / 1000)} s`
        : 'acordada',
  );

  const version = await get(`${api}/version`);
  const deployed = json<{ commit: string; env: string }>(version.text);
  const published = localCommit('origin/main');
  const head = localCommit('HEAD');
  const same = (a: string, b: string) => a.startsWith(b) || b.startsWith(a);
  add(
    'API: versão publicada',
    version.status === 200 && !!deployed,
    version.ms,
    deployed?.commit === 'local'
      ? 'a API não informa o commit (a versão com RENDER_GIT_COMMIT ainda não foi publicada)'
      : deployed
        ? `commit ${deployed.commit} (${deployed.env})` +
          (published
            ? same(published, deployed.commit)
              ? ' = origin/main'
              : ` ≠ origin/main ${published} (deploy atrasado ou em andamento?)`
            : '') +
          (head && head !== published ? `; seu HEAD local é ${head}` : '')
        : `respondeu ${version.status || version.text}`,
  );

  // A cadeia inteira: o pedido entra pelo site, o Worker repassa com o segredo, a API consulta o banco.
  const status = await get(`${site}/api/v1/status`, {}, WAKE_TIMEOUT_MS);
  const body = json<{
    status: string;
    database?: { status: string; ms: number };
    code?: string;
    message?: string;
  }>(status.text);
  if (status.status === 404) {
    const session = await get(`${site}/api/v1/session`, {}, WAKE_TIMEOUT_MS);
    add(
      'Cadeia: site → repasse → API',
      session.status === 200,
      session.ms,
      session.status === 200
        ? 'ok (a rota /api/v1/status ainda não foi publicada: o banco não foi conferido)'
        : explainChain(session.status, json(session.text)),
    );
  } else {
    add(
      'Cadeia: site → repasse → API → banco',
      status.status === 200 && body?.status === 'ok',
      status.ms,
      status.status === 200
        ? `ok; banco respondeu em ${body?.database?.ms ?? '?'} ms`
        : status.status === 503 && body?.database
          ? 'a API respondeu, mas o BANCO não (Neon fora do ar ou cota do mês esgotada?)'
          : explainChain(status.status, body),
    );
  }

  if (token) {
    const metrics = await get(`${api}/metrics`, { authorization: `Bearer ${token}` });
    const snap = json<MetricsSnapshot>(metrics.text);
    if (metrics.status === 200 && snap) {
      const s = diffSnapshots(null, snap);
      add(
        'API: números desde que subiu',
        s.errors5xx === 0,
        metrics.ms,
        `${Math.round(snap.uptimeMs / 60000)} min no ar · ${s.appRequests} pedidos do site · ` +
          `p95 ${s.p95Ms ?? '—'} ms · 5xx: ${s.errors5xx} · 429: ${s.rateLimited} · ` +
          `memória ${s.rssMB} MB` +
          (s.slowest ? ` · mais lenta: ${s.slowest.route} (p95 ${s.slowest.p95Ms} ms)` : ''),
      );
    } else {
      add(
        'API: números (/metrics)',
        false,
        metrics.ms,
        `respondeu ${metrics.status}: o METRICS_TOKEN confere com o do Render?`,
      );
    }
  }

  for (const c of checks) {
    console.log(
      `${c.ok ? '✔' : '✖'} ${c.name.padEnd(38)} ${String(Math.round(c.ms)).padStart(6)} ms  ${c.detail}`,
    );
  }
  const failed = checks.filter((c) => !c.ok).length;
  console.log(failed === 0 ? '\nTudo funcionando.' : `\n${failed} item(ns) com problema.`);
  process.exit(failed === 0 ? 0 : 1);
}

function explainChain(status: number, body: { message?: string } | null): string {
  if (status === 403)
    return '403: o segredo do repasse (API_PROXY_SECRET na Cloudflare) não confere com o PROXY_SECRET do Render';
  if (status === 503)
    return `503: ${body?.message ?? 'o Worker não tem API_ORIGIN/API_PROXY_SECRET'}`;
  if (status === 502)
    return '502: o Worker não conseguiu falar com a API (Render fora do ar ou suspenso?)';
  if (status === 0) return 'sem resposta';
  return `respondeu ${status}`;
}

void main();
