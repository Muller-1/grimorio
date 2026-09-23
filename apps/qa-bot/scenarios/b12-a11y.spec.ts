/**
 * B12 — Acessibilidade (plano v2, 15.7): axe em cada página e nos diálogos principais,
 * sem violações sérias ou críticas (RNF-07).
 */
import {
  expect,
  loadExampleSheet,
  openPage,
  PAGES,
  seriousA11yViolations,
  test,
} from '../support/bot';

test.describe('B12 — acessibilidade', { tag: '@B12' }, () => {
  for (const path of PAGES) {
    test(`axe em ${path}`, async ({ page }) => {
      await openPage(page, path);
      await page.waitForLoadState('networkidle');
      expect(await seriousA11yViolations(page)).toEqual([]);
    });
  }

  test('axe com o editor de atalho aberto', async ({ page }) => {
    await openPage(page, '/dados');
    await page.getByTestId('shortcut.new').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await seriousA11yViolations(page)).toEqual([]);
  });

  test('axe na ficha de exemplo com o editor de arma aberto', async ({ page }) => {
    await openPage(page, '/ficha');
    await loadExampleSheet(page);
    // No celular as colunas viram abas: abre a de Ações antes.
    const actionsTab = page.getByRole('tab', { name: 'Ações' });
    if (await actionsTab.isVisible()) await actionsTab.click();
    await page.getByTestId('actions.add').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await seriousA11yViolations(page)).toEqual([]);
  });
});
