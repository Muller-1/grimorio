import type { DatabasePort } from '../db/client';

/** Banco falso para testes de unidade (sem Postgres). */
export interface FakeDatabase extends DatabasePort {
  truncated: number;
  closed: boolean;
  healthy: boolean;
}

export function fakeDatabase(name = 'app_test'): FakeDatabase {
  const db: FakeDatabase = {
    truncated: 0,
    closed: false,
    healthy: true,
    async ping() {
      if (!db.healthy) throw new Error('banco fora do ar');
    },
    async name() {
      return name;
    },
    async truncateAll() {
      db.truncated++;
    },
    async close() {
      db.closed = true;
    },
  };
  return db;
}
