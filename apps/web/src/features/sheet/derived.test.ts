import * as rules from '@grimorio/rules';
import { createBlankSheet } from '@grimorio/shared';
import { beforeAll, describe, expect, it, vi } from 'vitest';

// Conta quantas vezes o site pede o cálculo da ficha (o motor de verdade continua rodando).
vi.mock('@grimorio/rules', async (original) => {
  const actual = await original<typeof rules>();
  return { ...actual, deriveSheet: vi.fn(actual.deriveSheet) };
});

const memory = new Map<string, string>();
beforeAll(() => {
  Object.assign(globalThis, {
    localStorage: {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => void memory.set(k, v),
      removeItem: (k: string) => void memory.delete(k),
    },
  });
});

describe('ficha derivada', () => {
  it('a mesma ficha é calculada uma vez, por mais painéis que peçam', async () => {
    const { derivedOf } = await import('./derived');
    const calls = vi.mocked(rules.deriveSheet);
    calls.mockClear();
    const sheet = createBlankSheet();
    const first = derivedOf(sheet);
    for (let i = 0; i < 10; i++) expect(derivedOf(sheet)).toBe(first);
    expect(calls).toHaveBeenCalledTimes(1);
    derivedOf(createBlankSheet());
    expect(calls).toHaveBeenCalledTimes(2);
  });

  it('cada ação na ficha aberta calcula a ficha nova uma vez só', async () => {
    const { derivedOf } = await import('./derived');
    const { useSheetStore } = await import('./store');
    const calls = vi.mocked(rules.deriveSheet);
    derivedOf(useSheetStore.getState().sheet); // a tela já mostrou a ficha
    calls.mockClear();
    useSheetStore.getState().dispatch({ type: 'damage', amount: 1 });
    const next = useSheetStore.getState().sheet;
    for (let i = 0; i < 5; i++) derivedOf(next);
    expect(calls).toHaveBeenCalledTimes(1);
  });

  it('cada edição calcula a ficha nova uma vez só', async () => {
    const { derivedOf } = await import('./derived');
    const { useSheetStore } = await import('./store');
    const calls = vi.mocked(rules.deriveSheet);
    calls.mockClear();
    useSheetStore.getState().edit((d) => void (d.identity.name = 'Thalia'));
    const next = useSheetStore.getState().sheet;
    for (let i = 0; i < 5; i++) derivedOf(next);
    expect(calls).toHaveBeenCalledTimes(1);
  });
});
