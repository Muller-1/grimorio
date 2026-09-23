/**
 * B11 — Dados, versão tela (plano v2, 15.7): a mesma sequência de rolagens feita pela
 * tela e pelo `seededRng` com a mesma semente dá exatamente os mesmos resultados.
 * O oráculo é o próprio motor (`@grimorio/rules`), rodando fora do navegador.
 */
import { roll, seededRng, type Rng } from '@grimorio/rules';
import { diceOf, expect, loadExampleSheet, openPage, rollBy, test, useSeed } from '../support/bot';

function oracle(rng: Rng, expression: string) {
  const r = roll(expression, { rng });
  if (!r.ok) throw new Error(`o oráculo não aceitou ${expression}`);
  return r.value;
}

test.describe('B11 — dados', { tag: '@B11' }, () => {
  test('expressões digitadas: tela = oráculo, dado por dado', async ({ page, seed }) => {
    const expressions = [
      '1d20',
      '4d6kh3',
      '2d20kh1+5',
      '2d20kl1-1',
      '100d2',
      '3d8-1',
      'd%',
      '(1+2)d6',
    ];
    await openPage(page, '/dados');
    await useSeed(page, seed);
    const rng = seededRng(seed);

    for (const expression of expressions) {
      await page.getByTestId('dice.input').fill(expression);
      const onScreen = await rollBy(page, () => page.getByTestId('dice.submit').click());
      const expected = oracle(rng, expression);
      expect(onScreen.total, expression).toBe(expected.total);
      expect(diceOf(onScreen), expression).toEqual(diceOf(expected));
      await expect(page.getByTestId('roll.last.total')).toHaveAttribute(
        'data-value',
        String(expected.total),
      );
    }
  });

  test('rolagem rápida (quantidade + dado + somador)', async ({ page, seed }) => {
    await openPage(page, '/dados');
    await useSeed(page, seed);
    await page.getByTestId('dice.quick.count').fill('3');
    await page.getByText('d6', { exact: true }).click();
    await page.getByTestId('dice.quick.mod').fill('2');
    await expect(page.getByTestId('dice.quick.submit')).toContainText('3d6+2');
    const onScreen = await rollBy(page, () => page.getByTestId('dice.quick.submit').click());
    expect(onScreen.total).toBe(oracle(seededRng(seed), '3d6+2').total);
  });

  test('atalho com nome: a magia da mesa (100d2)', async ({ page, seed }) => {
    await openPage(page, '/dados');
    await useSeed(page, seed);
    const onScreen = await rollBy(page, () =>
      page.getByRole('button', { name: /Rolar Magia da mesa/ }).click(),
    );
    const expected = oracle(seededRng(seed), '100d2');
    expect(onScreen.total).toBe(expected.total);
    expect(diceOf(onScreen)).toHaveLength(100);
  });

  test('ficha: teste de Destreza da ladina de exemplo (1d20+3)', async ({ page, seed }) => {
    await openPage(page, '/ficha');
    await loadExampleSheet(page);
    await useSeed(page, seed);
    const onScreen = await rollBy(page, () => page.getByTestId('ability.dex.roll').click());
    expect(onScreen.expression).toBe('1d20+3');
    expect(onScreen.total).toBe(oracle(seededRng(seed), '1d20+3').total);
  });
});
