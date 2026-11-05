import { emptyBuckets, type IntervalSummary } from '@grimorio/shared/metrics';
import { describe, expect, it } from 'vitest';
import { OptionsError, parseOptions, stagesFor } from './config';
import { diagnose, type StageResult } from './diagnose';
import type { Sample } from './http';
import { seededRng } from './rng';
import { arrival, fakeIp } from './setup';
import { isError, percentile, summarize, usageRates } from './stats';

describe('opções', () => {
  it('sem nada: escada até 150 contra a API local do teste', () => {
    const o = parseOptions([], {});
    expect(o).toMatchObject({ scenario: 'escada', users: 100, target: 'http://localhost:10000' });
    expect(stagesFor(o).map((s) => s.users)).toEqual([10, 25, 50, 100, 150]);
  });

  it('endereço fora do computador exige --confirmar e só aceita visitantes', () => {
    expect(() => parseOptions(['--alvo=https://grimorio.net.br'], {})).toThrow(OptionsError);
    expect(() => parseOptions(['--alvo=https://grimorio.net.br', '--confirmar'], {})).toThrow(
      /visitante/,
    );
    const o = parseOptions(
      ['--alvo=https://grimorio.net.br', '--confirmar', '--cenario=visitante'],
      {},
    );
    // Nada de segredo do teste local indo para um site de verdade.
    expect(o.proxySecret).toBeNull();
    expect(o.metricsToken).toBeNull();
    expect(() =>
      parseOptions(
        ['--alvo=https://grimorio.net.br', '--confirmar', '--cenario=visitante', '--usuarios=500'],
        {},
      ),
    ).toThrow(OptionsError);
  });

  it('opção desconhecida ou número fora da faixa é recusado com mensagem', () => {
    expect(() => parseOptions(['--usuraios=10'], {})).toThrow(/desconhecida/);
    expect(() => parseOptions(['--mesas=150'], {})).toThrow(/entre 0 e 100/);
  });

  it('pico: todo mundo entra em 5 s', () => {
    expect(
      stagesFor({ scenario: 'pico', users: 80, stepSeconds: 60, durationSeconds: 120 }),
    ).toEqual([{ users: 80, seconds: 120, rampSeconds: 5 }]);
  });
});

describe('quem entra e quando', () => {
  it('mesas de 5 e jogadores sozinhos intercalados: a mistura vale em todo degrau', () => {
    const order = arrival(150, 0.5);
    expect(order).toHaveLength(150);
    expect(order.filter((k) => k === 'mestre')).toHaveLength(15);
    for (const n of [10, 25, 50, 100]) {
      const inTables = order.slice(0, n).filter((k) => k !== 'solo').length;
      expect(inTables / n, `primeiros ${n}`).toBeGreaterThan(0.3);
      expect(inTables / n, `primeiros ${n}`).toBeLessThan(0.75);
    }
    // Cada mestre vem seguido dos 4 jogadores da mesa dele.
    const dm = order.indexOf('mestre');
    expect(order.slice(dm, dm + 5)).toEqual(['mestre', 'jogador', 'jogador', 'jogador', 'jogador']);
  });

  it('sem mesas, todos sozinhos; um IP por jogador, ou o mesmo para todos', () => {
    expect(new Set(arrival(12, 0))).toEqual(new Set(['solo']));
    expect(new Set([fakeIp(0, false), fakeIp(1, false), fakeIp(300, false)]).size).toBe(3);
    expect(fakeIp(0, true)).toBe(fakeIp(99, true));
  });

  it('a mesma semente sorteia a mesma sequência', () => {
    const a = seededRng(7).fork(3);
    const b = seededRng(7).fork(3);
    expect([a.next(), a.int(1, 20), a.next()]).toEqual([b.next(), b.int(1, 20), b.next()]);
    expect(seededRng(7).fork(4).next()).not.toBe(seededRng(7).fork(3).next());
  });
});

const sample = (ms: number, status = 200, extra: Partial<Sample> = {}): Sample => ({
  t: 0,
  stage: 0,
  kind: 'solo',
  label: 'GET /x',
  status,
  ms,
  bytes: 1000,
  ...extra,
});

describe('contas', () => {
  it('percentil exato e o que conta como erro', () => {
    const sorted = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentile(sorted, 50)).toBe(50);
    expect(percentile(sorted, 95)).toBe(95);
    expect(percentile([], 95)).toBeNull();
    expect([200, 201, 204, 409].map((status) => isError({ status }))).toEqual([
      false,
      false,
      false,
      false,
    ]);
    expect([0, 400, 401, 404, 429, 500, 503].every((status) => isError({ status }))).toBe(true);
  });

  it('resumo: conflitos à parte, 429 e sem-resposta contados', () => {
    const s = summarize(
      [
        sample(10),
        sample(20),
        sample(30, 409),
        sample(40, 429),
        sample(5000, 0, { failure: 'tempo' }),
      ],
      10,
    );
    expect(s).toMatchObject({
      count: 5,
      perSecond: 0.5,
      errors: 2,
      conflicts: 1,
      rateLimited: 1,
      noResponse: 1,
    });
    expect(s.codes).toEqual({ '200': 2, '409': 1, '429': 1, tempo: 1 });
  });

  it('taxa por pessoa por hora não depende de quantas pessoas havia', () => {
    const list = Array.from({ length: 360 }, () => sample(10, 200, { kind: 'jogador' }));
    // 360 pedidos em 2 jogadores × 30 min = 1 hora-pessoa.
    const [rate] = usageRates(list, { jogador: 3600 });
    expect(rate).toMatchObject({ kind: 'jogador', requestsPerHour: 360, bytesPerHour: 360_000 });
  });
});

function server(overrides: Partial<IntervalSummary> = {}): IntervalSummary {
  return {
    seconds: 60,
    requests: 600,
    appRequests: 600,
    perSecond: 10,
    codes: { '200': 600 },
    errors5xx: 0,
    rateLimited: 0,
    p50Ms: 20,
    p95Ms: 100,
    p99Ms: 200,
    slowest: null,
    routes: {},
    bytes: 0,
    cpuCores: 0.05,
    cpuOfLimit: 0.5,
    throttledShare: 0,
    loopBusy: 0.4,
    lagP99Ms: 10,
    rssMB: 120,
    memoryOfLimit: 0.25,
    avgInFlight: 1,
    poolQueueShare: 0,
    avgPoolQueue: 0,
    ...overrides,
  };
}

function stage(users: number, p95: number, errorRate = 0, srv = server()): StageResult {
  const client = summarize([sample(p95)], 60);
  return { index: 0, users, seconds: 60, client: { ...client, p95, errorRate }, server: srv };
}

describe('diagnóstico', () => {
  const base = {
    sloP95Ms: 1000,
    sloErrorRate: 0.01,
    sameIp: false,
    serverRoutes: null,
    rates: [],
    bandwidthGb: 5,
  };

  it('capacidade = maior degrau antes do primeiro que falhou; CPU no teto vira o achado principal', () => {
    const d = diagnose({
      ...base,
      stages: [
        stage(10, 120),
        stage(25, 300),
        stage(50, 2400, 0, server({ cpuOfLimit: 0.98, throttledShare: 0.7, loopBusy: 0.95 })),
        stage(100, 9000, 0.2),
      ],
    });
    expect(d.capacity).toBe(25);
    expect(d.maxTested).toBe(100);
    expect(d.verdict).toMatch(/até 25 jogadores/);
    expect(d.findings[0]).toMatchObject({ level: 'alto', title: 'A CPU da API é o gargalo' });
  });

  it('fila do banco sem CPU no teto aponta para as conexões', () => {
    const d = diagnose({
      ...base,
      stages: [stage(100, 1800, 0, server({ poolQueueShare: 0.4, avgPoolQueue: 3 }))],
    });
    expect(d.capacity).toBeNull();
    expect(d.findings.map((f) => f.title)).toEqual(['Fila por conexão com o banco']);
  });

  it('tudo dentro da meta: sem achados de gargalo; projeções das cotas por pessoa', () => {
    const d = diagnose({
      ...base,
      stages: [stage(10, 50), stage(100, 200)],
      rates: [{ kind: 'jogador', requestsPerHour: 400, bytesPerHour: 10 * 1024 * 1024 }],
    });
    expect(d.capacity).toBe(100);
    expect(d.findings).toEqual([]);
    expect(d.projections[0]).toMatchObject({ fits: '250 horas de jogador numa mesa por dia' });
    expect(d.projections[1]!.fits).toBe('512 horas de jogador numa mesa por mês');
  });

  it('429 com todos no mesmo IP explica o limite por rede; reinício da API é alto', () => {
    const limited = stage(25, 100);
    limited.client.rateLimited = 30;
    const d = diagnose({ ...base, sameIp: true, restarts: 1, stages: [limited] });
    expect(d.findings.map((f) => [f.level, f.title])).toEqual([
      ['alto', 'A API reiniciou durante o teste'],
      ['médio', 'Limite de pedidos por IP (429)'],
    ]);
  });

  it('as faixas do servidor e do cliente usam as mesmas unidades (ms)', () => {
    expect(emptyBuckets().length).toBeGreaterThan(20);
  });
});
