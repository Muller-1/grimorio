import { beforeAll, describe, expect, it } from 'vitest';
import { setRng } from '@/ports/rng';

/** localStorage em memória (os testes rodam no Node). Precisa existir ANTES de carregar o store. */
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

const store = async () => (await import('./store')).useDiceStore;

describe('atalhos (RF-72)', () => {
  it('primeira visita começa com exemplos, incluindo a magia de 100d2', async () => {
    const shortcuts = (await store()).getState().shortcuts;
    expect(shortcuts.map((s) => s.expression)).toContain('100d2');
  });

  it('cria atalho na forma canônica e salva no navegador com versão', async () => {
    const s = await store();
    const r = s.getState().addShortcut({ label: '  Dano da espada  ', expression: '1D8 + 3' });
    expect(r.ok && r.shortcut).toMatchObject({ label: 'Dano da espada', expression: '1d8+3' });
    const { SHORTCUTS_STORAGE_KEY } = await import('./store');
    const saved = JSON.parse(memory.get(SHORTCUTS_STORAGE_KEY) ?? '{}');
    expect(saved.schemaVersion).toBe(1);
    expect(saved.shortcuts.at(-1).expression).toBe('1d8+3');
  });

  it('recusa nome vazio, expressão inválida e variáveis (chegam no R2)', async () => {
    const s = (await store()).getState();
    expect(s.addShortcut({ label: ' ', expression: '1d6' })).toEqual({
      ok: false,
      error: { kind: 'label' },
    });
    expect(s.addShortcut({ label: 'x', expression: '1d' })).toMatchObject({
      ok: false,
      error: { kind: 'expression', error: { code: 'expected-sides' } },
    });
    expect(s.addShortcut({ label: 'x', expression: '1d6+@for' })).toMatchObject({
      ok: false,
      error: { kind: 'expression', error: { code: 'variable-unavailable' } },
    });
  });

  it('editar e apagar', async () => {
    const s = await store();
    const created = s.getState().addShortcut({ label: 'Cura', expression: '2d4+2' });
    if (!created.ok) throw new Error('falhou');
    const id = created.shortcut.id;
    s.getState().updateShortcut(id, { label: 'Poção', expression: '2d4+2' });
    expect(s.getState().shortcuts.find((x) => x.id === id)?.label).toBe('Poção');
    s.getState().removeShortcut(id);
    expect(s.getState().shortcuts.find((x) => x.id === id)).toBeUndefined();
  });

  it('rolar um atalho usa o nome dele no histórico', async () => {
    const s = await store();
    setRng({ int: (_min, max) => max });
    const magic = s.getState().shortcuts.find((x) => x.expression === '100d2')!;
    const r = s.getState().roll({ label: magic.label, expression: magic.expression });
    expect(r.ok && r.entry.result.total).toBe(200);
    expect(s.getState().history[0]?.label).toBe(magic.label);
    setRng(null);
  });

  it('dado ilegível vira cópia de segurança', async () => {
    const { loadShortcuts, SHORTCUTS_STORAGE_KEY, SHORTCUTS_BACKUP_KEY } = await import('./store');
    memory.set(SHORTCUTS_STORAGE_KEY, '{"schemaVersion":7}');
    expect(loadShortcuts()).toEqual({ shortcuts: [], recovered: true });
    expect(memory.get(SHORTCUTS_BACKUP_KEY)).toBe('{"schemaVersion":7}');
  });
});
