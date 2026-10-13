// Cloudflare Pages Function: todo pedido para /api/* do site passa por aqui e vai para a API
// (ADR-009). A lógica e os testes ficam em apps/web/src/edge/api-proxy.ts; este arquivo só liga
// a função ao endereço. Variáveis (Cloudflare → Settings → Variables and Secrets):
//   API_ORIGIN        endereço da API no Render (ex.: https://grimorio-api.onrender.com)
//   API_PROXY_SECRET  o mesmo valor de PROXY_SECRET da API (tipo "Secret")
import { proxyToApi, type ApiProxyEnv } from '../../apps/web/src/edge/api-proxy';

export const onRequest = (context: { request: Request; env: ApiProxyEnv }): Promise<Response> =>
  proxyToApi(context.request, context.env);
