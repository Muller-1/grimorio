import { createBlankSheet } from '@grimorio/shared';
import { beforeAll, describe, expect, it } from 'vitest';

/** localStorage em memória (os testes rodam no Node). */
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

describe('persistência da ficha', () => {
  it('sem nada salvo, começa em branco', async () => {
    const { loadSheet } = await import('./store');
    const r = loadSheet();
    expect(r.recoveredFromBadData).toBe(false);
    expect(r.sheet).toEqual(createBlankSheet());
  });

  it('dado ilegível vira cópia de segurança e a ficha começa em branco', async () => {
    const { loadSheet, SHEET_BACKUP_KEY, SHEET_STORAGE_KEY } = await import('./store');
    memory.set(SHEET_STORAGE_KEY, '{"schemaVersion": 99, "coisa": true}');
    const r = loadSheet();
    expect(r.recoveredFromBadData).toBe(true);
    expect(memory.get(SHEET_BACKUP_KEY)).toContain('coisa');
  });

  it('edita, normaliza e salva a cada mudança', async () => {
    memory.clear();
    const { useSheetStore, SHEET_STORAGE_KEY } = await import('./store');
    const { edit, dispatch } = useSheetStore.getState();
    edit((d) => {
      d.build.level = 3;
      d.state.hp.current = 20;
    });
    // nível 3, d8, Con 10 → PV máximo 8 + 5 + 5 = 18: o PV atual é ajustado
    expect(useSheetStore.getState().sheet.state.hp.current).toBe(18);
    dispatch({ type: 'damage', amount: 4 });
    const saved = JSON.parse(memory.get(SHEET_STORAGE_KEY) ?? '{}');
    expect(saved.state.hp.current).toBe(14);
  });

  it('edição inválida é ignorada (ex.: nível 0)', async () => {
    const { useSheetStore } = await import('./store');
    const before = useSheetStore.getState().sheet;
    useSheetStore.getState().edit((d) => void (d.build.level = 0));
    expect(useSheetStore.getState().sheet).toBe(before);
  });
});
