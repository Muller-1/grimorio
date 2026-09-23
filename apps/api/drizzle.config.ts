// drizzle-kit: `pnpm --filter @grimorio/api db:generate` cria a migração SQL a partir do
// src/db/schema.ts (não precisa de banco). Aplicar: `db:migrate` (src/db/migrate.ts).
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  strict: true,
  verbose: true,
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgres://app:app@localhost:5432/app_dev' },
});
