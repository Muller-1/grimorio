import { afterEach, describe, expect, it, vi } from 'vitest';

vi.stubGlobal('__APP_VERSION__', '0.1.0');
vi.stubGlobal('__APP_COMMIT__', 'teste');
vi.stubEnv('VITE_ACCOUNTS', 'true');

const { safeNext, useAuthStore, RETRY_DELAYS_MS, SLOW_AFTER_MS, resetAuthRetriesForTests } =
  await import('./store');

describe('safeNext (para onde voltar depois do login)', () => {
  it('só aceita caminhos do próprio site', () => {
    expect(safeNext('/personagem?id=abc')).toBe('/personagem?id=abc');
    expect(safeNext('//site-malicioso.example')).toBe('/personagens');
    expect(safeNext('/\\site-malicioso.example')).toBe('/personagens');
    expect(safeNext('https://site-malicioso.example')).toBe('/personagens');
    expect(safeNext(null)).toBe('/personagens');
  });
});

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });

/** A API "acordada": ninguém logado, Google configurado. */
const awake = (url: string) =>
  Promise.resolve(json(url.endsWith('/session') ? { user: null } : { google: true }));

describe('servidor dormindo (plano grátis da API)', () => {
  afterEach(() => {
    resetAuthRetriesForTests();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('tenta de novo sozinho, avisa quando demora e volta ao normal quando acorda', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string): Promise<Response> =>
      Promise.reject(new TypeError('sem rede')),
    );
    vi.stubGlobal('fetch', fetchMock);

    await useAuthStore.getState().refresh();
    let state = useAuthStore.getState();
    expect(state.status).toBe('unavailable');
    expect(state.checking).toBe(false);
    expect(state.nextRetryAt).toBe(Date.now() + RETRY_DELAYS_MS[0]);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Segunda tentativa sozinha: o servidor responde, mas devagar (está acordando).
    let wake!: () => void;
    fetchMock.mockImplementation(
      (url: string) =>
        new Promise<Response>((resolve) => {
          const previous = wake;
          wake = () => {
            previous?.();
            void awake(url).then(resolve);
          };
        }),
    );
    await vi.advanceTimersByTimeAsync(RETRY_DELAYS_MS[0]);
    expect(useAuthStore.getState().checking).toBe(true);
    expect(useAuthStore.getState().slow).toBe(false);
    await vi.advanceTimersByTimeAsync(SLOW_AFTER_MS);
    expect(useAuthStore.getState().slow).toBe(true);

    wake();
    await vi.advanceTimersByTimeAsync(0);
    state = useAuthStore.getState();
    expect(state.status).toBe('signed-out');
    expect(state.googleEnabled).toBe(true);
    expect(state.slow).toBe(false);
    expect(state.nextRetryAt).toBeNull();
  });

  it('desiste das tentativas sozinhas depois da última (fica o botão)', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(() => Promise.reject(new TypeError('sem rede')));
    vi.stubGlobal('fetch', fetchMock);

    await useAuthStore.getState().refresh();
    for (const delay of RETRY_DELAYS_MS) await vi.advanceTimersByTimeAsync(delay);
    expect(fetchMock).toHaveBeenCalledTimes(2 * (RETRY_DELAYS_MS.length + 1));
    expect(useAuthStore.getState().nextRetryAt).toBeNull();

    // Nada mais acontece sozinho.
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(fetchMock).toHaveBeenCalledTimes(2 * (RETRY_DELAYS_MS.length + 1));
  });

  it('dois pedidos ao mesmo tempo viram uma consulta só', async () => {
    const fetchMock = vi.fn(awake);
    vi.stubGlobal('fetch', fetchMock);
    await Promise.all([useAuthStore.getState().refresh(), useAuthStore.getState().refresh()]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(useAuthStore.getState().status).toBe('signed-out');
  });
});
