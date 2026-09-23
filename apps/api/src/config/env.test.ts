import { describe, expect, it } from 'vitest';
import { EnvError, parseEnv } from './env';

const base = { APP_ENV: 'local', DATABASE_URL: 'postgres://app:app@localhost:5432/app_dev' };
const token = 'x'.repeat(32);

describe('parseEnv', () => {
  it('aceita o mínimo e preenche os padrões', () => {
    const env = parseEnv(base);
    expect(env).toMatchObject({
      APP_ENV: 'local',
      HOST: '0.0.0.0',
      PORT: 3000,
      LOG_LEVEL: 'info',
      ENABLE_TEST_API: false,
    });
  });

  it('converte PORT e flags de texto', () => {
    expect(parseEnv({ ...base, PORT: '8080' }).PORT).toBe(8080);
    expect(parseEnv({ ...base, ENABLE_TEST_API: 'false' }).ENABLE_TEST_API).toBe(false);
    expect(parseEnv({ ...base, ENABLE_TEST_API: '1', TEST_API_TOKEN: token }).ENABLE_TEST_API).toBe(
      true,
    );
  });

  it('recusa ambiente desconhecido, banco que não é Postgres e porta inválida', () => {
    expect(() => parseEnv({ ...base, APP_ENV: 'prod' })).toThrow(EnvError);
    expect(() => parseEnv({ ...base, DATABASE_URL: 'mysql://x' })).toThrow(/DATABASE_URL/);
    expect(() => parseEnv({ ...base, PORT: '70000' })).toThrow(/PORT/);
    expect(() => parseEnv({ APP_ENV: 'local' })).toThrow(/DATABASE_URL/);
  });

  it('flag com texto estranho é erro, não "verdadeiro"', () => {
    expect(() => parseEnv({ ...base, ENABLE_TEST_API: 'sim' })).toThrow(/ENABLE_TEST_API/);
  });

  describe('API de teste', () => {
    it('não pode ser ligada em produção', () => {
      expect(() =>
        parseEnv({
          ...base,
          APP_ENV: 'production',
          ENABLE_TEST_API: 'true',
          TEST_API_TOKEN: token,
        }),
      ).toThrow(/produção/);
    });

    it('exige token de 32+ caracteres', () => {
      expect(() => parseEnv({ ...base, ENABLE_TEST_API: 'true' })).toThrow(/TEST_API_TOKEN/);
      expect(() => parseEnv({ ...base, ENABLE_TEST_API: 'true', TEST_API_TOKEN: 'curto' })).toThrow(
        /TEST_API_TOKEN/,
      );
    });

    it('lista todos os problemas de uma vez', () => {
      try {
        parseEnv({ APP_ENV: 'x' });
        expect.unreachable();
      } catch (error) {
        expect((error as Error).message).toMatch(/APP_ENV[\s\S]*DATABASE_URL/);
      }
    });
  });
});
