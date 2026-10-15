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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type CharacterRow = typeof characters.$inferSelect;
