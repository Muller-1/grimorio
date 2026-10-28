/**
 * B17 — Deslizar o dedo troca de aba na ficha (só no celular). O gesto é simulado com toques de
 * verdade pelo protocolo do Chrome. Rolar a página, mexer num campo ou começar na borda da tela
 * (gesto de voltar do sistema) não trocam de aba.
 */
import type { Locator, Page } from '@playwright/test';
import { expect, openPage, test } from '../support/bot';

const TABS = ['Personagem', 'Combate', 'Ações'] as const;
type Tab = (typeof TABS)[number];

interface Point {
  x: number;
  y: number;
}

/** Um toque do dedo: encosta em `from`, anda até `to` em passos e solta. */
async function touchSwipe(page: Page, from: Point, to: Point) {
  const cdp = await page.context().newCDPSession(page);
  const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', point?: Point) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: point ? [{ x: point.x, y: point.y }] : [],
    });
  await send('touchStart', from);
  const steps = 6;
  for (let i = 1; i <= steps; i++) {
    await send('touchMove', {
      x: from.x + ((to.x - from.x) * i) / steps,
      y: from.y + ((to.y - from.y) * i) / steps,
    });
  }
  await send('touchEnd');
  await cdp.detach();
}

async function expectTab(page: Page, name: Tab) {
  for (const tab of TABS) {
    await expect(page.getByRole('tab', { name: tab, exact: true })).toHaveAttribute(
      'aria-selected',
      String(tab === name),
    );
  }
}

/** Um ponto de toque dentro da área das colunas, visível na tela. */
async function inColumns(page: Page): Promise<Point> {
  const grid = page.locator('#col-character').locator('..');
  await grid.scrollIntoViewIfNeeded();
  const box = (await grid.boundingBox())!;
  const viewport = page.viewportSize()!;
  return { x: viewport.width * 0.8, y: Math.min(box.y + 120, viewport.height - 80) };
}

async function centerOf(field: Locator): Promise<Point> {
  await field.scrollIntoViewIfNeeded();
  const box = (await field.boundingBox())!;
  return { x: box.x + box.width - 12, y: box.y + box.height / 2 };
}

test.describe('B17 — deslizar para trocar de aba', { tag: '@B17' }, () => {
  test.skip(({ isMobile }) => !isMobile, 'o deslizar só existe no celular');

  test.beforeEach(async ({ page }) => {
    await openPage(page, '/ficha');
    await page.getByRole('tablist').waitFor();
    // Os ouvintes de toque entram logo depois do primeiro desenho da tela.
    await page.evaluate(
      () =>
        new Promise<void>((done) =>
          requestAnimationFrame(() => requestAnimationFrame(() => done())),
        ),
    );
  });

  test('para a esquerda avança, para a direita volta, e nas pontas fica onde está', async ({
    page,
  }) => {
    const p = await inColumns(page);
    const left = { x: p.x - 220, y: p.y };
    await expectTab(page, 'Personagem');

    await touchSwipe(page, p, left);
    await expectTab(page, 'Combate');
    await touchSwipe(page, p, left);
    await expectTab(page, 'Ações');
    await touchSwipe(page, p, left); // já é a última
    await expectTab(page, 'Ações');

    await touchSwipe(page, left, p);
    await expectTab(page, 'Combate');
    await touchSwipe(page, left, p);
    await expectTab(page, 'Personagem');
    await touchSwipe(page, left, p); // já é a primeira
    await expectTab(page, 'Personagem');
  });

  test('rolar a página (gesto vertical) não troca de aba', async ({ page }) => {
    const p = await inColumns(page);
    await touchSwipe(page, { x: p.x, y: p.y + 200 }, { x: p.x - 30, y: p.y - 120 });
    await expectTab(page, 'Personagem');
  });

  test('o dedo começando num campo de texto não troca de aba', async ({ page }) => {
    const field = page.locator('#col-character input:visible').first();
    const start = await centerOf(field);
    await touchSwipe(page, start, { x: start.x - 220, y: start.y });
    await expectTab(page, 'Personagem');
  });

  test('o dedo começando na borda da tela (gesto de voltar do sistema) é ignorado', async ({
    page,
  }) => {
    await page.getByRole('tab', { name: 'Combate', exact: true }).click();
    const p = await inColumns(page);
    await touchSwipe(page, { x: 16, y: p.y }, { x: 260, y: p.y });
    await expectTab(page, 'Combate');
  });

  test('o toque nas abas continua funcionando', async ({ page }) => {
    await page.getByRole('tab', { name: 'Ações', exact: true }).click();
    await expectTab(page, 'Ações');
    const p = await inColumns(page);
    await touchSwipe(page, { x: p.x - 220, y: p.y }, p);
    await expectTab(page, 'Combate');
  });
});
