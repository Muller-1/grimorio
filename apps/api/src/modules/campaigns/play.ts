/**
 * Jogo na mesa (docs/plano-escala-e-campanha.md, seção 2.2): o canal de ações, o que mudou
 * depois da versão N e as propostas de cura.
 *
 * Concorrência: toda escrita trava a linha da ficha (`FOR UPDATE`) antes de ler. Uma ficha é
 * uma fila; fichas diferentes não se travam. Cada ação traz um id gerado no aparelho e a tabela
 * de eventos não aceita o mesmo id duas vezes na mesma ficha: reenviar não aplica de novo.
 */
import { normalizeSheet } from '@grimorio/rules';
import { applyGameAction } from '@grimorio/rules/campaign';
import {
  sameSection,
  sectionOf,
  SHEET_SECTIONS,
  type CharacterDocument,
  type LocalSheet,
  type SectionRevs,
  type SheetSection,
} from '@grimorio/shared';
import {
  GameActionSchema,
  MAX_PENDING_PROPOSALS,
  PROPOSAL_TTL_HOURS,
  type ActorRole,
  type CharacterCampaign,
  type CharacterEvent,
  type CreateProposalBody,
  type GameAction,
  type Proposal,
} from '@grimorio/shared/campaign';
import { aliasedTable, and, asc, eq, gt, inArray, isNull } from 'drizzle-orm';
import type { Orm } from '../../db/client';
import {
  actionProposals,
  campaignCharacters,
  campaignMembers,
  campaigns,
  characterEvents,
  characters,
  users,
  type CharacterRow,
  type ProposalRow,
} from '../../db/schema';
import type { Ports } from '../../ports';
import { revsOf, sheetOf, summaryColumns, toDocument } from '../characters/service';
import { expireProposals, type Db } from './service';

const HOUR_MS = 60 * 60 * 1000;
/** Mais que isso atrás: o aparelho recebe a ficha inteira em vez da lista de eventos. */
const MAX_EVENTS = 200;

/** Quem a pessoa é para esta ficha. */
interface Access {
  role: ActorRole;
  campaign: CharacterCampaign | null;
}

/** Dona, mestre ou jogador da mesma mesa (ou `null`: a ficha "não existe" para ela). */
async function accessTo(db: Db, row: CharacterRow, userId: string): Promise<Access | null> {
  const [link] = await db
    .select({ id: campaigns.id, name: campaigns.name })
    .from(campaignCharacters)
    .innerJoin(campaigns, eq(campaigns.id, campaignCharacters.campaignId))
    .where(and(eq(campaignCharacters.characterId, row.id), isNull(campaigns.archivedAt)));
  if (row.ownerId === userId) {
    return { role: 'owner', campaign: link ? { ...link, role: 'owner' } : null };
  }
  if (!link) return null;
  const [member] = await db
    .select({ role: campaignMembers.role })
    .from(campaignMembers)
    .where(and(eq(campaignMembers.campaignId, link.id), eq(campaignMembers.userId, userId)));
  if (!member) return null;
  return { role: member.role, campaign: { ...link, role: member.role } };
}

const activeCharacter = (id: string) => and(eq(characters.id, id), isNull(characters.deletedAt));

export interface PendingAction {
  actionId: string;
  action: GameAction;
}

export type ActionsOutcome =
  | { kind: 'applied'; document: CharacterDocument; applied: string[]; duplicates: string[] }
  | { kind: 'not-found' };

export type UpdatesOutcome =
  | {
      kind: 'ok';
      version: number;
      campaign: CharacterCampaign | null;
      events: CharacterEvent[];
      truncated: boolean;
      document?: CharacterDocument;
      proposals: Proposal[];
    }
  | { kind: 'not-found' };

export type ProposalOutcome = 'created' | 'existing' | 'limit' | 'not-found';
export type DecisionOutcome =
  | { kind: 'accepted'; document: CharacterDocument; duplicate: boolean }
  | { kind: 'rejected' }
  | { kind: 'not-found' };

function toProposal(row: ProposalRow, proposer: string): Proposal {
  const action = GameActionSchema.parse(row.action);
  return {
    id: row.id,
    proposer,
    amount: action.type === 'heal' ? action.amount : 0,
    ...(row.note ? { note: row.note } : {}),
    createdAt: row.createdAt.toISOString(),
    expiresAt: new Date(row.createdAt.getTime() + PROPOSAL_TTL_HOURS * HOUR_MS).toISOString(),
  };
}

export function playService(orm: Orm, ports: Ports) {
  const proposalCutoff = () => new Date(ports.clock.now().getTime() - PROPOSAL_TTL_HOURS * HOUR_MS);

  /**
   * Aplica ações numa ficha já travada e grava tudo de uma vez: a ficha (uma versão nova, as
   * revisões das seções que mudaram) e um evento por ação nova.
   */
  async function applyLocked(
    tx: Db,
    row: CharacterRow,
    items: PendingAction[],
    actor: { id: string; role: ActorRole; approvedBy?: string },
  ) {
    const ids = items.map((i) => i.actionId);
    const seen = new Set(
      (
        await tx
          .select({ actionId: characterEvents.actionId })
          .from(characterEvents)
          .where(
            and(eq(characterEvents.characterId, row.id), inArray(characterEvents.actionId, ids)),
          )
      ).map((e) => e.actionId),
    );
    const now = ports.clock.now();
    const at = now.toISOString();
    let sheet: LocalSheet = sheetOf(row);
    const before = sheet;
    const applied: PendingAction[] = [];
    const duplicates: string[] = [];
    for (const item of items) {
      if (seen.has(item.actionId)) {
        duplicates.push(item.actionId);
        continue;
      }
      seen.add(item.actionId); // o mesmo id duas vezes no mesmo pedido: vale uma
      sheet = applyGameAction(sheet, item.action, { now: at, actionId: item.actionId }).sheet;
      applied.push(item);
    }
    if (applied.length === 0) {
      return { document: toDocument(row), applied: [], duplicates };
    }
    sheet = normalizeSheet(sheet).sheet;
    const revs: SectionRevs = { ...revsOf(row) };
    const changed: SheetSection[] = SHEET_SECTIONS.filter(
      (s) => !sameSection(sectionOf(before, s), sectionOf(sheet, s)),
    );
    for (const section of changed) revs[section] = (revs[section] ?? 0) + 1;
    const version = row.version + 1;
    const [updated] = await tx
      .update(characters)
      .set({ data: sheet, sectionRevs: revs, version, updatedAt: now, ...summaryColumns(sheet) })
      .where(eq(characters.id, row.id))
      .returning();
    await tx.insert(characterEvents).values(
      applied.map((item) => ({
        id: ports.ids.uuid(),
        characterId: row.id,
        actionId: item.actionId,
        actorId: actor.id,
        actorRole: actor.role,
        approvedBy: actor.approvedBy ?? null,
        action: item.action,
        version,
        createdAt: now,
      })),
    );
    return { document: toDocument(updated!), applied: applied.map((i) => i.actionId), duplicates };
  }

  async function pendingProposals(id: string): Promise<Proposal[]> {
    const rows = await orm
      .select({ proposal: actionProposals, proposer: users.displayName })
      .from(actionProposals)
      .innerJoin(users, eq(users.id, actionProposals.proposerId))
      .where(
        and(
          eq(actionProposals.characterId, id),
          eq(actionProposals.status, 'pending'),
          gt(actionProposals.createdAt, proposalCutoff()),
        ),
      )
      .orderBy(asc(actionProposals.createdAt));
    return rows.map(({ proposal, proposer }) => toProposal(proposal, proposer));
  }

  const lockCharacter = async (tx: Db, id: string) =>
    (await tx.select().from(characters).where(activeCharacter(id)).for('update'))[0];

  return {
    pendingProposals,

    /** Canal de ações: a dona e a mestre da campanha da ficha. */
    async applyActions(
      userId: string,
      id: string,
      items: PendingAction[],
    ): Promise<ActionsOutcome> {
      return orm.transaction(async (tx) => {
        const row = await lockCharacter(tx, id);
        if (!row) return { kind: 'not-found' };
        const access = await accessTo(tx, row, userId);
        if (!access || access.role === 'player') return { kind: 'not-found' };
        return {
          kind: 'applied',
          ...(await applyLocked(tx, row, items, { id: userId, role: access.role })),
        };
      });
    },

    /**
     * O que mudou depois da versão `after`: os eventos (para o aparelho reaplicar sobre o que
     * está na tela), a ficha do servidor quando a versão andou, e as propostas pendentes (dona).
     */
    async updates(userId: string, id: string, after: number): Promise<UpdatesOutcome> {
      const [row] = await orm.select().from(characters).where(activeCharacter(id));
      if (!row) return { kind: 'not-found' };
      const access = await accessTo(orm, row, userId);
      if (!access || access.role === 'player') return { kind: 'not-found' };

      let events: CharacterEvent[] = [];
      let truncated = false;
      if (row.version > after) {
        const actor = aliasedTable(users, 'actor');
        const approver = aliasedTable(users, 'approver');
        const rows = await orm
          .select({
            event: characterEvents,
            actorName: actor.displayName,
            approverName: approver.displayName,
          })
          .from(characterEvents)
          .leftJoin(actor, eq(actor.id, characterEvents.actorId))
          .leftJoin(approver, eq(approver.id, characterEvents.approvedBy))
          .where(and(eq(characterEvents.characterId, id), gt(characterEvents.version, after)))
          .orderBy(
            asc(characterEvents.version),
            asc(characterEvents.createdAt),
            asc(characterEvents.id),
          )
          .limit(MAX_EVENTS + 1);
        truncated = rows.length > MAX_EVENTS;
        if (!truncated) {
          events = rows.map(({ event, actorName, approverName }) => ({
            actionId: event.actionId,
            action: GameActionSchema.parse(event.action),
            version: event.version,
            at: event.createdAt.toISOString(),
            actor: { name: actorName ?? '', role: event.actorRole },
            ...(approverName ? { approvedBy: approverName } : {}),
          }));
        }
      }
      return {
        kind: 'ok',
        version: row.version,
        campaign: access.campaign,
        events,
        truncated,
        ...(row.version !== after ? { document: toDocument(row) } : {}),
        proposals: access.role === 'owner' ? await pendingProposals(id) : [],
      };
    },

    /** Outro jogador da mesma mesa propõe uma cura. A ficha não muda até a dona aceitar. */
    async propose(userId: string, id: string, body: CreateProposalBody): Promise<ProposalOutcome> {
      return orm.transaction(async (tx) => {
        const row = await lockCharacter(tx, id);
        if (!row) return 'not-found';
        const access = await accessTo(tx, row, userId);
        if (!access || access.role !== 'player') return 'not-found';
        const [existing] = await tx
          .select()
          .from(actionProposals)
          .where(eq(actionProposals.id, body.proposalId));
        if (existing) {
          return existing.proposerId === userId && existing.characterId === id
            ? 'existing'
            : 'not-found';
        }
        const pending = await tx.$count(
          actionProposals,
          and(
            eq(actionProposals.characterId, id),
            eq(actionProposals.status, 'pending'),
            gt(actionProposals.createdAt, proposalCutoff()),
          ),
        );
        if (pending >= MAX_PENDING_PROPOSALS) return 'limit';
        const action: GameAction = { type: 'heal', amount: body.amount };
        await tx.insert(actionProposals).values({
          id: body.proposalId,
          characterId: id,
          proposerId: userId,
          action,
          note: body.note || null,
          status: 'pending',
          createdAt: ports.clock.now(),
        });
        return 'created';
      });
    },

    /**
     * A dona aceita ou recusa. Aceitar vira uma ação normal com o id da proposta: dois cliques
     * (ou duas abas) aplicam uma vez só.
     */
    async decide(
      userId: string,
      id: string,
      proposalId: string,
      accept: boolean,
    ): Promise<DecisionOutcome> {
      return orm.transaction(async (tx) => {
        const row = await lockCharacter(tx, id);
        if (!row || row.ownerId !== userId) return { kind: 'not-found' };
        const [proposal] = await tx
          .select()
          .from(actionProposals)
          .where(and(eq(actionProposals.id, proposalId), eq(actionProposals.characterId, id)))
          .for('update');
        if (!proposal) return { kind: 'not-found' };
        if (proposal.status === 'accepted') {
          return accept
            ? { kind: 'accepted', document: toDocument(row), duplicate: true }
            : { kind: 'not-found' };
        }
        if (proposal.status !== 'pending') return { kind: 'not-found' };
        const now = ports.clock.now();
        const stillInCampaign = (await accessTo(tx, row, proposal.proposerId))?.role === 'player';
        if (proposal.createdAt <= proposalCutoff() || !stillInCampaign) {
          await expireProposals(tx, [id], now);
          return { kind: 'not-found' };
        }
        if (!accept) {
          await tx
            .update(actionProposals)
            .set({ status: 'rejected', decidedAt: now, decidedBy: userId })
            .where(eq(actionProposals.id, proposalId));
          return { kind: 'rejected' };
        }
        const result = await applyLocked(
          tx,
          row,
          [{ actionId: proposal.id, action: GameActionSchema.parse(proposal.action) }],
          { id: proposal.proposerId, role: 'player', approvedBy: userId },
        );
        await tx
          .update(actionProposals)
          .set({ status: 'accepted', decidedAt: now, decidedBy: userId })
          .where(eq(actionProposals.id, proposalId));
        return {
          kind: 'accepted',
          document: result.document,
          duplicate: result.applied.length === 0,
        };
      });
    },
  };
}
