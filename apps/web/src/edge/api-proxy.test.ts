import { describe, expect, it } from 'vitest';
import { CLIENT_IP_HEADER, PROXY_SECRET_HEADER, proxyToApi, type ApiProxyEnv } from './api-proxy';

const SECRET = 'segredo-do-repasse-com-mais-de-32-caracteres';
const env: ApiProxyEnv = {
  API_ORIGIN: 'https://grimorio-api.onrender.com',
  API_PROXY_SECRET: SECRET,
};

interface Call {
  url: string;
  init: RequestInit;
  headers: Headers;
}

/** fetch falso: guarda o pedido e responde o que o teste mandar. */
function fakeFetch(respond: () => Response = () => Response.json({ ok: true })) {
  const calls: Call[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {}, headers: new Headers(init?.headers) });
    return respond();
  }) as typeof fetch;
  return { calls, impl };
}

describe('repasse /api do site para a API (ADR-009)', () => {
  it('sem API configurada responde 503 em JSON (o site mostra "contas indisponíveis")', async () => {
    const { calls, impl } = fakeFetch();
    for (const partial of [{}, { API_ORIGIN: env.API_ORIGIN }, { API_PROXY_SECRET: SECRET }]) {
      const res = await proxyToApi(
        new Request('https://site.pages.dev/api/v1/session'),
        partial,
        impl,
      );
      expect(res.status).toBe(503);
      expect(await res.json()).toMatchObject({ code: 'INTERNAL' });
    }
    expect(calls).toHaveLength(0);
  });

  it('leva método, caminho, busca, corpo, cookie e origem até a API', async () => {
    const { calls, impl } = fakeFetch();
    const body = JSON.stringify({ name: 'Lia' });
    await proxyToApi(
      new Request('https://site.pages.dev/api/v1/characters/abc?x=1', {
        method: 'PATCH',
        body,
        headers: {
          'content-type': 'application/json',
          cookie: '__Secure-grimorio.session_token=abc',
          origin: 'https://site.pages.dev',
        },
      }),
      env,
      impl,
    );
    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call!.url).toBe('https://grimorio-api.onrender.com/api/v1/characters/abc?x=1');
    expect(call!.init.method).toBe('PATCH');
    expect(call!.init.redirect).toBe('manual');
    expect(new TextDecoder().decode(call!.init.body as ArrayBuffer)).toBe(body);
    expect(call!.headers.get('cookie')).toBe('__Secure-grimorio.session_token=abc');
    expect(call!.headers.get('origin')).toBe('https://site.pages.dev');
    expect(call!.headers.get('x-forwarded-host')).toBe('site.pages.dev');
    expect(call!.headers.get('x-forwarded-proto')).toBe('https');
  });

  it('põe o segredo e o IP que a Cloudflare viu; descarta o que o navegador tentou forjar', async () => {
    const { calls, impl } = fakeFetch();
    await proxyToApi(
      new Request('https://site.pages.dev/api/auth/sign-in/social', {
        method: 'POST',
        headers: {
          'cf-connecting-ip': '203.0.113.7',
          [CLIENT_IP_HEADER]: '1.1.1.1',
          [PROXY_SECRET_HEADER]: 'chute',
          'x-forwarded-for': '1.1.1.1',
          'x-real-ip': '1.1.1.1',
          forwarded: 'for=1.1.1.1',
        },
      }),
      env,
      impl,
    );
    const headers = calls[0]!.headers;
    expect(headers.get(PROXY_SECRET_HEADER)).toBe(SECRET);
    expect(headers.get(CLIENT_IP_HEADER)).toBe('203.0.113.7');
    expect(headers.get('x-forwarded-for')).toBeNull();
    expect(headers.get('x-real-ip')).toBeNull();
    expect(headers.get('forwarded')).toBeNull();
    expect(headers.get('cf-connecting-ip')).toBeNull();
  });

  it('sem o IP da Cloudflare não inventa um', async () => {
    const { calls, impl } = fakeFetch();
    await proxyToApi(
      new Request('https://site.pages.dev/api/v1/session', {
        headers: { [CLIENT_IP_HEADER]: '1.1.1.1' },
      }),
      env,
      impl,
    );
    expect(calls[0]!.headers.get(CLIENT_IP_HEADER)).toBeNull();
  });

  it('devolve redirecionamentos e todos os cookies como vieram (retorno do Google)', async () => {
    const { impl } = fakeFetch(() => {
      const headers = new Headers({ location: 'https://site.pages.dev/personagens' });
      headers.append('set-cookie', '__Secure-grimorio.session_token=s1; Path=/; HttpOnly; Secure');
      headers.append('set-cookie', '__Secure-grimorio.state=; Max-Age=0; Path=/');
      return new Response(null, { status: 302, headers });
    });
    const res = await proxyToApi(
      new Request('https://site.pages.dev/api/auth/callback/google?code=c&state=s'),
      env,
      impl,
    );
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('https://site.pages.dev/personagens');
    expect(res.headers.getSetCookie()).toHaveLength(2);
  });

  it('API fora do ar vira 502 em JSON', async () => {
    const impl = (async () => {
      throw new TypeError('fetch failed');
    }) as typeof fetch;
    const res = await proxyToApi(new Request('https://site.pages.dev/api/v1/session'), env, impl);
    expect(res.status).toBe(502);
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('API_ORIGIN com caminho ou barra no fim usa só a origem', async () => {
    const { calls, impl } = fakeFetch();
    await proxyToApi(
      new Request('https://site.pages.dev/api/v1/session'),
      { ...env, API_ORIGIN: ' https://grimorio-api.onrender.com/qualquer/ ' },
      impl,
    );
    expect(calls[0]!.url).toBe('https://grimorio-api.onrender.com/api/v1/session');
  });
});
