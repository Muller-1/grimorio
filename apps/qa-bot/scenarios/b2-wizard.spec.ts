/**
 * B2 — Explorador do assistente (plano v2, 15.7), versão inicial: percorre a criação escolhendo
 * opções ao acaso (com a semente do bot) até o fim, sem conta, e confere a ficha criada com o
 * motor de regras (oráculo).
 */
import { buildCharacterSheet, deriveSheet, seededRng } from '@grimorio/rules';
import { expect, openPage, test } from '../support/bot';

test.describe('B2 — assistente de criação', { tag: '@B2' }, () => {
  test('cria um personagem aleatório e a ficha bate com o motor', async ({ page, seed }) => {
    const rng = seededRng(seed);
    /** Escolhe uma opção ao acaso; `required` espera as opções aparecerem. */
    const pick = async (prefix: string, required = false) => {
      const options = page.locator(`[data-testid^="${prefix}"]`);
      if (required) await options.first().waitFor();
      const count = await options.count();
      if (count > 0) await options.nth(rng.int(0, count - 1)).click();
    };
    /** Avançar/Criar ficam clicáveis mesmo com pendência (levam até ela): o estado está em data-ready. */
    const ready = async (testId: string) =>
      (await page.getByTestId(testId).getAttribute('data-ready')) === 'true';
    /** Marca perícias livres (não desabilitadas) até o limite. */
    const fillSkills = async () => {
      for (let guard = 0; guard < 20; guard++) {
        const free = page.locator('[data-testid^="wizard.skill."]:not(:checked):not([disabled])');
        if ((await free.count()) === 0) break;
        const step = (await page.getByTestId('wizard.finish').count())
          ? 'wizard.finish'
          : 'wizard.next';
        if (await ready(step)) break;
        await free.nth(rng.int(0, (await free.count()) - 1)).check();
      }
    };

    /** Maestria em Arma (Bárbaro, Guerreiro, Paladino, Guardião, Ladino): armas ao acaso. */
    const fillMasteries = async () => {
      for (let guard = 0; guard < 6; guard++) {
        if (await ready('wizard.next')) break;
        const free = page.locator(
          'input[data-testid^="wizard.mastery."]:not(:checked):not([disabled])',
        );
        if ((await free.count()) === 0) break;
        await free.nth(rng.int(0, (await free.count()) - 1)).check();
      }
    };

    await openPage(page, '/criar');
    await pick('wizard.option.class.', true);
    await pick('wizard.class-option.');
    await pick('wizard.fighting-style.');
    await fillSkills();
    await fillMasteries();
    await page.getByTestId('wizard.next').click();

    // Origem: só as opções do SRD (o "Outro" pede texto).
    await pick('wizard.option.background.', true);
    const custom = page.getByTestId('wizard.option.background.custom');
    if ((await custom.getAttribute('aria-pressed')) === 'true') {
      await page.getByTestId('wizard.option.background.soldier').click();
    }
    await page
      .locator('[data-testid^="wizard.option.species."]:not([data-testid$="custom"])')
      .first()
      .click();
    await pick('wizard.species-option.');
    await pick('wizard.species-feat.');
    await fillSkills();
    for (const lang of await page
      .getByRole('checkbox', { name: /^(Anão|Élfico|Gigante|Orc)$/ })
      .all()) {
      if (await ready('wizard.next')) break;
      if (await lang.isEnabled()) await lang.check();
    }
    await expect(page.getByTestId('wizard.next')).toHaveAttribute('data-ready', 'true');
    await page.getByTestId('wizard.next').click();

    await page.getByTestId('wizard.ability.suggest').click();
    // (o bônus sugerido segue o atributo primário da classe)
    await page.getByRole('button', { name: 'Sugerir pela classe' }).click();
    await page.getByTestId('wizard.next').click();

    await page.getByTestId('wizard.name').fill('Bot Aventureiro');
    await fillSkills();
    await expect(page.getByTestId('wizard.finish')).toHaveAttribute('data-ready', 'true');

    // Oráculo: o rascunho salvo + o motor dizem quais números a ficha deve mostrar.
    const draft = await page.evaluate(
      () => JSON.parse(localStorage.getItem('grimorio.criacao.v1') ?? '{}').draft,
    );
    const expected = deriveSheet(buildCharacterSheet(draft, { newId: () => 'x' })!);

    await page.getByTestId('wizard.finish').click();
    await page.waitForURL(/\/ficha$/);
    await expect(page.getByTestId('stat.ac')).toHaveAttribute(
      'data-value',
      String(expected.armorClass.value),
    );
    await expect(page.getByTestId('hp.max')).toHaveAttribute(
      'data-value',
      String(expected.hpMax.value),
    );
    await expect(page.getByTestId('stat.initiative')).toHaveAttribute(
      'data-value',
      String(expected.initiative.value),
    );
  });
});
