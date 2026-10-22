import { createBlankSheet, type LocalSheet } from '@grimorio/shared';
import { PARTY_FIELDS, type GameAction } from '@grimorio/shared/campaign';
import { describe, expect, it } from 'vitest';
import { applyGameAction, isConditionKey, partySummary } from '.';

const ctx = (n: number) => ({ now: '2026-10-22T20:00:00.000Z', actionId: `id-${n}` });

function kaela(): LocalSheet {
  const s = createBlankSheet();
  s.identity.name = 'Kaela';
  s.combat.hpMaxOverride = 30;
  s.state.hp.current = 30;
  return s;
}

const run = (sheet: LocalSheet, actions: GameAction[]) =>
  actions.reduce((s, a, i) => applyGameAction(s, a, ctx(i)).sheet, sheet);

describe('ações da campanha', () => {
  it('dano 3 depois de dano 4 = dano 4 depois de dano 3', () => {
    const a = run(kaela(), [
      { type: 'damage', amount: 3 },
      { type: 'damage', amount: 4 },
    ]);
    const b = run(kaela(), [
      { type: 'damage', amount: 4 },
      { type: 'damage', amount: 3 },
    ]);
    expect(a.state.hp.current).toBe(23);
    expect(b.state.hp.current).toBe(23);
  });

  it('marcar a mesma condição duas vezes não desmarca; desmarcar o que não está não faz nada', () => {
    const on: GameAction = { type: 'set-condition', key: 'cond:poisoned', on: true };
    expect(run(kaela(), [on, on]).state.active).toEqual(['cond:poisoned']);
    expect(run(kaela(), [{ ...on, on: false }]).state.active).toEqual([]);
  });

  it('só condições do glossário (a Exaustão vai pelo nível)', () => {
    expect(isConditionKey('cond:prone')).toBe(true);
    expect(isConditionKey('cond:exhaustion')).toBe(false);
    expect(isConditionKey('cond:inventada')).toBe(false);
    const s = run(kaela(), [{ type: 'set-condition', key: 'cond:inventada', on: true }]);
    expect(s.state.active).toEqual([]);
    expect(run(kaela(), [{ type: 'set-exhaustion', level: 2 }]).state.active).toEqual([
      'cond:exhaustion:2',
    ]);
  });

  it('o resumo da mesa tem só os seis campos', () => {
    const s = run(kaela(), [
      { type: 'damage', amount: 5 },
      { type: 'set-temp-hp', amount: 4 },
    ]);
    const summary = partySummary(s);
    expect(Object.keys(summary).sort()).toEqual([...PARTY_FIELDS].sort());
    expect(summary.hp).toEqual({ current: 25, max: 30, temp: 4 });
  });
});
