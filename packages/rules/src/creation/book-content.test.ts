import { ABILITY_KEYS, SKILL_KEYS } from '@grimorio/shared';
import { describe, expect, it } from 'vitest';
import { LEVEL_FEATS } from '../classes/feats';
import { deriveSheet } from '../sheet/derive';
import { suggestBackgroundBonus } from './abilities';
import { buildCharacterSheet } from './build';
import { BACKGROUNDS, CLASSES, FIGHTING_STYLES, ORIGIN_FEATS, WEAPONS } from './content';
import { emptyDraft, stepIssues, withBackground, withClass } from './draft';

/** O conteúdo do livro (fora do SRD): dados consistentes e ligados ao assistente. */
describe('antecedentes, talentos de Origem e Estilos de Luta do livro', () => {
  it('16 antecedentes em ordem alfabética, 12 deles do livro', () => {
    const list = Object.values(BACKGROUNDS);
    expect(list).toHaveLength(16);
    expect(list.filter((b) => b.source === 'book')).toHaveLength(12);
    const names = list.map((b) => b.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'pt-BR')));
    expect(Object.keys(BACKGROUNDS)).toEqual(list.map((b) => b.id));
  });

  it('cada antecedente tem atributos, perícias, talento e equipamento válidos', () => {
    for (const bg of Object.values(BACKGROUNDS)) {
      expect(new Set(bg.abilities).size, bg.id).toBe(3);
      for (const a of bg.abilities) expect(ABILITY_KEYS, bg.id).toContain(a);
      expect(new Set(bg.skills).size, bg.id).toBe(2);
      for (const s of bg.skills) expect(SKILL_KEYS, bg.id).toContain(s);
      expect(ORIGIN_FEATS[bg.feat], bg.id).toBeDefined();
      expect(bg.tool.length, bg.id).toBeGreaterThan(3);
      expect(bg.summary.length, bg.id).toBeGreaterThan(30);
      const [a, b] = bg.equipment;
      expect(a.option).toBe('A');
      expect(b).toMatchObject({ option: 'B', gold: 50, items: [] });
      for (const w of a.weapons) expect(WEAPONS[w.id], `${bg.id}: ${w.id}`).toBeDefined();
      // Cada arma da ficha aparece também na lista de itens.
      expect(a.items.length, bg.id).toBeGreaterThanOrEqual(a.weapons.length);
    }
  });

  it('Guia usa Iniciado em Magia com a lista de Druida', () => {
    expect(BACKGROUNDS.guide).toMatchObject({ feat: 'magic-initiate', featNote: 'Druida' });
  });

  it('talentos de Origem: 10 no total, 6 do livro, cada um com texto', () => {
    const feats = Object.values(ORIGIN_FEATS);
    expect(feats).toHaveLength(10);
    expect(feats.filter((f) => f.source === 'book')).toHaveLength(6);
    for (const f of feats) expect(f.text.length, f.id).toBeGreaterThan(30);
  });

  it('Estilos de Luta: 10 no total, 6 do livro', () => {
    const styles = Object.values(FIGHTING_STYLES);
    expect(styles).toHaveLength(10);
    expect(styles.filter((s) => s.source === 'book')).toHaveLength(6);
    for (const s of styles) expect(s.id in FIGHTING_STYLES).toBe(true);
  });

  it('Fazendeiro (Vigoroso) soma 2 PV por nível, além do Dado de Vida', () => {
    const cls = CLASSES.fighter;
    const make = (backgroundId: string) => {
      let d = withClass(emptyDraft(), 'fighter');
      d = withBackground(d, backgroundId);
      const bg = BACKGROUNDS[backgroundId]!;
      const from = cls.skills.from === 'any' ? SKILL_KEYS : cls.skills.from;
      d.classSkills = from.filter((s) => !bg.skills.includes(s)).slice(0, cls.skills.count);
      d.fightingStyleId = 'dueling';
      d.speciesId = 'orc';
      d.languages = ['Anão', 'Élfico'];
      d.abilityMethod = 'standard-array';
      d.baseScores = { ...cls.standardArray };
      d.backgroundBonus = suggestBackgroundBonus(bg.abilities, cls.primary);
      d.name = 'Teste';
      if (cls.weaponMastery) {
        d.weaponMasteries = ['greatsword', 'longsword', 'handaxe'].slice(
          0,
          cls.weaponMastery.count,
        ) as never;
      }
      return d;
    };
    let n = 0;
    const ctx = { newId: () => `b-${++n}` };
    const build = (id: string) => {
      const sheet = buildCharacterSheet(make(id), ctx);
      if (!sheet) throw new Error(`ficha não montada para ${id}`);
      return sheet;
    };
    const farmer = build('farmer');
    const guard = build('guard');
    expect(stepIssues(make('farmer'), 'origin')).toEqual([]);
    expect(farmer.combat.hpBonusPerLevel).toBe(2);
    expect(guard.combat.hpBonusPerLevel).toBeUndefined();
    expect(farmer.features.some((f) => f.name === 'Talento: Vigoroso')).toBe(true);
    expect(deriveSheet(farmer).hpMax.parts.at(-1)).toEqual({
      source: { kind: 'trait' },
      value: 2,
    });
  });
});

describe('talentos da subida de nível (SRD + livro)', () => {
  it('ids únicos, categorias e níveis coerentes', () => {
    const ids = LEVEL_FEATS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    const general = LEVEL_FEATS.filter((f) => f.category === 'general');
    const boons = LEVEL_FEATS.filter((f) => f.category === 'epic-boon');
    expect(general).toHaveLength(42); // Imobilizador (SRD) + 41 do livro
    expect(boons).toHaveLength(12);
    for (const f of general) expect(f.minLevel, f.id).toBe(4);
    for (const f of boons) {
      expect(f.minLevel, f.id).toBe(19);
      expect(f.abilityIncrease?.max, f.id).toBe(30);
    }
  });

  it('todo talento tem texto e o aumento de atributo usa atributos válidos', () => {
    for (const f of LEVEL_FEATS) {
      expect(f.text.length, f.id).toBeGreaterThan(30);
      expect(f.name.length, f.id).toBeGreaterThan(2);
      for (const a of f.abilityIncrease?.from ?? []) expect(ABILITY_KEYS, f.id).toContain(a);
      for (const a of f.requiresAbility ?? []) expect(ABILITY_KEYS, f.id).toContain(a);
      // Pré-requisito de atributo sempre bate com um atributo que o talento aumenta.
      if (f.requiresAbility && f.abilityIncrease) {
        expect(
          f.requiresAbility.some((a) => f.abilityIncrease!.from.includes(a)),
          f.id,
        ).toBe(true);
      }
    }
  });

  it('o livro soma 46 talentos e o resto vem do SRD', () => {
    expect(LEVEL_FEATS.filter((f) => f.source === 'book')).toHaveLength(46);
    expect(LEVEL_FEATS.filter((f) => f.source !== 'book')).toHaveLength(8);
  });
});
