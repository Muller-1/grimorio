import { createBlankSheet, type LocalSheet } from '@grimorio/shared';
import { describe, expect, it } from 'vitest';
import { applySheetAction, type SheetAction } from '../sheet/actions';
import { deriveSheet } from '../sheet/derive';
import { checkSheetInvariants, normalizeSheet } from '../sheet/invariants';
import { parseSpellDuration } from '../spells/duration';

const NOW = '2026-10-30T12:00:00.000Z';
let n = 0;
const act = (s: LocalSheet, action: SheetAction) =>
  applySheetAction(s, action, { now: NOW, actionId: `a${++n}` });
const run = (s: LocalSheet, ...actions: SheetAction[]) =>
  actions.reduce((x, a) => act(x, a).sheet, s);

function cleric(): LocalSheet {
  const s = createBlankSheet();
  s.build.level = 5;
  s.build.abilities.wis = 16;
  s.progression = { classId: 'cleric', levels: [] };
  return s;
}

/** Conjurar em si mesmo uma magia de Concentração, como a aba Magias faz. */
const castOnSelf = (spellId: string): SheetAction[] => [
  { type: 'set-concentration', spellId },
  { type: 'toggle-spell-effect', spellId },
];
const nextRounds = (k: number): SheetAction[] =>
  Array.from({ length: k }, () => ({ type: 'next-round' }) as const);
const effect = (s: LocalSheet, key: string) =>
  deriveSheet(s).activeEffects.find((e) => e.key === key);

describe('duração das magias (texto do livro → números)', () => {
  it.each([
    ['Concentração, até 1 minuto', { amount: 1, unit: 'minute' }],
    ['Concentração, até 10 minutos', { amount: 10, unit: 'minute' }],
    ['1 rodada', { amount: 1, unit: 'round' }],
    ['Concentração, até 6 rodadas', { amount: 6, unit: 'round' }],
    ['8 horas', { amount: 8, unit: 'hour' }],
    ['24 horas', { amount: 24, unit: 'hour' }],
    ['10 dias', { amount: 10, unit: 'day' }],
  ])('%s', (text, expected) => {
    expect(parseSpellDuration(text)).toEqual(expected);
  });

  it('instantânea, até ser dissipada e especial não têm duração contada', () => {
    expect(parseSpellDuration('Instantânea')).toBeNull();
    expect(parseSpellDuration('Até ser dissipada')).toBeNull();
    expect(parseSpellDuration('Especial')).toBeNull();
  });
});

describe('efeito ligado guarda quando começou e quanto dura', () => {
  it('Bênção em você: início, 1 minuto, sua, com Concentração', () => {
    const s = run(cleric(), ...castOnSelf('bless'));
    expect(s.state.activeInfo?.['spell:bless']).toEqual({
      startedAt: NOW,
      duration: { amount: 1, unit: 'minute' },
      by: 'self',
      concentration: true,
    });
    expect(effect(s, 'spell:bless')).toMatchObject({ name: 'Bênção', concentration: true });
  });

  it('desligar tira os detalhes junto', () => {
    const s = run(cleric(), ...castOnSelf('bless'), {
      type: 'toggle-spell-effect',
      spellId: 'bless',
    });
    expect(s.state.activeInfo?.['spell:bless']).toBeUndefined();
  });

  it('detalhe sem efeito ligado (ficha editada à mão) sai na normalização', () => {
    const s = cleric();
    s.state.activeInfo = { 'spell:bless': { startedAt: NOW } };
    expect(checkSheetInvariants(s)).toContain('active-info-orphan');
    expect(normalizeSheet(s).sheet.state.activeInfo).toBeUndefined();
  });
});

describe('rodadas de combate', () => {
  it('Bênção conjurada na rodada 2 vale até o início da rodada 12', () => {
    let s = run(cleric(), { type: 'start-combat' }, { type: 'next-round' }, ...castOnSelf('bless'));
    expect(s.state.round).toBe(2);
    expect(effect(s, 'spell:bless')).toMatchObject({ endsAtRound: 12, roundsLeft: 10 });
    s = run(s, ...nextRounds(9));
    expect(s.state.round).toBe(11);
    expect(s.state.active).toContain('spell:bless');
    const r = act(s, { type: 'next-round' });
    expect(r.notices).toContain('effects-ended');
    expect(r.sheet.state.active).not.toContain('spell:bless');
    expect(r.sheet.state.concentration).toBeUndefined();
  });

  it('Escudo Arcano (1 rodada) sai na rodada seguinte', () => {
    const s = run(
      cleric(),
      { type: 'start-combat' },
      { type: 'toggle-spell-effect', spellId: 'shield' },
    );
    expect(effect(s, 'spell:shield')).toMatchObject({ endsAtRound: 2, roundsLeft: 1 });
    expect(run(s, { type: 'next-round' }).state.active).not.toContain('spell:shield');
  });

  it('condição com rodadas contadas (Atordoado por 1 rodada) sai sozinha', () => {
    const s = run(
      cleric(),
      { type: 'start-combat' },
      { type: 'next-round' },
      { type: 'toggle-on-you', key: 'cond:stunned', rounds: 1 },
    );
    expect(s.state.activeInfo?.['cond:stunned']).toMatchObject({ by: 'other', startedRound: 2 });
    expect(run(s, { type: 'next-round' }).state.active).not.toContain('cond:stunned');
  });

  it('o que foi ligado antes do combate conta a partir da rodada 1', () => {
    const s = run(cleric(), ...castOnSelf('bless'), { type: 'start-combat' });
    expect(effect(s, 'spell:bless')).toMatchObject({ endsAtRound: 11, roundsLeft: 10 });
  });

  it('Concentração numa magia lançada em outra criatura também acaba no tempo', () => {
    const s = run(
      cleric(),
      { type: 'start-combat' },
      {
        type: 'set-concentration',
        spellId: 'hold-person',
        duration: { amount: 1, unit: 'minute' },
      },
    );
    expect(deriveSheet(s).concentration).toMatchObject({ spellId: 'hold-person', endsAtRound: 11 });
    expect(run(s, ...nextRounds(10)).state.concentration).toBeUndefined();
  });

  it('encerrar o combate: some o que dura rodadas; o resto continua, sem rodada', () => {
    const s = run(
      cleric(),
      { type: 'start-combat' },
      ...castOnSelf('bless'),
      { type: 'toggle-spell-effect', spellId: 'shield' },
      { type: 'end-combat' },
    );
    expect(s.state.round).toBeUndefined();
    expect(s.state.active).toEqual(['spell:bless']);
    expect(s.state.activeInfo?.['spell:bless']?.startedRound).toBeUndefined();
  });
});

describe('descansos passam o tempo', () => {
  it('descanso curto (1 hora): acaba o que dura até 1 hora; Armadura Arcana fica', () => {
    const s = run(
      cleric(),
      ...castOnSelf('bless'),
      { type: 'toggle-spell-effect', spellId: 'mage-armor' },
      { type: 'short-rest' },
    );
    expect(s.state.active).toEqual(['spell:mage-armor']);
    expect(s.state.concentration).toBeUndefined();
    expect(Object.keys(s.state.activeInfo ?? {})).toEqual(['spell:mage-armor']);
  });
});
