/**
 * Rotas de sistema (plano v2, 15.2): existem também em produção.
 * - /health: o processo está de pé (não consulta nada; serve para o provedor reiniciar a API).
 * - /ready: a API consegue atender (o banco responde).
 * - /version: qual versão está no ar (o bot e o deploy conferem o commit).
 */
import type { FastifyPluginAsync } from 'fastify';
import { buildInfo } from '../../build-info';

const READY_TIMEOUT_MS = 2_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`sem resposta em ${ms} ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

export const systemRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => ({ status: 'ok' }));

  app.get('/ready', async (_request, reply) => {
    try {
      await withTimeout(app.db.ping(), READY_TIMEOUT_MS);
      return { status: 'ready', checks: { database: 'ok' } };
    } catch (error) {
      app.log.warn({ err: error }, 'banco indisponível');
      return reply.code(503).send({ status: 'unavailable', checks: { database: 'down' } });
    }
  });

  app.get('/version', async () => ({
    version: buildInfo.version,
    commit: app.env.APP_COMMIT ?? buildInfo.commit,
    env: app.env.APP_ENV,
  }));
};
