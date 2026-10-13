/**
 * Rotas de personagens (plano v2, 13). Todas exigem login.
 *   GET    /api/v1/characters        lista resumida (mais recentes primeiro)
 *   POST   /api/v1/characters        criar; o id vem do navegador (repetir não duplica)
 *   GET    /api/v1/characters/:id    ficha completa + versão + revisões das seções
 *   PATCH  /api/v1/characters/:id    salvar seções com `baseRevs` (409 em conflito)
 *   DELETE /api/v1/characters/:id    mover para a lixeira
 */
import { CreateCharacterBodySchema, PatchCharacterBodySchema } from '@grimorio/shared';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { PostgresDatabase } from '../../db/client';
import { requireUser } from '../auth/routes';
import { sendError } from '../http';
import { characterService } from './service';

const Params = z.object({ id: z.uuid() });

export const characterRoutes: FastifyPluginAsync = async (app) => {
  const service = characterService((app.db as PostgresDatabase).orm, app.ports);

  app.addHook('onSend', async (request, reply) => {
    if (request.url.startsWith('/api/v1/characters')) reply.header('cache-control', 'no-store');
  });

  app.get('/api/v1/characters', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    return { characters: await service.list(user.id) };
  });

  app.post('/api/v1/characters', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const body = CreateCharacterBodySchema.safeParse(request.body);
    if (!body.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'ficha inválida', body.error.issues);
    }
    const result = await service.create(user.id, body.data.id, body.data.sheet);
    switch (result.kind) {
      case 'created':
        return reply.code(201).send(result.document);
      case 'existing':
        return reply.code(200).send(result.document);
      case 'id-taken':
        return sendError(reply, 409, 'CONFLICT_ID', 'id já usado');
      case 'limit':
        return sendError(reply, 409, 'LIMIT_EXCEEDED', 'limite de personagens da conta');
    }
  });

  app.get('/api/v1/characters/:id', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const params = Params.safeParse(request.params);
    if (!params.success) return sendError(reply, 404, 'NOT_FOUND', 'personagem não encontrado');
    const document = await service.get(user.id, params.data.id);
    if (!document) return sendError(reply, 404, 'NOT_FOUND', 'personagem não encontrado');
    return document;
  });

  app.patch('/api/v1/characters/:id', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const params = Params.safeParse(request.params);
    if (!params.success) return sendError(reply, 404, 'NOT_FOUND', 'personagem não encontrado');
    const body = PatchCharacterBodySchema.safeParse(request.body);
    if (!body.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'pedido inválido', body.error.issues);
    }
    const result = await service.patch(user.id, params.data.id, body.data);
    switch (result.kind) {
      case 'saved':
        return result.document;
      case 'not-found':
        return sendError(reply, 404, 'NOT_FOUND', 'personagem não encontrado');
      case 'conflict':
        return sendError(reply, 409, 'CONFLICT_SECTION', 'seção alterada em outro aparelho', {
          conflicts: result.conflicts,
        });
      case 'invalid':
        return sendError(reply, 400, 'VALIDATION_ERROR', 'ficha inválida', result.issues);
    }
  });

  app.delete('/api/v1/characters/:id', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const params = Params.safeParse(request.params);
    if (!params.success) return sendError(reply, 404, 'NOT_FOUND', 'personagem não encontrado');
    const removed = await service.remove(user.id, params.data.id);
    if (!removed) return sendError(reply, 404, 'NOT_FOUND', 'personagem não encontrado');
    return reply.code(204).send();
  });
};
