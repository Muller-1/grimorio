/** Contas sobre os pedidos medidos do lado de quem usa (tempos exatos, não em faixas). */
import type { Sample, UserKind } from './http';

export function percentile(sorted: readonly number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[rank]!;
}

/** Erro = sem resposta, 5xx, 429 ou 4xx inesperado. 409 (conflito/limite) é previsto e conta à parte. */
export function isError(sample: Pick<Sample, 'status'>): boolean {
  const s = sample.status;
  return s === 0 || s >= 500 || (s >= 400 && s !== 409);
}

export interface SampleSummary {
  count: number;
  perSecond: number;
  p50: number | null;
  p90: number | null;
  p95: number | null;
  p99: number | null;
  max: number | null;
  errors: number;
  errorRate: number;
  conflicts: number;
  rateLimited: number;
  noResponse: number;
  codes: Record<string, number>;
  bytes: number;
  avgBytes: number;
}

export function summarize(samples: readonly Sample[], seconds: number): SampleSummary {
  const times = samples.map((s) => s.ms).sort((a, b) => a - b);
  const codes: Record<string, number> = {};
  let errors = 0;
  let conflicts = 0;
  let rateLimited = 0;
  let noResponse = 0;
  let bytes = 0;
  for (const s of samples) {
    const code = s.status === 0 ? (s.failure ?? 'rede') : String(s.status);
    codes[code] = (codes[code] ?? 0) + 1;
    if (isError(s)) errors++;
    if (s.status === 409) conflicts++;
    if (s.status === 429) rateLimited++;
    if (s.status === 0) noResponse++;
    bytes += s.bytes;
  }
  const count = samples.length;
  return {
    count,
    perSecond: seconds > 0 ? count / seconds : 0,
    p50: percentile(times, 50),
    p90: percentile(times, 90),
    p95: percentile(times, 95),
    p99: percentile(times, 99),
    max: times.length > 0 ? times[times.length - 1]! : null,
    errors,
    errorRate: count > 0 ? errors / count : 0,
    conflicts,
    rateLimited,
    noResponse,
    codes,
    bytes,
    avgBytes: count > 0 ? bytes / count : 0,
  };
}

export function groupBy<T, K extends string>(items: readonly T[], key: (item: T) => K) {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    let list = groups.get(k);
    if (!list) groups.set(k, (list = []));
    list.push(item);
  }
  return groups;
}

/** Pedidos e bytes por pessoa por hora, por tipo de jogador (base das projeções de cota). */
export interface UsageRate {
  kind: UserKind;
  requestsPerHour: number;
  bytesPerHour: number;
}

/**
 * `userSeconds`: soma do tempo em que cada jogador desse tipo esteve "online" no teste. Assim a
 * taxa não depende de quantos jogadores havia: é o que UMA pessoa gera numa hora.
 */
export function usageRates(
  samples: readonly Sample[],
  userSeconds: Partial<Record<UserKind, number>>,
): UsageRate[] {
  const out: UsageRate[] = [];
  for (const [kind, list] of groupBy(samples, (s) => s.kind)) {
    const seconds = userSeconds[kind] ?? 0;
    if (seconds <= 0) continue;
    const bytes = list.reduce((sum, s) => sum + s.bytes, 0);
    out.push({
      kind,
      requestsPerHour: (list.length / seconds) * 3600,
      bytesPerHour: (bytes / seconds) * 3600,
    });
  }
  return out;
}
