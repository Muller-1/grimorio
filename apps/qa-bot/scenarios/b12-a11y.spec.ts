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

  // Temas de cor (14/10): o contraste vale em todos, não só no padrão.
  for (const theme of ['dark', 'arcane', 'forest', 'contrast']) {
    test(`axe no tema ${theme} (início, assistente e ficha de exemplo)`, async ({ page }) => {
      await page.addInitScript((id) => localStorage.setItem('grimorio.tema', id), theme);
      await openPage(page, '/');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      expect(await seriousA11yViolations(page)).toEqual([]);
      await openPage(page, '/criar');
      await page.getByTestId('wizard.option.class.fighter').click();
      expect(await seriousA11yViolations(page)).toEqual([]);
      await openPage(page, '/ficha');
      await loadExampleSheet(page);
      expect(await seriousA11yViolations(page)).toEqual([]);
      await page.getByTestId('theme.trigger').click();
      await expect(page.getByTestId('theme.picker')).toBeVisible();
      expect(await seriousA11yViolations(page)).toEqual([]);
    });
  }
});
