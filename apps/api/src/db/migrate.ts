/**
 * Aplica as migrações pendentes (pasta apps/api/drizzle). No pipeline, roda ANTES do deploy
 * da API (plano v2, 17).
 *   pnpm --filter @grimorio/api db:migrate          (usa DATABASE_URL do .env)
 *   node apps/api/dist/db/migrate.js                (versão empacotada)
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDatabase } from './client';

/** Mesmo caminho a partir de src/db/ e de dist/db/. */
export const MIGRATIONS_DIR = fileURLToPath(new URL('../../drizzle', import.meta.url));

export async function runMigrations(url: string): Promise<void> {
  const db = createDatabase(url, { max: 1 });
  try {
    await migrate(db.orm, { migrationsFolder: MIGRATIONS_DIR });
  } finally {
    await db.close();
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Defina DATABASE_URL (veja apps/api/.env.example).');
    process.exit(1);
  }
  const name = new URL(url).pathname.slice(1);
  await runMigrations(url);
  console.log(`migrações aplicadas em ${name}`);
}
