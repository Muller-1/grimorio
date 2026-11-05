/**
 * Rotas de sistema (plano v2, 15.2): existem também em produção.
 * - /health: o processo está de pé (não consulta nada; serve para o provedor reiniciar a API).
 * - /ready: a API consegue atender (o banco responde).
 * - /version: qual versão está no ar (o bot e o deploy conferem o commit).
 * - /api/v1/status (ADR-016): a mesma pergunta do /ready, mas feita PELO SITE. Publicado, só
 *   responde se o pedido passou pelo repasse da Cloudflare com o segredo certo, então um 200
 *   aqui prova a cadeia inteira: site → repasse → API → banco. É o que o monitor externo chama.
 */
import { performance } from 'node:perf_hooks';
import type { FastifyPluginAsync } from 'fastify';
import { buildInfo } from '../../build-info';

const READY_TIMEOUT_MS = 2_000;
/** O banco pode estar "acordando" (o Neon suspende sem uso): o status espera um pouco mais. */
const STATUS_TIMEOUT_MS = 5_000;
/**
 * O status guarda a última conferência do banco por 1 minuto: chamar a rota muitas vezes não
 * gera consultas a mais (nem mantém o banco acordado à toa).
 */
export const STATUS_CACHE_MS = 60_000;
/** Depois de uma falha, confere de novo mais cedo (o banco pode ter acabado de voltar). */
const STATUS_RETRY_MS = 10_000;

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

interface DatabaseCheck {
  ok: boolean;
  ms: number;
  checkedAt: Date;
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

  let last: DatabaseCheck | null = null;
  let running: Promise<DatabaseCheck> | null = null;
  const checkDatabase = async (): Promise<DatabaseCheck> => {
    const started = performance.now();
    let ok = true;
    try {
      await withTimeout(app.db.ping(), STATUS_TIMEOUT_MS);
    } catch (error) {
      ok = false;
      app.log.warn({ err: error }, 'status: banco indisponível');
    }
    return { ok, ms: Math.round(performance.now() - started), checkedAt: app.ports.clock.now() };
  };

  app.get('/api/v1/status', async (_request, reply) => {
    reply.header('cache-control', 'no-store');
    const now = app.ports.clock.now().getTime();
    const ttl = last?.ok ? STATUS_CACHE_MS : STATUS_RETRY_MS;
    if (!last || now - last.checkedAt.getTime() >= ttl) {
      // Dois pedidos ao mesmo tempo esperam a mesma consulta.
      running ??= checkDatabase().finally(() => {
        running = null;
      });
      last = await running;
    }
    const check = last;
    return reply.code(check.ok ? 200 : 503).send({
      status: check.ok ? 'ok' : 'degraded',
      version: buildInfo.version,
      commit: app.env.APP_COMMIT ?? buildInfo.commit,
      env: app.env.APP_ENV,
      uptimeS: Math.round(process.uptime()),
      database: {
        status: check.ok ? 'ok' : 'down',
        ms: check.ms,
        checkedAt: check.checkedAt.toISOString(),
      },
    });
  });
};
