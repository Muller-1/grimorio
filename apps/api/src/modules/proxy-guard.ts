/**
 * Repasse /api do site (ADR-009). Publicado, o navegador só fala com o site; uma função da
 * Cloudflare Pages repassa /api/* para a API com dois cabeçalhos:
 * - `x-grimorio-proxy`: o segredo combinado (PROXY_SECRET), que prova que o pedido veio do site;
 * - `x-grimorio-client-ip`: o IP do jogador, como a Cloudflare viu.
 *
 * Com PROXY_SECRET definido, todo pedido sem o segredo certo recebe 403, menos as rotas de
 * sistema (o Render confere /health). Só por isso o IP informado é confiável: sem o repasse,
 * todos os jogadores chegariam com o IP da Cloudflare e dividiriam o mesmo limite de tentativas
 * do login.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { sendError } from './http';

export const PROXY_SECRET_HEADER = 'x-grimorio-proxy';
export const CLIENT_IP_HEADER = 'x-grimorio-client-ip';

/** Rotas que respondem sem o segredo (conferidas pelo padrão da rota, não pelo texto da URL). */
const OPEN_ROUTES = new Set(['/health', '/ready', '/version']);

const digest = (value: string) => createHash('sha256').update(value).digest();

/** Comparação em tempo constante (o tamanho do segredo também não vaza). */
export function proxySecretMatches(received: unknown, expected: string): boolean {
  if (typeof received !== 'string' || received.length === 0) return false;
  return timingSafeEqual(digest(received), digest(expected));
}

const proxyGuardPlugin: FastifyPluginAsync = async (app) => {
  const secret = app.env.PROXY_SECRET;
  if (!secret) return;

  app.addHook('onRequest', async (request, reply) => {
    // `routeOptions.url` é o padrão da rota já encontrada (ex.: "/api/auth/*"); não dá para
    // escapar com "/%61pi/..." ou barras duplas. Endereço desconhecido também exige o segredo.
    const route = request.routeOptions.url;
    if (route && OPEN_ROUTES.has(route)) return;
    if (proxySecretMatches(request.headers[PROXY_SECRET_HEADER], secret)) return;
    return sendError(reply, 403, 'FORBIDDEN', 'a API só atende pelo endereço do site');
  });
};

export const proxyGuard = fp(proxyGuardPlugin, { name: 'proxy-guard' });
