import { createBlankSheet } from '@grimorio/shared';
import { beforeAll, describe, expect, it } from 'vitest';
import { CLASS_ORDER, type ClassId } from '../../creation/content';
import { checkSheetInvariants } from '../../sheet/invariants';
import { deriveSheet } from '../../sheet/derive';
import { levelUpSteps } from '../../levelup/plan';
import { SPELLS } from '../../spells/data';
import { CLASS_PROGRESSIONS } from '../index';
import type { FeatureDef } from '../types';
import {
  bookSubclassesReady,
  loadAllBookSubclasses,
  loadBookSubclasses,
  sheetNeedsBookSubclasses,
} from './index';

// Rode só uma classe com: pnpm vitest run packages/rules/src/classes/book-subclasses -t fighter

const SRD_SUBCLASS = Object.fromEntries(
  CLASS_ORDER.map((id) => [id, CLASS_PROGRESSIONS[id].subclasses.map((s) => s.id)]),
) as Record<ClassId, string[]>;

const spellIds = new Set(SPELLS.map((s) => s.id));

beforeAll(async () => {
  expect(sheetNeedsBookSubclasses({ classId: 'fighter', subclassId: 'battle-master' })).toBe(true);
  await loadAllBookSubclasses();
});

const bookOf = (id: ClassId) =>
  CLASS_PROGRESSIONS[id].subclasses.filter((s) => !SRD_SUBCLASS[id].includes(s.id));

describe('subclasses do livro', () => {
  it.each(CLASS_ORDER)('%s: as 3 do livro, com ids e níveis válidos', (classId) => {
    const p = CLASS_PROGRESSIONS[classId];
    const book = bookOf(classId);
    expect(book.map((s) => s.id)).toHaveLength(3);
    const classIds = p.features.map((f) => f.id);
    const subIds = p.subclasses.map((s) => s.id);
    expect(new Set(subIds).size, 'id de subclasse repetido').toBe(subIds.length);

    for (const sub of book) {
      expect(sub.source, sub.id).toBe('book');
      expect(sub.id).toMatch(/^[a-z0-9-]+$/);
      expect(sub.tagline.length, `${sub.id}: tagline`).toBeGreaterThan(10);
      const ids = sub.features.map((f) => f.id);
      expect(new Set(ids).size, `${sub.id}: id de característica repetido`).toBe(ids.length);
      // Uma característica por nível de subclasse, pelo menos (o livro dá algo em todos).
      for (const level of p.subclassLevels) {
        expect(
          sub.features.some((f) => f.level === level),
          `${sub.id}: nada no nível ${level}`,
        ).toBe(true);
      }
      for (const f of sub.features) {
        expect(f.id).toMatch(/^[a-z0-9-]+$/);
        expect(p.subclassLevels, `${sub.id}/${f.id} no nível ${f.level}`).toContain(f.level);
        expect(classIds, `${f.id} repete um id da classe`).not.toContain(f.id);
        expect(f.text.length, `${sub.id}/${f.id}: texto`).toBeGreaterThan(10);
        expect(f.text.length, `${sub.id}/${f.id}: texto longo demais`).toBeLessThanOrEqual(900);
      }
    }
  });

  it.each(CLASS_ORDER)('%s: recursos, colunas e magias que existem', (classId) => {
    const p = CLASS_PROGRESSIONS[classId];
    for (const sub of bookOf(classId)) {
      const all: FeatureDef[] = [...p.features, ...sub.features];
      const resources = new Set(all.flatMap((f) => (f.resource ? [f.resource.id] : [])));
      for (const f of sub.features) {
        for (const a of f.activation ?? []) {
          if (a.cost) expect(resources, `${sub.id}/${a.id}: recurso`).toContain(a.cost.resource);
        }
        for (const id of f.grantedSpells?.ids ?? []) {
          expect(spellIds.has(id), `${sub.id}/${f.id}: magia ${id}`).toBe(true);
        }
      }
      for (const [level, ids] of Object.entries(sub.spells ?? {})) {
        expect(p.subclassLevels.length > 0 && Number(level) >= 3, `${sub.id}: nível ${level}`).toBe(
          true,
        );
        for (const id of ids) expect(spellIds.has(id), `${sub.id}: magia ${id}`).toBe(true);
      }
      for (const options of Object.values(sub.optionSpells ?? {})) {
        for (const id of Object.values(options).flat()) {
          expect(spellIds.has(id), `${sub.id}: magia ${id}`).toBe(true);
        }
      }
      const columnsIn = (value: unknown): string[] =>
        typeof value === 'object' && value !== null
          ? Object.entries(value).flatMap(([k, v]) =>
              k === 'column' ? [v as string] : columnsIn(v),
            )
          : [];
      for (const [name, values] of Object.entries(sub.columns ?? {})) {
        expect(values, `${sub.id}: coluna ${name}`).toHaveLength(20);
      }
      for (const column of columnsIn(sub.features)) {
        expect({ ...p.columns, ...sub.columns }, `${sub.id}: coluna ${column}`).toHaveProperty(
          column,
        );
      }
      if (sub.spellcasting) {
        expect(sub.spellcasting.prepared, `${sub.id}: preparadas`).toHaveLength(20);
        if (sub.spellcasting.cantrips) expect(sub.spellcasting.cantrips).toHaveLength(20);
      }
    }
  });

  it.each(CLASS_ORDER)('%s: a ficha calcula do nível 3 ao 20 sem quebrar', (classId) => {
    for (const sub of bookOf(classId)) {
      for (const level of [3, 6, 10, 14, 17, 20]) {
        const s = createBlankSheet();
        s.build.level = level;
        s.build.abilities = { str: 16, dex: 16, con: 14, int: 14, wis: 14, cha: 14 };
        s.progression = { classId, subclassId: sub.id, levels: [] };
        const d = deriveSheet(s);
        expect(d.level).toBe(level);
        expect(checkSheetInvariants(s), `${sub.id} nível ${level}`).toEqual([]);
      }
    }
  });
});

describe('carregar sob demanda', () => {
  it('registrar de novo não repete e a classe fica pronta', async () => {
    const before = CLASS_PROGRESSIONS.fighter.subclasses.length;
    await loadBookSubclasses('fighter');
    expect(CLASS_PROGRESSIONS.fighter.subclasses).toHaveLength(before);
    expect(bookSubclassesReady('fighter')).toBe(true);
    expect(bookSubclassesReady('classe-inventada')).toBe(true);
  });

  it('fichas do SRD ou "Outra (do livro)" nunca esperam', () => {
    expect(sheetNeedsBookSubclasses(undefined)).toBe(false);
    expect(sheetNeedsBookSubclasses({ classId: 'fighter' })).toBe(false);
    expect(sheetNeedsBookSubclasses({ classId: 'fighter', subclassId: 'custom' })).toBe(false);
    expect(sheetNeedsBookSubclasses({ classId: 'fighter', subclassId: 'champion' })).toBe(false);
  });
});

describe('conjuração de um terço (Cavaleiro Místico, Trapaceiro Arcano)', () => {
  const sheet = (classId: string, level: number, subclassId?: string) => {
    const s = createBlankSheet();
    s.build.level = level;
    s.build.abilities = { ...s.build.abilities, int: 16 };
    s.progression = { classId, levels: [], ...(subclassId ? { subclassId } : {}) };
    return s;
  };

  it('Cavaleiro Místico no 3: 2 espaços de 1º, truques e magias da lista do Mago', () => {
    const sc = deriveSheet(sheet('fighter', 3, 'eldritch-knight')).spellcasting!;
    expect(sc.ability).toBe('int');
    expect(sc.slots).toEqual([{ circle: 1, max: 2, spent: 0 }]);
    expect(sc.lists).toEqual(['wizard']);
    expect(sc.cantripsMax).toBe(2);
    expect(sc.preparedMax).toBe(3);
  });

  it('Trapaceiro Arcano no 19 tem 4º círculo; Campeão não conjura', () => {
    const sc = deriveSheet(sheet('rogue', 19, 'arcane-trickster')).spellcasting!;
    expect(sc.slots.map((s) => s.max)).toEqual([4, 3, 3, 1]);
    expect(sc.maxCircle).toBe(4);
    expect(deriveSheet(sheet('fighter', 19, 'champion')).spellcasting).toBeNull();
  });

  it('subir para o 3 escolhendo Cavaleiro Místico pede truques e magias do Mago', () => {
    const [step] = levelUpSteps(sheet('fighter', 2), 3, { subclassId: 'eldritch-knight' });
    const cantrips = step!.choices.find((c) => c.key === 'cantrips');
    expect(cantrips?.def).toMatchObject({ kind: 'cantrips', count: 2, lists: ['wizard'] });
    expect(step!.choices.find((c) => c.key === 'prepared')?.def).toMatchObject({
      count: 3,
      maxCircle: 1,
    });
  });

  it('Bruxo 11: o Arcano Místico não entra nas magias preparadas (círculo máximo 5)', () => {
    expect(deriveSheet(sheet('warlock', 11)).spellcasting!.maxCircle).toBe(5);
  });
});

describe('subida de vários níveis escolhendo a subclasse no caminho', () => {
  it.each(CLASS_ORDER)('%s: a subclasse não muda nada nos níveis antes dela', (classId) => {
    const p = CLASS_PROGRESSIONS[classId];
    const subLevel = p.subclassLevels[0]!;
    const blank = createBlankSheet();
    blank.build.abilities = { str: 14, dex: 14, con: 14, int: 14, wis: 14, cha: 14 };
    blank.progression = { classId, levels: [] };
    const before = levelUpSteps(blank, 20).filter((s) => s.level < subLevel);
    for (const sub of p.subclasses) {
      const withSub = levelUpSteps(blank, 20, { subclassId: sub.id }).filter(
        (s) => s.level < subLevel,
      );
      expect(withSub, `${sub.id}`).toEqual(before);
    }
  });

  it('Ladino 1 → 3 com Trapaceiro Arcano: nada de magia no 2; truques e magias no 3', () => {
    const s = createBlankSheet();
    s.build.abilities = { ...s.build.abilities, int: 14 };
    s.progression = { classId: 'rogue', levels: [] };
    const [two, three] = levelUpSteps(s, 3, { subclassId: 'arcane-trickster' });
    expect(two!.choices.map((c) => c.key)).not.toContain('replace-cantrip');
    expect(two!.choices.map((c) => c.key)).not.toContain('replace-spell');
    expect(three!.choices.find((c) => c.key === 'cantrips')?.def).toMatchObject({ count: 3 });
    expect(three!.gains.slots).toEqual([{ circle: 1, from: 0, to: 2 }]);
  });
});
