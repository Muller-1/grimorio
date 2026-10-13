import { describe, expect, it } from 'vitest';
import { EnvError, EXAMPLE_AUTH_SECRET, parseEnv } from './env';

const base = {
  APP_ENV: 'local',
  DATABASE_URL: 'postgres://app:app@localhost:5432/app_dev',
  AUTH_SECRET: 's'.repeat(32),
};
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

  describe('login (ADR-008)', () => {
    it('SITE_URL padrão é o Vite local; outras origens vêm numa lista', () => {
      const env = parseEnv({
        ...base,
        TRUSTED_ORIGINS: 'http://localhost:4173, https://x.pages.dev',
      });
      expect(env.SITE_URL).toBe('http://localhost:5173');
      expect(env.TRUSTED_ORIGINS).toEqual(['http://localhost:4173', 'https://x.pages.dev']);
    });

    it('SITE_URL e origens confiáveis são só a origem (sem caminho)', () => {
      expect(() => parseEnv({ ...base, SITE_URL: 'http://localhost:5173/' })).toThrow(/SITE_URL/);
      expect(() => parseEnv({ ...base, TRUSTED_ORIGINS: 'javascript:alert(1)' })).toThrow(
        /TRUSTED_ORIGINS/,
      );
    });

    it('exige AUTH_SECRET com 32+ caracteres', () => {
      const { AUTH_SECRET: _, ...noSecret } = base;
      expect(() => parseEnv(noSecret)).toThrow(/AUTH_SECRET/);
      expect(() => parseEnv({ ...base, AUTH_SECRET: 'curto' })).toThrow(/AUTH_SECRET/);
    });

    it('o segredo de exemplo só vale no computador', () => {
      const example = { ...base, AUTH_SECRET: EXAMPLE_AUTH_SECRET };
      expect(parseEnv(example).AUTH_SECRET).toBe(EXAMPLE_AUTH_SECRET);
      expect(() => parseEnv({ ...example, APP_ENV: 'staging' })).toThrow(/exemplo/);
    });

    it('credenciais do Google vão juntas; vazio conta como ausente', () => {
      expect(parseEnv({ ...base, GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '' })).toMatchObject({
        GOOGLE_CLIENT_ID: undefined,
        GOOGLE_CLIENT_SECRET: undefined,
      });
      expect(() => parseEnv({ ...base, GOOGLE_CLIENT_ID: 'id' })).toThrow(/GOOGLE_CLIENT_SECRET/);
      expect(
        parseEnv({ ...base, GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 's' }),
      ).toMatchObject({ GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 's' });
    });

    it('produção exige https', () => {
      expect(() => parseEnv({ ...base, APP_ENV: 'production' })).toThrow(/https/);
      expect(
        parseEnv({ ...base, APP_ENV: 'production', SITE_URL: 'https://grimorio.com.br' }).SITE_URL,
      ).toBe('https://grimorio.com.br');
    });
  });

  describe('repasse do site (ADR-009)', () => {
    it('PROXY_SECRET é opcional; vazio conta como ausente', () => {
      expect(parseEnv(base).PROXY_SECRET).toBeUndefined();
      expect(parseEnv({ ...base, PROXY_SECRET: '  ' }).PROXY_SECRET).toBeUndefined();
      expect(parseEnv({ ...base, PROXY_SECRET: token }).PROXY_SECRET).toBe(token);
    });

    it('PROXY_SECRET curto é erro', () => {
      expect(() => parseEnv({ ...base, PROXY_SECRET: 'curto' })).toThrow(/PROXY_SECRET/);
    });
  });
});
