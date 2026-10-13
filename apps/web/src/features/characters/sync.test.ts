import {
  createBlankSheet,
  initialSectionRevs,
  type CharacterDocument,
  type LocalSheet,
} from '@grimorio/shared';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/** localStorage em memória (os testes rodam no Node). */
const memory = new Map<string, string>();
beforeAll(() => {
  Object.assign(globalThis, {
    localStorage: {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => void memory.set(k, v),
      removeItem: (k: string) => void memory.delete(k),
      key: (i: number) => [...memory.keys()][i] ?? null,
      get length() {
        return memory.size;
      },
    },
  });
});

const ID = '00000000-0000-4000-8000-000000000001';
const USER = '00000000-0000-4000-8000-0000000000aa';

function doc(
  edit: (s: LocalSheet) => void = () => {},
  revs = initialSectionRevs(),
): CharacterDocument {
  const sheet = createBlankSheet();
  edit(sheet);
  return { id: ID, version: 1, sectionRevs: revs, sheet, updatedAt: '2026-10-08T12:00:00.000Z' };
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

let requests: { method: string; url: string; body: unknown }[] = [];
let respond: (body: unknown) => Response;

beforeEach(() => {
  vi.useFakeTimers();
  memory.clear();
  requests = [];
  vi.stubGlobal('__APP_VERSION__', '0.1.0');
  vi.stubGlobal('__APP_COMMIT__', 'teste');
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    requests.push({ method: init.method ?? 'GET', url, body });
    return respond(body);
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function load() {
  vi.resetModules();
  const sync = await import('./sync');
  const { useSheetStore } = await import('@/features/sheet/store');
  return { ...sync, useSheetStore };
}

describe('salvamento automático da ficha da conta', () => {
  it('edição → espera um instante → envia só a seção alterada → "salvo"', async () => {
    const { startSync, useSyncStore, useSheetStore } = await load();
    startSync(doc(), USER);
    expect(useSheetStore.getState().source).toEqual({ kind: 'account', id: ID });

    respond = (body) => {
      const sections = (body as { sections: Record<string, unknown> }).sections;
      return json(
        200,
        doc((s) => Object.assign(s, sections), { ...initialSectionRevs(), identity: 2 }),
      );
    };
    useSheetStore.getState().edit((d) => void (d.identity.name = 'Thalia'));
    expect(useSyncStore.getState().status).toBe('pending');
    expect(requests).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(900);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      method: 'PATCH',
      url: `/api/v1/characters/${ID}`,
      body: { baseRevs: { identity: 1 } },
    });
    expect(Object.keys((requests[0]!.body as { sections: object }).sections)).toEqual(['identity']);
    expect(useSyncStore.getState().status).toBe('saved');
  });

  it('sem internet: guarda no aparelho e tenta de novo depois', async () => {
    const { startSync, useSyncStore, useSheetStore, hasUnsyncedChanges } = await load();
    startSync(doc(), USER);
    respond = () => {
      throw new TypeError('rede fora');
    };
    useSheetStore.getState().edit((d) => void (d.state.inspiration = 1));
    await vi.advanceTimersByTimeAsync(900);
    expect(['offline', 'error']).toContain(useSyncStore.getState().status);
    expect(hasUnsyncedChanges(ID, USER)).toBe(true);

    respond = () =>
      json(
        200,
        doc((s) => (s.state.inspiration = 1), { ...initialSectionRevs(), state: 2 }),
      );
    await vi.advanceTimersByTimeAsync(3_100);
    expect(useSyncStore.getState().status).toBe('saved');
    expect(hasUnsyncedChanges(ID, USER)).toBe(false);
  });

  it('conflito: mostra a escolha e não reenvia sozinho; "manter a minha" reenvia', async () => {
    const { startSync, useSyncStore, useSheetStore, resolveConflict } = await load();
    startSync(doc(), USER);
    const theirs = doc((s) => (s.identity.name = 'Do PC')).sheet.identity;
    respond = () =>
      json(409, {
        code: 'CONFLICT_SECTION',
        message: 'x',
        details: { conflicts: [{ section: 'identity', serverRev: 2, server: theirs }] },
      });
    useSheetStore.getState().edit((d) => void (d.identity.name = 'Do celular'));
    await vi.advanceTimersByTimeAsync(900);
    expect(useSyncStore.getState().status).toBe('conflict');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(requests).toHaveLength(1);

    respond = (body) =>
      json(
        200,
        doc((s) => Object.assign(s, (body as { sections: object }).sections), {
          ...initialSectionRevs(),
          identity: 3,
        }),
      );
    resolveConflict('mine');
    await vi.advanceTimersByTimeAsync(10);
    expect(requests[1]).toMatchObject({ body: { baseRevs: { identity: 2 } } });
    expect(useSyncStore.getState().status).toBe('saved');
    expect(useSheetStore.getState().sheet.identity.name).toBe('Do celular');
  });

  it('ao reabrir, alterações não enviadas deste aparelho vão primeiro', async () => {
    const first = await load();
    first.startSync(doc(), USER);
    respond = () => json(503, { code: 'INTERNAL', message: 'x' });
    first.useSheetStore.getState().edit((d) => void (d.state.inspiration = 2));
    await vi.advanceTimersByTimeAsync(900);

    const second = await load();
    respond = (body) =>
      json(
        200,
        doc((s) => Object.assign(s, (body as { sections: object }).sections), {
          ...initialSectionRevs(),
          state: 2,
        }),
      );
    second.startSync(doc(), USER);
    expect(second.useSheetStore.getState().sheet.state.inspiration).toBe(2);
    await vi.advanceTimersByTimeAsync(10);
    expect(requests.at(-1)).toMatchObject({ method: 'PATCH', body: { baseRevs: { state: 1 } } });
  });

  it('o cache de outro usuário é ignorado', async () => {
    const { readCache, startSync } = await load();
    startSync(doc(), USER);
    expect(readCache(ID, USER)).not.toBeNull();
    expect(readCache(ID, '00000000-0000-4000-8000-0000000000bb')).toBeNull();
  });
});
