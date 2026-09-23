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
    __BOT_CSP__?: string[];
  }
}

/**
 * Fixtures do bot:
 * - `seed`: a semente única da execução (BOT_SEED);
 * - `consoleErrors`: coleta erros do console, da página e violações da CSP e FALHA o cenário se
 *   houver algum;
 * - registra todos os eventos `app:*` em `window.__BOT_EVENTS__` (sem `sleep`: esperamos eventos).
 */
export const test = base.extend<{ seed: number; consoleErrors: string[] }>({
  seed: async ({}, use, testInfo) => {
    const seed = Number(process.env.BOT_SEED ?? 1);
    testInfo.annotations.push({ type: 'semente', description: String(seed) });
    await use(seed);
  },
  consoleErrors: [
    async ({ page }, use, testInfo) => {
      const errors: string[] = [];
      page.on('console', (m) => {
        if (m.type() !== 'error') return;
        // Um cenário que abre de propósito uma página inexistente (status 404) marca o teste
        // com `expected404(...)`; o aviso do navegador sobre ESSE documento não é erro do site.
        const allowed = testInfo.annotations.some(
          (a) => a.type === '404-esperado' && m.location().url.endsWith(a.description ?? '\0'),
        );
        if (!allowed) errors.push(m.text());
      });
      page.on('pageerror', (e) => errors.push(e.message));
      await page.addInitScript(() => {
        // Violações da Content-Security-Policy nem sempre aparecem como erro no console.
        window.__BOT_CSP__ = [];
        document.addEventListener('securitypolicyviolation', (e) => {
          window.__BOT_CSP__!.push(`${e.violatedDirective} bloqueou ${e.blockedURI || 'inline'}`);
        });
        window.__BOT_EVENTS__ = [];
        for (const type of ['app:ready', 'app:roll']) {
          window.addEventListener(type, (e) => {
            window.__BOT_EVENTS__!.push({ type, detail: (e as CustomEvent).detail });
          });
        }
      });
      await use(errors);
      const csp = page.isClosed() ? [] : await page.evaluate(() => window.__BOT_CSP__ ?? []);
      expect(errors, 'o site não pode mostrar erros no console').toEqual([]);
      expect(csp, 'nada pode ser bloqueado pela Content-Security-Policy').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Avisa a fixture de console que `path` deve mesmo responder 404. */
export function expected404(path: string): void {
  test.info().annotations.push({ type: '404-esperado', description: path });
}

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
