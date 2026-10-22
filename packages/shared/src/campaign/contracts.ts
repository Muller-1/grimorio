// Ponto de entrada próprio (`@grimorio/shared/campaign`): fica fora do pacote da ficha.

import { z } from '../zod';
import { CharacterDocumentSchema } from '../sheet/sections';

/**
 * Contratos da campanha (docs/plano-escala-e-campanha.md, seção 2).
 *
 * - **Ações** mudam o estado de jogo com valores relativos ("dano 7"), aplicadas no servidor uma
 *   depois da outra: duas pessoas mexendo na mesma ficha não geram conflito.
 * - **Propostas** são a cura que outro jogador oferece; só viram ação quando a dona aceita.
 * - O **resumo da mesa** é montado no servidor e só tem nome, classe, nível, CA, PV e condições.
 */

export const MAX_CAMPAIGNS_PER_USER = 10;
export const MAX_MEMBERS_PER_CAMPAIGN = 12;
export const MAX_PENDING_PROPOSALS = 10;
export const PROPOSAL_TTL_HOURS = 24;
export const INVITE_TTL_DAYS = 7;
export const MAX_ACTIONS_PER_REQUEST = 50;

/** "cond:poisoned", "cond:prone"… (a Exaustão tem a própria ação). */
const conditionKey = z
  .string()
  .max(40)
  .regex(/^cond:[a-z-]+$/);

/**
 * O que a mestre (ou a dona) pode aplicar pelo canal de ações. `set-condition` diz o estado
 * desejado em vez de "alternar": duas pessoas marcando Envenenado ao mesmo tempo não se anulam.
 */
export const GameActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('damage'),
    amount: z.number().int().min(1).max(9999),
    critical: z.boolean().optional(),
  }),
  z.object({ type: z.literal('heal'), amount: z.number().int().min(1).max(9999) }),
  z.object({ type: z.literal('set-temp-hp'), amount: z.number().int().min(0).max(9999) }),
  z.object({ type: z.literal('set-condition'), key: conditionKey, on: z.boolean() }),
  z.object({ type: z.literal('set-exhaustion'), level: z.number().int().min(0).max(6) }),
]);
export type GameAction = z.infer<typeof GameActionSchema>;

export const PostActionsBodySchema = z.object({
  actions: z
    .array(z.object({ actionId: z.uuid(), action: GameActionSchema }))
    .min(1)
    .max(MAX_ACTIONS_PER_REQUEST),
});
export type PostActionsBody = z.infer<typeof PostActionsBodySchema>;

export const ActionsResultSchema = z.object({
  document: CharacterDocumentSchema,
  /** Aplicadas agora. */
  applied: z.array(z.uuid()),
  /** Já tinham sido aplicadas (reenvio): nada mudou de novo. */
  duplicates: z.array(z.uuid()),
});
export type ActionsResult = z.infer<typeof ActionsResultSchema>;

export const ActorRoleSchema = z.enum(['owner', 'dm', 'player']);
export type ActorRole = z.infer<typeof ActorRoleSchema>;

export const CharacterEventSchema = z.object({
  actionId: z.uuid(),
  action: GameActionSchema,
  /** Versão da ficha depois desta ação. */
  version: z.number().int(),
  at: z.string(),
  actor: z.object({ name: z.string(), role: ActorRoleSchema }),
  /** Só quando veio de uma proposta aceita: quem aceitou. */
  approvedBy: z.string().optional(),
});
export type CharacterEvent = z.infer<typeof CharacterEventSchema>;

export const EventsResponseSchema = z.object({
  /** Versão atual da ficha no servidor. */
  version: z.number().int(),
  events: z.array(CharacterEventSchema),
});
export type EventsResponse = z.infer<typeof EventsResponseSchema>;

// ---------- campanhas ----------

export const CampaignRoleSchema = z.enum(['dm', 'player']);
export type CampaignRole = z.infer<typeof CampaignRoleSchema>;

const campaignName = z.string().trim().min(1).max(80);

export const CreateCampaignBodySchema = z.object({ id: z.uuid(), name: campaignName });
export type CreateCampaignBody = z.infer<typeof CreateCampaignBodySchema>;

export const CampaignSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  role: CampaignRoleSchema,
  members: z.number().int(),
  characters: z.number().int(),
});
export type CampaignSummary = z.infer<typeof CampaignSummarySchema>;

export const CampaignListSchema = z.object({ campaigns: z.array(CampaignSummarySchema) });

export const CampaignDetailSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  role: CampaignRoleSchema,
  members: z.array(z.object({ name: z.string(), role: CampaignRoleSchema, me: z.boolean() })),
  /** Só a mestre vê o convite. */
  invite: z.object({ code: z.string(), expiresAt: z.string() }).optional(),
});
export type CampaignDetail = z.infer<typeof CampaignDetailSchema>;

export const JoinCampaignBodySchema = z.object({ code: z.string().trim().min(8).max(64) });
export const CampaignCharacterBodySchema = z.object({ characterId: z.uuid() });

/** Campanha da ficha, para a ficha da conta saber se acompanha a mesa. */
export const CharacterCampaignSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  role: z.enum(['owner', 'dm', 'player']),
});
export type CharacterCampaign = z.infer<typeof CharacterCampaignSchema>;

// ---------- resumo da mesa ----------

/** Os seis campos que os outros jogadores veem (decidido em 22/10). Nada além disso. */
export const PARTY_FIELDS = ['name', 'className', 'level', 'ac', 'hp', 'conditions'] as const;

export const PartyMemberSchema = z.object({
  characterId: z.uuid(),
  /** Nome de quem joga com a ficha. */
  player: z.string(),
  mine: z.boolean(),
  version: z.number().int(),
  summary: z.object({
    name: z.string(),
    className: z.string(),
    level: z.number().int(),
    ac: z.number().int(),
    hp: z.object({ current: z.number().int(), max: z.number().int(), temp: z.number().int() }),
    /** "cond:poisoned"… e "cond:exhaustion:2". */
    conditions: z.array(z.string()),
  }),
});
export type PartyMember = z.infer<typeof PartyMemberSchema>;
export type PartySummary = PartyMember['summary'];

export const PartyResponseSchema = z.object({ party: z.array(PartyMemberSchema) });

// ---------- propostas de cura ----------

export const CreateProposalBodySchema = z.object({
  proposalId: z.uuid(),
  amount: z.number().int().min(1).max(999),
  note: z.string().trim().max(120).optional(),
});
export type CreateProposalBody = z.infer<typeof CreateProposalBodySchema>;

export const ProposalSchema = z.object({
  id: z.uuid(),
  proposer: z.string(),
  amount: z.number().int(),
  note: z.string().optional(),
  createdAt: z.string(),
  expiresAt: z.string(),
});
export type Proposal = z.infer<typeof ProposalSchema>;

export const ProposalListSchema = z.object({ proposals: z.array(ProposalSchema) });

/** GET /characters/:id/updates?after=N (dona e mestre). */
export const UpdatesResponseSchema = z.object({
  version: z.number().int(),
  campaign: CharacterCampaignSchema.nullable(),
  events: z.array(CharacterEventSchema),
  /** Muitos eventos atrás: vem só a ficha (o aparelho junta pela regra de seções). */
  truncated: z.boolean(),
  /** A ficha do servidor, quando a versão andou desde N. */
  document: CharacterDocumentSchema.optional(),
  proposals: z.array(ProposalSchema),
});
export type UpdatesResponse = z.infer<typeof UpdatesResponseSchema>;
