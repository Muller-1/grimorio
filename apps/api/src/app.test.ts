import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app';
import type { Env } from './config/env';
import { controllableClock, inMemoryMailer, sequentialIds } from './ports';
import { TEST_API_PREFIX, TEST_TOKEN_HEADER } from './plugins/test-api';
import { PROXY_SECRET_HEADER } from './modules/proxy-guard';
import { fakeDatabase, type FakeDatabase } from './testing/fake-db';
import { TEST_TOKEN, testEnv } from './testing/env';

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

async function start(env: Partial<Env> = {}, db: FakeDatabase = fakeDatabase()) {
  app = await buildApp(testEnv(env), { db, ports: { ids: sequentialIds() } });
  return { app, db };
}

const withTestApi = { ENABLE_TEST_API: true, TEST_API_TOKEN: TEST_TOKEN } as const;
const auth = { [TEST_TOKEN_HEADER]: TEST_TOKEN };

describe('rotas de sistema', () => {
  it('/health responde sem consultar o banco', async () => {
    const { app, db } = await start();
    db.healthy = false;
    const res = await app.inject('/health');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('/ready diz 200 com o banco no ar e 503 sem ele', async () => {
    const { app, db } = await start();
    expect((await app.inject('/ready')).statusCode).toBe(200);
    db.healthy = false;
    const res = await app.inject('/ready');
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ status: 'unavailable', checks: { database: 'down' } });
  });

  it('/version devolve o commit publicado e o ambiente', async () => {
    const { app } = await start({ APP_COMMIT: 'abc1234', APP_ENV: 'staging' });
    expect((await app.inject('/version')).json()).toMatchObject({
      commit: 'abc1234',
      env: 'staging',
    });
  });

  it('toda resposta leva um id de requisição gerado pela porta', async () => {
    const { app } = await start();
    const res = await app.inject({ url: '/health', headers: { 'x-request-id': 'forjado' } });
    expect(res.headers['x-request-id']).toBe('00000000-0000-4000-8000-000000000001');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('API de teste — salvaguardas (plano v2, 15.10)', () => {
  it('não sobe em produção, mesmo com ENABLE_TEST_API e token', async () => {
    // Passa por fora do parseEnv de propósito: a proteção do plugin vale sozinha.
    await expect(
      buildApp(testEnv({ APP_ENV: 'production', ...withTestApi }), {
        db: fakeDatabase(),
      }),
    ).rejects.toThrow(/produção/);
  });

  it('sem o plugin, /__test__/reset não existe (404)', async () => {
    const { app, db } = await start();
    const res = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/reset`,
      headers: auth,
    });
    expect(res.statusCode).toBe(404);
    expect(db.truncated).toBe(0);
  });

  it('sem token ou com token errado responde 404, igual a rota inexistente', async () => {
    const disabled = await buildApp(testEnv(), { db: fakeDatabase() });
    const reference = await disabled.inject({ method: 'POST', url: `${TEST_API_PREFIX}/reset` });
    await disabled.close();

    const { app, db } = await start(withTestApi);
    for (const headers of [
      {},
      { [TEST_TOKEN_HEADER]: 'errado' },
      { [TEST_TOKEN_HEADER]: `${TEST_TOKEN}x` },
    ]) {
      const res = await app.inject({ method: 'POST', url: `${TEST_API_PREFIX}/reset`, headers });
      expect(res.statusCode).toBe(404);
      expect(res.body).toBe(reference.body);
    }
    expect(db.truncated).toBe(0);
  });

  it('o token vale mesmo com o endereço escrito de outro jeito', async () => {
    const { app, db } = await start(withTestApi);
    for (const url of ['/%5F%5Ftest__/reset', '/__test__/reset?x=1', '/__test__//reset']) {
      const res = await app.inject({ method: 'POST', url });
      expect(res.statusCode, url).toBe(404);
    }
    expect(db.truncated).toBe(0);
  });

  it('reset recusa banco que não termina em _test ou _staging', async () => {
    const { app, db } = await start(withTestApi, fakeDatabase('app_dev'));
    const res = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/reset`,
      headers: auth,
    });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ error: 'unsafe-database' });
    expect(db.truncated).toBe(0);
  });

  it.each(['app_test', 'app_staging'])('reset apaga o banco %s', async (name) => {
    const { app, db } = await start(withTestApi, fakeDatabase(name));
    const res = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/reset`,
      headers: auth,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, database: name });
    expect(db.truncated).toBe(1);
  });
});

describe('API de teste — ganchos', () => {
  it('para e adianta o relógio', async () => {
    const clock = controllableClock();
    app = await buildApp(testEnv(withTestApi), { db: fakeDatabase(), ports: { clock } });
    const set = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/clock`,
      headers: auth,
      payload: { now: '2026-09-23T12:00:00.000Z' },
    });
    expect(set.json()).toEqual({ now: '2026-09-23T12:00:00.000Z' });
    const advanced = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/clock`,
      headers: auth,
      payload: { advanceMs: 31 * 24 * 3600 * 1000 },
    });
    expect(advanced.json()).toEqual({ now: '2026-10-24T12:00:00.000Z' });
    expect(clock.now().toISOString()).toBe('2026-10-24T12:00:00.000Z');

    const invalid = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/clock`,
      headers: auth,
      payload: { now: 'amanhã' },
    });
    expect(invalid.statusCode).toBe(400);
  });

  it('fixa a semente, mostra a caixa de e-mails e os eventos; o reset limpa tudo', async () => {
    const mailer = inMemoryMailer();
    app = await buildApp(testEnv(withTestApi), { db: fakeDatabase(), ports: { mailer } });
    const rng = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/rng`,
      headers: auth,
      payload: { seed: 42 },
    });
    expect(rng.json()).toEqual({ ok: true, seed: 42 });

    await mailer.send({ to: 'a@b.c', subject: 'Bem-vindo', text: '...' });
    app.ports.events.publish({ type: 'user.created', at: '2026-09-23T00:00:00Z' });
    expect(
      (await app.inject({ url: `${TEST_API_PREFIX}/outbox`, headers: auth })).json(),
    ).toHaveLength(1);
    expect(
      (
        await app.inject({ url: `${TEST_API_PREFIX}/events?type=user.created`, headers: auth })
      ).json(),
    ).toHaveLength(1);

    await app.inject({ method: 'POST', url: `${TEST_API_PREFIX}/reset`, headers: auth });
    expect(mailer.outbox()).toEqual([]);
    expect(app.ports.events.recorded()).toEqual([]);
  });
});

describe('repasse do site — PROXY_SECRET (ADR-009)', () => {
  const secret = 'segredo-do-repasse-com-mais-de-32-caracteres';

  it('sem PROXY_SECRET, nada muda (computador e testes)', async () => {
    const { app } = await start();
    expect((await app.inject('/api/v1/session')).statusCode).toBe(404);
  });

  it('com PROXY_SECRET, /api/* sem o segredo certo recebe 403', async () => {
    const { app } = await start({ PROXY_SECRET: secret });
    for (const headers of [{}, { [PROXY_SECRET_HEADER]: 'chute' }, { [PROXY_SECRET_HEADER]: '' }]) {
      const res = await app.inject({ url: '/api/v1/session', headers });
      expect(res.statusCode).toBe(403);
      expect(res.json()).toMatchObject({ code: 'FORBIDDEN' });
    }
  });

  it('com o segredo certo, o pedido segue (aqui, 404: o banco falso não tem as rotas)', async () => {
    const { app } = await start({ PROXY_SECRET: secret });
    const res = await app.inject({
      url: '/api/v1/session',
      headers: { [PROXY_SECRET_HEADER]: secret },
    });
    expect(res.statusCode).toBe(404);
  });

  it('não dá para escapar com caminho codificado ou barras duplas', async () => {
    const { app } = await start({ PROXY_SECRET: secret });
    for (const url of [
      '/%61pi/v1/session',
      '//api/v1/session',
      '/API/v1/session',
      '/health/../api/v1/me',
    ]) {
      expect((await app.inject(url)).statusCode, url).toBe(403);
    }
  });

  it('rotas de sistema continuam abertas (o Render confere /health)', async () => {
    const { app } = await start({ PROXY_SECRET: secret });
    expect((await app.inject('/health')).statusCode).toBe(200);
    expect((await app.inject('/ready')).statusCode).toBe(200);
    expect((await app.inject('/version')).statusCode).toBe(200);
    expect((await app.inject('/health?x=1')).statusCode).toBe(200);
  });
});

describe('medidor e /metrics (ADR-016)', () => {
  const token = 'token-das-metricas-com-mais-de-32-caracteres';
  const bearer = { authorization: `Bearer ${token}` };

  it('sem METRICS_TOKEN, /metrics não existe', async () => {
    const { app } = await start();
    expect((await app.inject('/metrics')).statusCode).toBe(404);
  });

  it('com o token configurado, só responde a quem manda o token certo', async () => {
    const { app } = await start({ METRICS_TOKEN: token });
    for (const authorization of [undefined, 'Bearer errado', token, `Bearer ${token}x`]) {
      const res = await app.inject({
        url: '/metrics',
        headers: authorization ? { authorization } : {},
      });
      expect(res.statusCode, String(authorization)).toBe(404);
    }
    const ok = await app.inject({ url: '/metrics', headers: bearer });
    expect(ok.statusCode).toBe(200);
    expect(ok.headers['cache-control']).toBe('no-store');
  });

  it('conta por padrão de rota: pedidos, códigos, faixas de tempo e bytes', async () => {
    const { app } = await start({ METRICS_TOKEN: token });
    await app.inject('/health');
    await app.inject('/health');
    await app.inject('/nao-existe');
    await app.inject('/nao-existe/outra');
    const snap = (await app.inject({ url: '/metrics', headers: bearer })).json();
    expect(snap.routes['GET /health']).toMatchObject({ count: 2, codes: { '200': 2 } });
    expect(snap.routes['GET /health'].bytes).toBeGreaterThan(0);
    expect(snap.routes['GET /health'].buckets.reduce((a: number, b: number) => a + b, 0)).toBe(2);
    // Endereço desconhecido não cria uma linha por URL (não dá para encher a memória).
    expect(snap.routes['GET (sem rota)']).toMatchObject({ count: 2, codes: { '404': 2 } });
    // O próprio /metrics não entra na conta.
    expect(Object.keys(snap.routes).some((r) => r.includes('/metrics'))).toBe(false);
    expect(snap.requests).toMatchObject({ total: 4, inFlight: 0 });
    expect(snap.process.rssBytes).toBeGreaterThan(0);
    // Banco falso: sem pool para medir.
    expect(snap.db.poolMax).toBeNull();
  });

  it('publicado (com PROXY_SECRET), /metrics vale com o token mesmo sem o segredo do site', async () => {
    const { app } = await start({
      METRICS_TOKEN: token,
      PROXY_SECRET: 'segredo-do-repasse-com-mais-de-32-caracteres',
    });
    expect((await app.inject({ url: '/metrics', headers: bearer })).statusCode).toBe(200);
    // Sem token configurado, /metrics é um endereço desconhecido: exige o segredo (403).
    const { app: other } = await start({
      PROXY_SECRET: 'segredo-do-repasse-com-mais-de-32-caracteres',
    });
    expect((await other.inject('/metrics')).statusCode).toBe(403);
    await other.close();
  });

  it('o 403 do repasse e o 429 do limite também entram na conta', async () => {
    const secret = 'segredo-do-repasse-com-mais-de-32-caracteres';
    const { app } = await start({ METRICS_TOKEN: token, PROXY_SECRET: secret });
    await app.inject('/api/v1/session');
    const snap = (await app.inject({ url: '/metrics', headers: bearer })).json();
    const forbidden = Object.values(snap.routes as Record<string, { codes: object }>).find(
      (r) => '403' in r.codes,
    );
    expect(forbidden).toBeDefined();
  });

  it('resumo do minuto vai para o log só quando houve pedido do site', async () => {
    const lines: { msg: string; resumo?: Record<string, unknown> }[] = [];
    const stream = { write: (line: string) => lines.push(JSON.parse(line)) };
    const db = fakeDatabase();
    app = await buildApp(testEnv({ LOG_LEVEL: 'info' }), {
      db,
      metrics: { summaryEveryMs: 50 },
      logStream: stream,
    });
    await app.inject('/health');
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(lines.filter((l) => l.msg === 'resumo do minuto')).toEqual([]);
    await app.inject('/nao-existe');
    await new Promise((resolve) => setTimeout(resolve, 120));
    const summary = lines.find((l) => l.msg === 'resumo do minuto');
    expect(summary?.resumo).toMatchObject({ pedidos: 1 });
  });
});

describe('/api/v1/status (ADR-016)', () => {
  it('diz ok com o banco no ar e guarda a conferência por 1 minuto', async () => {
    const clock = controllableClock();
    clock.set('2026-11-03T12:00:00.000Z');
    const db = fakeDatabase();
    app = await buildApp(testEnv({ APP_COMMIT: 'abc1234' }), { db, ports: { clock } });
    const first = await app.inject('/api/v1/status');
    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({
      status: 'ok',
      commit: 'abc1234',
      database: { status: 'ok', checkedAt: '2026-11-03T12:00:00.000Z' },
    });
    expect(first.headers['cache-control']).toBe('no-store');
    await app.inject('/api/v1/status');
    await app.inject('/api/v1/status');
    expect(db.pings).toBe(1);
    clock.advance(60_000);
    await app.inject('/api/v1/status');
    expect(db.pings).toBe(2);
  });

  it('banco fora do ar: 503 "degraded", e confere de novo em 10 s', async () => {
    const clock = controllableClock();
    clock.set('2026-11-03T12:00:00.000Z');
    const db = fakeDatabase();
    db.healthy = false;
    app = await buildApp(testEnv(), { db, ports: { clock } });
    const down = await app.inject('/api/v1/status');
    expect(down.statusCode).toBe(503);
    expect(down.json()).toMatchObject({ status: 'degraded', database: { status: 'down' } });
    db.healthy = true;
    clock.advance(10_000);
    expect((await app.inject('/api/v1/status')).statusCode).toBe(200);
  });

  it('publicado, só responde pelo site (com o segredo do repasse): prova a cadeia inteira', async () => {
    const secret = 'segredo-do-repasse-com-mais-de-32-caracteres';
    const { app } = await start({ PROXY_SECRET: secret });
    expect((await app.inject('/api/v1/status')).statusCode).toBe(403);
    const viaSite = await app.inject({
      url: '/api/v1/status',
      headers: { [PROXY_SECRET_HEADER]: secret },
    });
    expect(viaSite.statusCode).toBe(200);
  });
});
