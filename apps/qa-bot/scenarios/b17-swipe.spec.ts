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

/** O que o deslizar ignora de propósito (o mesmo de apps/web/src/features/sheet/swipe.ts). */
const NO_SWIPE =
  'input, textarea, select, [role="slider"], [contenteditable="true"], [data-no-swipe]';

/**
 * Um ponto de toque dentro da área das colunas, visível na tela e longe de campos: o gesto vai
 * de lá até 220 px à esquerda, e os dois pontos precisam ser "chão". Longe mesmo: o Chrome puxa
 * o toque para o campo mais próximo (uns 15 px), e começar num campo não troca de aba (isso tem
 * teste próprio).
 */
async function inColumns(page: Page): Promise<Point> {
  const grid = page.getByTestId('sheet.columns');
  await grid.scrollIntoViewIfNeeded();
  const box = (await grid.boundingBox())!;
  const viewport = page.viewportSize()!;
  const x = viewport.width * 0.8;
  for (let dy = 120; box.y + dy < viewport.height - 80; dy += 10) {
    const y = box.y + dy;
    const free = await page.evaluate(
      ({ x, y, ignore }) =>
        [x, x - 220].every((px) =>
          [-20, 0, 20].every((ox) =>
            [-20, 0, 20].every((oy) => {
              const el = document.elementFromPoint(px + ox, y + oy);
              const root = el?.closest('[data-testid="sheet.columns"]');
              if (!el || !root || el.closest(ignore)) return false;
              // Nem dentro de algo que rola para os lados (o deslizar deixa essa rolagem em paz).
              for (let e: Element | null = el; e && e !== root; e = e.parentElement) {
                const sideways = /auto|scroll/.test(getComputedStyle(e).overflowX);
                if (sideways && e.scrollWidth > e.clientWidth) return false;
              }
              return true;
            }),
          ),
        ),
      { x, y, ignore: NO_SWIPE },
    );
    if (free) return { x, y };
  }
  throw new Error('nenhum ponto livre de campos na área das colunas');
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
    // Cada aba tem outro conteúdo: o ponto de partida é escolhido de novo a cada gesto.
    const swipe = async (dir: 'left' | 'right') => {
      const p = await inColumns(page);
      const left = { x: p.x - 220, y: p.y };
      await (dir === 'left' ? touchSwipe(page, p, left) : touchSwipe(page, left, p));
    };
    await expectTab(page, 'Personagem');

    await swipe('left');
    await expectTab(page, 'Combate');
    await swipe('left');
    await expectTab(page, 'Ações');
    await swipe('left'); // já é a última
    await expectTab(page, 'Ações');

    await swipe('right');
    await expectTab(page, 'Combate');
    await swipe('right');
    await expectTab(page, 'Personagem');
    await swipe('right'); // já é a primeira
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
