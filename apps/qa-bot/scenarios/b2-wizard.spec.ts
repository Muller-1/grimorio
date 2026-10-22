/**
 * B2 — Explorador do assistente (plano v2, 15.7), versão inicial: percorre a criação escolhendo
 * opções ao acaso (com a semente do bot) até o fim, sem conta, e confere a ficha criada com o
 * motor de regras (oráculo).
 */
import {
  BACKGROUNDS,
  buildCharacterSheet,
  CLASSES,
  deriveSheet,
  emptyDraft,
  seededRng,
  suggestBackgroundBonus,
  withBackground,
  withClass,
} from '@grimorio/rules';
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

    // Magias (só para quem conjura ou tem Iniciado em Magia): as recomendadas do livro e,
    // no que faltar (truque extra, Iniciado em Magia), magias ao acaso.
    if (await page.getByTestId('wizard.step.spells').count()) {
      await page.getByRole('heading', { name: 'Escolha suas magias' }).waitFor();
      const recommended = page.getByTestId('wizard.spells.recommended');
      if (await recommended.count()) await recommended.click();
      for (const select of await page.locator('select[data-testid^="wizard.initiate."]').all()) {
        await select.selectOption({ index: rng.int(1, 3) });
      }
      for (const list of await page
        .locator('[data-testid^="wizard.spells."], [data-testid^="wizard.initiate."]')
        .filter({ has: page.locator('input[data-testid^="pick."]') })
        .all()) {
        for (let guard = 0; guard < 8 && !(await ready('wizard.next')); guard++) {
          const free = list.locator('input[data-testid^="pick."]:not(:checked):not([disabled])');
          const n = await free.count();
          if (n === 0) break;
          await free.nth(rng.int(0, n - 1)).click();
        }
      }
      await expect(page.getByTestId('wizard.next')).toHaveAttribute('data-ready', 'true');
      await page.getByTestId('wizard.next').click();
    }

    await page.getByTestId('wizard.name').fill('Bot Aventureiro');
    await fillSkills();
    await expect(page.getByTestId('wizard.finish')).toHaveAttribute('data-ready', 'true');

    // Oráculo: o rascunho salvo + o motor dizem quais números a ficha deve mostrar.
    const draft = await page.evaluate(
      () => JSON.parse(localStorage.getItem('grimorio.criacao.v1') ?? '{}').draft,
    );
    const expected = deriveSheet(buildCharacterSheet(draft, { newId: () => 'x' })!);
    const expectedSheet = buildCharacterSheet(draft, { newId: () => 'x' })!;

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
    // As magias escolhidas no assistente estão na ficha.
    const sheet = await page.evaluate(() => window.__APP_TEST__!.getSheet() as { spells: unknown });
    expect(sheet.spells).toEqual(expectedSheet.spells);
  });

  test('Mago Sábio: magias recomendadas do livro e Iniciado em Magia', async ({ page }) => {
    // Rascunho pronto até Atributos (as etapas anteriores já têm cenário acima).
    let d = withClass(emptyDraft(), 'wizard');
    d = withBackground(d, 'sage');
    d.classSkills = ['investigation', 'medicine'];
    d.speciesId = 'human';
    d.speciesSkills = ['perception'];
    d.speciesFeatId = 'alert';
    d.languages = ['Anão', 'Élfico'];
    d.baseScores = { ...CLASSES.wizard.standardArray };
    d.backgroundBonus = suggestBackgroundBonus(BACKGROUNDS.sage!.abilities, CLASSES.wizard.primary);
    await page.addInitScript((draft) => {
      if (!sessionStorage.getItem('bot.seeded')) {
        localStorage.setItem(
          'grimorio.criacao.v1',
          JSON.stringify({ v: 1, step: 'spells', draft }),
        );
        localStorage.setItem('grimorio.criacao.intro-visto', '1');
        sessionStorage.setItem('bot.seeded', '1');
      }
    }, d);
    await openPage(page, '/criar');
    await page.getByRole('heading', { name: 'Escolha suas magias' }).waitFor();
    await expect(page.getByTestId('wizard.next')).toHaveAttribute('data-ready', 'false');

    await page.getByTestId('wizard.spells.recommended').click();
    await expect(page.getByTestId('wizard-spell-cantrips.count')).toHaveText('3 de 3');
    await expect(page.getByTestId('wizard-spellbook.count')).toHaveText('6 de 6');
    await expect(page.getByTestId('wizard-spell-prepared.count')).toHaveText('4 de 4');

    // Iniciado em Magia do Sábio: lista do Mago (fixa), atributo, 2 truques e 1 magia.
    await page.getByTestId('wizard.initiate.0.ability').selectOption('int');
    const cantrips = page.getByTestId('wizard.initiate.0.cantrips');
    await cantrips.getByTestId('pick.fire-bolt').check();
    await cantrips.getByTestId('pick.minor-illusion').check();
    // Truque que já é da classe não aparece de novo para o talento.
    await expect(cantrips.getByTestId('pick.light')).toBeDisabled();
    await page.getByTestId('wizard.initiate.0.spell').getByTestId('pick.shield').check();
    await expect(page.getByTestId('wizard.next')).toHaveAttribute('data-ready', 'true');
    await page.getByTestId('wizard.next').click();

    await page.getByTestId('wizard.name').fill('Elara');
    await page.getByTestId('wizard.finish').click();
    await page.waitForURL(/\/ficha$/);
    const sheet = await page.evaluate(
      () =>
        window.__APP_TEST__!.getSheet() as {
          spells: { cantrips: string[]; spellbook: string[]; granted: { id: string }[] };
        },
    );
    expect(sheet.spells.cantrips).toEqual(['light', 'mage-hand', 'ray-of-frost']);
    expect(sheet.spells.spellbook).toHaveLength(6);
    expect(sheet.spells.granted.map((g) => g.id)).toEqual([
      'fire-bolt',
      'minor-illusion',
      'shield',
    ]);
  });
});
