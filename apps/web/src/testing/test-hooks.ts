/**
 * Ganchos de teste do front (plano v2, 15.3 — subconjunto do R1 + ficha local).
 *
 * SÓ entram no bundle no build de teste (`pnpm build:test`, que usa `--mode test`). No build de produção,
 * a condição em main.tsx vira `false`, o import some e o CI confere que `__APP_TEST__`
 * não aparece em nenhum arquivo (salvaguarda 1, plano v2, 15.10).
 *
 * Regra do bot: preparar pelo gancho, agir pela interface, conferir pelo oráculo.
 */
import { deriveSheet, seededRng, type RollResult, type SheetDerived } from '@grimorio/rules';
import type { LocalSheet } from '@grimorio/shared';
import { siteConfig } from '@/app/config';
import { useDiceStore } from '@/features/dice/store';
import { useSheetStore } from '@/features/sheet/store';
import { setNow } from '@/ports/clock';
import { onAny } from '@/ports/events';
import { setRng } from '@/ports/rng';

export interface AppTestHooks {
  build: { version: string; commit: string };
  /** Última rolagem (a mais recente do histórico), ou `null`. */
  getLastRoll(): RollResult | null;
  /** Ficha local como está salva. */
  getSheet(): LocalSheet;
  /** Valores derivados da ficha atual (o mesmo cálculo que a tela usa). */
  getDerived(): SheetDerived;
  /** Troca o gerador por `seededRng(seed)`; `null` volta ao criptográfico. */
  setRngSeed(seed: number | null): void;
  /** Fixa o relógio; `null` volta ao relógio real. */
  setNow(iso: string | null): void;
}

declare global {
  interface Window {
    __APP_TEST__?: AppTestHooks;
  }
}

export function installTestHooks(): void {
  window.__APP_TEST__ = {
    build: { version: siteConfig.version, commit: siteConfig.commit },
    getLastRoll: () => useDiceStore.getState().history[0]?.result ?? null,
    getSheet: () => useSheetStore.getState().sheet,
    getDerived: () => deriveSheet(useSheetStore.getState().sheet),
    setRngSeed: (seed) => setRng(seed === null ? null : seededRng(seed)),
    setNow: (iso) => setNow(iso),
  };
  // Cada evento interno vira um evento do navegador que o Playwright pode esperar.
  onAny((event) => window.dispatchEvent(new CustomEvent(`app:${event.type}`, { detail: event })));
  window.dispatchEvent(new CustomEvent('app:ready'));
}
