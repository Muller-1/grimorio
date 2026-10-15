import { DAMAGE_TYPES } from '@grimorio/shared';
import { describe, expect, it } from 'vitest';
import { CLASS_PROGRESSIONS } from '../classes';
import { SPECIES_SPELLS } from '../creation/species-spells';
import { parse } from '../dice';
import { filterSpells, normalizeSearch, spellById, SPELLS } from './data';
import { SPELL_EFFECTS } from './effects';
import { spellRoll } from './casting';
import { SPELL_CLASSES, SPELL_SCHOOLS } from './types';

describe('lista de magias (SRD 5.2)', () => {
  it('339 magias, ids únicos no formato da ficha', () => {
    expect(SPELLS).toHaveLength(339);
    const ids = SPELLS.map((s) => s.id);
    expect(new Set(ids).size).toBe(339);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]{1,60}$/);
  });

  it('quantidade por círculo e por lista de classe igual ao SRD', () => {
    const byLevel = SPELLS.reduce<Record<number, number>>(
      (acc, s) => ({ ...acc, [s.level]: (acc[s.level] ?? 0) + 1 }),
      {},
    );
    expect(byLevel).toEqual({
      0: 27,
      1: 57,
      2: 57,
      3: 42,
      4: 34,
      5: 38,
      6: 31,
      7: 20,
      8: 17,
      9: 16,
    });
    const byClass = Object.fromEntries(
      SPELL_CLASSES.map((c) => [c, SPELLS.filter((s) => s.classes.includes(c)).length]),
    );
    expect(byClass).toEqual({
      bard: 130,
      cleric: 109,
      druid: 124,
      paladin: 38,
      ranger: 48,
      sorcerer: 140,
      warlock: 72,
      wizard: 218,
    });
  });

  it('campos válidos: escola, classes, textos em português sem pés', () => {
    for (const s of SPELLS) {
      expect(SPELL_SCHOOLS, s.id).toContain(s.school);
      expect(s.classes.length, s.id).toBeGreaterThan(0);
      expect(s.text.length, s.id).toBeGreaterThan(30);
      expect(s.name, s.id).not.toMatch(/[A-Z][a-z]+'s /); // sem "Tasha's" etc.
      expect(`${s.text} ${s.higher ?? ''} ${s.range}`, s.id).not.toMatch(/\b(feet|foot|pés)\b/i);
      expect(s.concentration, s.id).toBe(s.duration.startsWith('Concentração'));
    }
  });

  it('todo dado de dano e cura é válido no rolador, em qualquer círculo', () => {
    for (const s of SPELLS) {
      for (const d of s.damage ?? []) expect(DAMAGE_TYPES, s.id).toContain(d.type);
      for (let slot = Math.max(1, s.level); slot <= 9; slot++) {
        const roll = spellRoll(s, { slot, characterLevel: 20, mod: 4 });
        for (const d of roll.damage)
          expect(parse(d.expression).ok, `${s.id}: ${d.expression}`).toBe(true);
        if (roll.heal) expect(parse(roll.heal).ok, `${s.id}: ${roll.heal}`).toBe(true);
      }
    }
  });

  it('magias citadas por classes, subclasses e espécies existem', () => {
    const ids: string[] = [];
    for (const p of Object.values(CLASS_PROGRESSIONS)) {
      for (const f of [...p.features, ...p.subclasses.flatMap((s) => s.features)]) {
        ids.push(...(f.grantedSpells?.ids ?? []));
      }
      for (const sub of p.subclasses) {
        for (const list of Object.values(sub.spells ?? {})) ids.push(...list);
        for (const table of Object.values(sub.optionSpells ?? {})) {
          for (const list of Object.values(table)) ids.push(...list);
        }
      }
    }
    for (const table of Object.values(SPECIES_SPELLS)) {
      for (const list of Object.values(table)) ids.push(...list);
    }
    expect(ids.length).toBeGreaterThan(50);
    for (const id of ids) expect(spellById(id), id).toBeDefined();
  });

  it('efeitos ativos: só magias que existem, com o mesmo nome e concentração', () => {
    expect(Object.keys(SPELL_EFFECTS).length).toBeGreaterThanOrEqual(20);
    for (const [id, e] of Object.entries(SPELL_EFFECTS)) {
      const s = spellById(id)!;
      expect(s, id).toBeDefined();
      expect(e.name).toBe(s.name);
      expect(e.concentration).toBe(s.concentration);
    }
  });

  it('busca sem acento e filtros por classe e círculo', () => {
    expect(normalizeSearch('Mísseis Mágicos')).toBe('misseis magicos');
    expect(filterSpells({ query: 'misseis' }).map((s) => s.id)).toEqual(['magic-missile']);
    const wiz1 = filterSpells({ classes: ['wizard'], levels: [1] });
    expect(wiz1.every((s) => s.level === 1 && s.classes.includes('wizard'))).toBe(true);
    expect(filterSpells({ classes: ['paladin'], maxLevel: 0 })).toEqual([]);
  });
});

describe('rolagens das magias', () => {
  const at = (id: string, slot: number, characterLevel = 5, mod = 3) =>
    spellRoll(spellById(id)!, { slot, characterLevel, mod });

  it('Bola de Fogo: 8d6 Ígneo, +1d6 por círculo acima do 3º', () => {
    expect(spellById('fireball')).toMatchObject({ level: 3, save: 'dex', school: 'evocation' });
    expect(at('fireball', 3).damage).toEqual([{ expression: '8d6', type: 'fire' }]);
    expect(at('fireball', 5).damage).toEqual([{ expression: '10d6', type: 'fire' }]);
  });

  it('Curar Ferimentos: 2d8 + modificador, +2d8 por círculo', () => {
    expect(at('cure-wounds', 1).heal).toBe('2d8+3');
    expect(at('cure-wounds', 3).heal).toBe('6d8+3');
  });

  it('truques crescem nos níveis 5, 11 e 17', () => {
    expect(at('fire-bolt', 0, 1).damage[0]!.expression).toBe('1d10');
    expect(at('fire-bolt', 0, 5).damage[0]!.expression).toBe('2d10');
    expect(at('fire-bolt', 0, 17).damage[0]!.expression).toBe('4d10');
    expect(spellById('fire-bolt')!.attack).toBe('ranged');
  });

  it('Rajada Mística: mais raios, não mais dados', () => {
    const r = at('eldritch-blast', 0, 11);
    expect(r.beams).toBe(3);
    expect(r.damage[0]!.expression).toBe('1d10');
  });
});
