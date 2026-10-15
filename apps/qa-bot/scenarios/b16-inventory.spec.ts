/**
 * B16 — Pedido de 15/10: inventário (ouro, peso, arma equipada ou guardada), características
 * separadas pela origem, efeitos em você (condições) e foto enviada do computador. Uma ficha de
 * antes do inventário abre e é organizada sozinha. O oráculo é o motor de regras.
 */
import { deflateSync } from 'node:zlib';
import { carryingLoad, knownWeightKg, upgradeSheetContent } from '@grimorio/rules';
import { createBlankSheet, type LocalSheet } from '@grimorio/shared';
import type { Page } from '@playwright/test';
import { expect, openPage, seriousA11yViolations, test } from '../support/bot';

const SHEET_KEY = 'grimorio.ficha.v1';

const OLD_EQUIPMENT =
  'Machado Grande, 4 Machadinhas, Kit de Aventureiro, 20 Flechas, Kit de Curandeiro. 29 PO. (Classe: opção A; antecedente: opção A. O ouro pode ser gasto em equipamento do capítulo 6.)';

/** Ficha como o assistente fazia antes do inventário: equipamento em texto, sem origem. */
function oldSheet(): LocalSheet {
  const s = createBlankSheet();
  s.identity.name = 'Grum';
  s.identity.className = 'Bárbaro';
  s.build.abilities = { ...s.build.abilities, str: 16, con: 14 };
  s.combat.hitDie = 12;
  s.progression = { classId: 'barbarian', levels: [] };
  const weapon = (id: string, name: string, dice: string) => ({
    id,
    name,
    ability: 'str' as const,
    proficient: true,
    damageDice: dice,
    damageType: 'slashing' as const,
    magicBonus: 0,
    critRange: 20,
  });
  s.weapons = [weapon('w1', 'Machado Grande', '1d12'), weapon('w2', 'Machadinha (×4)', '1d6')];
  s.features = [
    { id: 'f1', name: 'Fúria', text: 'Texto da Fúria.' },
    { id: 'f2', name: 'Talento: Atacante Selvagem', text: 'Texto do talento.' },
    { id: 'f3', name: 'Equipamento inicial', text: OLD_EQUIPMENT },
  ];
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

/** PNG de verdade, sem bibliotecas: um degradê de `w`×`h` pixels. */
function makePng(w: number, h: number): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(w, 0);
  header.writeUInt32BE(h, 4);
  header[8] = 8; // 8 bits
  header[9] = 2; // RGB
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 3 + 1);
    for (let x = 0; x < w; x++) {
      raw[row + 1 + x * 3] = (x * 255) / w;
      raw[row + 2 + x * 3] = (y * 255) / h;
      raw[row + 3 + x * 3] = 128;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

test.describe('B16 — inventário, características e efeitos', { tag: '@B16' }, () => {
  test('ficha antiga: o equipamento vai para o inventário e a arma guardada sai dos ataques', async ({
    page,
  }) => {
    const before = oldSheet();
    const oracle = upgradeSheetContent(before, { newId: () => 'x' })!.sheet;
    const expected = carryingLoad(oracle);
    await withSheet(page, before);
    await openColumn(page, 'Ações');

    // Características: separadas pela origem; o texto do equipamento saiu de lá.
    await page.getByRole('tab', { name: 'Características' }).click();
    await expect(page.getByTestId('features.class')).toContainText('Fúria');
    await expect(page.getByTestId('features.feat')).toContainText('Atacante Selvagem');
    await expect(page.getByText('Equipamento inicial', { exact: true })).toHaveCount(0);

    // Inventário: ouro, itens e peso iguais aos do motor de regras.
    await page.getByRole('tab', { name: 'Inventário' }).click();
    await expect(page.getByTestId('inventory.gp')).toHaveValue('29');
    const load = page.getByTestId('inventory.load');
    await expect(load).toHaveAttribute('data-carried', String(expected.carriedKg));
    await expect(load).toHaveAttribute('data-capacity', String(16 * 7.5));
    expect(await seriousA11yViolations(page)).toEqual([]);

    // Guardar o Machado Grande: sai do peso e dos ataques.
    await page.getByTestId('inventory.weapon.w1.equipped').click();
    const machado = knownWeightKg('Machado Grande')!;
    await expect(load).toHaveAttribute(
      'data-carried',
      String(Math.round((expected.carriedKg - machado) * 100) / 100),
    );
    await page.getByRole('tab', { name: 'Armas/Utilizáveis' }).click();
    await expect(page.getByTestId('attack.w1')).toHaveCount(0);
    await expect(page.getByTestId('attack.w2')).toBeVisible();
    await expect(page.getByTestId('weapons.stored')).toBeVisible();

    // Item novo com o peso do livro.
    await page.getByRole('tab', { name: 'Inventário' }).click();
    await page.getByTestId('inventory.add').click();
    await page.getByTestId('item.name').fill('Corda');
    await page.getByTestId('item.save').click();
    const sheet = await sheetNow(page);
    expect(carryingLoad(sheet).carriedKg).toBeCloseTo(
      expected.carriedKg - machado + knownWeightKg('Corda')!,
      2,
    );
    expect(sheet.weapons.find((w) => w.id === 'w1')?.equipped).toBe(false);
    expect(sheet.features.every((f) => f.source)).toBe(true);
  });

  test('condição em você: Envenenado dá Desvantagem nos ataques e sai pelo X', async ({ page }) => {
    const s = oldSheet();
    s.features = s.features.map((f) => ({ ...f, source: 'class' as const }));
    await withSheet(page, s);
    await openColumn(page, 'Combate');
    await page.getByTestId('on-you.open').click();
    await page.getByTestId('on-you.cond:poisoned').click();
    expect(await seriousA11yViolations(page)).toEqual([]);
    await page.getByTestId('on-you.done').click();
    await expect(page.getByTestId('on-you.chips')).toContainText('Envenenado');
    const derived = (await page.evaluate(() => window.__APP_TEST__!.getDerived())) as {
      attacks: { disadvantage: boolean }[];
    };
    expect(derived.attacks[0]?.disadvantage).toBe(true);
    await page.getByRole('button', { name: /Envenenado/ }).click();
    await expect(page.getByTestId('on-you.chips')).toHaveCount(0);
  });

  test('foto do computador: reduzida no navegador e guardada na ficha', async ({ page }) => {
    const s = oldSheet();
    s.features = [];
    await withSheet(page, s);
    await openColumn(page, 'Personagem');
    await page.getByTestId('portrait.trigger').click();
    const png = makePng(1200, 900);
    await page
      .getByTestId('portrait.file')
      .setInputFiles({ name: 'heroi.png', mimeType: 'image/png', buffer: png });
    await expect
      .poll(async () => (await sheetNow(page)).identity.portraitData ?? '')
      .toMatch(/^data:image\/(webp|jpeg);base64,/);
    const data = (await sheetNow(page)).identity.portraitData!;
    // Reduzida para no máximo 320 px de lado e dentro do limite da ficha.
    expect(data.length).toBeLessThan(150_000);
    const size = await page.evaluate(async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      return [img.naturalWidth, img.naturalHeight];
    }, data);
    expect(size).toEqual([320, 240]);
  });
});
