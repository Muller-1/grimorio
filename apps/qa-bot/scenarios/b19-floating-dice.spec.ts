/**
 * B19 — Botão flutuante de rolar dados na ficha. Abre um campo para digitar a rolagem; mora na
 * borda esquerda ou direita (arrastando troca de lado e de altura, sem grudar em cima nem
 * embaixo) e, com o painel aberto, sobe para dar lugar ao resultado da rolagem.
 */
import type { Page } from '@playwright/test';
import { expect, openPage, rollBy, test } from '../support/bot';

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const box = async (page: Page, testId: string): Promise<Box> =>
  (await page.getByTestId(testId).boundingBox())!;

/**
 * Espera o botão parar. Ele desliza até o lugar com um balanço que passa um pouco do ponto e
 * volta: comparar duas posições seguidas pegava às vezes o meio do balanço (máquina lenta do CI).
 * Aqui espera não sobrar nenhuma transição no botão.
 */
async function settled(page: Page): Promise<Box> {
  await page.waitForFunction(() => {
    const wrap = document.querySelector('[data-testid="floating-dice"]');
    return wrap !== null && wrap.getAnimations({ subtree: true }).length === 0;
  });
  return box(page, 'floating-dice.button');
}

/** Arrasta o botão com o dedo (celular) ou com o mouse (computador). */
async function drag(page: Page, isMobile: boolean, to: { x: number; y: number }) {
  const from = await settled(page);
  const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const steps = 12;
  const at = (i: number) => ({
    x: start.x + ((to.x - start.x) * i) / steps,
    y: start.y + ((to.y - start.y) * i) / steps,
  });
  if (isMobile) {
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', p?: { x: number; y: number }) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [p] : [] });
    await touch('touchStart', start);
    for (let i = 1; i <= steps; i++) {
      await touch('touchMove', at(i));
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(150); // para antes de soltar: sem embalo
    await touch('touchEnd');
    await cdp.detach();
  } else {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(at(i).x, at(i).y);
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(150);
    await page.mouse.up();
  }
  return settled(page);
}

const below = (upper: Box, lower: Box) => upper.y + upper.height <= lower.y + 0.5;

test.describe('B19 — botão flutuante de rolar dados', { tag: '@B19' }, () => {
  test.beforeEach(async ({ page }) => {
    await openPage(page, '/ficha');
    await page.getByTestId('floating-dice.button').waitFor();
  });

  test('digita a rolagem, rola, e botão e painel sobem para o resultado aparecer', async ({
    page,
  }) => {
    const before = await settled(page);
    await page.getByTestId('floating-dice.button').click();
    const input = page.getByTestId('floating-dice.input');
    await expect(input).toBeFocused();
    await expect(page.getByRole('dialog', { name: 'Rolar dados' })).toBeVisible();

    await input.fill('2d6+3');
    const result = await rollBy(page, () => input.press('Enter'));
    expect(result.expression).toBe('2d6+3');
    const tray = page.getByTestId('roll.tray');
    await expect(tray).toBeVisible();

    // Botão e painel acima do resultado, sem cobrir nada dele.
    await expect(page.getByTestId('floating-dice')).toHaveAttribute('data-lifted', 'true');
    const lifted = await settled(page);
    const trayBox = await box(page, 'roll.tray');
    const panel = (await page.getByRole('dialog', { name: 'Rolar dados' }).boundingBox())!;
    expect(below(lifted, trayBox)).toBe(true);
    expect(below(panel, trayBox)).toBe(true);
    expect(below(panel, lifted)).toBe(true);
    await expect(page.getByTestId('floating-dice.panel')).toBeVisible();

    // O resultado some: o botão volta para onde estava.
    await page.getByRole('button', { name: 'Esconder o resultado' }).click();
    await expect(tray).toBeHidden();
    await expect(page.getByTestId('floating-dice')).not.toHaveAttribute('data-lifted', 'true');
    const back = await settled(page);
    expect(back.y).toBeCloseTo(before.y, 0);
  });

  test('a bandeja mostra os dados do que é digitado, com os contornos de manter e tirar', async ({
    page,
  }) => {
    await page.getByTestId('floating-dice.button').click();
    const input = page.getByTestId('floating-dice.input');
    const tray = page.getByTestId('floating-dice.tray');
    const dice = tray.locator('.gr-die');

    await expect(dice).toHaveCount(1); // 1d20 de começo
    await input.fill('4d6dl1');
    await expect(dice).toHaveCount(4);
    await expect(tray.locator('.gr-die[data-mark="low"]')).toHaveCount(1);
    await input.fill('2d20kh1+1d4');
    await expect(dice).toHaveCount(3);
    await expect(tray.locator('.gr-die[data-mark="high"]')).toHaveCount(1);
    await expect(tray.locator('[data-shape="d4"]')).toHaveCount(1);
    await input.fill('2d20kl1');
    await expect(tray.locator('.gr-die[data-mark="low"]')).toHaveCount(1);

    // Mais de 7 dados: nada de dados, só o total depois de rolar.
    await input.fill('8d6');
    await expect(tray).toHaveAttribute('data-kind', 'many');
    await expect(dice).toHaveCount(0);
    await rollBy(page, () => input.press('Enter'));
    await expect(tray).toHaveAttribute('data-rolled', 'true');
    await expect(page.getByTestId('roll.tray')).toBeVisible();

    // Rolado com 2 dados: o contorno vai no dado que de fato ficou.
    await input.fill('2d20kh1');
    const result = await rollBy(page, () => input.press('Enter'));
    const kept = result.terms[0]!.dice.findIndex((d) => d.kept);
    await expect(dice.nth(kept)).toHaveAttribute('data-mark', 'high');
    await expect(dice.nth(1 - kept)).toHaveAttribute('data-out', '');
    // Entra no histórico (e na notificação) quando os dados param.
    await expect(page.getByTestId('roll.tray')).toContainText('2d20kh1');

    // Rolar duas vezes seguidas: a primeira nem chegou a aparecer e não entra no histórico. As
    // duas no mesmo instante (dois Enter pelo Playwright podem levar mais que o giro numa
    // máquina lenta, e aí a primeira para e entra, como deve).
    await input.fill('1d20+7');
    const second = await rollBy(page, () =>
      input.evaluate((el: HTMLInputElement) => {
        el.form!.requestSubmit();
        el.form!.requestSubmit();
      }),
    );
    await expect(page.getByTestId('roll.last.total')).toHaveAttribute(
      'data-value',
      String(second.total),
    );
    await page.getByRole('button', { name: 'Ver histórico de rolagens' }).first().click();
    const history = page.locator('[data-testid^="roll.history."]');
    // 1d20+7 (só a segunda), 2d20kh1 e 8d6.
    await expect(history).toHaveCount(3);
  });

  test('rolar pela ficha com o painel aberto anima na bandeja sem fechar nem apagar o campo', async ({
    page,
  }) => {
    await page.getByTestId('floating-dice.button').click();
    const input = page.getByTestId('floating-dice.input');
    const tray = page.getByTestId('floating-dice.tray');
    await input.fill('3d8+2');
    // No celular o painel cobre o meio da tela: o jogador rola a ficha até o dado ficar acima dele.
    const strength = page.getByTestId('ability.str.roll');
    await strength.evaluate((el) => {
      el.scrollIntoView({ block: 'start' });
      window.scrollBy(0, -140);
    });
    await rollBy(page, () => strength.click());
    await expect(page.getByTestId('floating-dice.panel')).toBeVisible();
    await expect(tray).toHaveAttribute('data-rolled', 'true');
    await expect(tray.locator('.gr-die')).toHaveCount(1);
    await expect(input).toHaveValue('3d8+2');
    // A notificação aparece quando o dado para.
    await expect(page.getByTestId('roll.tray')).toBeVisible();

    // Tocar no campo volta para os dados digitados.
    await input.click();
    await expect(tray).not.toHaveAttribute('data-rolled', 'true');
    await expect(tray.locator('.gr-die')).toHaveCount(3);

    // Um toque fora que não rola nada fecha o painel (na margem da página, logo abaixo do cabeçalho).
    await page.mouse.click(6, 80);
    await expect(page.getByTestId('floating-dice.panel')).toBeHidden();
  });

  test('expressão errada avisa no painel; Esc fecha e devolve o foco ao botão', async ({
    page,
  }) => {
    await page.getByTestId('floating-dice.button').click();
    const input = page.getByTestId('floating-dice.input');
    await input.fill('2d');
    await input.press('Enter');
    await expect(page.getByTestId('floating-dice.error')).toBeVisible();
    await expect(page.getByTestId('roll.tray')).toBeHidden();

    await input.press('Escape');
    await expect(page.getByTestId('floating-dice.panel')).toBeHidden();
    await expect(page.getByTestId('floating-dice.button')).toBeFocused();
  });

  test('arrastar troca de lado, não gruda em cima nem embaixo e o lugar fica salvo', async ({
    page,
    isMobile,
  }) => {
    const viewport = page.viewportSize()!;
    const wrap = page.getByTestId('floating-dice');
    await expect(wrap).toHaveAttribute('data-side', 'right');

    // Para a esquerda, no meio da tela: encosta na borda esquerda.
    const left = await drag(page, isMobile, { x: viewport.width * 0.3, y: viewport.height / 2 });
    await expect(wrap).toHaveAttribute('data-side', 'left');
    expect(left.x).toBeCloseTo(16, 0);
    expect(Math.abs(left.y + left.height / 2 - viewport.height / 2)).toBeLessThan(30);
    // Arrastar não abre o painel.
    await expect(page.getByTestId('floating-dice.panel')).toBeHidden();

    // Lá para cima: para abaixo do cabeçalho, sem grudar no topo.
    const top = await drag(page, isMobile, { x: 30, y: 0 });
    expect(top.y).toBeGreaterThanOrEqual(64);
    // Lá para baixo (e para a direita): fica acima do pé da tela.
    const bottom = await drag(page, isMobile, { x: viewport.width - 10, y: viewport.height });
    await expect(wrap).toHaveAttribute('data-side', 'right');
    expect(bottom.y + bottom.height).toBeLessThanOrEqual(viewport.height - 40);
    const inner = await page.evaluate(() => document.documentElement.clientWidth);
    expect(bottom.x + bottom.width).toBeCloseTo(inner - 16, 0);

    // Volta para a esquerda e recarrega: o lugar foi lembrado.
    const saved = await drag(page, isMobile, { x: 20, y: viewport.height * 0.4 });
    await page.reload();
    await page.getByTestId('floating-dice.button').waitFor();
    await expect(wrap).toHaveAttribute('data-side', 'left');
    const reloaded = await settled(page);
    expect(reloaded.y).toBeCloseTo(saved.y, 0);
  });
});
