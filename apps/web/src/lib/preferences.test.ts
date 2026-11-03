import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import themeJs from '../../public/theme.js?raw';
import {
  currentFont,
  currentMotion,
  FLOATING_DICE_STORAGE_KEY,
  floatingDiceEnabled,
  FONT_STORAGE_KEY,
  MOTION_STORAGE_KEY,
  motionOff,
  OLD_DICE_ANIMATION_KEY,
  setFloatingDice,
  setFont,
  setMotion,
  subscribePreferences,
} from './preferences';

/** <html>, janela, "reduzir movimento" e localStorage mínimos (os testes rodam no Node). */
function fakeBrowser({ reduce = false } = {}) {
  const attrs = new Map<string, string>();
  const storage = new Map<string, string>();
  const listeners = new Map<string, Set<(e: Event) => void>>();
  const on = (type: string, fn: (e: Event) => void) => {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type)!.add(fn);
  };
  const media = {
    matches: reduce,
    addEventListener: (_: string, fn: (e: Event) => void) => on('media', fn),
    removeEventListener: (_: string, fn: (e: Event) => void) => listeners.get('media')?.delete(fn),
  };
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
    matchMedia: (query: string) =>
      query === '(prefers-reduced-motion: reduce)' ? media : { matches: false },
    window: {
      addEventListener: on,
      removeEventListener: (type: string, fn: (e: Event) => void) =>
        listeners.get(type)?.delete(fn),
      dispatchEvent: (e: Event) => {
        for (const fn of listeners.get(e.type) ?? []) fn(e);
        return true;
      },
    },
  });
  const fire = (type: string, extra: object = {}) =>
    window.dispatchEvent(Object.assign(new Event(type), extra));
  return { attrs, storage, media, listeners, fire };
}

function cleanup() {
  for (const k of ['document', 'localStorage', 'window', 'matchMedia'])
    delete (globalThis as Record<string, unknown>)[k];
}

/** Roda o public/theme.js como o navegador roda, no <html> e no armazenamento de mentira. */
function runThemeJs() {
  new Function('window', 'document', 'localStorage', themeJs)(
    { matchMedia: undefined },
    globalThis.document,
    globalThis.localStorage,
  );
}

describe('preferências: public/theme.js', () => {
  afterEach(cleanup);

  it('usa as mesmas chaves', () => {
    for (const key of [MOTION_STORAGE_KEY, FONT_STORAGE_KEY, OLD_DICE_ANIMATION_KEY]) {
      expect(themeJs).toContain(`'${key}'`);
    }
    expect(themeJs).toContain('/^(on|off)$/');
  });

  it('aplica movimento e fonte salvos antes de a página aparecer', () => {
    const browser = fakeBrowser();
    browser.storage.set(MOTION_STORAGE_KEY, 'off');
    browser.storage.set(FONT_STORAGE_KEY, 'legible');
    runThemeJs();
    expect(browser.attrs.get('data-motion')).toBe('off');
    expect(browser.attrs.get('data-font')).toBe('legible');
  });

  it('valor estranho não marca nada', () => {
    const browser = fakeBrowser();
    browser.storage.set(MOTION_STORAGE_KEY, '<script>');
    browser.storage.set(FONT_STORAGE_KEY, 'comic-sans');
    runThemeJs();
    expect(browser.attrs.has('data-motion')).toBe(false);
    expect(browser.attrs.has('data-font')).toBe(false);
  });

  it('a caixa "Animação" antiga desmarcada vira movimento desligado (e some)', () => {
    const browser = fakeBrowser();
    browser.storage.set(OLD_DICE_ANIMATION_KEY, '0');
    runThemeJs();
    expect(browser.storage.get(MOTION_STORAGE_KEY)).toBe('off');
    expect(browser.attrs.get('data-motion')).toBe('off');
    expect(browser.storage.has(OLD_DICE_ANIMATION_KEY)).toBe(false);
  });

  it('a caixa antiga marcada só some; uma escolha nova vale mais que ela', () => {
    const browser = fakeBrowser();
    browser.storage.set(OLD_DICE_ANIMATION_KEY, '1');
    runThemeJs();
    expect(browser.storage.has(MOTION_STORAGE_KEY)).toBe(false);
    expect(browser.storage.has(OLD_DICE_ANIMATION_KEY)).toBe(false);

    browser.storage.set(OLD_DICE_ANIMATION_KEY, '0');
    browser.storage.set(MOTION_STORAGE_KEY, 'on');
    runThemeJs();
    expect(browser.attrs.get('data-motion')).toBe('on');
  });
});

describe('preferências: movimento', () => {
  afterEach(cleanup);

  it('sem escolha, segue o aparelho', () => {
    fakeBrowser();
    expect(currentMotion()).toBe('on');
    cleanup();
    fakeBrowser({ reduce: true });
    expect(currentMotion()).toBe('off');
    expect(motionOff()).toBe(true);
  });

  it('a escolha vale mais que o aparelho, nos dois sentidos', () => {
    const browser = fakeBrowser({ reduce: true });
    setMotion('on');
    expect(browser.attrs.get('data-motion')).toBe('on');
    expect(browser.storage.get(MOTION_STORAGE_KEY)).toBe('on');
    expect(currentMotion()).toBe('on');
    setMotion('off');
    expect(currentMotion()).toBe('off');
  });

  it('sem armazenamento disponível, vale só nesta visita', () => {
    fakeBrowser();
    Object.assign(globalThis, {
      localStorage: {
        setItem: () => {
          throw new Error('bloqueado');
        },
      },
    });
    expect(() => setMotion('off')).not.toThrow();
    expect(currentMotion()).toBe('off');
  });
});

describe('preferências: fonte e botão flutuante', () => {
  let browser: ReturnType<typeof fakeBrowser>;
  beforeEach(() => {
    browser = fakeBrowser();
  });
  afterEach(cleanup);

  it('"Mais legível" marca o <html> e guarda; "Padrão" tira e apaga', () => {
    expect(currentFont()).toBe('default');
    setFont('legible');
    expect(browser.attrs.get('data-font')).toBe('legible');
    expect(browser.storage.get(FONT_STORAGE_KEY)).toBe('legible');
    expect(currentFont()).toBe('legible');
    setFont('default');
    expect(browser.attrs.has('data-font')).toBe(false);
    expect(browser.storage.has(FONT_STORAGE_KEY)).toBe(false);
  });

  it('o botão flutuante começa ligado; desligar guarda, religar apaga', () => {
    expect(floatingDiceEnabled()).toBe(true);
    setFloatingDice(false);
    expect(browser.storage.get(FLOATING_DICE_STORAGE_KEY)).toBe('0');
    expect(floatingDiceEnabled()).toBe(false);
    setFloatingDice(true);
    expect(browser.storage.has(FLOATING_DICE_STORAGE_KEY)).toBe(false);
  });
});

describe('preferências: acompanhar a troca', () => {
  let browser: ReturnType<typeof fakeBrowser>;
  beforeEach(() => {
    browser = fakeBrowser();
  });
  afterEach(cleanup);

  it('avisa quando muda aqui e para de avisar quando sai', () => {
    let calls = 0;
    const stop = subscribePreferences(() => calls++);
    setMotion('off');
    setFont('legible');
    setFloatingDice(false);
    expect(calls).toBe(3);
    stop();
    setMotion('on');
    expect(calls).toBe(3);
    expect(browser.listeners.get('media')?.size ?? 0).toBe(0);
  });

  it('outra aba trocou: o <html> acompanha; chave de outra coisa não avisa', () => {
    let calls = 0;
    subscribePreferences(() => calls++);
    browser.storage.set(MOTION_STORAGE_KEY, 'off');
    browser.storage.set(FONT_STORAGE_KEY, 'legible');
    browser.fire('storage', { key: MOTION_STORAGE_KEY });
    expect(browser.attrs.get('data-motion')).toBe('off');
    expect(browser.attrs.get('data-font')).toBe('legible');
    browser.fire('storage', { key: 'grimorio.ficha.v1' });
    expect(calls).toBe(1);
  });

  it('outra aba apagou tudo: volta ao padrão', () => {
    setMotion('off');
    setFont('legible');
    subscribePreferences(() => {});
    browser.storage.clear();
    browser.fire('storage', { key: null });
    expect(browser.attrs.has('data-motion')).toBe(false);
    expect(browser.attrs.has('data-font')).toBe(false);
  });

  it('o aparelho mudou "reduzir movimento" com a página aberta: avisa', () => {
    let calls = 0;
    subscribePreferences(() => calls++);
    browser.media.matches = true;
    for (const fn of browser.listeners.get('media') ?? []) fn(new Event('change'));
    expect(calls).toBe(1);
    expect(currentMotion()).toBe('off');
  });
});
