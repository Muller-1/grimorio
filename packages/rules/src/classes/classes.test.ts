import { describe, expect, it } from 'vitest';
import { CLASSES } from '../creation/content';
import { CLASS_PROGRESSIONS, columnAt, FULL_CASTER_SLOTS, HALF_CASTER_SLOTS, PACT_SLOTS } from '.';

const entries = Object.values(CLASS_PROGRESSIONS);

describe('progressão das classes (SRD 5.2)', () => {
  it('as 12 classes da criação têm progressão', () => {
    expect(Object.keys(CLASS_PROGRESSIONS).sort()).toEqual(Object.keys(CLASSES).sort());
  });

  it.each(entries.map((p) => [p.classId, p] as const))('%s: tabelas com 20 níveis', (_, p) => {
    for (const [name, values] of Object.entries(p.columns)) {
      expect(values, name).toHaveLength(20);
      expect(p.columnNames[name], `nome da coluna ${name}`).toBeTruthy();
    }
    if (p.spellcasting) {
      expect(p.spellcasting.prepared).toHaveLength(20);
      if (p.spellcasting.cantrips) expect(p.spellcasting.cantrips).toHaveLength(20);
    }
  });

  it.each(entries.map((p) => [p.classId, p] as const))(
    '%s: ids únicos, níveis válidos, subclasse no 3 e Dádiva Épica no 19',
    (_, p) => {
      const ids = p.features.map((f) => f.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const f of p.features) {
        expect(f.level).toBeGreaterThanOrEqual(1);
        expect(f.level).toBeLessThanOrEqual(20);
        expect(f.text.length, f.id).toBeGreaterThan(10);
      }
      expect(p.features.find((f) => f.choice?.kind === 'subclass')?.level).toBe(3);
      expect(p.features.find((f) => f.choice?.kind === 'epic-boon')?.level).toBe(19);
      expect(p.subclassLevels[0]).toBe(3);
      expect(p.subclasses).toHaveLength(1);
      for (const sub of p.subclasses) {
        const subIds = sub.features.map((f) => f.id);
        expect(new Set(subIds).size).toBe(subIds.length);
        for (const f of sub.features) {
          expect(p.subclassLevels, `${sub.id}/${f.id} no nível ${f.level}`).toContain(f.level);
          expect(ids, `${f.id} repete um id da classe`).not.toContain(f.id);
        }
      }
    },
  );

  it('Aumento no Valor de Atributo nos níveis do livro', () => {
    const asi = (id: keyof typeof CLASS_PROGRESSIONS) =>
      CLASS_PROGRESSIONS[id].features.filter((f) => f.choice?.kind === 'asi').map((f) => f.level);
    expect(asi('barbarian')).toEqual([4, 8, 12, 16]);
    expect(asi('fighter')).toEqual([4, 6, 8, 12, 14, 16]);
    expect(asi('rogue')).toEqual([4, 8, 10, 12, 16]);
  });

  it('recursos e ativações apontam para recursos que existem', () => {
    for (const p of entries) {
      const all = [...p.features, ...p.subclasses.flatMap((s) => s.features)];
      const resources = new Set(all.flatMap((f) => (f.resource ? [f.resource.id] : [])));
      for (const f of all) {
        for (const a of f.activation ?? []) {
          if (a.cost) expect(resources, `${p.classId}/${a.id}`).toContain(a.cost.resource);
        }
      }
    }
  });

  it('colunas citadas em valores existem na tabela', () => {
    const columnsIn = (value: unknown): string[] =>
      typeof value === 'object' && value !== null
        ? Object.entries(value).flatMap(([k, v]) => (k === 'column' ? [v as string] : columnsIn(v)))
        : [];
    for (const p of entries) {
      for (const column of columnsIn([p.features, p.subclasses])) {
        expect(p.columns, `${p.classId}: coluna ${column}`).toHaveProperty(column);
      }
    }
  });

  it('números conferidos com as tabelas', () => {
    expect(columnAt(CLASS_PROGRESSIONS.barbarian, 'rages', 17)).toBe(6);
    expect(columnAt(CLASS_PROGRESSIONS.barbarian, 'rageDamage', 9)).toBe(3);
    expect(columnAt(CLASS_PROGRESSIONS.rogue, 'sneakAttack', 19)).toBe(10);
    expect(columnAt(CLASS_PROGRESSIONS.monk, 'martialArts', 11)).toBe(10);
    expect(columnAt(CLASS_PROGRESSIONS.warlock, 'invocations', 18)).toBe(10);
    expect(CLASS_PROGRESSIONS.wizard.spellcasting!.prepared[15]).toBe(21);
    expect(CLASS_PROGRESSIONS.sorcerer.spellcasting!.prepared[1]).toBe(4);
    expect(FULL_CASTER_SLOTS[19]).toEqual([4, 3, 3, 3, 3, 2, 2, 1, 1]);
    expect(HALF_CASTER_SLOTS[16]).toEqual([4, 3, 3, 3, 1]);
    expect(PACT_SLOTS[10]).toEqual({ count: 3, circle: 5 });
  });
});
