/**
 * Worker do site na Cloudflare (ADR-009). Os arquivos de `apps/web/dist` são servidos direto
 * pela Cloudflare, com `_headers` e `404.html` (ver wrangler.jsonc); este código só roda para
 * `/api/*` (`run_worker_first`) e leva o pedido até a API.
 */
import { proxyToApi, type ApiProxyEnv } from './api-proxy';

export interface SiteEnv extends ApiProxyEnv {
  /** Os arquivos do site (binding "ASSETS" do wrangler.jsonc). */
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export function isApiPath(pathname: string): boolean {
  return pathname === '/api' || pathname.startsWith('/api/');
}

export default {
  fetch(request: Request, env: SiteEnv): Promise<Response> {
    const { pathname } = new URL(request.url);
    // Fora de /api a Cloudflare nem chama o Worker; o ASSETS aqui é só por garantia.
    return isApiPath(pathname) ? proxyToApi(request, env) : env.ASSETS.fetch(request);
  },
};
