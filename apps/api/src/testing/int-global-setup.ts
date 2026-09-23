/**
 * Preparação dos testes de integração: confere que o banco é de TESTE, que está no ar e aplica
 * as migrações. O endereço vai para os testes por `inject('databaseUrl')`.
 */
import pg from 'pg';
import type { TestProject } from 'vitest/node';
import { runMigrations } from '../db/migrate';
import { DISPOSABLE_DATABASE } from '../db/safety';

export const DEFAULT_TEST_DATABASE_URL = 'postgres://app:app@localhost:5432/app_test';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

export default async function setup(project: TestProject): Promise<void> {
  const url = process.env.DATABASE_URL_TEST ?? DEFAULT_TEST_DATABASE_URL;
  const name = new URL(url).pathname.slice(1);
  if (!/_test$/.test(name) || !DISPOSABLE_DATABASE.test(name)) {
    throw new Error(`Os testes de integração só rodam num banco *_test (recebido: "${name}").`);
  }
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 5_000 });
  try {
    await client.connect();
  } catch (error) {
    throw new Error(
      `Não consegui conectar em ${name} (${(error as Error).message}).\n` +
        'Suba o Postgres com `docker compose up -d --wait` na raiz do projeto.',
      { cause: error },
    );
  } finally {
    await client.end().catch(() => {});
  }
  await runMigrations(url);
  project.provide('databaseUrl', url);
}
