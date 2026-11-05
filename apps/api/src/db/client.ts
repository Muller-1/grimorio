import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

/**
 * O que o resto da API precisa do banco. As rotas de sistema e a API de teste falam com esta
 * interface, então os testes de unidade podem trocar o banco por um falso.
 */
export interface DatabasePort {
  /** Consulta mínima; rejeita se o banco não responder. */
  ping(): Promise<void>;
  /** Nome do banco conectado (`current_database()`). */
  name(): Promise<string>;
  /** Apaga os dados de todas as tabelas da aplicação (a API de teste confere o banco antes). */
  truncateAll(): Promise<void>;
  close(): Promise<void>;
  /** Conexões do pool agora: abertas, livres e pedidos na fila esperando uma (métricas). */
  poolStats?(): PoolStats;
}

export interface PoolStats {
  max: number;
  total: number;
  idle: number;
  waiting: number;
}

/** Conexões por instância da API, se ninguém disser outro número (DATABASE_POOL_MAX). */
export const DEFAULT_POOL_MAX = 10;

export type Orm = NodePgDatabase<typeof schema>;

export interface PostgresDatabase extends DatabasePort {
  orm: Orm;
  pool: pg.Pool;
}

export function isPostgresDatabase(db: DatabasePort): db is PostgresDatabase {
  return 'orm' in db && 'pool' in db;
}

/** Erro de chave repetida do Postgres (23505), venha direto do `pg` ou embrulhado pelo Drizzle. */
export function isUniqueViolation(error: unknown): boolean {
  for (let e = error, depth = 0; e && depth < 4; depth++) {
    if ((e as { code?: unknown }).code === '23505') return true;
    e = (e as { cause?: unknown }).cause;
  }
  return false;
}

export function createDatabase(url: string, options: { max?: number } = {}): PostgresDatabase {
  const max = options.max ?? DEFAULT_POOL_MAX;
  const pool = new pg.Pool({
    connectionString: url,
    max,
    connectionTimeoutMillis: 5_000,
  });
  // Um erro numa conexão ociosa não pode derrubar o processo (ex.: banco reiniciou).
  pool.on('error', () => {});
  const orm = drizzle(pool, { schema });

  return {
    orm,
    pool,
    async ping() {
      await pool.query('select 1');
    },
    async name() {
      const result = await pool.query<{ name: string }>('select current_database() as name');
      return result.rows[0]!.name;
    },
    async truncateAll() {
      const { rows } = await pool.query<{ table: string }>(
        `select quote_ident(tablename) as "table" from pg_tables where schemaname = 'public'`,
      );
      if (rows.length === 0) return;
      await pool.query(
        `truncate table ${rows.map((r) => r.table).join(', ')} restart identity cascade`,
      );
    },
    async close() {
      await pool.end();
    },
    poolStats() {
      return {
        max,
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      };
    },
  };
}
