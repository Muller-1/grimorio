import type { FastifyInstance } from 'fastify';
import { inject } from 'vitest';
import { buildApp, type BuildOptions } from '../app';
import type { Env } from '../config/env';
import { createDatabase, type PostgresDatabase } from '../db/client';
import { TEST_TOKEN, testEnv } from './env';

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

/** Cookie de sessão de um usuário novo (ou existente, com `userId`), pela API de teste. */
export async function loginAs(
  app: FastifyInstance,
  who: { email: string; name?: string } | { userId: string },
): Promise<{ cookie: string; userId: string }> {
  const res = await app.inject({
    method: 'POST',
    url: '/__test__/session',
    headers: { 'x-test-token': TEST_TOKEN },
    payload: who,
  });
  if (res.statusCode !== 200) throw new Error(`loginAs falhou: ${res.statusCode} ${res.body}`);
  const body = res.json<{ cookie: string; user: { id: string } }>();
  return { cookie: body.cookie, userId: body.user.id };
}
