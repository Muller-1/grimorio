import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app';
import type { Env } from './config/env';
import { controllableClock, inMemoryMailer, sequentialIds } from './ports';
import { TEST_API_PREFIX, TEST_TOKEN_HEADER } from './plugins/test-api';
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
