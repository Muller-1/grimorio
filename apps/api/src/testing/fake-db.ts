import type { DatabasePort } from '../db/client';

/** Banco falso para testes de unidade (sem Postgres). */
export interface FakeDatabase extends DatabasePort {
  truncated: number;
  closed: boolean;
  healthy: boolean;
  /** Quantas vezes alguém perguntou se o banco está no ar. */
  pings: number;
}

export function fakeDatabase(name = 'app_test'): FakeDatabase {
  const db: FakeDatabase = {
    truncated: 0,
    closed: false,
    healthy: true,
    pings: 0,
    async ping() {
      db.pings++;
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
