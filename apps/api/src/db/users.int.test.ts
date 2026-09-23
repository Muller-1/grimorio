// A primeira migração (tabela users) aplicada num Postgres de verdade.
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { sequentialIds } from '../ports';
import { testDatabase } from '../testing/int-helpers';
import { users } from './schema';

const db = testDatabase();
const ids = sequentialIds();
afterAll(() => db.close());
beforeEach(() => db.truncateAll());

describe('tabela users', () => {
  it('grava e lê um usuário com os padrões do banco', async () => {
    const id = ids.uuid();
    await db.orm.insert(users).values({ id, email: 'ana@exemplo.com', displayName: 'Ana' });
    const [row] = await db.orm.select().from(users).where(eq(users.id, id));
    expect(row).toMatchObject({ email: 'ana@exemplo.com', isSynthetic: false, deletedAt: null });
    expect(row!.createdAt).toBeInstanceOf(Date);
  });

  it('e-mail é único entre contas ativas, sem diferenciar maiúsculas', async () => {
    await db.orm.insert(users).values({ id: ids.uuid(), email: 'Bia@x.com', displayName: 'Bia' });
    await expect(
      db.orm.insert(users).values({ id: ids.uuid(), email: 'bia@X.com', displayName: 'Bia 2' }),
    ).rejects.toThrow();
  });

  it('quem excluiu a conta pode se cadastrar de novo com o mesmo e-mail (11.4)', async () => {
    const first = ids.uuid();
    await db.orm.insert(users).values({ id: first, email: 'caio@x.com', displayName: 'Caio' });
    await db.orm
      .update(users)
      .set({ deletedAt: sql`now()` })
      .where(eq(users.id, first));
    await db.orm.insert(users).values({ id: ids.uuid(), email: 'caio@x.com', displayName: 'Caio' });
    const rows = await db.orm.select().from(users).where(eq(users.email, 'caio@x.com'));
    expect(rows).toHaveLength(2);
  });
});
