/**
 * Esquema do banco (plano v2, 11.2). Mudou algo aqui? Gere a migração:
 *   pnpm --filter @grimorio/api db:generate
 * Migrações só ADICIONAM (plano v2, 17: "expandir e contrair").
 */
import { sql } from 'drizzle-orm';
import { boolean, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    /** Gerado pela aplicação (porta IdGenerator), não pelo banco. */
    id: uuid('id').primaryKey(),
    email: text('email').notNull(),
    displayName: varchar('display_name', { length: 60 }).notNull(),
    /** Conta canário do monitor B14 (plano v2, 15.10): fora das métricas. */
    isSynthetic: boolean('is_synthetic').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    /** Exclusão lógica: a conta some da lista e é apagada de vez depois do prazo. */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    // E-mail único só entre contas ativas: quem excluiu a conta pode se cadastrar de novo (11.4).
    uniqueIndex('users_email_active_uq')
      .on(sql`lower(${t.email})`)
      .where(sql`${t.deletedAt} IS NULL`),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
