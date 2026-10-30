/**
 * B15 — Subida de nível, magias e habilidades (ADR-010): sobe um Bárbaro de 2 para 4 pelas
 * telas curtas de cada nível (subclasse, o que ganhou, uma escolha por tela), liga Fúria +
 * Ataque Imprudente e confere o Frenesi; num Mago, adiciona uma magia pela aba Magias, conjura
 * gastando espaço e confere a Concentração; num Clérigo, o Conjurar já rola o ataque e o
 * "Em mim" da cura cura a própria ficha. O oráculo é o motor de regras (mesmas contas que a
 * ficha usa).
 */
import { createBlankSheet, type LocalSheet } from '@grimorio/shared';
import type { Page } from '@playwright/test';
import { expect, openPage, seriousA11yViolations, test } from '../support/bot';

const SHEET_KEY = 'grimorio.ficha.v1';

function sheetOf(
  classId: string,
  level: number,
  abilities: Partial<LocalSheet['build']['abilities']>,
) {
  const s = createBlankSheet();
  s.identity.name = `Teste ${classId}`;
  s.identity.className = classId;
  s.build.level = level;
  s.build.abilities = { ...s.build.abilities, ...abilities };
  s.combat.hitDie = classId === 'barbarian' ? 12 : 6;
  s.progression = { classId, levels: [] };
  s.weapons = [
    {
      id: 'w1',
      name: 'Machado Grande',
      ability: 'str',
      proficient: true,
      damageDice: '1d12',
      damageType: 'slashing',
      magicBonus: 0,
      critRange: 20,
    },
  ];
  s.state.hp.current = 1;
  return s;
}

async function withSheet(page: Page, sheet: LocalSheet) {
  await page.addInitScript(
    ([key, value]) => {
      // Só na primeira carga: depois a ficha é a que o site salvou.
      if (!sessionStorage.getItem('bot.seeded')) {
        localStorage.setItem(key!, value!);
        sessionStorage.setItem('bot.seeded', '1');
      }
    },
    [SHEET_KEY, JSON.stringify(sheet)],
  );
  await openPage(page, '/ficha');
  // A ficha é carregada sob demanda: espera aparecer antes de procurar as abas do celular.
  await page.getByTestId('levelup.open').waitFor();
}

async function openColumn(page: Page, name: 'Personagem' | 'Combate' | 'Ações') {
  const tab = page.getByRole('tab', { name, exact: true });
  if (await tab.isVisible()) await tab.click();
}

/** Avança pelas telas da subida de nível (escolhas opcionais ficam para depois) até `testId`. */
async function nextUntil(page: Page, testId: string) {
  for (let i = 0; i < 8 && !(await page.getByTestId(testId).isVisible()); i++) {
    await page.getByTestId('levelup.next').click();
  }
  await expect(page.getByTestId(testId)).toBeVisible();
}

const sheetNow = (page: Page) => page.evaluate(() => window.__APP_TEST__!.getSheet() as LocalSheet);

test.describe('B15 — subida de nível, magias e habilidades', { tag: '@B15' }, () => {
  test('Bárbaro 2 → 4: escolhas por nível, resumo, aplicar e desfazer', async ({ page }) => {
    await withSheet(page, sheetOf('barbarian', 2, { str: 16, con: 14 }));
    await page.getByTestId('levelup.open').click();
    await page.getByTestId('levelup.count.2').click();
    await expect(page.getByTestId('levelup.from-to')).toHaveText('Nível 2 → 4');
    await page.getByTestId('levelup.confirm').click();

    // Nível 3: a subclasse vem primeiro (muda o que se ganha) e é obrigatória.
    const level3 = page.getByTestId('levelup.level.3');
    await expect(level3).toHaveAttribute('data-page', 'choice');
    await expect(page.getByTestId('levelup.next')).toBeDisabled();
    await page.getByTestId('choice.subclass.berserker').check();
    await page.getByTestId('levelup.next').click();
    // Depois, numa tela só, o que ganhou (já com a característica da subclasse).
    await expect(level3).toHaveAttribute('data-page', 'gains');
    await expect(page.getByTestId('levelup.gains.numbers')).toContainText('Fúrias');
    await expect(page.getByTestId('levelup.gains.numbers')).toContainText('2 → 3');
    await expect(page.getByTestId('levelup.gains.features')).toContainText('Frenesi');
    expect(await seriousA11yViolations(page)).toEqual([]);
    await nextUntil(page, 'levelup.level.4');

    // Nível 4: o que ganhou e, na tela seguinte, o Aumento de Atributo (+2 em Força).
    await expect(page.getByTestId('levelup.level.4')).toHaveAttribute('data-page', 'gains');
    await page.getByTestId('levelup.next').click();
    await expect(page.getByTestId('levelup.next')).toBeDisabled();
    await page.locator('[data-testid^="ability-select."]').first().selectOption('str');
    expect(await seriousA11yViolations(page)).toEqual([]);
    await nextUntil(page, 'levelup.summary');

    await expect(page.getByTestId('levelup.summary')).toContainText('18');
    await page.getByTestId('levelup.apply').click();

    let sheet = await sheetNow(page);
    expect(sheet.build.level).toBe(4);
    expect(sheet.build.abilities.str).toBe(18);
    expect(sheet.progression?.subclassId).toBe('berserker');
    expect(sheet.progression?.levels.map((l) => l.level)).toEqual([3, 4]);

    // Desfazer volta para a ficha de antes.
    await page.getByTestId('toast.action').click();
    sheet = await sheetNow(page);
    expect(sheet.build.level).toBe(2);
    expect(sheet.build.abilities.str).toBe(16);
  });

  test('Fúria + Ataque Imprudente ligam o Frenesi no dano do 1º acerto', async ({ page }) => {
    const s = sheetOf('barbarian', 3, { str: 16 });
    s.progression!.subclassId = 'berserker';
    await withSheet(page, s);
    await openColumn(page, 'Combate');
    await expect(page.getByTestId('resource.rage.remaining')).toHaveAttribute('data-value', '3');
    await page.getByTestId('activation.rage.toggle').click();
    await expect(page.getByTestId('resource.rage.remaining')).toHaveAttribute('data-value', '2');
    await page.getByTestId('activation.reckless-attack.toggle').click();
    await expect(page.getByTestId('powers.active')).toContainText('Resistência');

    const derived = (await page.evaluate(() => window.__APP_TEST__!.getDerived())) as {
      attacks: {
        damageExpression: string;
        firstHitExpression: string | null;
        advantage: boolean;
      }[];
    };
    expect(derived.attacks[0]).toMatchObject({
      damageExpression: '1d12+5',
      firstHitExpression: '1d12+5+2d6',
      advantage: true,
    });
    await openColumn(page, 'Ações');
    await page.getByRole('button', { name: 'Detalhes de Machado Grande' }).click();
    await expect(page.getByTestId('attack.w1.extras')).toContainText('Frenesi 2d6');
    await expect(page.getByTestId('attack.w1.first-hit')).toBeVisible();

    // Crítico no 1º acerto: dobra os dados da arma e os do Frenesi; o +5 entra uma vez.
    await page.getByTestId('attack.w1.crit').click();
    let last = await page.evaluate(() => window.__APP_TEST__!.getLastRoll());
    expect(last?.expression).toBe('2d12+5');
    await page.getByTestId('attack.w1.first-hit-crit').click();
    last = await page.evaluate(() => window.__APP_TEST__!.getLastRoll());
    expect(last?.expression).toBe('2d12+5+4d6');
  });

  test('Mago: adiciona magia, conjura gastando espaço e mantém Concentração', async ({ page }) => {
    await withSheet(page, sheetOf('wizard', 3, { int: 16 }));
    await openColumn(page, 'Ações');
    await page.getByRole('tab', { name: 'Magias' }).click();
    await expect(page.getByTestId('spells.dc')).toHaveAttribute('data-value', '13');
    await expect(page.getByTestId('spells.slots')).toBeVisible();

    await page.getByTestId('spells.add').click();
    await page.getByTestId('picker.search').fill('teia');
    await page.getByTestId('pick.web').check();
    await page.getByTestId('picker.search').fill('misseis');
    await page.getByTestId('pick.magic-missile').check();
    expect(await seriousA11yViolations(page)).toEqual([]);
    await page.getByTestId('picker.add').click();

    await page.getByRole('button', { name: 'Detalhes de Teia' }).click();
    await page.getByTestId('spell.web.slot').selectOption('2');
    await page.getByTestId('spell.web.cast').click();
    await expect(page.getByTestId('spells.concentration')).toContainText('Teia');
    const sheet = await sheetNow(page);
    expect(sheet.state.slotsSpent.slice(0, 2)).toEqual([0, 1]);
    expect(sheet.spells.spellbook.sort()).toEqual(['magic-missile', 'web']);
    expect(await seriousA11yViolations(page)).toEqual([]);
  });

  test('Clérigo: Conjurar gasta o espaço e já rola o ataque; "Em mim" só na cura', async ({
    page,
  }) => {
    await withSheet(page, sheetOf('cleric', 3, { wis: 16 }));
    await openColumn(page, 'Ações');
    await page.getByRole('tab', { name: 'Magias' }).click();
    await page.getByTestId('spells.add').click();
    await page.getByTestId('picker.search').fill('raio guia');
    await page.getByTestId('pick.guiding-bolt').check();
    await page.getByTestId('picker.search').fill('curar ferimentos');
    await page.getByTestId('pick.cure-wounds').check();
    await page.getByTestId('picker.add').click();

    // Atalho com a carta fechada: gasta o espaço de 1º círculo e rola o ataque de magia.
    await page.getByTestId('spell.guiding-bolt.quick').click();
    let sheet = await sheetNow(page);
    expect(sheet.state.slotsSpent[0]).toBe(1);
    const attack = await page.evaluate(() => window.__APP_TEST__!.getLastRoll());
    expect(attack?.expression).toBe('1d20+5');

    // Magia de ataque não pergunta "Em mim"; a de cura pergunta e cura a própria ficha.
    await page.getByRole('button', { name: 'Detalhes de Raio Guia' }).click();
    await expect(page.getByTestId('spell.guiding-bolt.on-self')).toHaveCount(0);
    await page.getByRole('button', { name: 'Detalhes de Curar Ferimentos' }).click();
    await page.getByTestId('spell.cure-wounds.on-self').click();
    await expect(page.getByTestId('spell.cure-wounds.on-self')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await seriousA11yViolations(page)).toEqual([]);
    await page.getByTestId('spell.cure-wounds.cast').click();
    const heal = await page.evaluate(() => window.__APP_TEST__!.getLastRoll());
    const derived = (await page.evaluate(() => window.__APP_TEST__!.getDerived())) as {
      hpMax: { value: number };
    };
    sheet = await sheetNow(page);
    expect(sheet.state.slotsSpent[0]).toBe(2);
    expect(sheet.state.hp.current).toBe(Math.min(derived.hpMax.value, 1 + heal!.total));
  });
});
