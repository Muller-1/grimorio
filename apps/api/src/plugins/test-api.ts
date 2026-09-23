/**
 * API de teste (plano v2, 15.4): prepara cenários para o bot. NUNCA em produção.
 *
 * Salvaguardas (plano v2, 15.10), cada uma com teste automático:
 * - recusa ser registrada com APP_ENV=production (a inicialização falha);
 * - sem o cabeçalho `x-test-token` certo, toda rota /__test__/* responde 404, igual a uma rota
 *   que não existe;
 * - `reset` só apaga bancos cujo nome termina em `_test` ou `_staging`.
 *
 * As rotas ficam num contexto próprio (prefixo /__test__): o gancho do token vale para todas
 * elas, seja qual for a forma como o endereço foi escrito (ex.: com `%5F` no lugar de `_`).
 */
import { timingSafeEqual } from 'node:crypto';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { assertDisposableDatabase, UnsafeDatabaseError } from '../db/safety';
import { isControllableClock, isControllableRng, isInMemoryMailer } from '../ports';

export const TEST_API_PREFIX = '/__test__';
export const TEST_TOKEN_HEADER = 'x-test-token';

const ClockBody = z.union([
  z.object({ now: z.iso.datetime({ offset: true }).nullable() }),
  z.object({ advanceMs: z.number().int().min(0) }),
]);
const RngBody = z.object({ seed: z.number().int().min(0).max(0xffffffff).nullable() });
const EventsQuery = z.object({ type: z.string().optional() });

function tokenMatches(given: unknown, expected: Buffer): boolean {
  if (typeof given !== 'string') return false;
  const buffer = Buffer.from(given);
  return buffer.length === expected.length && timingSafeEqual(buffer, expected);
}

function badRequest(reply: FastifyReply, error: z.ZodError) {
  return reply.code(400).send({ error: 'invalid-body', issues: error.issues });
}

export const testApi: FastifyPluginAsync = async (app) => {
  // Salvaguarda: nunca em produção, nem por engano de configuração.
  if (app.env.APP_ENV === 'production') {
    throw new Error('A API de teste não pode ser registrada em produção.');
  }
  const token = app.env.TEST_API_TOKEN;
  if (!token || token.length < 32) {
    throw new Error('A API de teste exige TEST_API_TOKEN com pelo menos 32 caracteres.');
  }
  const expected = Buffer.from(token);

  await app.register(
    async (scope) => {
      // Salvaguarda: sem o token, a rota "não existe".
      scope.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
        if (tokenMatches(request.headers[TEST_TOKEN_HEADER], expected)) return;
        reply.callNotFound();
        return reply;
      });

      const { ports, db } = app;

      scope.post('/reset', async (_request, reply) => {
        let database: string;
        try {
          database = await assertDisposableDatabase(db);
        } catch (error) {
          if (error instanceof UnsafeDatabaseError) {
            return reply.code(409).send({ error: 'unsafe-database', message: error.message });
          }
          throw error;
        }
        await db.truncateAll();
        if (isInMemoryMailer(ports.mailer)) ports.mailer.clear();
        ports.events.clearRecorded();
        if (isControllableClock(ports.clock)) ports.clock.set(null);
        if (isControllableRng(ports.rng)) ports.rng.reseed(null);
        return { ok: true, database };
      });

      scope.post('/clock', async (request, reply) => {
        const body = ClockBody.safeParse(request.body);
        if (!body.success) return badRequest(reply, body.error);
        if (!isControllableClock(ports.clock)) {
          return reply.code(501).send({ error: 'clock-not-controllable' });
        }
        if ('advanceMs' in body.data) ports.clock.advance(body.data.advanceMs);
        else ports.clock.set(body.data.now);
        return { now: ports.clock.now().toISOString() };
      });

      scope.post('/rng', async (request, reply) => {
        const body = RngBody.safeParse(request.body);
        if (!body.success) return badRequest(reply, body.error);
        if (!isControllableRng(ports.rng)) {
          return reply.code(501).send({ error: 'rng-not-controllable' });
        }
        ports.rng.reseed(body.data.seed);
        return { ok: true, seed: body.data.seed };
      });

      scope.get('/outbox', async (_request, reply) => {
        if (!isInMemoryMailer(ports.mailer)) {
          return reply.code(501).send({ error: 'mailer-not-in-memory' });
        }
        return ports.mailer.outbox();
      });

      scope.get('/events', async (request, reply) => {
        const query = EventsQuery.safeParse(request.query);
        if (!query.success) return badRequest(reply, query.error);
        return ports.events.recorded(query.data.type ? { type: query.data.type } : undefined);
      });
    },
    { prefix: TEST_API_PREFIX },
  );
};
