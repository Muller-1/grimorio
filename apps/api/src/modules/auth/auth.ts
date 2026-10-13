/**
 * Login (ADR-008): Better Auth com o Google, dentro do nosso Fastify e do nosso Postgres.
 *
 * - O site e a API ficam na MESMA origem: o navegador fala com `${SITE_URL}/api/...` e o
 *   servidor do site repassa /api para a API (no computador, o proxy do Vite). Assim o cookie
 *   de sessão é "do próprio site" e funciona em todos os navegadores (ADR-007, achado 1).
 * - Não há login por senha: só Google. Nada de senha para vazar nem e-mail para enviar.
 * - Guardamos o mínimo (LGPD, plano v2, 14.3): e-mail, nome, foto e o id da pessoa no Google.
 *   Os tokens do Google são descartados: o site não usa nenhuma API do Google.
 * - Ids vêm da nossa porta IdGenerator (testes previsíveis).
 */
import { betterAuth, type BetterAuthPlugin } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { testUtils } from 'better-auth/plugins';
import type { Env } from '../../config/env';
import type { Orm } from '../../db/client';
import { accounts, sessions, users, verifications } from '../../db/schema';
import type { Ports } from '../../ports';
import { CLIENT_IP_HEADER } from '../proxy-guard';

/** Caminho das rotas da biblioteca (o retorno do Google é `${AUTH_BASE_PATH}/callback/google`). */
export const AUTH_BASE_PATH = '/api/auth';

/** Nome do cookie de sessão: `grimorio.session_token` (`__Secure-` na frente com https). */
export const COOKIE_PREFIX = 'grimorio';

const DISPLAY_NAME_MAX = 60;
const FALLBACK_NAME = 'Aventureiro';

/** Nome de exibição seguro para a coluna `display_name` (varchar 60, obrigatório). */
export function cleanDisplayName(name: unknown): string {
  const text = typeof name === 'string' ? name.replace(/\s+/g, ' ').trim() : '';
  return Array.from(text).slice(0, DISPLAY_NAME_MAX).join('') || FALLBACK_NAME;
}

/** Remove o que não guardamos de uma conta do Google (tokens de acesso). */
function withoutTokens<T extends Record<string, unknown>>(account: T): T {
  return {
    ...account,
    accessToken: null,
    refreshToken: null,
    idToken: null,
    accessTokenExpiresAt: null,
    refreshTokenExpiresAt: null,
  };
}

function betterAuthLogLevel(level: Env['LOG_LEVEL']): 'debug' | 'info' | 'warn' | 'error' {
  if (level === 'trace' || level === 'debug') return 'debug';
  if (level === 'info') return 'info';
  if (level === 'warn') return 'warn';
  return 'error';
}

export function googleConfigured(env: Env): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export function createAuth(env: Env, orm: Orm, ports: Ports) {
  const testing = env.APP_ENV !== 'production' && env.ENABLE_TEST_API;
  const google =
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            // Sempre mostra a escolha de conta (computador compartilhado, várias contas).
            prompt: 'select_account' as const,
          },
        }
      : {};

  return betterAuth({
    appName: 'Grimório',
    baseURL: env.SITE_URL,
    basePath: AUTH_BASE_PATH,
    secret: env.AUTH_SECRET,
    trustedOrigins: [env.SITE_URL, ...env.TRUSTED_ORIGINS],
    database: drizzleAdapter(orm, {
      provider: 'pg',
      usePlural: true,
      schema: { users, sessions, accounts, verifications },
    }),
    emailAndPassword: { enabled: false },
    socialProviders: google,
    user: {
      fields: { name: 'displayName' },
      additionalFields: {
        isSynthetic: { type: 'boolean', defaultValue: false, input: false },
      },
    },
    account: {
      // Não atualiza os tokens a cada login (eles nem são guardados).
      updateAccountOnSignIn: false,
      accountLinking: { enabled: true, trustedProviders: ['google'] },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 dias
      updateAge: 60 * 60 * 24, // renova a validade no máximo 1 vez por dia
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => ({ data: { ...user, name: cleanDisplayName(user.name) } }),
        },
        update: {
          before: async (user) =>
            'name' in user ? { data: { ...user, name: cleanDisplayName(user.name) } } : undefined,
        },
      },
      account: {
        create: { before: async (account) => ({ data: withoutTokens(account) }) },
        update: { before: async (account) => ({ data: withoutTokens(account) }) },
      },
    },
    // Erros do login (ex.: o jogador cancelou no Google) voltam para a nossa página.
    onAPIError: { errorURL: `${env.SITE_URL}/entrar` },
    // Explícito (e não pelo NODE_ENV): limite de tentativas em produção, e a conferência de
    // origem/destino SEMPRE ligada — por padrão a biblioteca desliga essa conferência em testes,
    // e aí os testes não provariam nada.
    rateLimit: { enabled: env.APP_ENV === 'production' },
    logger: { disabled: env.LOG_LEVEL === 'silent', level: betterAuthLogLevel(env.LOG_LEVEL) },
    advanced: {
      disableOriginCheck: false,
      disableCSRFCheck: false,
      cookiePrefix: COOKIE_PREFIX,
      useSecureCookies: env.SITE_URL.startsWith('https://'),
      // Publicado (ADR-009): o IP do jogador vem do repasse do site, que a API só aceita com o
      // segredo. Sem isso, o limite de tentativas juntaria todo mundo num balde só.
      ...(env.PROXY_SECRET ? { ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] } } : {}),
      database: { generateId: () => ports.ids.uuid() },
    },
    telemetry: { enabled: false },
    // Só fora de produção, com a API de teste ligada: sessão sem Google para o bot (15.4).
    // (O tipo do plugin não fecha com `exactOptionalPropertyTypes`; o formato é o da biblioteca.)
    plugins: testing ? [testUtils() as unknown as BetterAuthPlugin] : [],
  });
}

export type Auth = ReturnType<typeof createAuth>;
