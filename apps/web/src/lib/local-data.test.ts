import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setNow } from '@/ports/clock';
import authStore from '@/features/auth/store.ts?raw';
import {
  ACCOUNT_PREFIX,
  buildExport,
  clearableKeys,
  clearLocalData,
  exportFileName,
  localKeys,
} from './local-data';

/** localStorage mínimo, com chaves deste site e de outro (os testes rodam no Node). */
function fakeStorage(entries: Record<string, string>) {
  const storage = new Map(Object.entries(entries));
  Object.assign(globalThis, {
    localStorage: {
      get length() {
        return storage.size;
      },
      key: (i: number) => [...storage.keys()][i] ?? null,
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => void storage.set(k, v),
      removeItem: (k: string) => void storage.delete(k),
    },
  });
  return storage;
}

describe('dados deste navegador', () => {
  let storage: Map<string, string>;
  beforeEach(() => {
    setNow('2026-11-03T18:00:00.000Z');
    storage = fakeStorage({
      'grimorio.tema': 'dark',
      'grimorio.atalhos.v1': '[{"label":"Vantagem","expression":"2d20kh1"}]',
      'grimorio.ficha.v1': '{"identity":{"name":"Lira"}}',
      'grimorio.ficha.botao-dados': '0',
      'outro-site.token': 'nao-e-nosso',
    });
  });
  afterEach(() => {
    setNow(null);
    delete (globalThis as Record<string, unknown>).localStorage;
  });

  it('só olha as chaves do site, em ordem', () => {
    expect(localKeys()).toEqual([
      'grimorio.atalhos.v1',
      'grimorio.ficha.botao-dados',
      'grimorio.ficha.v1',
      'grimorio.tema',
    ]);
  });

  it('exporta tudo, com objetos e listas abertos e o resto como estava', () => {
    const file = buildExport();
    expect(file).toMatchObject({ site: 'grimorio', formato: 1 });
    expect(file.exportadoEm).toBe('2026-11-03T18:00:00.000Z');
    expect(file.dados).toEqual({
      'grimorio.atalhos.v1': [{ label: 'Vantagem', expression: '2d20kh1' }],
      'grimorio.ficha.botao-dados': '0',
      'grimorio.ficha.v1': { identity: { name: 'Lira' } },
      'grimorio.tema': 'dark',
    });
    expect(JSON.stringify(file)).not.toContain('nao-e-nosso');
    expect(exportFileName()).toBe('grimorio-dados-2026-11-03.json');
  });

  it('apagar tira só o que é do site e conta quantas saíram', () => {
    expect(clearLocalData()).toBe(4);
    expect([...storage.keys()]).toEqual(['outro-site.token']);
    expect(clearLocalData()).toBe(0);
  });

  it('apagar deixa a cópia das fichas da conta (pode ter edição ainda não enviada)', () => {
    // O mesmo prefixo que o Sair limpa (features/auth/store.ts).
    expect(authStore).toContain(`ACCOUNT_STORAGE_PREFIX = '${ACCOUNT_PREFIX}'`);
    storage.set(`${ACCOUNT_PREFIX}ficha.abc`, '{"pendente":true}');
    storage.set(`${ACCOUNT_PREFIX}entrou`, '1');
    expect(clearableKeys()).not.toContain(`${ACCOUNT_PREFIX}ficha.abc`);
    clearLocalData();
    expect([...storage.keys()].sort()).toEqual([
      'grimorio.conta.entrou',
      'grimorio.conta.ficha.abc',
      'outro-site.token',
    ]);
  });

  it('sem armazenamento disponível, exporta vazio e apagar não quebra', () => {
    Object.assign(globalThis, {
      localStorage: {
        get length(): number {
          throw new Error('bloqueado');
        },
      },
    });
    expect(buildExport().dados).toEqual({});
    expect(clearLocalData()).toBe(0);
  });
});
