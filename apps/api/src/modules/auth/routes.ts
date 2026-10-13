/**
 * Rotas de login (ADR-008):
 * - `/api/auth/*` — da biblioteca (entrar com Google, retorno do Google, sair, sessão);
 * - `GET /api/v1/auth/providers` — quais jeitos de entrar estão ligados (o site mostra o botão);
 * - `GET /api/v1/session` — `{ user }` ou `{ user: null }` (o site pergunta isso ao abrir);
 * - `GET /api/v1/me` — quem está logado (401 sem sessão).
 *
 * Também decora a API com `app.auth` e `app.currentUser(request)`, usados pelas outras rotas.
 */
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import type { Me } from '@grimorio/shared';
import type { PostgresDatabase } from '../../db/client';
import { AUTH_BASE_PATH, createAuth, googleConfigured } from './auth';
import { sendError } from '../http';

/** Cabeçalhos que o Fastify calcula sozinho ao enviar a resposta. */
const SKIPPED_HEADERS = new Set([
  'content-length',
  'transfer-encoding',
  'connection',
  'set-cookie',
]);

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  image: string | null;
}

const authRoutesPlugin: FastifyPluginAsync = async (app) => {
  const db = app.db as PostgresDatabase;
  const auth = createAuth(app.env, db.orm, app.ports);
  app.decorate('auth', auth);

  app.decorate('currentUser', async (request: FastifyRequest): Promise<CurrentUser | null> => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) return null;
    const { user } = session;
    return {
      id: user.id,
      email: user.email,
      displayName: user.name,
      image: user.image ?? null,
    };
  });

  // As rotas da biblioteca recebem o corpo cru (texto): quem interpreta é ela.
  await app.register(async (scope) => {
    scope.removeAllContentTypeParsers();
    scope.addContentTypeParser(
      '*',
      { parseAs: 'string', bodyLimit: 64 * 1024 },
      (_req, body, done) => done(null, body),
    );

    scope.route({
      method: ['GET', 'POST'],
      url: `${AUTH_BASE_PATH}/*`,
      async handler(request, reply) {
        // A origem vem da configuração, nunca do cabeçalho Host.
        const url = new URL(request.url, app.env.SITE_URL);
        const init: RequestInit = {
          method: request.method,
          headers: fromNodeHeaders(request.headers),
        };
        if (request.method !== 'GET' && typeof request.body === 'string' && request.body) {
          init.body = request.body;
        }
        const response = await auth.handler(new Request(url, init));

        reply.status(response.status);
        response.headers.forEach((value, key) => {
          if (!SKIPPED_HEADERS.has(key)) reply.header(key, value);
        });
        const cookies = response.headers.getSetCookie();
        if (cookies.length > 0) reply.header('set-cookie', cookies);
        reply.header('cache-control', 'no-store');
        const body = response.body ? Buffer.from(await response.arrayBuffer()) : null;
        return reply.send(body);
      },
    });
  });

  app.get('/api/v1/auth/providers', async (_request, reply) => {
    reply.header('cache-control', 'no-store');
    return { google: googleConfigured(app.env) };
  });

  // O site usa esta (200 sempre): visitante sem conta não é erro, e um 401 sujaria o console
  // do navegador em toda página. `/api/v1/me` continua respondendo 401 para scripts e testes.
  app.get('/api/v1/session', async (request, reply) => {
    reply.header('cache-control', 'no-store');
    const user: Me | null = await app.currentUser(request);
    return { user };
  });

  app.get('/api/v1/me', async (request, reply) => {
    reply.header('cache-control', 'no-store');
    const user = await app.currentUser(request);
    if (!user) return sendError(reply, 401, 'UNAUTHENTICATED', 'sem sessão');
    const me: Me = user;
    return me;
  });
};

export const authRoutes = fp(authRoutesPlugin, { name: 'auth' });

/** Para rotas que exigem login: devolve o usuário ou já responde 401. */
export async function requireUser(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<CurrentUser | null> {
  const user = await request.server.currentUser(request);
  if (!user) {
    await sendError(reply, 401, 'UNAUTHENTICATED', 'sem sessão');
    return null;
  }
  return user;
}
