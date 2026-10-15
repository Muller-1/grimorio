/**
 * B15 — Subida de nível, magias e habilidades (ADR-010): sobe um Bárbaro de 2 para 4 pelas
 * telas por nível, liga Fúria + Ataque Imprudente e confere o Frenesi; num Mago, adiciona uma
 * magia pela aba Magias, conjura gastando espaço e confere a Concentração. O oráculo é o motor
 * de regras (mesmas contas que a ficha usa).
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

const sheetNow = (page: Page) => page.evaluate(() => window.__APP_TEST__!.getSheet() as LocalSheet);

test.describe('B15 — subida de nível, magias e habilidades', { tag: '@B15' }, () => {
  test('Bárbaro 2 → 4: escolhas por nível, resumo, aplicar e desfazer', async ({ page }) => {
    await withSheet(page, sheetOf('barbarian', 2, { str: 16, con: 14 }));
    await page.getByTestId('levelup.open').click();
    await page.getByTestId('levelup.count.2').click();
    await expect(page.getByTestId('levelup.from-to')).toHaveText('Nível 2 → 4');
    await page.getByTestId('levelup.confirm').click();

    // Nível 3: o que ganhou aparece; subclasse é obrigatória.
    await expect(page.getByTestId('levelup.level.3')).toBeVisible();
    await expect(page.getByTestId('levelup.gains.numbers')).toContainText('Fúrias: 2 → 3');
    await expect(page.getByTestId('levelup.next')).toBeDisabled();
    await page.getByTestId('choice.subclass.berserker').check();
    await expect(page.getByTestId('levelup.gains.features')).toContainText('Frenesi');
    expect(await seriousA11yViolations(page)).toEqual([]);
    await page.getByTestId('levelup.next').click();

    // Nível 4: +2 em Força.
    await expect(page.getByTestId('levelup.level.4')).toBeVisible();
    await expect(page.getByTestId('levelup.next')).toBeDisabled();
    await page.locator('[data-testid^="ability-select."]').first().selectOption('str');
    await page.getByTestId('levelup.next').click();

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
});
