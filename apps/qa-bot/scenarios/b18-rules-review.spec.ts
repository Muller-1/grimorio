/**
 * B18 — Regras que a ficha passou a saber (revisão do motor): tipo e propriedades da arma
 * (Arquearia e Ataque Furtivo seguem a arma, não o atributo); armadura e Escudo vestidos no
 * Inventário calculam a CA (Estilo Defesa só com armadura); Atordoado falha sozinho nas
 * salvaguardas de Força e Destreza, tira as ações e encerra a Concentração. O oráculo é o motor
 * de regras.
 */
import { deriveSheet } from '@grimorio/rules';
import { createBlankSheet, type LocalSheet } from '@grimorio/shared';
import type { Page } from '@playwright/test';
import { expect, openPage, rollCount, test } from '../support/bot';

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

  test('armadura no Inventário: CA calculada, Defesa só vestida, Escudo pelo nome', async ({
    page,
  }) => {
    const s = sheetOf('paladin', 2, { str: 15, dex: 14 });
    s.progression!.levels = [{ level: 2, choices: [{ kind: 'fighting-style', id: 'defense' }] }];
    // Ficha de antes da tabela de armaduras: o item tem o nome do livro, sem os números.
    s.inventory.items = [{ id: 'i1', name: 'Cota de Malha', quantity: 1 }];
    await withSheet(page, s);
    await openColumn(page, 'Combate');
    const ac = page.getByTestId('stat.ac');
    // Cota de Malha 16 + Defesa 1 (a ficha reconhece a armadura ao abrir).
    await expect(ac).toHaveAttribute('data-value', '17');

    await openColumn(page, 'Ações');
    await page.getByRole('tab', { name: 'Inventário' }).click();
    await page.getByTestId('inventory.item.i1.carried').click();
    let sheet = await sheetNow(page);
    expect(deriveSheet(sheet).armorClass.value).toBe(12);

    await page.getByTestId('inventory.item.i1.carried').click();
    await page.getByTestId('inventory.add').click();
    await page.getByTestId('item.name').fill('Escudo');
    await expect(page.getByTestId('item.armor.kind')).toHaveValue('shield');
    await page.getByTestId('item.save').click();
    sheet = await sheetNow(page);
    const expected = deriveSheet(sheet).armorClass.value;
    expect(expected).toBe(19);
    await openColumn(page, 'Combate');
    await expect(ac).toHaveAttribute('data-value', String(expected));
  });

  test('Atordoado: falha sozinho em Força e Destreza, sem ações, Concentração encerrada', async ({
    page,
  }) => {
    const s = sheetOf('cleric', 3, { wis: 16 });
    s.state.concentration = 'bless';
    s.state.active = ['spell:bless'];
    await withSheet(page, s);
    await openColumn(page, 'Combate');
    await page.getByTestId('on-you.open').click();
    await page.getByTestId('on-you.cond:stunned').click();
    await page.getByTestId('on-you.done').click();

    const sheet = await sheetNow(page);
    expect(sheet.state.concentration).toBeUndefined();
    expect(deriveSheet(sheet).saves.dex.autoFail).toBe(true);
    await expect(page.getByTestId('powers.restrictions')).toContainText('Atordoado');

    await openColumn(page, 'Personagem');
    const before = await rollCount(page);
    await page.getByTestId('save.dex.auto-fail').click();
    await expect(page.getByRole('status').filter({ hasText: 'Falha automática' })).toBeVisible();
    expect(await rollCount(page)).toBe(before);
    // Constituição continua rolando normal.
    await expect(page.getByTestId('save.con.roll')).toBeVisible();
    await openColumn(page, 'Ações');
    await expect(page.getByTestId('actions.restricted')).toContainText('Atordoado');
  });
});
