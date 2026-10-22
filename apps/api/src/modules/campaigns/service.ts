/**
 * Campanhas (docs/plano-escala-e-campanha.md, seção 2.3).
 *
 * - Quem pode o quê é conferido aqui, dentro das consultas: campanha de que a pessoa não
 *   participa é "não encontrada" (404), como as fichas.
 * - O resumo da mesa sai pronto do servidor, só com os seis campos decididos; o resto da ficha
 *   de outro jogador nunca sai daqui.
 */
import { partySummary } from '@grimorio/rules/campaign';
import {
  INVITE_TTL_DAYS,
  MAX_CAMPAIGNS_PER_USER,
  MAX_MEMBERS_PER_CAMPAIGN,
  type CampaignDetail,
  type CampaignRole,
  type CampaignSummary,
  type PartyMember,
} from '@grimorio/shared/campaign';
import { and, asc, count, eq, gt, inArray, isNull, sql } from 'drizzle-orm';
import type { Orm } from '../../db/client';
import {
  actionProposals,
  campaignCharacters,
  campaignMembers,
  campaigns,
  characters,
  users,
} from '../../db/schema';
import type { Ports } from '../../ports';
import { sheetOf } from '../characters/service';

export type Tx = Parameters<Parameters<Orm['transaction']>[0]>[0];
export type Db = Orm | Tx;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Papel da pessoa numa campanha ativa (ou `null`: não participa ou a campanha acabou). */
export async function roleIn(
  db: Db,
  campaignId: string,
  userId: string,
): Promise<CampaignRole | null> {
  const [row] = await db
    .select({ role: campaignMembers.role })
    .from(campaignMembers)
    .innerJoin(campaigns, eq(campaigns.id, campaignMembers.campaignId))
    .where(
      and(
        eq(campaignMembers.campaignId, campaignId),
        eq(campaignMembers.userId, userId),
        isNull(campaigns.archivedAt),
      ),
    );
  return row?.role ?? null;
}

/** Ao tirar uma ficha da campanha, as curas que esperavam a dona deixam de valer. */
export async function expireProposals(db: Db, characterIds: string[], now: Date) {
  if (characterIds.length === 0) return;
  await db
    .update(actionProposals)
    .set({ status: 'expired', decidedAt: now })
    .where(
      and(
        inArray(actionProposals.characterId, characterIds),
        eq(actionProposals.status, 'pending'),
      ),
    );
}

export type CreateCampaignResult =
  | { kind: 'created' | 'existing'; campaign: CampaignDetail }
  | { kind: 'id-taken' }
  | { kind: 'limit' };

export type JoinResult =
  { kind: 'joined' | 'already'; campaignId: string } | { kind: 'not-found' } | { kind: 'full' };

export type AddCharacterResult = 'added' | 'already' | 'other-campaign' | 'not-found';

export function campaignService(orm: Orm, ports: Ports) {
  const newInvite = () => ({
    // Código aleatório (UUID do gerador de ids, sem traços): 32 caracteres hexadecimais.
    inviteCode: ports.ids.uuid().replace(/-/g, ''),
    inviteExpiresAt: new Date(ports.clock.now().getTime() + INVITE_TTL_DAYS * DAY_MS),
  });

  async function detail(db: Db, userId: string, id: string): Promise<CampaignDetail | null> {
    const role = await roleIn(db, id, userId);
    if (!role) return null;
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    if (!campaign) return null;
    const members = await db
      .select({
        userId: campaignMembers.userId,
        role: campaignMembers.role,
        name: users.displayName,
      })
      .from(campaignMembers)
      .innerJoin(users, eq(users.id, campaignMembers.userId))
      .where(eq(campaignMembers.campaignId, id))
      // Na mesma hora (relógio parado nos testes), desempata pela ordem de criação da conta.
      .orderBy(asc(campaignMembers.joinedAt), asc(users.createdAt), asc(users.id));
    return {
      id: campaign.id,
      name: campaign.name,
      role,
      members: members.map((m) => ({ name: m.name, role: m.role, me: m.userId === userId })),
      ...(role === 'dm'
        ? {
            invite: {
              code: campaign.inviteCode,
              expiresAt: campaign.inviteExpiresAt.toISOString(),
            },
          }
        : {}),
    };
  }

  return {
    detail: (userId: string, id: string) => detail(orm, userId, id),

    async create(userId: string, id: string, name: string): Promise<CreateCampaignResult> {
      return orm.transaction(async (tx) => {
        const [existing] = await tx.select().from(campaigns).where(eq(campaigns.id, id));
        if (existing) {
          if (existing.ownerId !== userId || existing.archivedAt) return { kind: 'id-taken' };
          return { kind: 'existing', campaign: (await detail(tx, userId, id))! };
        }
        // Trava as campanhas da pessoa para o limite não "furar" com pedidos simultâneos.
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`campaigns:${userId}`}))`);
        const owned = await tx.$count(
          campaigns,
          and(eq(campaigns.ownerId, userId), isNull(campaigns.archivedAt)),
        );
        if (owned >= MAX_CAMPAIGNS_PER_USER) return { kind: 'limit' };
        const now = ports.clock.now();
        await tx
          .insert(campaigns)
          .values({ id, ownerId: userId, name, createdAt: now, updatedAt: now, ...newInvite() });
        await tx
          .insert(campaignMembers)
          .values({ campaignId: id, userId, role: 'dm', joinedAt: now });
        return { kind: 'created', campaign: (await detail(tx, userId, id))! };
      });
    },

    async list(userId: string): Promise<CampaignSummary[]> {
      const mine = await orm
        .select({ id: campaigns.id, name: campaigns.name, role: campaignMembers.role })
        .from(campaignMembers)
        .innerJoin(campaigns, eq(campaigns.id, campaignMembers.campaignId))
        .where(and(eq(campaignMembers.userId, userId), isNull(campaigns.archivedAt)))
        .orderBy(asc(campaigns.createdAt));
      if (mine.length === 0) return [];
      const ids = mine.map((c) => c.id);
      const memberCounts = await orm
        .select({ id: campaignMembers.campaignId, n: count() })
        .from(campaignMembers)
        .where(inArray(campaignMembers.campaignId, ids))
        .groupBy(campaignMembers.campaignId);
      const characterCounts = await orm
        .select({ id: campaignCharacters.campaignId, n: count() })
        .from(campaignCharacters)
        .innerJoin(characters, eq(characters.id, campaignCharacters.characterId))
        .where(and(inArray(campaignCharacters.campaignId, ids), isNull(characters.deletedAt)))
        .groupBy(campaignCharacters.campaignId);
      const countOf = (rows: { id: string; n: number }[], id: string) =>
        rows.find((r) => r.id === id)?.n ?? 0;
      return mine.map((c) => ({
        id: c.id,
        name: c.name,
        role: c.role,
        members: countOf(memberCounts, c.id),
        characters: countOf(characterCounts, c.id),
      }));
    },

    /** Só a mestre: troca o código (o link antigo deixa de funcionar) e renova a validade. */
    async renewInvite(userId: string, id: string): Promise<CampaignDetail | null> {
      if ((await roleIn(orm, id, userId)) !== 'dm') return null;
      await orm
        .update(campaigns)
        .set({ ...newInvite(), updatedAt: ports.clock.now() })
        .where(eq(campaigns.id, id));
      return detail(orm, userId, id);
    },

    async join(userId: string, code: string): Promise<JoinResult> {
      return orm.transaction(async (tx) => {
        const [campaign] = await tx
          .select()
          .from(campaigns)
          .where(
            and(
              eq(campaigns.inviteCode, code),
              isNull(campaigns.archivedAt),
              gt(campaigns.inviteExpiresAt, ports.clock.now()),
            ),
          )
          .for('update');
        if (!campaign) return { kind: 'not-found' };
        if (await roleIn(tx, campaign.id, userId)) {
          return { kind: 'already', campaignId: campaign.id };
        }
        const members = await tx.$count(
          campaignMembers,
          eq(campaignMembers.campaignId, campaign.id),
        );
        if (members >= MAX_MEMBERS_PER_CAMPAIGN) return { kind: 'full' };
        await tx
          .insert(campaignMembers)
          .values({ campaignId: campaign.id, userId, role: 'player', joinedAt: ports.clock.now() })
          .onConflictDoNothing();
        return { kind: 'joined', campaignId: campaign.id };
      });
    },

    /**
     * Sair da campanha (jogador): as fichas da pessoa saem junto. A mestre não sai; encerra a
     * campanha (`end`).
     */
    async leave(userId: string, id: string): Promise<'left' | 'dm' | 'not-found'> {
      return orm.transaction(async (tx) => {
        const role = await roleIn(tx, id, userId);
        if (!role) return 'not-found';
        if (role === 'dm') return 'dm';
        const mine = await tx
          .select({ id: campaignCharacters.characterId })
          .from(campaignCharacters)
          .innerJoin(characters, eq(characters.id, campaignCharacters.characterId))
          .where(and(eq(campaignCharacters.campaignId, id), eq(characters.ownerId, userId)));
        const ids = mine.map((c) => c.id);
        if (ids.length) {
          await tx.delete(campaignCharacters).where(inArray(campaignCharacters.characterId, ids));
          await expireProposals(tx, ids, ports.clock.now());
        }
        await tx
          .delete(campaignMembers)
          .where(and(eq(campaignMembers.campaignId, id), eq(campaignMembers.userId, userId)));
        return 'left';
      });
    },

    /** Só a mestre: encerra a campanha. As fichas ficam livres para outra mesa. */
    async end(userId: string, id: string): Promise<boolean> {
      return orm.transaction(async (tx) => {
        if ((await roleIn(tx, id, userId)) !== 'dm') return false;
        const linked = await tx
          .select({ id: campaignCharacters.characterId })
          .from(campaignCharacters)
          .where(eq(campaignCharacters.campaignId, id));
        await expireProposals(
          tx,
          linked.map((c) => c.id),
          ports.clock.now(),
        );
        await tx.delete(campaignCharacters).where(eq(campaignCharacters.campaignId, id));
        await tx
          .update(campaigns)
          .set({ archivedAt: ports.clock.now() })
          .where(eq(campaigns.id, id));
        return true;
      });
    },

    /** A pessoa põe a PRÓPRIA ficha na mesa. Uma ficha fica em uma campanha só. */
    async addCharacter(
      userId: string,
      id: string,
      characterId: string,
    ): Promise<AddCharacterResult> {
      return orm.transaction(async (tx) => {
        if (!(await roleIn(tx, id, userId))) return 'not-found';
        const [character] = await tx
          .select({ id: characters.id })
          .from(characters)
          .where(
            and(
              eq(characters.id, characterId),
              eq(characters.ownerId, userId),
              isNull(characters.deletedAt),
            ),
          )
          .for('update');
        if (!character) return 'not-found';
        const [link] = await tx
          .select()
          .from(campaignCharacters)
          .where(eq(campaignCharacters.characterId, characterId));
        if (link) return link.campaignId === id ? 'already' : 'other-campaign';
        await tx
          .insert(campaignCharacters)
          .values({ campaignId: id, characterId, addedAt: ports.clock.now() });
        return 'added';
      });
    },

    /** Tirar uma ficha da mesa: a dona ou a mestre. */
    async removeCharacter(userId: string, id: string, characterId: string): Promise<boolean> {
      return orm.transaction(async (tx) => {
        const role = await roleIn(tx, id, userId);
        if (!role) return false;
        const [link] = await tx
          .select({ ownerId: characters.ownerId })
          .from(campaignCharacters)
          .innerJoin(characters, eq(characters.id, campaignCharacters.characterId))
          .where(
            and(
              eq(campaignCharacters.campaignId, id),
              eq(campaignCharacters.characterId, characterId),
            ),
          );
        if (!link || (role !== 'dm' && link.ownerId !== userId)) return false;
        await tx.delete(campaignCharacters).where(eq(campaignCharacters.characterId, characterId));
        await expireProposals(tx, [characterId], ports.clock.now());
        return true;
      });
    },

    /** O resumo da mesa: todos os membros veem o mesmo, só os seis campos de cada ficha. */
    async party(userId: string, id: string): Promise<PartyMember[] | null> {
      if (!(await roleIn(orm, id, userId))) return null;
      const rows = await orm
        .select({ character: characters, player: users.displayName })
        .from(campaignCharacters)
        .innerJoin(characters, eq(characters.id, campaignCharacters.characterId))
        .innerJoin(users, eq(users.id, characters.ownerId))
        .where(and(eq(campaignCharacters.campaignId, id), isNull(characters.deletedAt)))
        .orderBy(asc(campaignCharacters.addedAt), asc(characters.createdAt), asc(characters.id));
      return rows.map(({ character, player }) => ({
        characterId: character.id,
        player,
        mine: character.ownerId === userId,
        version: character.version,
        summary: partySummary(sheetOf(character)),
      }));
    },
  };
}

export type CampaignService = ReturnType<typeof campaignService>;
