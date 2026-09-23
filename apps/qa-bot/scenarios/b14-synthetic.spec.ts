/**
 * B14 — monitor sintético (plano v2, RNF-12; plano de início, Etapa 8).
 *
 * Roda contra a PRODUÇÃO a cada 30 minutos (.github/workflows/sintetico.yml). Por isso NÃO usa
 * ganchos de teste nem semente: só faz o que qualquer visitante faria. A fixture de console
 * continua valendo — um erro no console em produção (ex.: algo bloqueado pela CSP) também falha.
 *
 *   pnpm bot --scenario=B14 --env=https://SEU-SITE.pages.dev
 */
import { expect, test } from '../support/bot';

test.describe('B14 — produção no ar', { tag: '@B14' }, () => {
  test('abre /dados, rola 1d20 e o total fica entre 1 e 20', async ({ page }) => {
    const response = await page.goto('/dados');
    expect(response?.status()).toBe(200);

    await page.getByTestId('dice.input').fill('1d20');
    await page.getByTestId('dice.submit').click();

    const total = page.getByTestId('roll.last.total');
    await expect(total).toHaveAttribute('data-value', /^\d+$/);
    const value = Number(await total.getAttribute('data-value'));
    expect(value).toBeGreaterThanOrEqual(1);
    expect(value).toBeLessThanOrEqual(20);
  });
});
