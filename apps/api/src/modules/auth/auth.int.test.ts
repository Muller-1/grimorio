// Login com Google (ADR-008) contra um Postgres de verdade. O Google é simulado só na troca do
// código pelo token (a única chamada que o servidor faz para fora).
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { accounts, sessions, users } from '../../db/schema';
import { sequentialIds } from '../../ports';
import { TEST_TOKEN } from '../../testing/env';
import { loginAs, startApp, testDatabase } from '../../testing/int-helpers';
import { CLIENT_IP_HEADER, PROXY_SECRET_HEADER } from '../proxy-guard';
import { cleanDisplayName } from './auth';

const google = { GOOGLE_CLIENT_ID: 'id-do-teste.apps', GOOGLE_CLIENT_SECRET: 'segredo-do-teste' };
const SITE = 'http://localhost:5173';
const json = { 'content-type': 'application/json', origin: SITE };

const db = testDatabase();
let app: FastifyInstance | undefined;
afterAll(() => db.close());
beforeEach(() => db.truncateAll());
afterEach(async () => {
  vi.restoreAllMocks();
  await app?.close();
  app = undefined;
});

/** Cookies de uma resposta, prontos para o próximo pedido. Cookie apagado (Max-Age=0) sai. */
function cookiesFrom(setCookie: string | string[] | undefined, previous = ''): string {
  const jar = new Map(
    previous
      .split('; ')
      .filter(Boolean)
      .map((pair) => [pair.split('=')[0]!, pair] as const),
  );
  for (const raw of [setCookie ?? []].flat()) {
    const pair = raw.split(';')[0]!;
    const name = pair.split('=')[0]!;
    if (/max-age=0/i.test(raw) || pair.endsWith('=')) jar.delete(name);
    else jar.set(name, pair);
  }
  return [...jar.values()].join('; ');
}

/** id_token como o Google devolve (a assinatura não é conferida: veio direto do Google). */
function fakeIdToken(claims: Record<string, unknown>): string {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(new Date('2026-10-08T12:00:00Z').getTime() / 1000);
  return [
    part({ alg: 'RS256', kid: 'teste', typ: 'JWT' }),
    part({
      iss: 'https://accounts.google.com',
      aud: google.GOOGLE_CLIENT_ID,
      iat: now,
      exp: now + 3600,
      ...claims,
    }),
    'assinatura',
  ].join('.');
}

/** Simula o endpoint de token do Google e devolve quantas vezes ele foi chamado. */
function mockGoogleToken(claims: Record<string, unknown>) {
  const realFetch = globalThis.fetch;
  const calls: { body: string }[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith('https://oauth2.googleapis.com/token')) {
      calls.push({ body: String(init?.body ?? '') });
      return Response.json({
        access_token: 'token-de-acesso-secreto',
        refresh_token: 'token-de-renovacao-secreto',
        expires_in: 3599,
        token_type: 'Bearer',
        scope: 'openid email profile',
        id_token: fakeIdToken(claims),
      });
    }
    return realFetch(input, init);
  });
  return calls;
}

/** Passo 1 (botão "Entrar com Google") + passo 2 (o Google manda de volta com ?code). */
async function signInWithGoogle(server: FastifyInstance, callbackURL = '/personagens') {
  const start = await server.inject({
    method: 'POST',
    url: '/api/auth/sign-in/social',
    headers: json,
    payload: { provider: 'google', callbackURL, errorCallbackURL: '/entrar' },
  });
  expect(start.statusCode, start.body).toBe(200);
  const authorize = new URL(start.json<{ url: string }>().url);
  const state = authorize.searchParams.get('state')!;
  const cookie = cookiesFrom(start.headers['set-cookie']);
  const back = await server.inject({
    url: `/api/auth/callback/google?code=codigo-do-google&state=${encodeURIComponent(state)}`,
    headers: { cookie },
  });
  return { authorize, back, cookie: cookiesFrom(back.headers['set-cookie'], cookie) };
}

describe('jeitos de entrar', () => {
  it('sem credenciais, o Google aparece desligado', async () => {
    app = await startApp();
    const res = await app.inject('/api/v1/auth/providers');
    expect(res.json()).toEqual({ google: false });
  });

  it('com credenciais, o Google aparece ligado', async () => {
    app = await startApp(google);
    expect((await app.inject('/api/v1/auth/providers')).json()).toEqual({ google: true });
  });
});

describe('GET /api/v1/session', () => {
  it('visitante recebe 200 com user null (sem sujar o console do navegador)', async () => {
    app = await startApp();
    const res = await app.inject('/api/v1/session');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ user: null });
  });

  it('com sessão, devolve o usuário', async () => {
    app = await startApp({ ENABLE_TEST_API: true, TEST_API_TOKEN: TEST_TOKEN });
    const { cookie, userId } = await loginAs(app, { email: 'dani@x.com', name: 'Dani' });
    const res = await app.inject({ url: '/api/v1/session', headers: { cookie } });
    expect(res.json()).toEqual({
      user: { id: userId, email: 'dani@x.com', displayName: 'Dani', image: null },
    });
  });
});

describe('GET /api/v1/me', () => {
  it('sem sessão responde 401 com código fixo', async () => {
    app = await startApp(google);
    const res = await app.inject('/api/v1/me');
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('cookie inventado não abre sessão', async () => {
    app = await startApp(google);
    const res = await app.inject({
      url: '/api/v1/me',
      headers: { cookie: 'grimorio.session_token=inventado.assinatura' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('entrar com Google', () => {
  it('o botão leva ao Google com o endereço de retorno do site e PKCE', async () => {
    app = await startApp(google);
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/social',
      headers: json,
      payload: { provider: 'google', callbackURL: '/personagens' },
    });
    expect(res.statusCode).toBe(200);
    const url = new URL(res.json<{ url: string }>().url);
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe(google.GOOGLE_CLIENT_ID);
    expect(url.searchParams.get('redirect_uri')).toBe(`${SITE}/api/auth/callback/google`);
    expect(url.searchParams.get('scope')).toBe('email profile openid');
    expect(url.searchParams.get('prompt')).toBe('select_account');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  });

  it('sem credenciais, pedir o Google não quebra a API', async () => {
    app = await startApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/social',
      headers: json,
      payload: { provider: 'google', callbackURL: '/personagens' },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });

  it('pedido vindo de outro site é recusado (CSRF)', async () => {
    app = await startApp(google);
    // Navegador de quem já tem cookies do site, levado a um site malicioso.
    const withCookies = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/social',
      headers: { ...json, origin: 'https://site-malicioso.example', cookie: 'grimorio.x=1' },
      payload: { provider: 'google', callbackURL: '/personagens' },
    });
    expect(withCookies.statusCode).toBe(403);
  });

  it('retorno do Google só vale no navegador que começou o login (state + cookie)', async () => {
    app = await startApp(google);
    mockGoogleToken({ sub: 'google-1', email: 'x@gmail.com', email_verified: true, name: 'X' });
    // O atacante começa o login no navegador DELE e manda o link de retorno para a vítima.
    const start = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/social',
      headers: json,
      payload: { provider: 'google', callbackURL: '/personagens', errorCallbackURL: '/entrar' },
    });
    const state = new URL(start.json<{ url: string }>().url).searchParams.get('state')!;
    const victim = await app.inject({
      url: `/api/auth/callback/google?code=codigo-do-atacante&state=${encodeURIComponent(state)}`,
    });
    expect(victim.statusCode).toBe(302);
    expect(victim.headers.location).toMatch(/error=/);
    expect([victim.headers['set-cookie']].flat().join()).not.toContain('session_token=');
    expect(await db.orm.$count(sessions)).toBe(0);
  });

  it('destino fora do site é recusado (redirecionamento aberto)', async () => {
    app = await startApp(google);
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/social',
      headers: json,
      payload: { provider: 'google', callbackURL: 'https://site-malicioso.example/roubar' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('primeira vez: cria a conta, abre a sessão e volta para o site', async () => {
    app = await startApp(google, { ports: { ids: sequentialIds() } });
    const tokenCalls = mockGoogleToken({
      sub: 'google-123',
      email: 'Ana.Silva@Gmail.com',
      email_verified: true,
      name: 'Ana Silva',
      picture: 'https://lh3.googleusercontent.com/a/foto',
    });

    const { back, cookie } = await signInWithGoogle(app);
    expect(tokenCalls).toHaveLength(1);
    expect(tokenCalls[0]!.body).toContain('code=codigo-do-google');
    expect(back.statusCode).toBe(302);
    expect(back.headers.location).toBe('/personagens');
    const sessionCookie = [back.headers['set-cookie']]
      .flat()
      .find((c) => c?.startsWith('grimorio.session_token='));
    expect(sessionCookie).toMatch(/HttpOnly/i);
    expect(sessionCookie).toMatch(/SameSite=Lax/i);

    const me = await app.inject({ url: '/api/v1/me', headers: { cookie } });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toEqual({
      id: expect.stringMatching(/^00000000-0000-4000-8000-/),
      email: 'ana.silva@gmail.com',
      displayName: 'Ana Silva',
      image: 'https://lh3.googleusercontent.com/a/foto',
    });

    const [user] = await db.orm.select().from(users);
    expect(user).toMatchObject({
      displayName: 'Ana Silva',
      emailVerified: true,
      isSynthetic: false,
    });
    const [account] = await db.orm.select().from(accounts);
    // Guardamos só quem é a pessoa no Google; nenhum token (ADR-008).
    expect(account).toMatchObject({
      providerId: 'google',
      accountId: 'google-123',
      userId: user!.id,
      accessToken: null,
      refreshToken: null,
      idToken: null,
    });
  });

  it('segunda vez: mesma conta, sessão nova, nada duplicado', async () => {
    app = await startApp(google);
    const claims = { sub: 'google-77', email: 'bia@gmail.com', email_verified: true, name: 'Bia' };
    mockGoogleToken(claims);
    await signInWithGoogle(app);
    const second = await signInWithGoogle(app);
    expect(second.back.statusCode).toBe(302);
    expect(await db.orm.$count(users)).toBe(1);
    expect(await db.orm.$count(accounts)).toBe(1);
    expect(await db.orm.$count(sessions)).toBe(2);
  });

  it('nome comprido do Google é cortado em 60 caracteres', async () => {
    app = await startApp(google);
    mockGoogleToken({
      sub: 'google-9',
      email: 'longo@gmail.com',
      email_verified: true,
      name: `Dona ${'Maria '.repeat(20)}`,
    });
    const { cookie } = await signInWithGoogle(app);
    const me = (await app.inject({ url: '/api/v1/me', headers: { cookie } })).json();
    expect(me.displayName).toHaveLength(60);
    expect(me.displayName.startsWith('Dona Maria')).toBe(true);
  });

  it('cancelar no Google volta para a página de entrar com o erro', async () => {
    app = await startApp(google);
    const start = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/social',
      headers: json,
      payload: { provider: 'google', callbackURL: '/personagens', errorCallbackURL: '/entrar' },
    });
    const state = new URL(start.json<{ url: string }>().url).searchParams.get('state')!;
    const back = await app.inject({
      url: `/api/auth/callback/google?error=access_denied&state=${encodeURIComponent(state)}`,
      headers: { cookie: cookiesFrom(start.headers['set-cookie']) },
    });
    expect(back.statusCode).toBe(302);
    expect(back.headers.location).toMatch(/^\/entrar\?error=access_denied/);
    expect(await db.orm.$count(users)).toBe(0);
  });

  it('sair encerra a sessão', async () => {
    app = await startApp(google);
    mockGoogleToken({
      sub: 'google-5',
      email: 'caio@gmail.com',
      email_verified: true,
      name: 'Caio',
    });
    const { cookie } = await signInWithGoogle(app);
    const out = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-out',
      headers: { ...json, cookie },
      payload: '{}',
    });
    expect(out.statusCode).toBe(200);
    expect(await db.orm.$count(sessions)).toBe(0);
    const me = await app.inject({ url: '/api/v1/me', headers: { cookie } });
    expect(me.statusCode).toBe(401);
  });
});

describe('sessão de teste para o bot (/__test__/session)', () => {
  const withTestApi = { ENABLE_TEST_API: true, TEST_API_TOKEN: TEST_TOKEN } as const;

  it('cria um usuário e devolve um cookie que a API aceita', async () => {
    app = await startApp(withTestApi);
    const { cookie, userId } = await loginAs(app, { email: 'bot@exemplo.com', name: 'Bot' });
    const me = await app.inject({ url: '/api/v1/me', headers: { cookie } });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({ id: userId, email: 'bot@exemplo.com', displayName: 'Bot' });
    const again = await loginAs(app, { userId });
    expect(again.userId).toBe(userId);
  });

  it('sem o token, a rota não existe; sem a API de teste, também não', async () => {
    app = await startApp(withTestApi);
    const res = await app.inject({
      method: 'POST',
      url: '/__test__/session',
      payload: { email: 'x@x.com' },
    });
    expect(res.statusCode).toBe(404);
    await app.close();
    app = await startApp();
    const off = await app.inject({
      method: 'POST',
      url: '/__test__/session',
      headers: { 'x-test-token': TEST_TOKEN },
      payload: { email: 'x@x.com' },
    });
    expect(off.statusCode).toBe(404);
  });

  it('usuário inexistente → 404', async () => {
    app = await startApp(withTestApi);
    const res = await app.inject({
      method: 'POST',
      url: '/__test__/session',
      headers: { 'x-test-token': TEST_TOKEN },
      payload: { userId: '00000000-0000-4000-8000-00000000abcd' },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('cleanDisplayName', () => {
  it('limpa espaços, corta em 60 e nunca fica vazio', () => {
    expect(cleanDisplayName('  Ana   Maria  ')).toBe('Ana Maria');
    expect(cleanDisplayName('')).toBe('Aventureiro');
    expect(cleanDisplayName(undefined)).toBe('Aventureiro');
    expect(cleanDisplayName('🐉'.repeat(70))).toBe('🐉'.repeat(60));
  });
});

describe('tabela users', () => {
  it('e-mail é único para sempre (ADR-007, achado 2)', async () => {
    const ids = sequentialIds(500);
    await db.orm.insert(users).values({ id: ids.uuid(), email: 'Bia@x.com', displayName: 'Bia' });
    await expect(
      db.orm.insert(users).values({ id: ids.uuid(), email: 'bia@X.com', displayName: 'Bia 2' }),
    ).rejects.toThrow();
    const [row] = await db.orm.select().from(users).where(eq(users.email, 'Bia@x.com'));
    expect(row?.updatedAt).toBeInstanceOf(Date);
  });
});

describe('publicado, atrás do repasse do site (ADR-009)', () => {
  const secret = 'segredo-do-repasse-com-mais-de-32-caracteres';
  const site = 'https://grimorio-teste.pages.dev';

  async function production() {
    return startApp({ APP_ENV: 'production', SITE_URL: site, PROXY_SECRET: secret, ...google });
  }

  function signIn(server: FastifyInstance, ip: string, withSecret = true) {
    return server.inject({
      method: 'POST',
      url: '/api/auth/sign-in/social',
      headers: {
        'content-type': 'application/json',
        origin: site,
        [CLIENT_IP_HEADER]: ip,
        ...(withSecret ? { [PROXY_SECRET_HEADER]: secret } : {}),
      },
      payload: { provider: 'google', callbackURL: '/personagens' },
    });
  }

  it('cada jogador tem o seu limite de tentativas: o IP vem do repasse', async () => {
    app = await production();
    for (let i = 0; i < 3; i++) expect((await signIn(app, '203.0.113.1')).statusCode).toBe(200);
    expect((await signIn(app, '203.0.113.1')).statusCode).toBe(429);
    // Outro jogador, mesmo instante: não herda o limite do primeiro.
    expect((await signIn(app, '203.0.113.2')).statusCode).toBe(200);
  });

  it('o endereço de retorno do Google é o do site publicado', async () => {
    app = await production();
    const res = await signIn(app, '203.0.113.3');
    const url = new URL(res.json<{ url: string }>().url);
    expect(url.searchParams.get('redirect_uri')).toBe(`${site}/api/auth/callback/google`);
    expect(res.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringMatching(/^__Secure-grimorio\./)]),
    );
  });

  it('sem o segredo (alguém chamando a API direto), 403 antes do login', async () => {
    app = await production();
    const res = await signIn(app, '203.0.113.4', false);
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: 'FORBIDDEN' });
  });
});
