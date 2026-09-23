// Salvaguardas da API de teste contra um Postgres de verdade (plano v2, 15.10).
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { users } from '../db/schema';
import { sequentialIds } from '../ports';
import { TEST_TOKEN } from '../testing/env';
import { startApp, testDatabase, withDatabaseName } from '../testing/int-helpers';
import { TEST_API_PREFIX, TEST_TOKEN_HEADER } from './test-api';

const withTestApi = { ENABLE_TEST_API: true, TEST_API_TOKEN: TEST_TOKEN } as const;
const auth = { [TEST_TOKEN_HEADER]: TEST_TOKEN };
const ids = sequentialIds();

describe('reset num banco de teste', () => {
  const db = testDatabase();
  afterAll(() => db.close());

  it('apaga os dados de todas as tabelas', async () => {
    await db.orm.insert(users).values({ id: ids.uuid(), email: 'd@x.com', displayName: 'D' });
    const app = await startApp(withTestApi);
    const res = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/reset`,
      headers: auth,
    });
    await app.close();
    expect(res.statusCode).toBe(200);
    expect(await db.orm.$count(users)).toBe(0);
  });

  it('sem token, não apaga nada', async () => {
    await db.orm.insert(users).values({ id: ids.uuid(), email: 'e@x.com', displayName: 'E' });
    const app = await startApp(withTestApi);
    const res = await app.inject({ method: 'POST', url: `${TEST_API_PREFIX}/reset` });
    await app.close();
    expect(res.statusCode).toBe(404);
    expect(await db.orm.$count(users)).toBe(1);
  });
});

/**
 * Um banco com nome de "desenvolvimento" criado só para este teste (o app_dev de verdade nunca é
 * tocado). O reset tem de recusar e os dados têm de continuar lá.
 */
describe('reset num banco que não é de teste', () => {
  const guardName = 'grimorio_guarda_dev';
  const admin = () => new pg.Client({ connectionString: inject('databaseUrl') });
  const guardUrl = () => withDatabaseName(inject('databaseUrl'), guardName);

  beforeAll(async () => {
    const client = admin();
    await client.connect();
    await client.query(`drop database if exists ${guardName}`);
    await client.query(`create database ${guardName}`);
    await client.end();
    const guard = new pg.Client({ connectionString: guardUrl() });
    await guard.connect();
    await guard.query('create table precioso (id int); insert into precioso values (1)');
    await guard.end();
  });

  afterAll(async () => {
    const client = admin();
    await client.connect();
    await client.query(`drop database if exists ${guardName} with (force)`);
    await client.end();
  });

  it('recusa com 409 e não apaga nada', async () => {
    const app = await startApp({ ...withTestApi, DATABASE_URL: guardUrl() });
    const res = await app.inject({
      method: 'POST',
      url: `${TEST_API_PREFIX}/reset`,
      headers: auth,
    });
    await app.close();
    expect(res.statusCode).toBe(409);
    expect(res.json().message).toContain(guardName);

    const guard = new pg.Client({ connectionString: guardUrl() });
    await guard.connect();
    const { rows } = await guard.query('select count(*)::int as n from precioso');
    await guard.end();
    expect(rows[0].n).toBe(1);
  });
});
