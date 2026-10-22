/**
 * Rotas da campanha (docs/plano-escala-e-campanha.md, seção 2). Todas exigem login; campanha
 * ou ficha a que a pessoa não tem acesso responde 404.
 *
 *   GET    /api/v1/campaigns                          campanhas de que participo
 *   POST   /api/v1/campaigns                          criar (o id vem do navegador)
 *   POST   /api/v1/campaigns/join                     entrar pelo código do convite
 *   GET    /api/v1/campaigns/:id                      nome, membros e (mestre) o convite
 *   DELETE /api/v1/campaigns/:id                      mestre: encerrar
 *   POST   /api/v1/campaigns/:id/invite               mestre: novo código de convite
 *   DELETE /api/v1/campaigns/:id/members/me           jogador: sair (as fichas saem junto)
 *   POST   /api/v1/campaigns/:id/characters           pôr a própria ficha na mesa
 *   DELETE /api/v1/campaigns/:id/characters/:charId   dona ou mestre: tirar a ficha
 *   GET    /api/v1/campaigns/:id/party                resumo da mesa (só os seis campos)
 *
 *   POST   /api/v1/characters/:id/actions             dona ou mestre: ações de jogo
 *   GET    /api/v1/characters/:id/updates?after=N     o que mudou depois da versão N
 *   POST   /api/v1/characters/:id/proposals           outro jogador da mesa: propor cura
 *   POST   /api/v1/characters/:id/proposals/:pid/accept | /reject   dona: decidir
 */
import {
  CampaignCharacterBodySchema,
  CreateCampaignBodySchema,
  CreateProposalBodySchema,
  JoinCampaignBodySchema,
  PostActionsBodySchema,
} from '@grimorio/shared/campaign';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { PostgresDatabase } from '../../db/client';
import { requireUser } from '../auth/routes';
import { sendError } from '../http';
import { playService } from './play';
import { campaignService } from './service';

const IdParams = z.object({ id: z.uuid() });
const CharacterParams = z.object({ id: z.uuid(), characterId: z.uuid() });
const ProposalParams = z.object({ id: z.uuid(), proposalId: z.uuid() });
const UpdatesQuery = z.object({ after: z.coerce.number().int().min(0).default(0) });

const notFound = (reply: FastifyReply, what = 'campanha') =>
  sendError(reply, 404, 'NOT_FOUND', `${what} não encontrada`);

/** Valida com o esquema; inválido responde na hora (404 para ids, 400 para o corpo). */
function parse<T>(
  schema: z.ZodType<T>,
  value: unknown,
  reply: FastifyReply,
  status: 400 | 404,
): T | null {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  void (status === 404
    ? notFound(reply, 'recurso')
    : sendError(reply, 400, 'VALIDATION_ERROR', 'pedido inválido', result.error.issues));
  return null;
}

export const campaignRoutes: FastifyPluginAsync = async (app) => {
  const orm = (app.db as PostgresDatabase).orm;
  const campaignsSvc = campaignService(orm, app.ports);
  const play = playService(orm, app.ports);

  app.addHook('onSend', async (request: FastifyRequest, reply) => {
    if (request.url.startsWith('/api/v1/campaigns')) reply.header('cache-control', 'no-store');
  });

  // ---------- campanhas ----------

  app.get('/api/v1/campaigns', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    return { campaigns: await campaignsSvc.list(user.id) };
  });

  app.post('/api/v1/campaigns', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const body = parse(CreateCampaignBodySchema, request.body, reply, 400);
    if (!body) return reply;
    const result = await campaignsSvc.create(user.id, body.id, body.name);
    switch (result.kind) {
      case 'created':
        return reply.code(201).send(result.campaign);
      case 'existing':
        return result.campaign;
      case 'id-taken':
        return sendError(reply, 409, 'CONFLICT_ID', 'id já usado');
      case 'limit':
        return sendError(reply, 409, 'LIMIT_EXCEEDED', 'limite de campanhas da conta');
    }
  });

  app.post('/api/v1/campaigns/join', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const body = parse(JoinCampaignBodySchema, request.body, reply, 400);
    if (!body) return reply;
    const result = await campaignsSvc.join(user.id, body.code);
    if (result.kind === 'not-found') return notFound(reply, 'convite');
    if (result.kind === 'full') return sendError(reply, 409, 'LIMIT_EXCEEDED', 'mesa cheia');
    return reply.code(result.kind === 'joined' ? 201 : 200).send({ campaignId: result.campaignId });
  });

  app.get('/api/v1/campaigns/:id', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const params = parse(IdParams, request.params, reply, 404);
    if (!params) return reply;
    return (await campaignsSvc.detail(user.id, params.id)) ?? notFound(reply);
  });

  app.delete('/api/v1/campaigns/:id', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const params = parse(IdParams, request.params, reply, 404);
    if (!params) return reply;
    if (!(await campaignsSvc.end(user.id, params.id))) return notFound(reply);
    return reply.code(204).send();
  });

  app.post('/api/v1/campaigns/:id/invite', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const params = parse(IdParams, request.params, reply, 404);
    if (!params) return reply;
    return (await campaignsSvc.renewInvite(user.id, params.id)) ?? notFound(reply);
  });

  app.delete('/api/v1/campaigns/:id/members/me', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const params = parse(IdParams, request.params, reply, 404);
    if (!params) return reply;
    const result = await campaignsSvc.leave(user.id, params.id);
    if (result === 'not-found') return notFound(reply);
    if (result === 'dm') {
      return sendError(reply, 403, 'FORBIDDEN', 'a mestre encerra a campanha em vez de sair');
    }
    return reply.code(204).send();
  });

  app.post('/api/v1/campaigns/:id/characters', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const params = parse(IdParams, request.params, reply, 404);
    if (!params) return reply;
    const body = parse(CampaignCharacterBodySchema, request.body, reply, 400);
    if (!body) return reply;
    const result = await campaignsSvc.addCharacter(user.id, params.id, body.characterId);
    if (result === 'not-found') return notFound(reply);
    if (result === 'other-campaign') {
      return sendError(reply, 409, 'CONFLICT_ID', 'a ficha já está em outra campanha');
    }
    return reply.code(result === 'added' ? 201 : 200).send({ characterId: body.characterId });
  });

  app.delete('/api/v1/campaigns/:id/characters/:characterId', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const params = parse(CharacterParams, request.params, reply, 404);
    if (!params) return reply;
    if (!(await campaignsSvc.removeCharacter(user.id, params.id, params.characterId))) {
      return notFound(reply);
    }
    return reply.code(204).send();
  });

  app.get('/api/v1/campaigns/:id/party', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const params = parse(IdParams, request.params, reply, 404);
    if (!params) return reply;
    const party = await campaignsSvc.party(user.id, params.id);
    return party ? { party } : notFound(reply);
  });

  // ---------- jogo na mesa (ficha) ----------

  app.post('/api/v1/characters/:id/actions', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const params = parse(IdParams, request.params, reply, 404);
    if (!params) return reply;
    const body = parse(PostActionsBodySchema, request.body, reply, 400);
    if (!body) return reply;
    const result = await play.applyActions(user.id, params.id, body.actions);
    if (result.kind === 'not-found') return notFound(reply, 'ficha');
    const { kind: _kind, ...rest } = result;
    return rest;
  });

  app.get('/api/v1/characters/:id/updates', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const params = parse(IdParams, request.params, reply, 404);
    if (!params) return reply;
    const query = parse(UpdatesQuery, request.query, reply, 400);
    if (!query) return reply;
    const result = await play.updates(user.id, params.id, query.after);
    if (result.kind === 'not-found') return notFound(reply, 'ficha');
    const { kind: _kind, ...rest } = result;
    return rest;
  });

  app.post('/api/v1/characters/:id/proposals', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return reply;
    const params = parse(IdParams, request.params, reply, 404);
    if (!params) return reply;
    const body = parse(CreateProposalBodySchema, request.body, reply, 400);
    if (!body) return reply;
    const result = await play.propose(user.id, params.id, body);
    if (result === 'not-found') return notFound(reply, 'ficha');
    if (result === 'limit') {
      return sendError(reply, 409, 'LIMIT_EXCEEDED', 'muitas propostas esperando a dona');
    }
    return reply.code(result === 'created' ? 201 : 200).send({ proposalId: body.proposalId });
  });

  for (const decision of ['accept', 'reject'] as const) {
    app.post(`/api/v1/characters/:id/proposals/:proposalId/${decision}`, async (request, reply) => {
      const user = await requireUser(request, reply);
      if (!user) return reply;
      const params = parse(ProposalParams, request.params, reply, 404);
      if (!params) return reply;
      const result = await play.decide(
        user.id,
        params.id,
        params.proposalId,
        decision === 'accept',
      );
      if (result.kind === 'not-found') return notFound(reply, 'proposta');
      if (result.kind === 'rejected') return reply.code(204).send();
      return { document: result.document, duplicate: result.duplicate };
    });
  }
};
