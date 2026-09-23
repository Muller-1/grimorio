import { randomInt } from 'node:crypto';
import { defineConfig, devices } from '@playwright/test';

/**
 * Bot de testes (plano v2, seção 15). Rode pela raiz: `pnpm bot` (ver cli.mjs).
 *
 * - Sem `BOT_BASE_URL`, gera o build de TESTE do site (com ganchos) e sobe em :4180.
 * - Toda execução usa UMA semente (`BOT_SEED`), impressa no início: qualquer falha
 *   é reproduzível com `pnpm bot --scenario=Bx --seed=N`.
 */

// Definida aqui, no processo principal, para que todos os workers herdem a mesma semente.
process.env.BOT_SEED ??= String(randomInt(1, 2 ** 31 - 1));

const port = 4180;
const baseURL = process.env.BOT_BASE_URL ?? `http://localhost:${port}`;
const chromiumPath = process.env.BOT_CHROMIUM_PATH;

export default defineConfig({
  testDir: './scenarios',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // Teste instável é bug (plano v2, 15.11): nada de "rodar de novo até passar".
  retries: 0,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'pt-BR',
    ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}),
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    // RNF-02: os cenários também rodam com tela de celular.
    { name: 'celular', use: { ...devices['Pixel 7'] } },
  ],
  ...(process.env.BOT_BASE_URL
    ? {}
    : {
        webServer: {
          command:
            'pnpm --filter @grimorio/web build:test && pnpm --filter @grimorio/web preview:test',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }),
});
