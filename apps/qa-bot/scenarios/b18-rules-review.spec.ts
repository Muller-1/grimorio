/**
 * B18 — Regras que a ficha passou a saber (revisão do motor): tipo e propriedades da arma
 * (Arquearia e Ataque Furtivo seguem a arma, não o atributo). O oráculo é o motor de regras.
 */
import { deriveSheet } from '@grimorio/rules';
import { createBlankSheet, type LocalSheet } from '@grimorio/shared';
import type { Page } from '@playwright/test';
import { expect, openPage, test } from '../support/bot';

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
  s.combat.hitDie = 10;
  s.progression = { classId, levels: [] };
  s.state.hp.current = 1;
  return s;
}

async function withSheet(page: Page, sheet: LocalSheet) {
  await page.addInitScript(
    ([key, value]) => {
      if (!sessionStorage.getItem('bot.seeded')) {
        localStorage.setItem(key!, value!);
        sessionStorage.setItem('bot.seeded', '1');
      }
    },
    [SHEET_KEY, JSON.stringify(sheet)],
  );
  await openPage(page, '/ficha');
  await page.getByTestId('levelup.open').waitFor();
}

async function openColumn(page: Page, name: 'Personagem' | 'Combate' | 'Ações') {
  const tab = page.getByRole('tab', { name, exact: true });
  if (await tab.isVisible()) await tab.click();
}

const sheetNow = (page: Page) => page.evaluate(() => window.__APP_TEST__!.getSheet() as LocalSheet);

test.describe('B18 — regras da revisão do motor', { tag: '@B18' }, () => {
  test('arma: o tipo e a Acuidade decidem a Arquearia, não o atributo', async ({ page }) => {
    const s = sheetOf('ranger', 2, { dex: 16 });
    s.progression!.levels = [{ level: 2, choices: [{ kind: 'fighting-style', id: 'archery' }] }];
    // Ficha antiga: Rapieira com Destreza fixa, sem tipo guardado (contava como à distância).
    s.weapons = [
      {
        id: 'w1',
        name: 'Rapieira',
        ability: 'dex',
        proficient: true,
        damageDice: '1d8',
        damageType: 'piercing',
        magicBonus: 0,
        critRange: 20,
      },
    ];
    await withSheet(page, s);
    await openColumn(page, 'Ações');
    const toHit = page.getByTestId('attack.w1.tohit');
    await expect(toHit).toHaveAttribute('data-value', '7');

    await page.getByRole('button', { name: 'Detalhes de Rapieira' }).click();
    await expect(page.getByTestId('attack.w1.traits')).toHaveText('À distância');
    await page.getByTestId('attack.w1').getByRole('button', { name: 'Editar' }).click();
    await page.getByTestId('weapon.range').selectOption('melee');
    await page.getByTestId('weapon.flag.finesse').check();
    await page.getByTestId('weapon.save').click();

    const sheet = await sheetNow(page);
    expect(sheet.weapons[0]).toMatchObject({ range: 'melee', finesse: true });
    const expected = deriveSheet(sheet).attacks[0]!.toHit.value;
    expect(expected).toBe(5);
    await expect(toHit).toHaveAttribute('data-value', String(expected));
    await expect(page.getByTestId('attack.w1.traits')).toHaveText('Corpo a corpo · Acuidade');
  });
});
