/**
 * Ponto único onde a API é montada (plano v2, 6.5). Os testes de integração chamam `buildApp`
 * com portas e banco de teste; o servidor chama com os padrões do ambiente.
 */
import Fastify, { type FastifyInstance } from 'fastify';
import type { Env } from './config/env';
import { createDatabase, isPostgresDatabase, type DatabasePort } from './db/client';
import { authRoutes } from './modules/auth/routes';
import { characterRoutes } from './modules/characters/routes';
import { proxyGuard } from './modules/proxy-guard';
import { systemRoutes } from './modules/system/routes';
import { testApi } from './plugins/test-api';
import { defaultPorts, type Ports } from './ports';

export interface BuildOptions {
  /** Troca portas específicas (ex.: relógio parado, ids em sequência). */
  ports?: Partial<Ports>;
  /** Banco já criado (quem passa é responsável por fechar). Sem isso, usa DATABASE_URL. */
  db?: DatabasePort;
}

export async function buildApp(env: Env, options: BuildOptions = {}): Promise<FastifyInstance> {
  const ports: Ports = { ...defaultPorts(env.APP_ENV), ...options.ports };
  const db = options.db ?? createDatabase(env.DATABASE_URL);

  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      // Segredos nunca vão para o log.
      redact: ['req.headers["x-test-token"]', 'req.headers.authorization', 'req.headers.cookie'],
    },
    bodyLimit: 256 * 1024,
    // Id de requisição vem da porta (plano v2, RNF-13); o cabeçalho de quem chama é ignorado.
    genReqId: () => ports.ids.uuid(),
    requestIdHeader: false,
  });

  app.decorate('env', env);
  app.decorate('ports', ports);
  app.decorate('db', db);

  app.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id);
    reply.header('x-content-type-options', 'nosniff');
  });
  if (!options.db) app.addHook('onClose', async () => db.close());

  // Antes de todas as rotas: publicado, só atende /api/* que chegue pelo site (ADR-009).
  await app.register(proxyGuard);
  await app.register(systemRoutes);
  // Login e personagens precisam do Postgres. Os testes de unidade usam um banco falso e só
  // exercitam as rotas de sistema e as salvaguardas da API de teste.
  if (isPostgresDatabase(db)) {
    await app.register(authRoutes);
    await app.register(characterRoutes);
  }
  if (env.ENABLE_TEST_API) await app.register(testApi);

  return app;
}
