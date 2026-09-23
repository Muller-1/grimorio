import type { Env } from '../config/env';

export const TEST_TOKEN = 'token-de-teste-com-mais-de-32-caracteres';

/** Ambiente de teste já validado; `overrides` troca o que o teste precisar. */
export function testEnv(overrides: Partial<Env> = {}): Env {
  return {
    APP_ENV: 'test',
    HOST: '127.0.0.1',
    PORT: 0,
    LOG_LEVEL: 'silent',
    DATABASE_URL: 'postgres://app:app@localhost:5432/app_test',
    ENABLE_TEST_API: false,
    ...overrides,
  };
}
