/**
 * B1 — Fumaça (plano v2, 15.7): abre todas as páginas, confere título e ausência de erros
 * no console; com semente fixa, 1d20 dá um valor exato conhecido.
 */
import { seededRng } from '@grimorio/rules';
import { expect, openPage, PAGES, rollBy, test } from '../support/bot';

test.describe('B1 — fumaça', { tag: '@B1' }, () => {
  for (const path of PAGES) {
    test(`abre ${path} sem erros`, async ({ page }) => {
      await openPage(page, path);
      await expect(page).toHaveTitle(/Grimório/);
      await expect(page.locator('h1').first()).toBeVisible();
    });
  }

  test('página que não existe mostra o aviso, sem erro', async ({ page }) => {
    await openPage(page, '/nao-existe');
    await expect(page.locator('h1')).toBeVisible();
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

  test('a página inicial chega pré-renderizada', async ({ request }) => {
    const html = await (await request.get('/')).text();
    expect(html).toContain('data-prerendered="/"');
  });
});
