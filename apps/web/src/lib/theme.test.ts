import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import themeJs from '../../public/theme.js?raw';
import {
  currentTheme,
  isThemeId,
  setTheme,
  subscribeTheme,
  THEME_STORAGE_KEY,
  THEMES,
} from './theme';

// As cores e o contraste de cada tema são conferidos em build/themes.test.ts (lê o CSS).
describe('temas: public/theme.js', () => {
  it('usa a mesma chave e a mesma lista de temas', () => {
    expect(themeJs).toContain(`'${THEME_STORAGE_KEY}'`);
    const list = /\^\(([a-z|]+)\)\$/.exec(themeJs)?.[1]?.split('|');
    expect(list).toEqual(THEMES.filter((id) => id !== 'auto'));
  });
});

// ---------- escolha e memória ----------

/** <html>, janela e localStorage mínimos (os testes rodam no Node). */
function fakeBrowser() {
  const attrs = new Map<string, string>();
  const storage = new Map<string, string>();
  const listeners = new Map<string, Set<(e: Event) => void>>();
  Object.assign(globalThis, {
    document: {
      documentElement: {
        getAttribute: (k: string) => attrs.get(k) ?? null,
        setAttribute: (k: string, v: string) => void attrs.set(k, v),
        removeAttribute: (k: string) => void attrs.delete(k),
      },
    },
    localStorage: {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => void storage.set(k, v),
      removeItem: (k: string) => void storage.delete(k),
    },
    window: {
      addEventListener: (type: string, fn: (e: Event) => void) => {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(fn);
      },
      removeEventListener: (type: string, fn: (e: Event) => void) =>
        listeners.get(type)?.delete(fn),
      dispatchEvent: (e: Event) => {
        for (const fn of listeners.get(e.type) ?? []) fn(e);
        return true;
      },
    },
  });
  return { attrs, storage, listeners };
}

describe('temas: escolha', () => {
  let browser: ReturnType<typeof fakeBrowser>;
  beforeEach(() => {
    browser = fakeBrowser();
  });
  afterEach(() => {
    for (const k of ['document', 'localStorage', 'window'])
      delete (globalThis as Record<string, unknown>)[k];
  });

  it('sem escolha, é automático', () => {
    expect(currentTheme()).toBe('auto');
  });

  it('escolher marca o <html>, guarda e avisa quem está ouvindo', () => {
    let calls = 0;
    const stop = subscribeTheme(() => calls++);
    setTheme('arcane');
    expect(browser.attrs.get('data-theme')).toBe('arcane');
    expect(browser.storage.get(THEME_STORAGE_KEY)).toBe('arcane');
    expect(currentTheme()).toBe('arcane');
    expect(calls).toBe(1);
    stop();
    setTheme('forest');
    expect(calls).toBe(1);
  });

  it('voltar para automático tira a marca e apaga o que estava guardado', () => {
    setTheme('dark');
    setTheme('auto');
    expect(browser.attrs.has('data-theme')).toBe(false);
    expect(browser.storage.has(THEME_STORAGE_KEY)).toBe(false);
  });

  it('trocar em outra aba vale nesta também; valor estranho vira automático', () => {
    let calls = 0;
    subscribeTheme(() => calls++);
    const storageEvent = (newValue: string | null, key = THEME_STORAGE_KEY) =>
      window.dispatchEvent(Object.assign(new Event('storage'), { key, newValue }));
    storageEvent('contrast');
    expect(currentTheme()).toBe('contrast');
    storageEvent('outra-chave', 'grimorio.ficha');
    expect(currentTheme()).toBe('contrast');
    storageEvent('<script>');
    expect(currentTheme()).toBe('auto');
    expect(calls).toBe(2);
  });

  it('sem armazenamento disponível, o tema vale só nesta visita', () => {
    Object.assign(globalThis, {
      localStorage: {
        setItem: () => {
          throw new Error('bloqueado');
        },
        removeItem: () => {
          throw new Error('bloqueado');
        },
      },
    });
    expect(() => setTheme('forest')).not.toThrow();
    expect(currentTheme()).toBe('forest');
  });

  it('só aceita temas conhecidos', () => {
    expect(isThemeId('light')).toBe(true);
    expect(isThemeId('sepia')).toBe(false);
    expect(isThemeId(null)).toBe(false);
  });
});
