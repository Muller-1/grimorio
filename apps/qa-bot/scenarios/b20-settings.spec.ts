/**
 * B20 — Configurações deste navegador: animações, fonte, botão flutuante de dados, exportar e
 * apagar. Tudo fica no localStorage e vale antes de a página aparecer (public/theme.js).
 */
import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { expect, loadExampleSheet, openPage, rollBy, test } from '../support/bot';

const radio = (page: Page, testId: string) => page.getByTestId(testId).getByRole('radio');

async function rollOnDicePage(page: Page): Promise<void> {
  await openPage(page, '/dados');
  await page.getByTestId('dice.input').fill('1d20');
  await rollBy(page, () => page.getByTestId('dice.submit').click());
}

test.describe('B20 — configurações', { tag: '@B20' }, () => {
  test('animações desligadas valem no site todo e depois de recarregar', async ({ page }) => {
    const html = page.locator('html');
    await openPage(page, '/configuracoes');
    await expect(radio(page, 'settings.motion.on')).toBeChecked();
    await page.getByTestId('settings.motion.off').click();
    await expect(html).toHaveAttribute('data-motion', 'off');

    await rollOnDicePage(page);
    await expect(html).toHaveAttribute('data-motion', 'off');
    await expect(page.getByTestId('roll.last.total')).not.toHaveClass(/animate-roll-pop/);

    await openPage(page, '/configuracoes');
    await page.getByTestId('settings.motion.on').click();
    await rollOnDicePage(page);
    await expect(page.getByTestId('roll.last.total')).toHaveClass(/animate-roll-pop/);
  });

  test('o aparelho pede menos movimento: começa desligado, e "Ligadas" vale mesmo assim', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openPage(page, '/configuracoes');
    await expect(radio(page, 'settings.motion.off')).toBeChecked();
    await expect(page.getByText(/Seu aparelho pede menos movimento/)).toBeVisible();
    await page.getByTestId('settings.motion.on').click();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    await rollOnDicePage(page);
    await expect(page.getByTestId('roll.last.total')).toHaveClass(/animate-roll-pop/);
  });

  test('a caixa "Animação" antiga, desmarcada, vira animações desligadas', async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('b20.pronto')) {
        localStorage.setItem('grimorio.dados.animacao', '0');
        sessionStorage.setItem('b20.pronto', '1');
      }
    });
    await openPage(page, '/configuracoes');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
    await expect(radio(page, 'settings.motion.off')).toBeChecked();
    expect(await page.evaluate(() => localStorage.getItem('grimorio.dados.animacao'))).toBeNull();
  });

  test('fonte mais legível muda as letras e volta ao padrão', async ({ page }) => {
    const html = page.locator('html');
    const bodyFont = () => page.evaluate(() => getComputedStyle(document.body).fontFamily);
    await openPage(page, '/configuracoes');
    await page.getByTestId('settings.font.legible').click();
    await expect(html).toHaveAttribute('data-font', 'legible');
    expect(await bodyFont()).toContain('Atkinson Hyperlegible');
    await openPage(page, '/ficha');
    expect(await bodyFont()).toContain('Atkinson Hyperlegible');

    await openPage(page, '/configuracoes');
    await page.getByTestId('settings.font.default').click();
    await expect(html).not.toHaveAttribute('data-font', /./);
    expect(await bodyFont()).toContain('Alegreya Sans');
    expect(await page.evaluate(() => localStorage.getItem('grimorio.fonte'))).toBeNull();
  });

  test('o botão flutuante de dados some da ficha quando desligado', async ({ page }) => {
    await openPage(page, '/ficha');
    await expect(page.getByTestId('floating-dice.button')).toBeVisible();

    await openPage(page, '/configuracoes');
    const toggle = page.getByTestId('settings.floating-dice');
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    // A ficha abre por inteiro (o botão, quando ligado, já teria chegado) e ele não está lá.
    await openPage(page, '/ficha');
    await expect(page.getByTestId('ability.str.roll')).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('floating-dice')).toHaveCount(0);

    await openPage(page, '/configuracoes');
    await page.getByTestId('settings.floating-dice').click();
    await openPage(page, '/ficha');
    await expect(page.getByTestId('floating-dice.button')).toBeVisible();
  });

  test('exportar baixa um .json com tudo que está guardado', async ({ page }) => {
    await openPage(page, '/configuracoes');
    await page.getByTestId('settings.motion.off').click();
    await page.getByTestId('settings.font.legible').click();
    await expect(page.getByTestId('settings.data.count')).toHaveAttribute('data-value', '2');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('settings.export').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^grimorio-dados-\d{4}-\d{2}-\d{2}\.json$/);
    const file = JSON.parse(await readFile((await download.path())!, 'utf8'));
    expect(file).toMatchObject({
      site: 'grimorio',
      formato: 1,
      dados: { 'grimorio.movimento': 'off', 'grimorio.fonte': 'legible' },
    });
  });

  test('apagar pede confirmação e apaga só o que é do site', async ({ page }) => {
    await openPage(page, '/configuracoes');
    await page.evaluate(() => {
      localStorage.setItem('grimorio.atalhos.v1', '[]');
      localStorage.setItem('outro-site.preferencia', 'fica');
    });
    await page.getByTestId('settings.motion.off').click();

    await page.getByTestId('settings.clear').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Não dá para desfazer');
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialog).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('grimorio.movimento'))).toBe('off');

    await page.getByTestId('settings.clear').click();
    await page.getByTestId('settings.clear.confirm').click();
    await page.waitForURL(/\/configuracoes/);
    await page.waitForFunction(() => window.__APP_TEST__ !== undefined);
    await expect(page.getByTestId('settings.cleared')).toBeVisible();
    // O aviso aparece uma vez: o endereço fica limpo e recarregar não repete.
    await expect(page).toHaveURL(/\/configuracoes$/);
    await expect(page.locator('html')).not.toHaveAttribute('data-motion', /./);
    const left = await page.evaluate(() => Object.keys(localStorage).sort());
    expect(left).toEqual(['outro-site.preferencia']);
    await page.reload();
    await expect(page.getByTestId('settings.floating-dice')).toBeVisible();
    await expect(page.getByTestId('settings.cleared')).toHaveCount(0);
  });

  test('as Configurações estão a um toque na barra', async ({ page, isMobile }) => {
    await openPage(page, '/dados');
    if (isMobile) {
      await page.getByTestId('nav.menu').click();
      await page.getByTestId('nav.menu.settings').click();
    } else {
      await page.getByTestId('nav.settings').click();
    }
    await page.waitForURL(/\/configuracoes$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Configurações');
  });

  test('ficha avulsa: exporta em .json e importa de volta, com confirmação', async ({ page }) => {
    await openPage(page, '/ficha');
    await loadExampleSheet(page);
    const name = await page.locator('h1').first().textContent();

    await page.getByTestId('sheet.menu').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('sheet.export').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.grimorio\.json$/);
    const path = (await download.path())!;
    expect(JSON.parse(await readFile(path, 'utf8'))).toMatchObject({ kind: 'local-sheet' });

    // Ficha nova em branco, depois importa o arquivo: o nome volta.
    await page.keyboard.press('Escape');
    await page.getByTestId('sheet.menu').click();
    await page.getByRole('button', { name: 'Nova ficha' }).click();
    await page.getByRole('button', { name: 'Sim, continuar' }).click();
    await expect(page.locator('h1').first()).not.toHaveText(name!);

    await page.getByTestId('sheet.menu').click();
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByTestId('sheet.import').click(),
    ]);
    await chooser.setFiles(path);
    await page.getByRole('button', { name: 'Sim, continuar' }).click();
    await expect(page.locator('h1').first()).toHaveText(name!);
  });
});
