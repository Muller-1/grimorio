import { describe, expect, it } from 'vitest';
import {
  bucketIndex,
  diffSnapshots,
  emptyBuckets,
  LATENCY_BUCKETS_MS,
  percentileFromBuckets,
  type MetricsSnapshot,
} from './metrics';

function buckets(entries: Record<number, number>): number[] {
  const out = emptyBuckets();
  for (const [ms, n] of Object.entries(entries)) out[bucketIndex(Number(ms))]! += n;
  return out;
}

function snapshot(overrides: Partial<MetricsSnapshot> = {}): MetricsSnapshot {
  return {
    uptimeMs: 60_000,
    at: '2026-11-03T00:00:00.000Z',
    commit: 'abc1234',
    process: {
      cpuUserMs: 0,
      cpuSystemMs: 0,
      cpuLimitCores: 0.1,
      throttledPeriods: 0,
      totalPeriods: 0,
      throttledMs: 0,
      loopActiveMs: 0,
      loopIdleMs: 0,
      lagBuckets: emptyBuckets(),
      rssBytes: 100 * 1024 * 1024,
      heapUsedBytes: 0,
      memoryLimitBytes: 512 * 1024 * 1024,
    },
    requests: { total: 0, inFlight: 0, inFlightSum: 0 },
    db: {
      poolMax: 10,
      poolTotal: 0,
      poolIdle: 0,
      poolWaiting: 0,
      samples: 0,
      samplesWithQueue: 0,
      queueSum: 0,
    },
    routes: {},
    ...overrides,
  };
}

describe('faixas de tempo', () => {
  it('cada tempo cai na menor faixa que o comporta; acima de tudo, na última', () => {
    expect(bucketIndex(0)).toBe(0);
    expect(bucketIndex(1)).toBe(0);
    expect(bucketIndex(1.2)).toBe(1);
    expect(LATENCY_BUCKETS_MS[bucketIndex(42)]).toBe(50);
    expect(bucketIndex(10 * 60_000)).toBe(LATENCY_BUCKETS_MS.length - 1);
  });

  it('percentil = limite da faixa onde cai a posição pedida', () => {
    // 90 pedidos rápidos (até 10 ms) e 10 lentos (até 500 ms).
    const counts = buckets({ 10: 90, 500: 10 });
    expect(percentileFromBuckets(counts, 50)).toBe(10);
    expect(percentileFromBuckets(counts, 90)).toBe(10);
    expect(percentileFromBuckets(counts, 95)).toBe(500);
    expect(percentileFromBuckets(counts, 100)).toBe(500);
    expect(percentileFromBuckets(emptyBuckets(), 95)).toBeNull();
  });
});

describe('diffSnapshots', () => {
  const route = (count: number, fast: number, slow: number, status = '200') => ({
    count,
    codes: { [status]: count },
    buckets: buckets({ 20: fast, 2000: slow }),
    totalMs: fast * 20 + slow * 2000,
    maxMs: slow > 0 ? 2000 : 20,
    bytes: count * 1000,
  });

  it('subtrai as duas leituras: pedidos, códigos, percentis, CPU e fila do banco', () => {
    const before = snapshot({
      uptimeMs: 60_000,
      routes: { 'GET /api/v1/characters': route(10, 10, 0) },
    });
    const after = snapshot({
      uptimeMs: 70_000,
      process: {
        ...before.process,
        cpuUserMs: 800,
        cpuSystemMs: 200,
        totalPeriods: 100,
        throttledPeriods: 40,
        loopActiveMs: 7_000,
        loopIdleMs: 3_000,
      },
      requests: { total: 120, inFlight: 3, inFlightSum: 200 },
      db: { ...before.db, samples: 100, samplesWithQueue: 25, queueSum: 50 },
      routes: {
        'GET /api/v1/characters': route(110, 100, 10),
        'GET /health': route(3, 3, 0),
        'POST /api/v1/characters/:id/actions': {
          ...route(7, 7, 0, '429'),
        },
      },
    });

    const s = diffSnapshots(before, after);
    expect(s.seconds).toBe(10);
    expect(s.requests).toBe(110);
    expect(s.appRequests).toBe(107);
    expect(s.perSecond).toBe(11);
    expect(s.rateLimited).toBe(7);
    expect(s.routes['GET /api/v1/characters']).toMatchObject({ count: 100, p50Ms: 20 });
    // 90 rápidos e 10 lentos nesta rota no intervalo: p95 cai nos lentos.
    expect(s.routes['GET /api/v1/characters']!.p95Ms).toBe(2000);
    expect(s.slowest).toEqual({ route: 'GET /api/v1/characters', p95Ms: 2000, count: 100 });
    // 1 s de CPU em 10 s = 0,1 núcleo = o limite inteiro do Render grátis.
    expect(s.cpuCores).toBe(0.1);
    expect(s.cpuOfLimit).toBe(1);
    expect(s.throttledShare).toBe(0.4);
    expect(s.loopBusy).toBe(0.7);
    expect(s.avgInFlight).toBe(2);
    expect(s.poolQueueShare).toBe(0.25);
    expect(s.avgPoolQueue).toBe(0.5);
    expect(s.bytes).toBe(100 * 1000 + 3 * 1000 + 7 * 1000);
  });

  it('API reiniciada no meio (contadores menores): conta desde o início', () => {
    const before = snapshot({ uptimeMs: 500_000, routes: { 'GET /health': route(999, 999, 0) } });
    const after = snapshot({ uptimeMs: 10_000, routes: { 'GET /health': route(5, 5, 0) } });
    const s = diffSnapshots(before, after);
    expect(s.requests).toBe(5);
    expect(s.appRequests).toBe(0);
    expect(s.seconds).toBe(10);
  });

  it('sem pool de banco nem limite de CPU, os campos ficam nulos (não inventa zero)', () => {
    const base = snapshot();
    const s = diffSnapshots(null, {
      ...base,
      process: { ...base.process, cpuLimitCores: null, totalPeriods: null, throttledPeriods: null },
      db: { ...base.db, poolMax: null },
    });
    expect(s.cpuOfLimit).toBeNull();
    expect(s.throttledShare).toBeNull();
    expect(s.poolQueueShare).toBeNull();
    expect(s.p95Ms).toBeNull();
  });
});
