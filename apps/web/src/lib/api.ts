import type { ApiError } from '@grimorio/shared';

/**
 * Cliente da API (ADR-008). A API mora em /api no mesmo endereço do site, então o cookie de
 * sessão vai sozinho em todo pedido. Nunca lança: falha de rede vira `status: 0`.
 */
export type ApiResult<T> =
  { ok: true; status: number; data: T } | { ok: false; status: number; error: ApiError | null };

/** Falha de rede, API fora do ar ou site sem API (o servidor devolveu HTML, não JSON). */
export function isUnreachable(result: ApiResult<unknown>): boolean {
  return !result.ok && (result.status === 0 || result.status >= 500 || result.error === null);
}

export async function api<T>(
  path: string,
  init: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown } = {},
): Promise<ApiResult<T>> {
  const method = init.method ?? 'GET';
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: {
        accept: 'application/json',
        ...(init.body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    });
  } catch {
    return { ok: false, status: 0, error: null };
  }

  const isJson = (response.headers.get('content-type') ?? '').includes('application/json');
  let payload: unknown = null;
  if (isJson && response.status !== 204) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  }
  if (response.ok) {
    // 2xx sem JSON (ex.: um site sem API devolvendo o index.html) não é a nossa API.
    if (!isJson && response.status !== 204)
      return { ok: false, status: response.status, error: null };
    return { ok: true, status: response.status, data: payload as T };
  }
  const error =
    payload && typeof payload === 'object' && 'code' in payload ? (payload as ApiError) : null;
  return { ok: false, status: response.status, error };
}
