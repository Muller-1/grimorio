import { createBlankSheet, type LocalSheet, type Weapon } from '@grimorio/shared';
import { describe, expect, it } from 'vitest';
import { applySheetAction, deriveSheet, type SheetAction } from '../sheet';

const ctx = { now: '2026-10-14T12:00:00.000Z', actionId: 'a1' };

function sheetOf(
  classId: string,
  level: number,
  opts: { subclassId?: string; abilities?: Partial<LocalSheet['build']['abilities']> } = {},
): LocalSheet {
  const s = createBlankSheet();
  s.build.level = level;
  s.build.abilities = { ...s.build.abilities, ...opts.abilities };
  s.progression = {
    classId,
    levels: [],
    ...(opts.subclassId ? { subclassId: opts.subclassId } : {}),
  };
  return s;
}

const axe: Weapon = {
  id: 'w1',
  name: 'Machado Grande',
  ability: 'str',
  proficient: true,
  damageDice: '1d12',
  damageType: 'slashing',
  magicBonus: 0,
  critRange: 20,
};
const bow: Weapon = { ...axe, id: 'w2', name: 'Arco Longo', ability: 'dex', damageDice: '1d8' };
const rapier: Weapon = {
  ...axe,
  id: 'w3',
  name: 'Rapieira',
  ability: 'finesse',
  damageDice: '1d8',
};

function act(sheet: LocalSheet, ...actions: SheetAction[]) {
  let s = sheet;
  const notices: string[] = [];
  for (const a of actions) {
    const out = applySheetAction(s, a, ctx);
    s = out.sheet;
    notices.push(...out.notices);
  }
  return { sheet: s, notices };
}

describe('motor de habilidades: Bárbaro', () => {
  const base = () => {
    const s = sheetOf('barbarian', 3, { subclassId: 'berserker', abilities: { str: 16 } });
    s.weapons = [axe, bow];
    return s;
  };

  it('Fúria tem usos pela tabela e gasta 1 ao ligar', () => {
    const d = deriveSheet(base());
    const rage = d.engine.resources.find((r) => r.id === 'rage')!;
    expect(rage).toMatchObject({ max: 3, remaining: 3, shortRest: 'one' });
    const { sheet } = act(base(), { type: 'toggle-activation', id: 'rage' });
    expect(sheet.state.active).toContain('rage');
    expect(deriveSheet(sheet).engine.resources.find((r) => r.id === 'rage')!.remaining).toBe(2);
  });

  it('em Fúria: +2 no dano de Força, resistências e vantagem em Força', () => {
    const { sheet } = act(base(), { type: 'toggle-activation', id: 'rage' });
    const d = deriveSheet(sheet);
    const axeAtk = d.attacks.find((a) => a.weaponId === 'w1')!;
    const bowAtk = d.attacks.find((a) => a.weaponId === 'w2')!;
    expect(axeAtk.damageExpression).toBe('1d12+5'); // For +3, Fúria +2
    expect(bowAtk.damageExpression).toBe('1d8'); // Destreza 10: sem bônus de Fúria
    expect(d.resistances.map((r) => r.type).sort()).toEqual([
      'bludgeoning',
      'piercing',
      'slashing',
    ]);
    expect(d.saves.str.advantage).toBe(true);
    expect(d.skills.athletics.advantage).toBe(true);
    expect(d.notes.some((n) => n.text.includes('Concentração'))).toBe(true);
  });

  it('Frenesi: só com Fúria E Ataque Imprudente, Xd6 = Dano de Fúria, 1×/turno', () => {
    const onlyRage = act(base(), { type: 'toggle-activation', id: 'rage' }).sheet;
    expect(deriveSheet(onlyRage).attacks[0]!.firstHitExpression).toBeNull();

    const both = act(onlyRage, { type: 'toggle-activation', id: 'reckless-attack' }).sheet;
    const atk = deriveSheet(both).attacks.find((a) => a.weaponId === 'w1')!;
    expect(atk.advantage).toBe(true);
    expect(atk.extraDamage).toEqual([{ name: 'Frenesi', dice: '2d6', oncePerTurn: true }]);
    expect(atk.damageExpression).toBe('1d12+5');
    expect(atk.firstHitExpression).toBe('1d12+5+2d6');

    // Nível 9: Dano de Fúria +3 → 3d6.
    const high = { ...both, build: { ...both.build, level: 9 } };
    expect(deriveSheet(high).attacks[0]!.firstHitExpression).toBe('1d12+6+3d6');
  });

  it('desligar Ataque Imprudente desliga o Golpe Brutal (que depende dele)', () => {
    const s = { ...base(), build: { ...base().build, level: 9 } };
    const on = act(
      s,
      { type: 'toggle-activation', id: 'reckless-attack' },
      { type: 'toggle-activation', id: 'brutal-strike' },
    ).sheet;
    expect(on.state.active).toEqual(['reckless-attack', 'brutal-strike']);
    const off = act(on, { type: 'toggle-activation', id: 'reckless-attack' }).sheet;
    expect(off.state.active).toEqual([]);
  });

  it('Golpe Brutal exige o Ataque Imprudente ligado', () => {
    const s = { ...base(), build: { ...base().build, level: 9 } };
    expect(act(s, { type: 'toggle-activation', id: 'brutal-strike' }).notices).toEqual([
      'requires-active',
    ]);
  });

  it('sem usos de Fúria não liga; descanso curto devolve 1; longo, todos', () => {
    let s = base();
    for (let i = 0; i < 3; i++) {
      s = act(
        s,
        { type: 'toggle-activation', id: 'rage' },
        { type: 'toggle-activation', id: 'rage' },
      ).sheet;
    }
    expect(act(s, { type: 'toggle-activation', id: 'rage' }).notices).toEqual(['no-uses']);
    s = act(s, { type: 'short-rest' }).sheet;
    expect(deriveSheet(s).engine.resources[0]!.remaining).toBe(1);
    s = act(s, { type: 'long-rest' }).sheet;
    expect(deriveSheet(s).engine.resources[0]!.remaining).toBe(3);
  });

  it('Fúria encerra a Concentração', () => {
    const s = { ...base(), state: { ...base().state, concentration: 'bless' } };
    const out = act(s, { type: 'toggle-activation', id: 'rage' });
    expect(out.sheet.state.concentration).toBeUndefined();
    expect(out.notices).toContain('concentration-ended');
  });

  it('passivos por nível: Sentido de Perigo (2), Movimento Rápido (5)', () => {
    expect(deriveSheet(sheetOf('barbarian', 1)).saves.dex.advantage).toBe(false);
    expect(deriveSheet(sheetOf('barbarian', 2)).saves.dex.advantage).toBe(true);
    expect(deriveSheet(sheetOf('barbarian', 4)).speedFt).toBe(30);
    expect(deriveSheet(sheetOf('barbarian', 5)).speedFt).toBe(40);
  });
});

describe('motor de habilidades: outras classes', () => {
  it('Ataque Furtivo: só em Acuidade ou à distância, dados pela tabela', () => {
    const s = sheetOf('rogue', 5, { abilities: { dex: 16 } });
    s.weapons = [axe, rapier, bow];
    const on = act(s, { type: 'toggle-activation', id: 'sneak-attack' }).sheet;
    const d = deriveSheet(on);
    expect(d.attacks.find((a) => a.weaponId === 'w1')!.firstHitExpression).toBeNull();
    expect(d.attacks.find((a) => a.weaponId === 'w3')!.firstHitExpression).toBe('1d8+3+3d6');
    expect(d.attacks.find((a) => a.weaponId === 'w2')!.firstHitExpression).toBe('1d8+3+3d6');
  });

  it('Crítico Aprimorado do Campeão: 19–20', () => {
    const s = sheetOf('fighter', 3, { subclassId: 'champion' });
    s.weapons = [axe];
    expect(deriveSheet(s).attacks[0]!.critRange).toBe(19);
    expect(deriveSheet(sheetOf('fighter', 3)).attacks).toEqual([]);
  });

  it('Pau pra Toda Obra: metade da proficiência nas perícias sem proficiência', () => {
    const s = sheetOf('bard', 2);
    s.build.skillProficiencies = { persuasion: 1 };
    const d = deriveSheet(s);
    expect(d.skills.athletics.bonus.value).toBe(1);
    expect(d.skills.persuasion.bonus.value).toBe(2);
    expect(d.initiative.value).toBe(1);
  });

  it('Retomar o Fôlego: gasta um uso e cura o valor rolado', () => {
    const s = sheetOf('fighter', 4);
    s.state.hp.current = 10;
    const d = deriveSheet(s);
    const sw = d.engine.activations.find((a) => a.id === 'second-wind')!;
    expect(sw.heal).toBe('1d10+4');
    const out = act(s, { type: 'use-activation', id: 'second-wind', healRolled: 9 }).sheet;
    expect(out.state.hp.current).toBe(19);
    expect(deriveSheet(out).engine.resources.find((r) => r.id === 'second-wind')!.spent).toBe(1);
  });

  it('opção escolhida ao subir de nível liga os efeitos dela (Resistência Elemental)', () => {
    const s = sheetOf('sorcerer', 6, { subclassId: 'draconic' });
    s.progression!.levels = [
      { level: 6, choices: [{ kind: 'option', id: 'elemental-affinity:fire' }] },
    ];
    expect(deriveSheet(s).resistances).toEqual([{ type: 'fire', source: 'Afinidade Elemental' }]);
  });
});

describe('magias ativas em você', () => {
  it('Bênção soma 1d4 no ataque e nas salvaguardas; Escudo da Fé +2 na CA', () => {
    let s = sheetOf('fighter', 1);
    s.weapons = [axe];
    s = act(
      s,
      { type: 'toggle-spell-effect', spellId: 'bless' },
      { type: 'toggle-spell-effect', spellId: 'shield-of-faith' },
    ).sheet;
    const d = deriveSheet(s);
    expect(d.attacks[0]!.attackExpression).toBe('1d20+2+1d4');
    expect(d.saves.con.bonusDice).toEqual(['1d4']);
    expect(d.armorClass.value).toBe(12);
    expect(d.armorClass.parts.at(-1)).toEqual({
      source: { kind: 'effect', name: 'Escudo da Fé' },
      value: 2,
    });
  });

  it('Armadura Arcana só vale se for maior que a CA atual; Pele-Casca garante 17', () => {
    const s = sheetOf('wizard', 1, { abilities: { dex: 14 } });
    const mage = act(s, { type: 'toggle-spell-effect', spellId: 'mage-armor' }).sheet;
    expect(deriveSheet(mage).armorClass.value).toBe(15);
    const armored = { ...mage, combat: { ...mage.combat, armorClassOverride: 18 } };
    expect(deriveSheet(armored).armorClass.value).toBe(18);
    const bark = act(s, { type: 'toggle-spell-effect', spellId: 'barkskin' }).sheet;
    expect(deriveSheet(bark).armorClass.value).toBe(17);
  });

  it('encerrar a Concentração tira o efeito da magia', () => {
    let s = sheetOf('cleric', 1);
    s = act(
      s,
      { type: 'set-concentration', spellId: 'bless' },
      { type: 'toggle-spell-effect', spellId: 'bless' },
    ).sheet;
    expect(s.state.active).toEqual(['spell:bless']);
    s = act(s, { type: 'set-concentration', spellId: 'shield-of-faith' }).sheet;
    expect(s.state.concentration).toBe('shield-of-faith');
    expect(s.state.active).toEqual([]);
  });
});

describe('espaços de magia', () => {
  it('conjurador pleno, meio-conjurador e Magia de Pacto pela tabela', () => {
    const wiz = deriveSheet(sheetOf('wizard', 5, { abilities: { int: 16 } })).spellcasting!;
    expect(wiz.slots.map((x) => x.max)).toEqual([4, 3, 2]);
    expect(wiz).toMatchObject({ dc: 14, attack: 6, maxCircle: 3, preparedMax: 9, cantripsMax: 4 });
    expect(wiz.spellbookMin).toBe(14);
    const pal = deriveSheet(sheetOf('paladin', 5)).spellcasting!;
    expect(pal.slots.map((x) => x.max)).toEqual([4, 2]);
    expect(pal.cantripsMax).toBeUndefined();
    const wl = deriveSheet(sheetOf('warlock', 5)).spellcasting!;
    expect(wl.pact).toEqual({ circle: 3, max: 2, spent: 0 });
    expect(wl.slots).toEqual([]);
    expect(deriveSheet(sheetOf('barbarian', 5)).spellcasting).toBeNull();
  });

  it('gastar e recuperar; descanso curto devolve a Magia de Pacto; longo, tudo', () => {
    let s = sheetOf('wizard', 3);
    s = act(s, { type: 'spend-slot', circle: 2 }, { type: 'spend-slot', circle: 2 }).sheet;
    expect(act(s, { type: 'spend-slot', circle: 2 }).notices).toEqual(['no-slot']);
    expect(s.state.slotsSpent[1]).toBe(2);
    s = act(s, { type: 'restore-slot', circle: 2 }).sheet;
    expect(s.state.slotsSpent[1]).toBe(1);
    s = act(s, { type: 'short-rest' }).sheet;
    expect(s.state.slotsSpent[1]).toBe(1);
    s = act(s, { type: 'long-rest' }).sheet;
    expect(s.state.slotsSpent[1]).toBe(0);

    let w = sheetOf('warlock', 2);
    w = act(w, { type: 'spend-slot', circle: 1, pact: true }).sheet;
    expect(w.state.pactSlotsSpent).toBe(1);
    w = act(w, { type: 'short-rest' }).sheet;
    expect(w.state.pactSlotsSpent).toBe(0);
  });

  it('ficha sem classe: atributo de conjuração escolhido à mão, sem espaços', () => {
    const s = createBlankSheet();
    expect(deriveSheet(s).spellcasting).toBeNull();
    s.spells.ability = 'wis';
    expect(deriveSheet(s).spellcasting).toMatchObject({ source: 'manual', dc: 10, slots: [] });
  });
});
