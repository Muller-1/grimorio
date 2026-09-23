/**
 * B1 — Fumaça (plano v2, 15.7): abre todas as páginas, confere título e ausência de erros
 * no console; com semente fixa, 1d20 dá um valor exato conhecido.
 */
import { seededRng } from '@grimorio/rules';
import { expect, expected404, openPage, PAGES, rollBy, test } from '../support/bot';

test.describe('B1 — fumaça', { tag: '@B1' }, () => {
  for (const path of PAGES) {
    test(`abre ${path} sem erros`, async ({ page }) => {
      await openPage(page, path);
      await expect(page).toHaveTitle(/Grimório/);
      await expect(page.locator('h1').first()).toBeVisible();
    });
  }

  test('página que não existe responde 404 e mostra o aviso, sem erro', async ({ page }) => {
    expected404('/nao-existe');
    const response = await page.goto('/nao-existe');
    expect(response?.status()).toBe(404);
    await page.waitForFunction(() => window.__APP_TEST__ !== undefined);
    await expect(page.locator('h1')).toHaveText('Página não encontrada');
  });

  test('o build de teste informa a versão', async ({ page }) => {
    await openPage(page, '/');
    const build = await page.evaluate(() => window.__APP_TEST__!.build);
    expect(build.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  test('com semente fixa, 1d20 dá o valor exato do oráculo', async ({ page, seed }) => {
    await openPage(page, '/dados');
    await page.evaluate((s) => window.__APP_TEST__!.setRngSeed(s), seed);
    await page.getByTestId('dice.input').fill('1d20');
    await rollBy(page, () => page.getByTestId('dice.submit').click());
    const expected = seededRng(seed).int(1, 20);
    await expect(page.getByTestId('roll.last.total')).toHaveAttribute(
      'data-value',
      String(expected),
    );
  });

  // Etapa 8: cada rota tem o próprio HTML (ver scripts/prerender.mjs).
  for (const [path, mark] of [
    ['/', 'data-prerendered="/"'],
    ['/termos', 'data-prerendered="/termos"'],
    ['/dados', 'data-shell="/dados"'],
    ['/ficha', 'data-shell="/ficha"'],
  ] as const) {
    test(`${path} chega com o HTML certo (${mark.split('=')[0]})`, async ({ request }) => {
      const html = await (await request.get(path)).text();
      expect(html).toContain(mark);
    });
  }

  test('responde com os cabeçalhos de segurança da produção', async ({ request }) => {
    const headers = (await request.get('/dados')).headers();
    expect(headers['content-security-policy']).toContain("script-src 'self'");
    expect(headers['x-content-type-options']).toBe('nosniff');
  });
});
