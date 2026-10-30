import { createBlankSheet, type Item, type LocalSheet } from '@grimorio/shared';
import { describe, expect, it } from 'vitest';
import { applySheetAction } from '../sheet/actions';
import { deriveSheet } from '../sheet/derive';
import { armorItemData, knownArmor } from './armor';

const ctx = { now: '2026-10-30T12:00:00.000Z', actionId: 'a1' };

function sheet(abilities: Partial<LocalSheet['build']['abilities']> = {}, classId?: string) {
  const s = createBlankSheet();
  s.build.level = 3;
  s.build.abilities = { ...s.build.abilities, ...abilities };
  if (classId) s.progression = { classId, levels: [] };
  return s;
}

let n = 0;
/** Item do inventário com os dados da armadura do livro (nome da tabela). */
function armor(name: string, extra: Partial<Item> = {}): Item {
  const def = knownArmor(name)!;
  return { id: `i${++n}`, name, quantity: 1, armor: armorItemData(def), ...extra };
}

const wearing = (s: LocalSheet, ...items: Item[]) => ({
  ...s,
  inventory: { ...s.inventory, items },
});

describe('tabela de armaduras (cap. 6)', () => {
  it('acha pelo nome, sem diferença de maiúsculas e acentos', () => {
    expect(knownArmor('Cota de Malha')).toMatchObject({
      kind: 'heavy',
      base: 16,
      dexCap: 0,
      strength: 13,
      stealthDisadvantage: true,
    });
    expect(knownArmor('couraca peitoral')).toMatchObject({ kind: 'medium', base: 14, dexCap: 2 });
    expect(knownArmor('Escudo')).toMatchObject({ kind: 'shield', base: 2 });
    expect(knownArmor('Mochila')).toBeUndefined();
  });
});

describe('Classe de Armadura pela armadura vestida', () => {
  it('Pesada não soma Destreza; Escudo +2; os nomes aparecem na explicação', () => {
    const s = wearing(sheet({ dex: 14 }), armor('Cota de Malha'), armor('Escudo'));
    const ac = deriveSheet(s).armorClass;
    expect(ac.value).toBe(18);
    expect(ac.parts).toEqual([
      { source: { kind: 'armor', name: 'Cota de Malha' }, value: 16 },
      { source: { kind: 'armor', name: 'Escudo' }, value: 2 },
    ]);
  });

  it('Média limita a Destreza a +2; Leve soma toda', () => {
    const dex18 = sheet({ dex: 18 });
    expect(deriveSheet(wearing(dex18, armor('Couraça Peitoral'))).armorClass.value).toBe(16);
    expect(deriveSheet(wearing(dex18, armor('Armadura de Couro Batido'))).armorClass.value).toBe(
      16,
    );
  });

  it('armadura guardada não conta; bônus mágico soma', () => {
    const s = sheet({ dex: 14 });
    expect(
      deriveSheet(wearing(s, armor('Cota de Malha', { equipped: false }))).armorClass.value,
    ).toBe(12);
    const plus1 = armor('Cota de Malha');
    plus1.armor = { ...plus1.armor!, bonus: 1 };
    expect(deriveSheet(wearing(s, plus1)).armorClass.value).toBe(17);
  });

  it('CA manual continua valendo e não soma o escudo de novo', () => {
    const s = wearing(sheet({ dex: 14 }), armor('Escudo'));
    s.combat.armorClassOverride = 18;
    expect(deriveSheet(s).armorClass.value).toBe(18);
  });

  it('Furtividade com Desvantagem quando a armadura pede', () => {
    const s = sheet({ dex: 14 });
    expect(deriveSheet(s).skills.stealth.disadvantage).toBe(false);
    expect(deriveSheet(wearing(s, armor('Cota de Malha'))).skills.stealth.disadvantage).toBe(true);
    expect(deriveSheet(wearing(s, armor('Couraça Peitoral'))).skills.stealth.disadvantage).toBe(
      false,
    );
  });

  it('Força abaixo da exigida: −3 m de Deslocamento e um aviso', () => {
    const weak = wearing(sheet({ str: 13 }), armor('Armadura de Placas'));
    const d = deriveSheet(weak);
    expect(d.speedFt).toBe(20);
    expect(d.notes.some((x) => x.text.includes('Força 15'))).toBe(true);
    const strong = wearing(sheet({ str: 15 }), armor('Armadura de Placas'));
    expect(deriveSheet(strong).speedFt).toBe(30);
  });
});

describe('o que só vale com ou sem armadura', () => {
  const defense = (s: LocalSheet) => {
    s.progression!.levels = [{ level: 2, choices: [{ kind: 'fighting-style', id: 'defense' }] }];
    return s;
  };

  it('Estilo Defesa: +1 só vestindo armadura; sem ela, só o lembrete', () => {
    const bare = defense(sheet({ dex: 14 }, 'paladin'));
    const d = deriveSheet(bare);
    expect(d.armorClass.value).toBe(12);
    expect(d.notes.some((x) => x.source === 'Defesa' && x.text.includes('armadura'))).toBe(true);
    const armored = deriveSheet(wearing(bare, armor('Armadura de Couro')));
    expect(armored.armorClass.value).toBe(14);
    expect(armored.armorClass.parts.at(-1)).toEqual({
      source: { kind: 'effect', name: 'Defesa' },
      value: 1,
    });
  });

  it('Defesa sem Armadura do Bárbaro: 10 + Des + Con, com Escudo; de armadura, não vale', () => {
    const s = sheet({ dex: 14, con: 16 }, 'barbarian');
    expect(deriveSheet(s).armorClass.value).toBe(15);
    expect(deriveSheet(wearing(s, armor('Escudo'))).armorClass.value).toBe(17);
    expect(deriveSheet(wearing(s, armor('Cota de Malha Parcial'))).armorClass.value).toBe(15);
    expect(deriveSheet(wearing(s, armor('Armadura de Couro'))).armorClass.value).toBe(13);
  });

  it('Defesa sem Armadura do Monge some com Escudo', () => {
    const s = sheet({ dex: 16, wis: 14 }, 'monk');
    expect(deriveSheet(s).armorClass.value).toBe(15);
    expect(deriveSheet(wearing(s, armor('Escudo'))).armorClass.value).toBe(15);
  });

  it('Resiliência Dracônica: 10 + Des + Car sem armadura', () => {
    const s = sheet({ dex: 14, cha: 16 }, 'sorcerer');
    s.progression!.subclassId = 'draconic';
    expect(deriveSheet(s).armorClass.value).toBe(15);
  });

  it('Armadura Arcana não vale vestindo armadura', () => {
    const s = sheet({ dex: 14 }, 'wizard');
    const mage = applySheetAction(
      s,
      { type: 'toggle-spell-effect', spellId: 'mage-armor' },
      ctx,
    ).sheet;
    expect(deriveSheet(mage).armorClass.value).toBe(15);
    expect(deriveSheet(wearing(mage, armor('Armadura de Couro'))).armorClass.value).toBe(13);
  });
});
