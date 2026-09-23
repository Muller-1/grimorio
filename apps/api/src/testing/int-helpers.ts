import type { FastifyInstance } from 'fastify';
import { inject } from 'vitest';
import { buildApp, type BuildOptions } from '../app';
import type { Env } from '../config/env';
import { createDatabase, type PostgresDatabase } from '../db/client';
import { testEnv } from './env';

/** Banco de teste de verdade (Postgres), já migrado pelo int-global-setup. */
export function testDatabase(): PostgresDatabase {
  return createDatabase(inject('databaseUrl'), { max: 2 });
}

/** Troca o nome do banco num endereço postgres://. */
export function withDatabaseName(url: string, name: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${name}`;
  return parsed.href;
}

export async function startApp(
  env: Partial<Env> = {},
  options: BuildOptions = {},
): Promise<FastifyInstance> {
  return buildApp(testEnv({ DATABASE_URL: inject('databaseUrl'), ...env }), options);
}
