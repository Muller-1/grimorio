import { inject } from 'vitest';
import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { startApp, withDatabaseName } from '../../testing/int-helpers';

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe('rotas de sistema com Postgres', () => {
  it('/ready responde 200 com o banco no ar', async () => {
    app = await startApp();
    const res = await app.inject('/ready');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ready', checks: { database: 'ok' } });
  });

  it('/ready responde 503 quando o banco não existe', async () => {
    app = await startApp({
      DATABASE_URL: withDatabaseName(inject('databaseUrl'), 'banco_que_nao_existe_test'),
    });
    expect((await app.inject('/ready')).statusCode).toBe(503);
  });

  it('/api/v1/status confere o banco de verdade; /metrics mostra o pool de conexões', async () => {
    const token = 'token-das-metricas-com-mais-de-32-caracteres';
    app = await startApp({ METRICS_TOKEN: token, DATABASE_POOL_MAX: 4 });
    const status = await app.inject('/api/v1/status');
    expect(status.statusCode).toBe(200);
    expect(status.json().database.status).toBe('ok');
    const snap = (
      await app.inject({ url: '/metrics', headers: { authorization: `Bearer ${token}` } })
    ).json();
    expect(snap.db).toMatchObject({ poolMax: 4, poolWaiting: 0 });
    expect(snap.db.poolTotal).toBeGreaterThanOrEqual(1);
  });

  it('/health e /version não dependem do banco', async () => {
    app = await startApp({ DATABASE_URL: 'postgres://app:app@127.0.0.1:1/nada_test' });
    expect((await app.inject('/health')).statusCode).toBe(200);
    expect((await app.inject('/version')).json()).toMatchObject({ env: 'test' });
  });
});
