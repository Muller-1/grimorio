/**
 * Limite de pedidos nas rotas de escrita (docs/plano-escala-e-campanha.md, seção 3). O login já
 * tem o limite da biblioteca; aqui ficam salvar ficha, ações, campanhas e propostas.
 *
 * Janela fixa por IP, guardada na memória: serve para uma instância da API (hoje é uma). Com
 * mais instâncias, cada uma conta a sua parte; para um limite exato, uma regra de limite na
 * Cloudflare na frente de /api.
 */
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { sendError } from '../modules/http';
import { CLIENT_IP_HEADER } from '../modules/proxy-guard';

export interface RateRule {
  name: string;
  /** Caminho (sem a busca) que a regra conta. */
  matches(path: string, method: string): boolean;
  limit: number;
  windowMs: number;
}

const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const MINUTE = 60_000;

export const DEFAULT_RATE_RULES: RateRule[] = [
  {
    name: 'escrita',
    matches: (path, method) => WRITE_METHODS.has(method) && path.startsWith('/api/v1/'),
    limit: 120,
    windowMs: MINUTE,
  },
  {
    // Convites: tentar códigos aleatórios não vale a pena.
    name: 'convite',
    matches: (path, method) => method === 'POST' && path === '/api/v1/campaigns/join',
    limit: 20,
    windowMs: 60 * MINUTE,
  },
  {
    name: 'propostas',
    matches: (path, method) =>
      method === 'POST' && /^\/api\/v1\/characters\/[^/]+\/proposals$/.test(path),
    limit: 30,
    windowMs: 10 * MINUTE,
  },
];

/** IP de quem pediu: o que o site informou (só confiável com o segredo do repasse) ou o da conexão. */
function clientIp(request: FastifyRequest): string {
  const forwarded = request.headers[CLIENT_IP_HEADER];
  if (request.server.env.PROXY_SECRET && typeof forwarded === 'string' && forwarded)
    return forwarded;
  return request.ip;
}

const rateLimitPlugin: FastifyPluginAsync<{ rules?: RateRule[] }> = async (app, options) => {
  const rules = options.rules ?? DEFAULT_RATE_RULES;
  const buckets = new Map<string, { count: number; resetAt: number }>();

  app.addHook('onRequest', async (request, reply) => {
    const path = request.url.split('?')[0]!;
    const now = app.ports.clock.now().getTime();
    // De tempos em tempos, esquece as janelas que já passaram.
    if (buckets.size > 5_000) {
      for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
    }
    for (const rule of rules) {
      if (!rule.matches(path, request.method)) continue;
      const key = `${rule.name}:${clientIp(request)}`;
      let bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        bucket = { count: 0, resetAt: now + rule.windowMs };
        buckets.set(key, bucket);
      }
      bucket.count += 1;
      if (bucket.count > rule.limit) {
        reply.header('retry-after', String(Math.ceil((bucket.resetAt - now) / 1000)));
        return sendError(reply, 429, 'RATE_LIMITED', 'muitos pedidos; tente daqui a pouco');
      }
    }
  });
};

export const rateLimit = fp(rateLimitPlugin, { name: 'rate-limit' });
