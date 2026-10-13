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
    /** Marca perícias livres (não desabilitadas) até o limite. */
    const fillSkills = async () => {
      for (let guard = 0; guard < 20; guard++) {
        const free = page.locator('[data-testid^="wizard.skill."]:not(:checked):not([disabled])');
        if ((await free.count()) === 0) break;
        if (await page.getByTestId('wizard.next').or(page.getByTestId('wizard.finish')).isEnabled())
          break;
        await free.nth(rng.int(0, (await free.count()) - 1)).check();
      }
    };

    await openPage(page, '/criar');
    await pick('wizard.option.class.', true);
    await pick('wizard.class-option.');
    await pick('wizard.fighting-style.');
    await fillSkills();
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
      if (await page.getByTestId('wizard.next').isEnabled()) break;
      if (await lang.isEnabled()) await lang.check();
    }
    await expect(page.getByTestId('wizard.next')).toBeEnabled();
    await page.getByTestId('wizard.next').click();

    await page.getByTestId('wizard.ability.suggest').click();
    // (o bônus sugerido segue o atributo primário da classe)
    await page.getByRole('button', { name: 'Sugerir pela classe' }).click();
    await page.getByTestId('wizard.next').click();

    await page.getByTestId('wizard.name').fill('Bot Aventureiro');
    await fillSkills();
    await expect(page.getByTestId('wizard.finish')).toBeEnabled();

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
