import { createBlankSheet, type LocalSheet } from '@grimorio/shared';
import { describe, expect, it } from 'vitest';
import { applySheetAction, type SheetAction } from '../sheet/actions';
import { deriveSheet } from '../sheet/derive';

const ctx = { now: '2026-10-30T12:00:00.000Z', actionId: 'a1' };

function caster(): LocalSheet {
  const s = createBlankSheet();
  s.build.level = 3;
  s.progression = { classId: 'cleric', levels: [] };
  s.state.concentration = 'bless';
  s.state.active = ['spell:bless'];
  return s;
}

const act = (s: LocalSheet, action: SheetAction) => applySheetAction(s, action, ctx);
const withOnYou = (s: LocalSheet, key: string) => act(s, { type: 'toggle-on-you', key }).sheet;

describe('condições que a ficha aplica sozinha', () => {
  it('Atordoado: falha automática em salvaguardas de Força e Destreza', () => {
    const d = deriveSheet(withOnYou(caster(), 'cond:stunned'));
    expect(d.saves.str.autoFail).toBe(true);
    expect(d.saves.dex.autoFail).toBe(true);
    expect(d.saves.con.autoFail).toBe(false);
    expect(deriveSheet(caster()).saves.str.autoFail).toBe(false);
  });

  it('Atordoado: sem ações, Ações Bônus nem Reações, e diz de onde vem', () => {
    const d = deriveSheet(withOnYou(caster(), 'cond:stunned'));
    expect(d.restrictions).toEqual({
      actions: true,
      bonusActions: true,
      reactions: true,
      sources: ['Atordoado'],
    });
    expect(deriveSheet(caster()).restrictions.actions).toBe(false);
  });

  it('ficar Incapacitado (ou Atordoado, Paralisado…) encerra a Concentração', () => {
    for (const key of [
      'cond:incapacitated',
      'cond:stunned',
      'cond:paralyzed',
      'cond:unconscious',
    ]) {
      const r = act(caster(), { type: 'toggle-on-you', key });
      expect(r.notices).toContain('concentration-ended');
      expect(r.sheet.state.concentration).toBeUndefined();
      expect(r.sheet.state.active).not.toContain('spell:bless');
    }
    // Envenenado não atrapalha a Concentração.
    const poisoned = act(caster(), { type: 'toggle-on-you', key: 'cond:poisoned' });
    expect(poisoned.sheet.state.concentration).toBe('bless');
  });

  it('Lentidão: só as Reações saem', () => {
    const d = deriveSheet(withOnYou(caster(), 'debuff:slow'));
    expect(d.restrictions).toMatchObject({ actions: false, bonusActions: false, reactions: true });
  });
});

describe('o que depende da situação fica separado dos lembretes', () => {
  it('Enfeitiçado: não atacar quem enfeitiçou é decisão da mesa, não lembrete solto', () => {
    const d = deriveSheet(withOnYou(caster(), 'cond:charmed'));
    expect(
      d.decisions.some((n) => n.source === 'Enfeitiçado' && n.text.includes('enfeitiçou')),
    ).toBe(true);
    expect(d.notes.some((n) => n.text.includes('não pode atacar'))).toBe(false);
  });

  it('Amedrontado: a Desvantagem é automática, mas só vale vendo a fonte do medo', () => {
    const d = deriveSheet(withOnYou(caster(), 'cond:frightened'));
    expect(d.attacks).toEqual([]);
    expect(d.skills.athletics.disadvantage).toBe(true);
    expect(d.decisions.some((n) => n.source === 'Amedrontado')).toBe(true);
  });

  it('Cego: falhar no que depende da visão é decisão da mesa', () => {
    const d = deriveSheet(withOnYou(caster(), 'cond:blinded'));
    expect(d.decisions.some((n) => n.text.includes('visão'))).toBe(true);
  });
});
