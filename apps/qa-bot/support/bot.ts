import AxeBuilder from '@axe-core/playwright';
import type { RollResult } from '@grimorio/rules';
import { test as base, expect, type Page } from '@playwright/test';

/** Forma dos ganchos que o site expõe no build de teste (apps/web/src/testing/test-hooks.ts). */
export interface AppTestHooks {
  build: { version: string; commit: string };
  getLastRoll(): RollResult | null;
  getSheet(): unknown;
  getDerived(): unknown;
  setRngSeed(seed: number | null): void;
  setNow(iso: string | null): void;
}

interface BotEvent {
  type: string;
  detail: unknown;
}

declare global {
  interface Window {
    __APP_TEST__?: AppTestHooks;
    __BOT_EVENTS__?: BotEvent[];
  }
}

/**
 * Fixtures do bot:
 * - `seed`: a semente única da execução (BOT_SEED);
 * - `consoleErrors`: coleta erros do console e da página e FALHA o cenário se houver algum;
 * - registra todos os eventos `app:*` em `window.__BOT_EVENTS__` (sem `sleep`: esperamos eventos).
 */
export const test = base.extend<{ seed: number; consoleErrors: string[] }>({
  seed: async ({}, use, testInfo) => {
    const seed = Number(process.env.BOT_SEED ?? 1);
    testInfo.annotations.push({ type: 'semente', description: String(seed) });
    await use(seed);
  },
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      page.on('pageerror', (e) => errors.push(e.message));
      await page.addInitScript(() => {
        window.__BOT_EVENTS__ = [];
        for (const type of ['app:ready', 'app:roll']) {
          window.addEventListener(type, (e) => {
            window.__BOT_EVENTS__!.push({ type, detail: (e as CustomEvent).detail });
          });
        }
      });
      await use(errors);
      expect(errors, 'o site não pode mostrar erros no console').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Abre a página e espera os ganchos de teste estarem instalados. */
export async function openPage(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForFunction(() => window.__APP_TEST__ !== undefined);
}

/** Troca o gerador do site por `seededRng(seed)` (preparar pelo gancho). */
export async function useSeed(page: Page, seed: number): Promise<void> {
  await page.evaluate((s) => window.__APP_TEST__!.setRngSeed(s), seed);
}

/** Quantas rolagens o site já anunciou (evento `app:roll`). */
export async function rollCount(page: Page): Promise<number> {
  return page.evaluate(() => window.__BOT_EVENTS__!.filter((e) => e.type === 'app:roll').length);
}

/** Espera até o site anunciar `total` rolagens. */
export async function waitForRolls(page: Page, total: number): Promise<void> {
  await page.waitForFunction(
    (n) => window.__BOT_EVENTS__!.filter((e) => e.type === 'app:roll').length >= n,
    total,
  );
}

/** Faz uma ação que rola dados e espera a rolagem ser anunciada. Devolve o resultado. */
export async function rollBy(page: Page, action: () => Promise<void>): Promise<RollResult> {
  const before = await rollCount(page);
  await action();
  await waitForRolls(page, before + 1);
  const last = await page.evaluate(() => window.__APP_TEST__!.getLastRoll());
  if (!last) throw new Error('o site não registrou a rolagem');
  return last;
}

/** Valor bruto de um número da tela (atributo data-value, plano v2, 8). */
export async function valueOf(page: Page, testId: string): Promise<number> {
  const raw = await page.getByTestId(testId).first().getAttribute('data-value');
  return Number(raw);
}

/** Todos os valores de dados de uma rolagem, na ordem. */
export function diceOf(result: RollResult): number[] {
  return result.terms.flatMap((t) => t.dice.map((d) => d.value));
}

/** Violações de acessibilidade sérias ou críticas (plano v2, B12). */
export async function seriousA11yViolations(page: Page): Promise<string[]> {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return result.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`);
}

/** Carrega a ficha de exemplo pela interface. */
export async function loadExampleSheet(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Carregar exemplo' }).click();
  await page.getByRole('button', { name: 'Sim, continuar' }).click();
}

/** Páginas públicas do R1 (+ ficha). */
export const PAGES = [
  '/',
  '/ficha',
  '/dados',
  '/apoie',
  '/creditos',
  '/termos',
  '/privacidade',
] as const;
