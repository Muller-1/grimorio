/**
 * Repasse /api/* do site para a API (ADR-009). Roda na Cloudflare Pages, como função
 * (`functions/api/[[path]].ts`), e não vai para o pacote do navegador.
 *
 * Por que existe: o cookie de sessão só funciona em todos os navegadores se for "do próprio
 * site" (ADR-007, achado 1). Então o navegador fala só com o endereço do site, e esta função
 * leva o pedido até a API (no Render) e traz a resposta de volta, sem mexer nela.
 *
 * - O que vem do navegador e poderia enganar a API (`x-forwarded-*`, `cf-*`, os nossos
 *   `x-grimorio-*`) é descartado; a função põe o IP real do jogador e o segredo combinado.
 * - Redirecionamentos (o retorno do Google) voltam para o navegador como vieram.
 * - Sem configuração ou com a API fora do ar, responde JSON 503/502: o site mostra "contas
 *   indisponíveis" e continua funcionando sem conta.
 */

export interface ApiProxyEnv {
  /** Endereço da API, só a origem. Ex.: https://grimorio-api.onrender.com */
  API_ORIGIN?: string | undefined;
  /** O mesmo valor de PROXY_SECRET da API. */
  API_PROXY_SECRET?: string | undefined;
}

export const PROXY_SECRET_HEADER = 'x-grimorio-proxy';
export const CLIENT_IP_HEADER = 'x-grimorio-client-ip';

/** Cabeçalhos que não passam adiante (de conexão, ou que alguém poderia forjar). */
const DROPPED = new Set([
  'connection',
  'keep-alive',
  'proxy-connection',
  'transfer-encoding',
  'upgrade',
  'te',
  'trailer',
  'host',
  'content-length',
  'forwarded',
  'x-real-ip',
]);
const DROPPED_PREFIXES = ['x-forwarded-', 'cf-', 'x-grimorio-'];

function dropped(name: string): boolean {
  return DROPPED.has(name) || DROPPED_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ code: 'INTERNAL', message }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/** Origem http(s) válida, sem caminho (ou `null`). */
function parseOrigin(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return new URL(url.origin);
  } catch {
    return null;
  }
}

export async function proxyToApi(
  request: Request,
  env: ApiProxyEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const origin = parseOrigin(env.API_ORIGIN);
  const secret = env.API_PROXY_SECRET?.trim();
  if (!origin || !secret) return jsonError(503, 'a API ainda não foi configurada neste site');

  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, origin);

  const headers = new Headers();
  request.headers.forEach((value, name) => {
    if (!dropped(name.toLowerCase())) headers.set(name, value);
  });
  // `cf-connecting-ip` é a Cloudflare quem preenche (o navegador não consegue forjar).
  const clientIp = request.headers.get('cf-connecting-ip');
  if (clientIp) headers.set(CLIENT_IP_HEADER, clientIp);
  headers.set(PROXY_SECRET_HEADER, secret);
  headers.set('x-forwarded-host', incoming.host);
  headers.set('x-forwarded-proto', incoming.protocol.replace(':', ''));

  const method = request.method.toUpperCase();
  const init: RequestInit = { method, headers, redirect: 'manual' };
  // Corpos da API são pequenos (até 256 kB): ler inteiro evita detalhes de streaming.
  if (method !== 'GET' && method !== 'HEAD') init.body = await request.arrayBuffer();

  let upstream: Response;
  try {
    upstream = await fetchImpl(target.href, init);
  } catch {
    return jsonError(502, 'a API não respondeu');
  }
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: upstream.headers,
  });
}
