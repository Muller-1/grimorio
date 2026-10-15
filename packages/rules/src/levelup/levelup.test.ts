import { createBlankSheet, type LocalSheet } from '@grimorio/shared';
import { describe, expect, it } from 'vitest';
import { deriveSheet } from '../sheet';
import { applyLevelUp, levelUpSteps } from '.';

let n = 0;
const ctx = { newId: () => `id-${++n}` };

function sheetOf(classId: string, level: number, extra: Partial<LocalSheet> = {}): LocalSheet {
  const s = createBlankSheet();
  s.build.level = level;
  s.build.abilities = { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 10 };
  s.progression = { classId, levels: [] };
  s.combat.hitDie = classId === 'barbarian' ? 12 : classId === 'wizard' ? 6 : 10;
  s.state.hp.current = deriveSheet(s).hpMax.value;
  return { ...s, ...extra };
}

describe('plano da subida de nível', () => {
  it('mostra o que ganha mesmo sem escolha (Bárbaro 1 → 2)', () => {
    const [step] = levelUpSteps(sheetOf('barbarian', 1), 2);
    expect(step!.level).toBe(2);
    expect(step!.gains.features.map((f) => f.id)).toEqual(['danger-sense', 'reckless-attack']);
    expect(step!.gains.hpAverage).toBe(7);
    expect(step!.gains.conMod).toBe(2);
    expect(step!.choices).toEqual([]);
  });

  it('nível 3 pede a subclasse; nível 4, atributo ou talento; nível 5 muda proficiência', () => {
    const steps = levelUpSteps(sheetOf('barbarian', 2), 5);
    expect(steps.map((s) => s.level)).toEqual([3, 4, 5]);
    expect(steps[0]!.choices.map((c) => c.def.kind)).toEqual(['subclass', 'skill']);
    expect(steps[0]!.gains.columns).toContainEqual({ name: 'Fúrias', from: 2, to: 3 });
    expect(steps[1]!.choices.map((c) => c.def.kind)).toEqual(['asi']);
    expect(steps[1]!.choices[0]!.required).toBe(true);
    expect(steps[2]!.gains.proficiency).toEqual({ from: 2, to: 3 });
  });

  it('subclasse escolhida na mesma subida libera as características dela', () => {
    const steps = levelUpSteps(sheetOf('barbarian', 2), 6, { subclassId: 'berserker' });
    expect(steps[0]!.gains.features.map((f) => f.id)).toContain('frenzy');
    expect(steps[3]!.gains.features.map((f) => f.id)).toContain('mindless-rage');
  });

  it('ficha antiga acima do nível 3 sem subclasse: pede no primeiro nível novo', () => {
    const steps = levelUpSteps(sheetOf('barbarian', 5), 6, { subclassId: 'berserker' });
    expect(steps[0]!.choices[0]!.def.kind).toBe('subclass');
    expect(steps[0]!.gains.features.map((f) => f.id)).toEqual(
      expect.arrayContaining(['frenzy', 'mindless-rage']),
    );
  });

  it('conjurador: espaços, truques e preparadas novos viram escolhas', () => {
    const [step] = levelUpSteps(sheetOf('wizard', 2), 3);
    expect(step!.gains.slots).toEqual([
      { circle: 1, from: 3, to: 4 },
      { circle: 2, from: 0, to: 2 },
    ]);
    const kinds = step!.choices.map((c) => c.def.kind);
    expect(kinds).toEqual(['subclass', 'spellbook', 'prepared', 'replace-cantrip']);
    expect(step!.choices.find((c) => c.def.kind === 'spellbook')!.def).toMatchObject({
      count: 2,
      maxCircle: 2,
    });
  });

  it('Bruxo: Magia de Pacto e troca de magia ao subir', () => {
    const [step] = levelUpSteps(sheetOf('warlock', 2), 3);
    expect(step!.gains.pact).toEqual({
      from: { count: 2, circle: 1 },
      to: { count: 2, circle: 2 },
    });
    expect(step!.choices.map((c) => c.def.kind)).toContain('replace-spell');
  });

  it('magias da subclasse e da espécie entram como sempre preparadas', () => {
    const s = sheetOf('cleric', 2);
    s.creation = {
      ...({} as NonNullable<LocalSheet['creation']>),
      speciesId: 'tiefling',
      speciesOptionId: 'infernal',
    };
    const [step] = levelUpSteps(s, 3, { subclassId: 'life' });
    const ids = step!.gains.grantedSpells.map((g) => `${g.source}:${g.id}`);
    expect(ids).toEqual(
      expect.arrayContaining(['subclass:bless', 'subclass:cure-wounds', 'species:hellish-rebuke']),
    );
  });

  it('não passa do nível 20 nem volta', () => {
    expect(levelUpSteps(sheetOf('fighter', 19), 25).map((s) => s.level)).toEqual([20]);
    expect(levelUpSteps(sheetOf('fighter', 5), 3)).toEqual([]);
    expect(levelUpSteps({ ...createBlankSheet() }, 3)).toEqual([]);
  });
});

describe('aplicar a subida de nível', () => {
  it('Bárbaro 2 → 4 com Berserker, PV rolado e +2 de Força', () => {
    const before = sheetOf('barbarian', 2);
    const after = applyLevelUp(
      before,
      [
        {
          level: 3,
          hpRolled: 12,
          choices: [
            { kind: 'subclass', id: 'berserker' },
            { kind: 'skill', id: 'perception' },
          ],
        },
        { level: 4, choices: [{ kind: 'asi', ability: 'str', amount: 2 }] },
      ],
      ctx,
    )!;
    expect(after).not.toBeNull();
    expect(after.build.level).toBe(4);
    expect(after.progression).toMatchObject({ classId: 'barbarian', subclassId: 'berserker' });
    expect(after.progression!.levels.map((l) => [l.level, l.hpRolled])).toEqual([
      [3, 12],
      [4, undefined],
    ]);
    expect(after.build.abilities.str).toBe(18);
    expect(after.build.skillProficiencies.perception).toBe(1);
    // PV: 12+2 (1) + 7+2 (2) + 12+2 (3) + 7+2 (4) = 46; atual sobe o mesmo que o máximo.
    expect(deriveSheet(after).hpMax.value).toBe(46);
    expect(after.state.hp.current).toBe(46);
    const names = after.features.map((f) => f.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'Subclasse: Trilha do Berserker',
        'Frenesi',
        'Conhecimento Primordial',
      ]),
    );
    expect(names).not.toContain('Aumento no Valor de Atributo');
    // O motor já enxerga o Frenesi.
    expect(deriveSheet(after).engine.features.map((f) => f.def.id)).toContain('frenzy');
  });

  it('atributo não passa de 20; talento do livro vira característica', () => {
    const s = sheetOf('fighter', 3);
    s.build.abilities.str = 19;
    const after = applyLevelUp(
      s,
      [{ level: 4, choices: [{ kind: 'feat', id: 'custom', text: 'Sentinela', ability: 'str' }] }],
      ctx,
    )!;
    expect(after.build.abilities.str).toBe(20);
    expect(after.features.map((f) => f.name)).toContain('Talento: Sentinela');
  });

  it('magias escolhidas vão para a ficha; troca de truque substitui', () => {
    const s = sheetOf('wizard', 2);
    s.spells.cantrips = ['fire-bolt', 'light', 'mage-hand'];
    s.spells.spellbook = ['magic-missile'];
    const after = applyLevelUp(
      s,
      [
        {
          level: 3,
          choices: [
            { kind: 'subclass', id: 'evoker' },
            { kind: 'spellbook', id: 'misty-step' },
            { kind: 'spellbook', id: 'shatter' },
            { kind: 'spell', id: 'misty-step' },
            { kind: 'replace-cantrip', id: 'ray-of-frost', text: 'light' },
          ],
        },
      ],
      ctx,
    )!;
    expect(after.spells.spellbook).toEqual(['magic-missile', 'misty-step', 'shatter']);
    expect(after.spells.prepared).toEqual(['misty-step']);
    expect(after.spells.cantrips).toEqual(['fire-bolt', 'ray-of-frost', 'mage-hand']);
  });

  it('opção escolhida, metamagia e invocação entram como características com o nome', () => {
    const s = sheetOf('sorcerer', 1);
    const after = applyLevelUp(
      s,
      [
        { level: 2, choices: [{ kind: 'metamagic', id: 'careful' }] },
        { level: 3, choices: [{ kind: 'subclass', id: 'draconic' }] },
      ],
      ctx,
    )!;
    expect(after.features.map((f) => f.name)).toContain('Metamagia: Magia Cuidadosa (1)');
  });

  it('ficha feita à mão: escolhe a classe na hora e passa a usar o dado dela', () => {
    const s = createBlankSheet();
    const after = applyLevelUp(s, [{ level: 2, choices: [] }], { ...ctx, classId: 'barbarian' })!;
    expect(after.progression?.classId).toBe('barbarian');
    expect(after.combat.hitDie).toBe(12);
    expect(after.identity.className).toBe('Bárbaro');
  });

  it('Campeão Primitivo (Bárbaro 20): For e Con +4 até 25', () => {
    const s = sheetOf('barbarian', 19);
    s.progression!.subclassId = 'berserker';
    s.build.abilities.str = 20;
    const after = applyLevelUp(s, [{ level: 20, choices: [] }], ctx)!;
    expect(after.build.abilities.str).toBe(24);
    expect(after.build.abilities.con).toBe(18);
  });
});
