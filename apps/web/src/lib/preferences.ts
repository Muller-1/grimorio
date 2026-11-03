/**
 * Preferências deste aparelho (página Configurações): movimento, fonte e o botão flutuante de
 * dados da ficha. Ficam só neste navegador, como o tema (lib/theme.ts), e não vão para a conta:
 * quem quer tudo parado no celular pode querer as animações no computador.
 *
 * Movimento e fonte viram atributos no <html> (`data-motion`, `data-font`) que o CSS usa. O
 * public/theme.js repete as chaves e aplica os dois antes de a página aparecer (a CSP não deixa
 * script inline); o teste confere que os dois continuam iguais.
 */
import { useSyncExternalStore } from 'react';
import { safeStorage } from '@/ports/storage';

export const MOTION_STORAGE_KEY = 'grimorio.movimento';
export const FONT_STORAGE_KEY = 'grimorio.fonte';
export const FLOATING_DICE_STORAGE_KEY = 'grimorio.ficha.botao-dados';
/** A antiga caixa "Animação" do rolador: o theme.js troca "desmarcada" por movimento desligado. */
export const OLD_DICE_ANIMATION_KEY = 'grimorio.dados.animacao';

export const MOTIONS = ['on', 'off'] as const;
export type Motion = (typeof MOTIONS)[number];

export const FONTS = ['default', 'legible'] as const;
export type FontChoice = (typeof FONTS)[number];

const CHANGE_EVENT = 'grimorio:preferencias';
const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';
const KEYS: readonly string[] = [MOTION_STORAGE_KEY, FONT_STORAGE_KEY, FLOATING_DICE_STORAGE_KEY];

const root = () => document.documentElement;
const reduceQuery = () => globalThis.matchMedia?.(REDUCE_QUERY);
const notify = () => window.dispatchEvent(new Event(CHANGE_EVENT));

export function isMotion(value: unknown): value is Motion {
  return typeof value === 'string' && (MOTIONS as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Movimento
// ---------------------------------------------------------------------------

/** Movimento em uso agora: a escolha feita aqui ou, sem escolha, o que o aparelho pede. */
export function currentMotion(): Motion {
  const attr = root().getAttribute('data-motion');
  if (isMotion(attr)) return attr;
  return reduceQuery()?.matches ? 'off' : 'on';
}

/** Para o código que anima sozinho (rolagem suave, d20 da tela de carregamento, bandeja). */
export function motionOff(): boolean {
  return currentMotion() === 'off';
}

export function setMotion(motion: Motion): void {
  root().setAttribute('data-motion', motion);
  safeStorage.set(MOTION_STORAGE_KEY, motion);
  notify();
}

// ---------------------------------------------------------------------------
// Fonte
// ---------------------------------------------------------------------------

export function currentFont(): FontChoice {
  return root().getAttribute('data-font') === 'legible' ? 'legible' : 'default';
}

/** "Padrão" não marca nada nem guarda nada (como o tema "Automático"). */
export function setFont(font: FontChoice): void {
  if (font === 'legible') {
    root().setAttribute('data-font', 'legible');
    safeStorage.set(FONT_STORAGE_KEY, 'legible');
  } else {
    root().removeAttribute('data-font');
    safeStorage.remove(FONT_STORAGE_KEY);
  }
  notify();
}

// ---------------------------------------------------------------------------
// Botão flutuante de dados da ficha
// ---------------------------------------------------------------------------

/** Ligado, a não ser que a pessoa tenha desligado. */
export function floatingDiceEnabled(): boolean {
  return safeStorage.get(FLOATING_DICE_STORAGE_KEY) !== '0';
}

export function setFloatingDice(enabled: boolean): void {
  if (enabled) safeStorage.remove(FLOATING_DICE_STORAGE_KEY);
  else safeStorage.set(FLOATING_DICE_STORAGE_KEY, '0');
  notify();
}

// ---------------------------------------------------------------------------
// Acompanhar a troca (nesta aba, em outra aba e no aparelho)
// ---------------------------------------------------------------------------

/** Outra aba mudou o armazenamento (ou apagou tudo): os atributos do <html> acompanham. */
function applyStored(): void {
  const motion = safeStorage.get(MOTION_STORAGE_KEY);
  if (isMotion(motion)) root().setAttribute('data-motion', motion);
  else root().removeAttribute('data-motion');
  if (safeStorage.get(FONT_STORAGE_KEY) === 'legible') root().setAttribute('data-font', 'legible');
  else root().removeAttribute('data-font');
}

export function subscribePreferences(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && !KEYS.includes(event.key)) return;
    applyStored();
    onChange();
  };
  const media = reduceQuery();
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  media?.addEventListener?.('change', onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
    media?.removeEventListener?.('change', onChange);
  };
}

// No HTML pré-renderizado ainda não há escolha: tudo no padrão até a página abrir.
const serverMotion = (): Motion => 'on';
const serverFont = (): FontChoice => 'default';
const serverFloatingDice = () => true;

export function useMotion(): Motion {
  return useSyncExternalStore(subscribePreferences, currentMotion, serverMotion);
}

export function useFont(): FontChoice {
  return useSyncExternalStore(subscribePreferences, currentFont, serverFont);
}

export function useFloatingDice(): boolean {
  return useSyncExternalStore(subscribePreferences, floatingDiceEnabled, serverFloatingDice);
}
