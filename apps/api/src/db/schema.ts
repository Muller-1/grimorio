/**
 * Esquema do banco (plano v2, 11.2). Mudou algo aqui? Gere a migração:
 *   pnpm --filter @grimorio/api db:generate
 * Migrações só ADICIONAM (plano v2, 17: "expandir e contrair").
 *
 * `users`, `sessions`, `accounts` e `verifications` seguem o formato que a biblioteca de login
 * (Better Auth, ADR-008) espera. Os nomes das propriedades (`emailVerified`, `userId`...) são os
 * da biblioteca; os nomes das colunas seguem o nosso padrão (snake_case).
 */
import type { SheetSection } from '@grimorio/shared';
import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();

export const users = pgTable(
  'users',
  {
    /** Gerado pela aplicação (porta IdGenerator), não pelo banco. */
    id: uuid('id').primaryKey(),
    email: text('email').notNull(),
    /** "name" na biblioteca de login. Nome vindo do Google é cortado em 60 caracteres. */
    displayName: varchar('display_name', { length: 60 }).notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    /** Foto do perfil (endereço do Google). Nunca guardamos a imagem em si. */
    image: text('image'),
    /** Conta canário do monitor B14 (plano v2, 15.10): fora das métricas. */
    isSynthetic: boolean('is_synthetic').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    /** Exclusão lógica: a conta some da lista e é apagada de vez depois do prazo. */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    // Índice da Etapa 9 (e-mail único entre contas ativas). Fica até a próxima "contração".
    uniqueIndex('users_email_active_uq')
      .on(sql`lower(${t.email})`)
      .where(sql`${t.deletedAt} IS NULL`),
    // ADR-007, achado 2: a biblioteca de login exige e-mail único para sempre. Ao excluir a
    // conta, o e-mail é apagado (trocado por um valor sem sentido) em vez de ficar guardado.
    uniqueIndex('users_email_uq').on(sql`lower(${t.email})`),
  ],
);

/** Sessões abertas (uma por navegador/aparelho). O cookie guarda só o `token`. */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('sessions_token_uq').on(t.token), index('sessions_user_idx').on(t.userId)],
);

/**
 * Jeitos de entrar ligados a um usuário (hoje só o Google). `accountId` é o id da pessoa no
 * Google ("sub"). Os tokens do Google não são guardados (ADR-008): não usamos nenhuma API dele.
 */
export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerId: text('provider_id').notNull(),
    accountId: text('account_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    /** Só existiria com login por senha, que não está ligado. */
    password: text('password'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('accounts_provider_account_uq').on(t.providerId, t.accountId),
    index('accounts_user_idx').on(t.userId),
  ],
);

/** Valores temporários da biblioteca de login (ex.: o "state" do retorno do Google). */
export const verifications = pgTable(
  'verifications',
  {
    id: uuid('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('verifications_identifier_idx').on(t.identifier)],
);

/**
 * Personagens (plano v2, 11.4). A ficha inteira fica em `data` (JSONB); o que a lista precisa
 * vira coluna, atualizada pelo servidor a cada salvamento. `section_revs` guarda a revisão de
 * cada seção para detectar conflito entre aparelhos (plano v2, 10.3).
 */
export const characters = pgTable(
  'characters',
  {
    /** Gerado no navegador: repetir o pedido de criação não duplica (plano v2, C-29). */
    id: uuid('id').primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    rulesEdition: varchar('rules_edition', { length: 8 }).notNull(),
    level: smallint('level').notNull().default(1),
    classSummary: varchar('class_summary', { length: 120 }).notNull().default(''),
    /**
     * A ficha como foi salva, em qualquer versão do formato: o serviço migra para a atual ao ler
     * (`migrateSheet`, ADR-010). Por isso o tipo é "desconhecido" aqui.
     */
    data: jsonb('data').$type<unknown>().notNull(),
    schemaVersion: smallint('schema_version').notNull(),
    /** Seções criadas depois (ex.: `spells`) faltam nas linhas antigas: contam como 0. */
    sectionRevs: jsonb('section_revs').$type<Partial<Record<SheetSection, number>>>().notNull(),
    version: integer('version').notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    /** Lixeira (plano v2, 11.6). */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('characters_owner_active')
      .on(t.ownerId, t.updatedAt.desc())
      .where(sql`${t.deletedAt} IS NULL`),
  ],
);

/**
 * Campanhas (docs/plano-escala-e-campanha.md, seção 2.3). A dona da linha é a mestre. O
 * convite é um código aleatório com validade; trocar o código invalida o anterior.
 */
export const campaigns = pgTable(
  'campaigns',
  {
    id: uuid('id').primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 80 }).notNull(),
    inviteCode: text('invite_code').notNull(),
    inviteExpiresAt: timestamp('invite_expires_at', { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('campaigns_invite_code_uq').on(t.inviteCode),
    index('campaigns_owner_idx').on(t.ownerId),
  ],
);

/** Quem está em cada campanha: `dm` (mestre) ou `player`. */
export const campaignMembers = pgTable(
  'campaign_members',
  {
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 8 }).$type<'dm' | 'player'>().notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.campaignId, t.userId] }),
    index('campaign_members_user_idx').on(t.userId),
  ],
);

/** Que ficha está em que campanha. Uma ficha fica em uma campanha só. */
export const campaignCharacters = pgTable(
  'campaign_characters',
  {
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.campaignId, t.characterId] }),
    uniqueIndex('campaign_characters_character_uq').on(t.characterId),
  ],
);

/**
 * Ações de jogo aplicadas pelo canal de ações (seção 2.2): não aplicar duas vezes
 * (`action_id` único por ficha), histórico ("a mestre aplicou 7 de dano") e "o que mudou depois
 * da versão N".
 */
export const characterEvents = pgTable(
  'character_events',
  {
    id: uuid('id').primaryKey(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    actionId: uuid('action_id').notNull(),
    /** Quem fez. Some (vira nulo) se a pessoa excluir a conta; o evento fica. */
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    actorRole: varchar('actor_role', { length: 8 }).$type<'owner' | 'dm' | 'player'>().notNull(),
    /** Só quando veio de uma proposta aceita: a dona. */
    approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
    action: jsonb('action').$type<unknown>().notNull(),
    version: integer('version').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('character_events_action_uq').on(t.characterId, t.actionId),
    index('character_events_version_idx').on(t.characterId, t.version),
  ],
);

/** Cura oferecida por outro jogador: só muda a ficha quando a dona aceita (seção 2.2). */
export const actionProposals = pgTable(
  'action_proposals',
  {
    id: uuid('id').primaryKey(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    proposerId: uuid('proposer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    action: jsonb('action').$type<unknown>().notNull(),
    note: varchar('note', { length: 120 }),
    status: varchar('status', { length: 10 })
      .$type<'pending' | 'accepted' | 'rejected' | 'expired'>()
      .notNull(),
    createdAt: createdAt(),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    decidedBy: uuid('decided_by').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => [index('action_proposals_character_idx').on(t.characterId, t.status)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type CharacterRow = typeof characters.$inferSelect;
export type CampaignRow = typeof campaigns.$inferSelect;
export type ProposalRow = typeof actionProposals.$inferSelect;
