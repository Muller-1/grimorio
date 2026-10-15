import { createBlankSheet, type LocalSheet } from '@grimorio/shared';
import { describe, expect, it } from 'vitest';
import { buildCharacterSheet } from '../creation/build';
import { emptyDraft, withBackground, withClass } from '../creation/draft';
import { CLASSES, BACKGROUNDS } from '../creation/content';
import { upgradeSheetContent } from '../creation/upgrade';
import { suggestBackgroundBonus } from '../creation/abilities';
import { deriveSheet } from '../sheet/derive';
import { carryingLoad, weaponWeightKg } from './load';
import { parseStartingEquipment, startingItems } from './starting';
import { itemKey, knownWeightKg, splitQuantity } from './weights';

let n = 0;
const ctx = { newId: () => `id-${++n}` };

function barbarian(): LocalSheet {
  const cls = CLASSES.barbarian;
  let d = withClass(emptyDraft(), 'barbarian');
  d = withBackground(d, 'soldier');
  d.classSkills = ['animal-handling', 'perception'];
  d.speciesId = 'orc';
  d.languages = ['Anão', 'Élfico'];
  d.abilityMethod = 'standard-array';
  d.baseScores = { ...cls.standardArray };
  d.backgroundBonus = suggestBackgroundBonus(BACKGROUNDS.soldier!.abilities, cls.primary);
  d.weaponMasteries = ['greataxe', 'handaxe'];
  d.name = 'Grum';
  return buildCharacterSheet(d, ctx)!;
}

const OLD_TEXT =
  'Machado Grande, 4 Machadinhas, Kit de Aventureiro, Lança, Arco Curto, 20 Flechas, Kit de Curandeiro, Kit de Jogos (o mesmo da proficiência), Aljava, Roupas de Viagem. 29 PO. (Classe: opção A; antecedente: opção A. O ouro pode ser gasto em equipamento do capítulo 6.)';

describe('peso dos itens (cap. 6)', () => {
  it('acha pelo nome no plural, sem acento e com a quantidade escrita', () => {
    expect(itemKey('Espadas Curtas')).toBe(itemKey('Espada Curta'));
    expect(knownWeightKg('Machadinhas')).toBe(1);
    expect(knownWeightKg('Livro (orações)')).toBe(2.5);
    expect(knownWeightKg('Foco Arcano (orbe)')).toBe(1.5);
    expect(knownWeightKg('Bugiganga misteriosa')).toBeUndefined();
    expect(splitQuantity('20 Flechas')).toEqual({ quantity: 20, name: 'Flechas' });
    expect(splitQuantity('Machadinha (×4)')).toEqual({ quantity: 4, name: 'Machadinha' });
  });

  it('a linha "Machadinha (×4)" pesa as quatro; o peso escrito pelo jogador vale mais', () => {
    const w = { ...barbarian().weapons[0]!, name: 'Machadinha (×4)' };
    delete w.weightKg;
    expect(weaponWeightKg(w)).toBe(4);
    expect(weaponWeightKg({ ...w, weightKg: 0.5 })).toBe(0.5);
  });
});

describe('equipamento inicial no inventário', () => {
  it('o assistente põe os itens e o ouro no inventário; as armas ficam em Armas', () => {
    const sheet = barbarian();
    expect(sheet.features.some((f) => f.name === 'Equipamento inicial')).toBe(false);
    expect(sheet.inventory.coins.gp).toBe(29);
    expect(sheet.inventory.items.map((i) => [i.name, i.quantity])).toEqual([
      ['Kit de Aventureiro', 1],
      ['Flechas', 20],
      ['Kit de Curandeiro', 1],
      ['Kit de Jogos (o mesmo da proficiência)', 1],
      ['Aljava', 1],
      ['Roupas de Viagem', 1],
    ]);
    expect(sheet.weapons.map((w) => [w.name, w.weightKg])).toEqual([
      ['Machado Grande', 3.5],
      ['Machadinha (×4)', 4],
      ['Lança', 1.5],
      ['Arco Curto', 1],
    ]);
  });

  it('o cajado que é Foco Arcano é a mesma arma: pesa uma vez só', () => {
    const items = startingItems(
      ['2 Adagas', 'Foco Arcano (cajado)', 'Livro de Magias'],
      [
        { ...barbarian().weapons[0]!, name: 'Cajado' },
        { ...barbarian().weapons[0]!, name: 'Adaga (×2)' },
      ],
      ctx.newId,
    );
    expect(items.map((i) => [i.name, i.weightKg])).toEqual([
      ['Foco Arcano (cajado)', 0],
      ['Livro de Magias', 1.5],
    ]);
  });

  it('lê só o texto que o assistente escrevia; texto mudado pelo jogador fica como está', () => {
    expect(parseStartingEquipment(OLD_TEXT)?.gold).toBe(29);
    expect(
      parseStartingEquipment(
        '200 PO. (Classe: opção B; antecedente: opção B. O ouro pode ser gasto em equipamento do capítulo 6.)',
      ),
    ).toEqual({ items: [], gold: 200 });
    expect(parseStartingEquipment(`${OLD_TEXT} Vendi o arco.`)).toBeNull();
  });
});

describe('fichas de antes do inventário (v2)', () => {
  it('ganham a origem de cada característica e o equipamento vai para o inventário', () => {
    const built = barbarian();
    const old: LocalSheet = {
      ...built,
      features: [
        ...built.features.map(({ source: _s, ...f }) => f),
        { id: 'eq', name: 'Equipamento inicial', text: OLD_TEXT },
        { id: 'mine', name: 'Odeia goblins', text: 'Anotação minha.' },
      ],
      inventory: { coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }, items: [] },
    };
    const out = upgradeSheetContent(old, ctx)!;
    expect(out.movedEquipment).toBe(true);
    const by = Object.fromEntries(out.sheet.features.map((f) => [f.name, f.source]));
    expect(by).toMatchObject({
      Fúria: 'class',
      'Defesa sem Armadura': 'class',
      'Classe de Armadura': 'training',
      'Visão no Escuro': 'species',
      'Vigor Implacável': 'species',
      'Talento: Atacante Selvagem': 'feat',
      'Treinamento e idiomas': 'training',
      'Odeia goblins': 'other',
    });
    expect(by['Equipamento inicial']).toBeUndefined();
    expect(out.sheet.inventory.coins.gp).toBe(29);
    expect(out.sheet.inventory.items.map((i) => i.name)).toContain('Kit de Aventureiro');
    // Uma vez só: depois de marcada, não há o que fazer.
    expect(upgradeSheetContent(out.sheet, ctx)).toBeNull();
  });

  it('texto do equipamento mudado pelo jogador continua como característica', () => {
    const blank = createBlankSheet();
    blank.features = [{ id: 'eq', name: 'Equipamento inicial', text: 'Mochila e corda.' }];
    const out = upgradeSheetContent(blank, ctx)!;
    expect(out.movedEquipment).toBe(false);
    expect(out.sheet.features).toEqual([
      { id: 'eq', name: 'Equipamento inicial', text: 'Mochila e corda.', source: 'other' },
    ]);
  });
});

describe('peso carregado e Capacidade de Carga', () => {
  it('soma armas equipadas, itens com você e moedas; Força × 7,5 kg', () => {
    const sheet = barbarian();
    const load = carryingLoad(sheet);
    // Armas 3,5 + 4 + 1,5 + 1 = 10; itens 27,5 + 0,5 + 1,5 + 0 + 0,5 + 2 = 32; 29 PO = 0,29 kg
    expect(load.carriedKg).toBe(42.29);
    expect(load.coinsKg).toBe(0.29);
    expect(load.capacityKg).toBe(sheet.build.abilities.str * 7.5);
    expect(load.over).toBe(false);
    expect(load.unknown).toBe(0);
  });

  it('arma guardada não pesa e não aparece nos ataques', () => {
    const sheet = barbarian();
    sheet.weapons[0]!.equipped = false;
    sheet.inventory.items[0]!.equipped = false;
    expect(carryingLoad(sheet).carriedKg).toBe(42.29 - 3.5 - 27.5);
    expect(deriveSheet(sheet).attacks.map((a) => a.weaponId)).not.toContain(sheet.weapons[0]!.id);
  });

  it('acima da capacidade: Deslocamento de até 1,5 m; acima do dobro, parado', () => {
    const sheet = barbarian();
    const cap = carryingLoad(sheet).capacityKg;
    sheet.inventory.items.push({ id: 'pedra', name: 'Pedra', quantity: 1, weightKg: cap });
    expect(deriveSheet(sheet).speedFt).toBe(5);
    sheet.inventory.items.push({ id: 'pedra2', name: 'Pedra', quantity: 1, weightKg: cap });
    expect(deriveSheet(sheet).speedFt).toBe(0);
  });

  it('Golias (Porte Poderoso) conta como tamanho maior: Força × 15 kg', () => {
    const sheet = barbarian();
    sheet.creation!.speciesId = 'goliath';
    expect(carryingLoad(sheet).capacityKg).toBe(sheet.build.abilities.str * 15);
  });
});
