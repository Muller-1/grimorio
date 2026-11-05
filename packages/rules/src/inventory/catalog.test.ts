import { createBlankSheet } from '@grimorio/shared';
import { describe, expect, it } from 'vitest';
import { deriveSheet } from '../sheet/derive';
import { bookCatalog, catalogToSheet, searchCatalog } from './catalog';

let n = 0;
const newId = () => `id-${++n}`;
const entry = (id: string) => bookCatalog().find((e) => e.id === id)!;

describe('catálogo de itens do livro', () => {
  it('junta armas, armaduras e equipamento, sem repetir nome', () => {
    const all = bookCatalog();
    const kinds = (k: string) => all.filter((e) => e.kind === k).length;
    expect(kinds('weapon')).toBeGreaterThanOrEqual(30);
    expect(kinds('armor')).toBe(13);
    expect(kinds('gear')).toBeGreaterThanOrEqual(30);
    expect(new Set(all.map((e) => e.name)).size).toBe(all.length);
    expect(new Set(all.map((e) => e.id)).size).toBe(all.length);
  });

  it('busca sem acento, por nome ou propriedade, e por tipo', () => {
    expect(searchCatalog('espada longa').map((e) => e.id)).toEqual(['weapon:longsword']);
    expect(searchCatalog('acuidade', 'weapon').every((e) => e.kind === 'weapon')).toBe(true);
    expect(searchCatalog('acuidade', 'weapon').map((e) => e.name)).toContain('Rapieira');
    expect(searchCatalog('explorador', 'gear').map((e) => e.name)).toContain(
      'Kit de Explorador de Masmorras',
    );
  });

  it('arma do Guerreiro vem proficiente, com peso e propriedades do livro', () => {
    const sheet = createBlankSheet();
    sheet.progression = { classId: 'fighter', levels: [] };
    const out = catalogToSheet(entry('weapon:longsword'), sheet, newId);
    expect('weapon' in out && out.weapon).toMatchObject({
      name: 'Espada Longa',
      proficient: true,
      damageDice: '1d8',
      damageType: 'slashing',
      weightKg: 1.5,
    });
  });

  it('Mago não é proficiente com arma marcial; ficha sem classe deixa marcar à mão', () => {
    const wizard = createBlankSheet();
    wizard.progression = { classId: 'wizard', levels: [] };
    const out = catalogToSheet(entry('weapon:longsword'), wizard, newId);
    expect('weapon' in out && out.weapon.proficient).toBe(false);
    const blank = catalogToSheet(entry('weapon:dagger'), createBlankSheet(), newId);
    expect('weapon' in blank && blank.weapon).toMatchObject({
      ability: 'finesse',
      proficient: true,
    });
  });

  it('armadura entra guardada com os números; vestida, muda a CA', () => {
    const sheet = createBlankSheet();
    const out = catalogToSheet(entry('armor:chain-mail'), sheet, newId);
    expect('item' in out && out.item).toMatchObject({
      name: 'Cota de Malha',
      equipped: false,
      armor: { kind: 'heavy', base: 16, dexCap: 0, strength: 13 },
    });
    if (!('item' in out)) return;
    sheet.inventory.items.push({ ...out.item, equipped: true });
    sheet.build.abilities.str = 13;
    expect(deriveSheet(sheet).armorClass.value).toBe(16);
  });

  it('equipamento vira item com o peso de uma unidade', () => {
    const out = catalogToSheet(entry('gear:corda'), createBlankSheet(), newId);
    expect('item' in out && out.item).toMatchObject({ name: 'Corda', quantity: 1, weightKg: 2.5 });
  });
});
