import { describe, expect, it } from 'vitest';
import worker, { isApiPath, type SiteEnv } from './worker';

function env(): SiteEnv & { assetCalls: string[] } {
  const assetCalls: string[] = [];
  return {
    assetCalls,
    API_ORIGIN: undefined,
    API_PROXY_SECRET: undefined,
    ASSETS: {
      fetch: async (request: Request) => {
        assetCalls.push(new URL(request.url).pathname);
        return new Response('arquivo do site');
      },
    },
  };
}

describe('Worker do site (ADR-009)', () => {
  it('só /api e /api/* vão para a API', () => {
    expect(isApiPath('/api')).toBe(true);
    expect(isApiPath('/api/v1/session')).toBe(true);
    expect(isApiPath('/apiario')).toBe(false);
    expect(isApiPath('/dados')).toBe(false);
  });

  it('/api/* passa pelo repasse (sem configuração: 503 em JSON)', async () => {
    const e = env();
    const res = await worker.fetch(new Request('https://site.workers.dev/api/v1/session'), e);
    expect(res.status).toBe(503);
    expect(e.assetCalls).toEqual([]);
  });

  it('o resto é arquivo do site', async () => {
    const e = env();
    const res = await worker.fetch(new Request('https://site.workers.dev/dados'), e);
    expect(await res.text()).toBe('arquivo do site');
    expect(e.assetCalls).toEqual(['/dados']);
  });
});
