/**
 * SPIKE DESCARTÁVEL (Etapa 9, decisão #7): Better Auth + Fastify 5 + Drizzle + Postgres.
 * Responde às perguntas do ADR-007 com código que roda. Não faz parte do produto.
 *
 *   cd spikes/auth && npm install && npm run spike   (precisa do Postgres do docker compose)
 */
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import { testUtils } from 'better-auth/plugins';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import Fastify from 'fastify';
import pg from 'pg';
import * as schema from './schema';

const ADMIN_URL = process.env.ADMIN_URL ?? 'postgres://app:app@localhost:5432/postgres';
const DB_NAME = 'spike_auth_test';
const DB_URL = new URL(ADMIN_URL);
DB_URL.pathname = `/${DB_NAME}`;

const step = (name: string) => console.log(`\n▶ ${name}`);
const ok = (msg: string) => console.log(`  ✔ ${msg}`);

// ---------- banco novo, com o schema gerado pelo `npx auth generate` ----------
step('banco e schema');
const admin = new pg.Client({ connectionString: ADMIN_URL });
await admin.connect();
await admin.query(`drop database if exists ${DB_NAME} with (force)`);
await admin.query(`create database ${DB_NAME}`);
await admin.end();
execSync('npx drizzle-kit push --force', { stdio: 'ignore' });
ok('tabelas users, sessions, accounts, verifications criadas');

const pool = new pg.Pool({ connectionString: DB_URL.href });
const db = drizzle(pool, { schema });

// Porta IdGenerator do projeto: ids previsíveis nos testes.
let next = 1;
const ids = { uuid: () => `00000000-0000-4000-8000-${String(next++).padStart(12, '0')}` };

const auth = betterAuth({
  baseURL: 'http://localhost:3000',
  // O site (outra origem) precisa estar na lista para servir de destino depois do login.
  trustedOrigins: ['http://localhost:5173'],
  secret: 'segredo-do-spike-com-mais-de-32-caracteres!!',
  database: drizzleAdapter(db, { provider: 'pg', usePlural: true, schema }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    discord: { clientId: 'id-falso-do-spike', clientSecret: 'segredo-falso' },
  },
  user: {
    fields: { name: 'displayName' },
    additionalFields: { isSynthetic: { type: 'boolean', defaultValue: false, input: false } },
  },
  advanced: { database: { generateId: () => ids.uuid() } },
  // Só fora de produção: o equivalente ao /__test__/session do plano v2 (15.4).
  plugins: [testUtils()],
});

// ---------- Fastify: o handler do guia oficial ----------
const app = Fastify();
app.route({
  method: ['GET', 'POST'],
  url: '/api/auth/*',
  async handler(request, reply) {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const req = new Request(url.toString(), {
      method: request.method,
      headers: fromNodeHeaders(request.headers),
      ...(request.body ? { body: JSON.stringify(request.body) } : {}),
    });
    const response = await auth.handler(req);
    reply.status(response.status);
    response.headers.forEach((value, key) => reply.header(key, value));
    return reply.send(response.body ? await response.text() : null);
  },
});
app.get('/me', async (request, reply) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
  if (!session) return reply.code(401).send({ error: 'unauthenticated' });
  return { id: session.user.id, email: session.user.email, name: session.user.name };
});
await app.ready();

const json = { 'content-type': 'application/json', origin: 'http://localhost:3000' };
const cookieFrom = (setCookie: string | string[] | undefined) =>
  [setCookie ?? []].flat().map((c) => c.split(';')[0]).join('; ');

// ---------- 1. cadastro e login com e-mail e senha ----------
step('cadastro com e-mail e senha');
const signUp = await app.inject({
  method: 'POST',
  url: '/api/auth/sign-up/email',
  headers: json,
  payload: { email: 'ana@exemplo.com', password: 'senha-bem-grande-123', name: 'Ana' },
});
assert.equal(signUp.statusCode, 200, signUp.body);
const setCookie = signUp.headers['set-cookie'];
console.log('  set-cookie:', [setCookie].flat()[0]?.replace(/=[^;]+/, '=…'));
assert.match(String([setCookie].flat()[0]), /HttpOnly/i);
assert.match(String([setCookie].flat()[0]), /SameSite=Lax/i);
const cookie = cookieFrom(setCookie);
ok('200 com cookie HttpOnly e SameSite=Lax');

const me = await app.inject({ url: '/me', headers: { cookie } });
assert.equal(me.statusCode, 200);
assert.equal(me.json().email, 'ana@exemplo.com');
ok(`sessão lida numa rota nossa: ${me.body}`);

const [row] = await db.select().from(schema.users).where(eq(schema.users.email, 'ana@exemplo.com'));
assert.equal(row?.id, '00000000-0000-4000-8000-000000000001');
assert.equal(row?.displayName, 'Ana');
assert.equal(row?.isSynthetic, false);
ok('id veio da nossa porta IdGenerator; "name" gravado em display_name; campo extra is_synthetic');

step('senha errada e usuário sem sessão');
const bad = await app.inject({
  method: 'POST',
  url: '/api/auth/sign-in/email',
  headers: json,
  payload: { email: 'ana@exemplo.com', password: 'errada-errada' },
});
assert.equal(bad.statusCode, 401);
assert.equal((await app.inject('/me')).statusCode, 401);
ok('401 nos dois casos');

step('cadastro repetido com o mesmo e-mail (outra caixa)');
const dup = await app.inject({
  method: 'POST',
  url: '/api/auth/sign-up/email',
  headers: json,
  payload: { email: 'ANA@exemplo.com', password: 'senha-bem-grande-123', name: 'Ana 2' },
});
console.log(`  status ${dup.statusCode}: ${dup.body.slice(0, 120)}`);
assert.notEqual(dup.statusCode, 200);
ok('recusado (o e-mail é normalizado para minúsculas)');

step('pedido vindo de um site que não está na lista (CSRF)');
const evil = await app.inject({
  method: 'POST',
  url: '/api/auth/sign-in/email',
  headers: { ...json, origin: 'https://site-malicioso.example', cookie },
  payload: { email: 'ana@exemplo.com', password: 'senha-bem-grande-123' },
});
console.log(`  status ${evil.statusCode}: ${evil.body.slice(0, 80)}`);
assert.equal(evil.statusCode, 403);
ok('recusado: só as origens em trustedOrigins podem usar os cookies');

// ---------- 2. login com Discord (sem credenciais reais: só a primeira perna) ----------
step('login com Discord');
const social = await app.inject({
  method: 'POST',
  url: '/api/auth/sign-in/social',
  headers: json,
  payload: { provider: 'discord', callbackURL: 'http://localhost:5173/ficha' },
});
assert.equal(social.statusCode, 200, social.body);
const redirect = new URL(social.json().url);
assert.equal(redirect.hostname, 'discord.com');
assert.equal(redirect.searchParams.get('client_id'), 'id-falso-do-spike');
console.log(`  redirect: ${redirect.origin}${redirect.pathname}?scope=${redirect.searchParams.get('scope')}`);
ok('gera o endereço de autorização do Discord (state + PKCE em cookie)');

// ---------- 3. sessão de teste sem e-mail, para o bot (plano v2, 15.4) ----------
step('sessão de teste pelo plugin testUtils');
const ctx = await auth.$context;
const bot = ctx.test.createUser({ email: 'canario@exemplo.com', name: 'Canário', isSynthetic: true });
await ctx.test.saveUser(bot);
const login = await ctx.test.login({ userId: bot.id });
const botCookie = login.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
const meBot = await app.inject({ url: '/me', headers: { cookie: botCookie } });
assert.equal(meBot.statusCode, 200);
assert.equal(meBot.json().email, 'canario@exemplo.com');
ok('login por id, sem senha nem e-mail: cookie válido para a API');

// ---------- 4. o que a biblioteca faz com o relógio ----------
step('relógio');
const [session] = await db.select().from(schema.sessions).limit(1);
const days = (session!.expiresAt.getTime() - session!.createdAt.getTime()) / 86_400_000;
console.log(`  sessão expira em ${days.toFixed(1)} dias (relógio do sistema; não usa a nossa porta Clock)`);

await app.close();
await pool.end();
console.log('\nSPIKE OK');
