import { createBlankSheet, type LocalSheet, type Weapon } from '@grimorio/shared';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { parse } from '../dice';
import { applySheetAction, type SheetAction } from './actions';
import { abilityModifier, deriveSheet, proficiencyBonusForLevel, withModifier } from './derive';
import { checkSheetInvariants, normalizeSheet } from './invariants';

let seq = 0;
const ctx = () => ({ now: '2026-09-22T12:00:00.000Z', actionId: `a${++seq}` });

/** Guerreira de referência (conferida à mão): nível 3, For 16, Des 13, Con 14, d10. */
function thalia(): LocalSheet {
  const s = createBlankSheet();
  s.identity.name = 'Thalia';
  s.build.level = 3;
  s.build.abilities = { str: 16, dex: 13, con: 14, int: 8, wis: 12, cha: 10 };
  s.build.saveProficiencies = ['str', 'con'];
  s.build.skillProficiencies = { athletics: 1, perception: 1, stealth: 2, history: 0.5 };
  s.combat.hitDie = 10;
  s.state.hp.current = 28;
  return s;
}

function act(sheet: LocalSheet, action: SheetAction) {
  return applySheetAction(sheet, action, ctx());
}

describe('modificador e proficiência', () => {
  it.each([
    [1, -5],
    [3, -4],
    [8, -1],
    [9, -1],
    [10, 0],
    [11, 0],
    [15, 2],
    [20, 5],
    [30, 10],
  ])('valor %i → modificador %i', (score, mod) => {
    expect(abilityModifier(score)).toBe(mod);
  });

  it.each([
    [1, 2],
    [4, 2],
    [5, 3],
    [8, 3],
    [9, 4],
    [13, 5],
    [15, 5],
    [17, 6],
    [20, 6],
  ])('nível %i → proficiência +%i', (level, bonus) => {
    expect(proficiencyBonusForLevel(level)).toBe(bonus);
  });
});

describe('deriveSheet — ficha de referência', () => {
  const d = deriveSheet(thalia());

  it('proficiência e atributos', () => {
    expect(d.proficiencyBonus.value).toBe(2);
    expect(d.abilities.str).toEqual({ score: 16, mod: 3 });
    expect(d.abilities.dex.mod).toBe(1);
  });

  it('salvaguardas somam proficiência só nas marcadas', () => {
    expect(d.saves.str.bonus.value).toBe(5);
    expect(d.saves.con.bonus.value).toBe(4);
    expect(d.saves.dex.bonus.value).toBe(1);
    expect(d.saves.int.bonus.value).toBe(-1);
  });

  it('perícias: nenhuma, metade, proficiente, especialização', () => {
    expect(d.skills.athletics.bonus.value).toBe(5); // 3 + 2
    expect(d.skills.perception.bonus.value).toBe(3); // 1 + 2
    expect(d.skills.stealth.bonus.value).toBe(5); // 1 + 2×2
    expect(d.skills.history.bonus.value).toBe(0); // -1 + ⌊2/2⌋
    expect(d.skills.arcana.bonus.value).toBe(-1);
  });

  it('explicação da perícia lista as partes', () => {
    expect(d.skills.stealth.bonus.parts).toEqual([
      { source: { kind: 'ability', ability: 'dex' }, value: 1 },
      { source: { kind: 'proficiency', level: 2 }, value: 4 },
    ]);
  });

  it('iniciativa, CA sem armadura e percepção passiva', () => {
    expect(d.initiative.value).toBe(1);
    expect(d.armorClass.value).toBe(11);
    expect(d.passivePerception.value).toBe(13);
  });

  it('PV máximo pela média: 10+2 no 1º nível, 6+2 nos seguintes', () => {
    expect(d.hpMax.value).toBe(28);
  });

  it('dados de vida', () => {
    expect(d.hitDice).toEqual({ die: 10, total: 3, remaining: 3 });
  });
});

describe('deriveSheet — ajustes manuais', () => {
  it('CA manual substitui 10 + Destreza', () => {
    const s = thalia();
    s.combat.armorClassOverride = 18;
    const ac = deriveSheet(s).armorClass;
    expect(ac.value).toBe(18);
    expect(ac.parts).toEqual([{ source: { kind: 'override' }, value: 18 }]);
  });

  it('PV máximo manual', () => {
    const s = thalia();
    s.combat.hpMaxOverride = 31;
    expect(deriveSheet(s).hpMax.value).toBe(31);
  });

  it('PV por nível nunca é menor que 1 (Constituição muito baixa)', () => {
    const s = createBlankSheet();
    s.build.level = 3;
    s.build.abilities.con = 1; // -5
    s.combat.hitDie = 6;
    // 1º nível: max(1, 6-5)=1; depois: max(1, 4-5)=1 → 3
    expect(deriveSheet(s).hpMax.value).toBe(3);
  });
});

describe('ataques', () => {
  const dagger: Weapon = {
    id: 'w1',
    name: 'Adaga',
    ability: 'finesse',
    proficient: true,
    damageDice: '1d4',
    magicBonus: 0,
    critRange: 20,
  };

  it('arma com acuidade usa o maior entre Força e Destreza', () => {
    const s = thalia();
    s.weapons = [dagger];
    const [atk] = deriveSheet(s).attacks;
    expect(atk!.toHit.value).toBe(5); // For 3 + prof 2
    expect(atk!.damageBonus.value).toBe(3);
    expect(atk!.damageExpression).toBe('1d4+3');
  });

  it('bônus mágico entra no ataque e no dano; sem proficiência não soma', () => {
    const s = thalia();
    s.weapons = [{ ...dagger, ability: 'dex', proficient: false, magicBonus: 1 }];
    const [atk] = deriveSheet(s).attacks;
    expect(atk!.toHit.value).toBe(2); // Des 1 + mágico 1
    expect(atk!.damageExpression).toBe('1d4+2');
  });

  it('dado de dano inválido gera aviso e nenhuma expressão', () => {
    const s = thalia();
    s.weapons = [{ ...dagger, damageDice: '1d' }];
    const d = deriveSheet(s);
    expect(d.attacks[0]!.damageExpression).toBeNull();
    expect(d.warnings).toContainEqual({ code: 'invalid-damage-dice', weaponId: 'w1' });
  });

  it('withModifier monta expressões válidas', () => {
    expect(withModifier('1d20', 5)).toBe('1d20+5');
    expect(withModifier('1d20', -1)).toBe('1d20-1');
    expect(withModifier('1d20', 0)).toBe('1d20');
  });
});

describe('PV: dano, cura, temporários e desfazer (RF-36)', () => {
  it('PV temporários não se somam: tendo 3 e recebendo 5, fica com 5', () => {
    let s = act(thalia(), { type: 'set-temp-hp', amount: 3 }).sheet;
    s = act(s, { type: 'set-temp-hp', amount: 5 }).sheet;
    expect(s.state.hp.temp).toBe(5);
    s = act(s, { type: 'set-temp-hp', amount: 2 }).sheet;
    expect(s.state.hp.temp).toBe(5);
  });

  it('dano consome primeiro os temporários', () => {
    let s = act(thalia(), { type: 'set-temp-hp', amount: 4 }).sheet;
    s = act(s, { type: 'damage', amount: 10 }).sheet;
    expect(s.state.hp).toEqual({ current: 22, temp: 0 });
  });

  it('PV nunca fica abaixo de 0 nem acima do máximo', () => {
    let s = act(thalia(), { type: 'damage', amount: 20 }).sheet;
    s = act(s, { type: 'damage', amount: 20 }).sheet;
    expect(s.state.hp.current).toBe(0);
    s = act(s, { type: 'heal', amount: 500 }).sheet;
    expect(s.state.hp.current).toBe(28);
  });

  it('desfazer um dano devolve PV e temporários exatamente', () => {
    const start = act(thalia(), { type: 'set-temp-hp', amount: 4 }).sheet;
    const hit = act(start, { type: 'damage', amount: 10 }).sheet;
    const damageEvent = hit.state.hpLog.at(-1)!;
    const undone = act(hit, { type: 'undo-hp', targetActionId: damageEvent.actionId }).sheet;
    expect(undone.state.hp).toEqual(start.state.hp);
    expect(undone.state.hpLog.at(-1)!.undone).toBe(true);
  });

  it('desfazer não apaga o que veio depois (ação inversa, não volta no tempo)', () => {
    let s = act(thalia(), { type: 'damage', amount: 5 }).sheet; // 23
    const first = s.state.hpLog.at(-1)!.actionId;
    s = act(s, { type: 'damage', amount: 3 }).sheet; // 20
    s = act(s, { type: 'undo-hp', targetActionId: first }).sheet; // +5 → 25
    expect(s.state.hp.current).toBe(25);
  });

  it('desfazer duas vezes o mesmo evento não faz nada', () => {
    let s = act(thalia(), { type: 'damage', amount: 5 }).sheet;
    const id = s.state.hpLog.at(-1)!.actionId;
    s = act(s, { type: 'undo-hp', targetActionId: id }).sheet;
    const r = act(s, { type: 'undo-hp', targetActionId: id });
    expect(r.sheet.state.hp.current).toBe(28);
    expect(r.notices).toContain('nothing-to-undo');
  });

  it('Curados e Recebidos ignoram eventos desfeitos', () => {
    let s = act(thalia(), { type: 'damage', amount: 5 }).sheet;
    s = act(s, { type: 'damage', amount: 3 }).sheet;
    s = act(s, { type: 'heal', amount: 2 }).sheet;
    s = act(s, { type: 'undo-hp', targetActionId: s.state.hpLog[1]!.actionId }).sheet;
    expect(deriveSheet(s).hpTotals).toEqual({ received: 5, healed: 2 });
  });

  it('histórico guarda no máximo 50 eventos', () => {
    let s = thalia();
    for (let i = 0; i < 60; i++) s = act(s, { type: 'damage', amount: 0 }).sheet;
    expect(s.state.hpLog).toHaveLength(50);
  });
});

describe('testes contra a morte (RF-37)', () => {
  const dying = () => {
    const s = thalia();
    s.state.hp.current = 0;
    return s;
  };

  it('20 natural: volta com 1 PV e zera os testes', () => {
    const s = dying();
    s.state.deathSaves = { successes: 1, failures: 2 };
    const r = act(s, { type: 'death-save', d20: 20 });
    expect(r.sheet.state.hp.current).toBe(1);
    expect(r.sheet.state.deathSaves).toEqual({ successes: 0, failures: 0 });
    expect(r.notices).toContain('revived');
  });

  it('1 natural conta duas falhas', () => {
    expect(act(dying(), { type: 'death-save', d20: 1 }).sheet.state.deathSaves.failures).toBe(2);
  });

  it('10 ou mais é sucesso; menos de 10 é falha', () => {
    expect(act(dying(), { type: 'death-save', d20: 10 }).sheet.state.deathSaves).toEqual({
      successes: 1,
      failures: 0,
    });
    expect(act(dying(), { type: 'death-save', d20: 9 }).sheet.state.deathSaves).toEqual({
      successes: 0,
      failures: 1,
    });
  });

  it('três sucessos: estável; três falhas: morto', () => {
    let s = dying();
    for (let i = 0; i < 3; i++) s = act(s, { type: 'death-save', d20: 15 }).sheet;
    expect(s.state.deathSaves.successes).toBe(3);

    let f = dying();
    f.state.deathSaves.failures = 2;
    const r = act(f, { type: 'death-save', d20: 5 });
    f = r.sheet;
    expect(f.state.deathSaves.failures).toBe(3);
    expect(r.notices).toContain('dead');
  });

  it('só rola com 0 PV', () => {
    const r = act(thalia(), { type: 'death-save', d20: 15 });
    expect(r.notices).toContain('not-dying');
    expect(r.sheet.state.deathSaves).toEqual({ successes: 0, failures: 0 });
  });

  it('dano com 0 PV: uma falha (duas se for crítico)', () => {
    expect(act(dying(), { type: 'damage', amount: 3 }).sheet.state.deathSaves.failures).toBe(1);
    expect(
      act(dying(), { type: 'damage', amount: 3, critical: true }).sheet.state.deathSaves.failures,
    ).toBe(2);
  });

  it('morte instantânea: excedente ≥ PV máximo', () => {
    const s = thalia(); // 28/28
    const r = act(s, { type: 'damage', amount: 56 });
    expect(r.sheet.state.hp.current).toBe(0);
    expect(r.sheet.state.deathSaves.failures).toBe(3);
    expect(r.notices).toContain('instant-death');
    // 55 = 28 + 27: excedente menor que o máximo, só cai
    expect(act(thalia(), { type: 'damage', amount: 55 }).notices).not.toContain('instant-death');
  });

  it('receber cura com 0 PV zera os testes', () => {
    const s = dying();
    s.state.deathSaves = { successes: 2, failures: 1 };
    expect(act(s, { type: 'heal', amount: 3 }).sheet.state.deathSaves).toEqual({
      successes: 0,
      failures: 0,
    });
  });
});

describe('dados de vida e descanso longo', () => {
  it('gastar um dado de vida cura o resultado + Constituição (mínimo 1)', () => {
    const s = thalia();
    s.state.hp.current = 10;
    const r = act(s, { type: 'spend-hit-die', rolled: 4 });
    expect(r.sheet.state.hp.current).toBe(16); // 4 + 2
    expect(r.sheet.state.hitDiceSpent).toBe(1);

    const weak = createBlankSheet();
    weak.build.abilities.con = 3; // -4
    weak.state.hp.current = 1;
    weak.combat.hpMaxOverride = 10;
    expect(act(weak, { type: 'spend-hit-die', rolled: 2 }).sheet.state.hp.current).toBe(2);
  });

  it('sem dados de vida restantes, nada acontece', () => {
    const s = thalia();
    s.state.hitDiceSpent = 3;
    const r = act(s, { type: 'spend-hit-die', rolled: 5 });
    expect(r.notices).toContain('no-hit-dice');
    expect(r.sheet).toEqual(s);
  });

  it('precisa de pelo menos 1 PV para descansar', () => {
    const s = thalia();
    s.state.hp.current = 0;
    expect(act(s, { type: 'spend-hit-die', rolled: 5 }).notices).toContain('needs-1-hp');
  });

  it('desfazer a cura do dado de vida devolve o dado', () => {
    const s = thalia();
    s.state.hp.current = 10;
    let r = act(s, { type: 'spend-hit-die', rolled: 4 }).sheet;
    r = act(r, { type: 'undo-hp', targetActionId: r.state.hpLog.at(-1)!.actionId }).sheet;
    expect(r.state.hp.current).toBe(10);
    expect(r.state.hitDiceSpent).toBe(0);
  });

  it('descanso longo (2024): PV cheio, temporários zerados, todos os dados de vida de volta', () => {
    const s = thalia();
    s.state.hp = { current: 5, temp: 3 };
    s.state.hitDiceSpent = 2;
    s.state.hpLog = act(s, { type: 'damage', amount: 1 }).sheet.state.hpLog;
    const r = act(s, { type: 'long-rest' }).sheet;
    expect(r.state.hp).toEqual({ current: 28, temp: 0 });
    expect(r.state.hitDiceSpent).toBe(0);
    expect(r.state.hpLog).toEqual([]);
  });
});

describe('invariantes', () => {
  it('normalizeSheet corrige valores acima do máximo e avisa', () => {
    const s = thalia();
    s.state.hp.current = 28;
    s.state.hitDiceSpent = 3;
    s.build.level = 1; // PV máximo cai para 12 e só há 1 dado de vida
    const { sheet, warnings } = normalizeSheet(s);
    expect(sheet.state.hp.current).toBe(12);
    expect(sheet.state.hitDiceSpent).toBe(1);
    expect(warnings).toContainEqual({
      code: 'value-clamped',
      field: 'hp.current',
      from: 28,
      to: 12,
    });
    expect(checkSheetInvariants(sheet)).toEqual([]);
  });

  it('qualquer sequência de ações mantém as invariantes', () => {
    const arbAction: fc.Arbitrary<SheetAction> = fc.oneof(
      fc.record({
        type: fc.constant('damage'),
        amount: fc.integer({ min: 0, max: 80 }),
        critical: fc.boolean(),
      }),
      fc.record({ type: fc.constant('heal'), amount: fc.integer({ min: 0, max: 80 }) }),
      fc.record({ type: fc.constant('set-temp-hp'), amount: fc.integer({ min: 0, max: 30 }) }),
      fc.record({ type: fc.constant('death-save'), d20: fc.integer({ min: 1, max: 20 }) }),
      fc.record({ type: fc.constant('spend-hit-die'), rolled: fc.integer({ min: 1, max: 10 }) }),
      fc.constant<SheetAction>({ type: 'long-rest' }),
      fc.constant<SheetAction>({ type: 'undo-hp', targetActionId: 'último' }),
    );
    fc.assert(
      fc.property(fc.array(arbAction, { maxLength: 40 }), (actions) => {
        let s = thalia();
        for (const a of actions) {
          const action =
            a.type === 'undo-hp'
              ? { ...a, targetActionId: s.state.hpLog.at(-1)?.actionId ?? 'nenhum' }
              : a;
          s = act(s, action).sheet;
          const violations = checkSheetInvariants(s);
          if (violations.length > 0) return false;
        }
        return true;
      }),
    );
  });

  it('dano 3 seguido de dano 4 = dano 4 seguido de dano 3 (relação metamórfica)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 60 }), fc.integer({ min: 0, max: 60 }), (a, b) => {
        const x = act(act(thalia(), { type: 'damage', amount: a }).sheet, {
          type: 'damage',
          amount: b,
        });
        const y = act(act(thalia(), { type: 'damage', amount: b }).sheet, {
          type: 'damage',
          amount: a,
        });
        return (
          x.sheet.state.hp.current === y.sheet.state.hp.current &&
          x.sheet.state.hp.temp === y.sheet.state.hp.temp
        );
      }),
    );
  });

  it('descanso longo duas vezes = uma vez', () => {
    const once = act(thalia(), { type: 'long-rest' }).sheet;
    const twice = act(once, { type: 'long-rest' }).sheet;
    expect(twice.state).toEqual(once.state);
  });
});

describe('expressões geradas pela ficha são válidas', () => {
  it('toda expressão de ataque passa no parser', () => {
    fc.assert(
      fc.property(fc.integer({ min: -10, max: 20 }), (mod) => parse(withModifier('1d20', mod)).ok),
    );
  });
});
