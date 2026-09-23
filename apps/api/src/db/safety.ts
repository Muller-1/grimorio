import type { DatabasePort } from './client';

/** Bancos que a API de teste pode apagar (plano v2, 15.10, salvaguarda do banco). */
export const DISPOSABLE_DATABASE = /_(test|staging)$/;

export class UnsafeDatabaseError extends Error {
  override name = 'UnsafeDatabaseError';
}

/** Lança se o banco conectado não for descartável (`*_test` ou `*_staging`). */
export async function assertDisposableDatabase(db: DatabasePort): Promise<string> {
  const name = await db.name();
  if (!DISPOSABLE_DATABASE.test(name)) {
    throw new UnsafeDatabaseError(
      `Recusado: o banco "${name}" não termina em _test nem em _staging.`,
    );
  }
  return name;
}
