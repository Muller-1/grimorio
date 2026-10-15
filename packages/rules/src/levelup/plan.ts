import type { LocalSheet, SkillKey } from '@grimorio/shared';
import { CLASS_PROGRESSIONS, columnAt } from '../classes';
import { HALF_CASTER_SLOTS } from '../classes/common';
import type { ChoiceDef, ClassProgression, FeatureDef, SubclassDef } from '../classes/types';
import { CLASSES, type ClassId } from '../creation/content';
import { speciesSpellsAt } from '../creation/species-spells';
import { abilityModifier, proficiencyBonusForLevel } from '../sheet/derive';
import { pactSlots, slotTable } from '../spells/casting';

/**
 * Subida de nível (ADR-010): para cada nível novo, o que o personagem GANHA (sempre aparece,
 * mesmo sem nada para escolher) e o que ele ESCOLHE. Puro: a interface monta as telas com isto
 * e devolve as escolhas para `applyLevelUp`.
 */

/** Escolhas de magia que a subida cria sozinha (além das escolhas das características). */
export type SpellChoiceDef =
  | { kind: 'cantrips'; count: number; lists: string[] }
  /** Magias preparadas novas (Mago: do grimório). */
  | { kind: 'prepared'; count: number; maxCircle: number; lists: string[]; fromSpellbook: boolean }
  /** Mago: magias novas no grimório. */
  | { kind: 'spellbook'; count: number; maxCircle: number }
  /** Opcional: trocar um truque por outro da mesma lista. */
  | { kind: 'replace-cantrip'; lists: string[] }
  /** Opcional: trocar uma magia preparada (Bardo, Bruxo, Feiticeiro). */
  | { kind: 'replace-spell'; maxCircle: number; lists: string[] };

export interface LevelChoiceSlot {
  /** Único dentro do nível (ex.: "asi-4", "cantrips"). */
  key: string;
  /** Característica que pede a escolha (vazio nas escolhas de magia). */
  featureId?: string;
  title: string;
  /** Texto da característica, para o jogador saber o que está escolhendo. */
  text?: string;
  def: ChoiceDef | SpellChoiceDef;
  /** Obrigatória para continuar (subclasse, atributo/talento, opções); as outras dá para deixar
   * para depois (na ficha). */
  required: boolean;
}

export interface GainedFeature {
  id: string;
  name: string;
  text: string;
  source: 'class' | 'subclass';
}

export interface LevelGains {
  level: number;
  hitDie: number;
  /** Média fixa do livro (dado/2 + 1) e o modificador de Constituição de agora. */
  hpAverage: number;
  conMod: number;
  proficiency?: { from: number; to: number };
  features: GainedFeature[];
  /** Colunas da tabela que mudam (Fúrias 3 → 4, Dano de Fúria +2 → +3…). */
  columns: { name: string; from: number | string; to: number | string }[];
  slots: { circle: number; from: number; to: number }[];
  pact?: { from: { count: number; circle: number }; to: { count: number; circle: number } };
  cantrips?: { from: number; to: number };
  prepared?: { from: number; to: number };
  /** Magias que passam a ficar sempre preparadas (subclasse, espécie…). */
  grantedSpells: { id: string; source: 'class' | 'subclass' | 'species' }[];
}

export interface LevelStep {
  level: number;
  gains: LevelGains;
  choices: LevelChoiceSlot[];
}

/** Escolhas automáticas: não aparecem como característica nova (o resultado entra no lugar). */
const PLACEHOLDER_KINDS = new Set(['subclass', 'asi', 'epic-boon']);

export function subclassOf(progression: ClassProgression, id: string | undefined) {
  return progression.subclasses.find((s) => s.id === id);
}

/** Magias da subclasse ganhas neste nível (inclui a opção, ex.: terreno do Círculo da Terra). */
export function subclassSpellsAt(
  sub: SubclassDef | undefined,
  level: number,
  option: string | undefined,
  /** Escolheu a subclasse agora: recebe também as de níveis anteriores. */
  catchUp: boolean,
): string[] {
  if (!sub) return [];
  const tables = [sub.spells, option ? sub.optionSpells?.[option] : undefined];
  const out: string[] = [];
  for (const table of tables) {
    for (const [lvl, ids] of Object.entries(table ?? {})) {
      const l = Number(lvl);
      if (l === level || (catchUp && l < level)) out.push(...ids);
    }
  }
  return out;
}

/** Classe pela qual a ficha sobe de nível (a da progressão, ou a escolhida agora). */
export function progressionFor(sheet: LocalSheet, classId?: string): ClassProgression | null {
  const id = classId ?? sheet.progression?.classId;
  return id && id in CLASS_PROGRESSIONS ? CLASS_PROGRESSIONS[id as ClassId] : null;
}

function columnChanges(p: ClassProgression, level: number) {
  const out: LevelGains['columns'] = [];
  for (const [col, name] of Object.entries(p.columnNames)) {
    const from = columnAt(p, col, level - 1);
    const to = columnAt(p, col, level);
    if (from !== undefined && to !== undefined && from !== to) out.push({ name, from, to });
  }
  return out;
}

export interface PlanOptions {
  /** Classe escolhida agora (ficha feita à mão, sem progressão). */
  classId?: string;
  /** Subclasse escolhida dentro desta mesma subida (muda o que os níveis seguintes ganham). */
  subclassId?: string;
  /** Opção de subclasse escolhida agora (ex.: terreno do Círculo da Terra). */
  options?: Record<string, string>;
}

/** Os níveis de `sheet.build.level + 1` até `target`, com ganhos e escolhas. */
export function levelUpSteps(
  sheet: LocalSheet,
  target: number,
  opts: PlanOptions = {},
): LevelStep[] {
  const p = progressionFor(sheet, opts.classId);
  if (!p) return [];
  const from = sheet.build.level;
  const to = Math.min(20, Math.max(from, Math.floor(target)));
  const cls = CLASSES[p.classId];
  const conMod = abilityModifier(sheet.build.abilities.con);
  const savedSub = sheet.progression?.subclassId;
  const subId = savedSub ?? opts.subclassId;
  const sub = subclassOf(p, subId);
  const sc = p.spellcasting;
  const steps: LevelStep[] = [];
  const creation = sheet.creation;

  for (let level = from + 1; level <= to; level++) {
    const choices: LevelChoiceSlot[] = [];
    const features: GainedFeature[] = [];
    const granted: LevelGains['grantedSpells'] = [];
    const give = (ids: string[], source: 'class' | 'subclass' | 'species') => {
      for (const id of ids) if (!granted.some((g) => g.id === id)) granted.push({ id, source });
    };

    // Subclasse ainda não escolhida (ficha antiga ou feita à mão já acima do nível 3).
    const needsSubclass = !savedSub && level === Math.max(from + 1, 3) && level >= 3;
    const subChosenHere = needsSubclass;
    const classFeatures = p.features.filter((f) => f.level === level);
    for (const f of classFeatures) {
      if (f.choice?.kind === 'subclass' && !needsSubclass) continue;
      if (!f.choice || !PLACEHOLDER_KINDS.has(f.choice.kind)) {
        features.push({ id: f.id, name: f.name, text: f.text, source: 'class' });
      }
      if (f.choice) choices.push(choiceSlot(f, level));
      if (f.grantedSpells) give(f.grantedSpells.ids, 'class');
    }
    if (needsSubclass && !classFeatures.some((f) => f.choice?.kind === 'subclass')) {
      const def = p.features.find((f) => f.choice?.kind === 'subclass');
      if (def) choices.unshift(choiceSlot(def, level));
    }
    // Características da subclasse: deste nível (ou, se escolheu agora, as que ficaram para trás).
    if (sub) {
      for (const f of sub.features) {
        if (f.level === level || (subChosenHere && f.level < level)) {
          features.push({ id: f.id, name: f.name, text: f.text, source: 'subclass' });
          if (f.choice) choices.push(choiceSlot(f, level));
          if (f.grantedSpells) give(f.grantedSpells.ids, 'subclass');
        }
      }
      const option = Object.entries(opts.options ?? {}).find(([fid]) =>
        sub.features.some((f) => f.id === fid),
      )?.[1];
      give(
        subclassSpellsAt(sub, level, option ?? savedOption(sheet, sub), subChosenHere),
        'subclass',
      );
    }
    if (level === 3 || level === 5) {
      give(speciesSpellsAt(creation?.speciesId, creation?.speciesOptionId, level), 'species');
    }

    const gains: LevelGains = {
      level,
      hitDie: cls.hitDie,
      hpAverage: cls.hitDie / 2 + 1,
      conMod,
      features,
      columns: columnChanges(p, level),
      slots: [],
      grantedSpells: granted,
    };
    const profFrom = proficiencyBonusForLevel(level - 1);
    const profTo = proficiencyBonusForLevel(level);
    if (profFrom !== profTo) gains.proficiency = { from: profFrom, to: profTo };

    if (sc) {
      const lists = [p.classId as string];
      if (p.classId === 'bard' && level >= 10) lists.push('cleric', 'druid', 'wizard');
      let maxCircle = 0;
      if (sc.kind === 'pact') {
        const a = pactSlots(level - 1);
        const b = pactSlots(level);
        if (a.count !== b.count || a.circle !== b.circle) gains.pact = { from: a, to: b };
        maxCircle = b.circle;
      } else {
        const a = slotTable(sc.kind, level - 1);
        const b = slotTable(sc.kind, level);
        b.forEach((n, i) => {
          if (n !== a[i]) gains.slots.push({ circle: i + 1, from: a[i] ?? 0, to: n });
          if (n > 0) maxCircle = i + 1;
        });
      }
      const c0 = sc.cantrips?.[level - 2] ?? 0;
      const c1 = sc.cantrips?.[level - 1] ?? 0;
      if (c1 !== c0) {
        gains.cantrips = { from: c0, to: c1 };
        choices.push({
          key: 'cantrips',
          title: 'Truques novos',
          def: { kind: 'cantrips', count: c1 - c0, lists },
          required: false,
        });
      }
      if (sc.spellbook) {
        choices.push({
          key: 'spellbook',
          title: 'Magias novas no grimório',
          def: { kind: 'spellbook', count: sc.spellbook.perLevel, maxCircle },
          required: false,
        });
      }
      const p0 = sc.prepared[level - 2] ?? 0;
      const p1 = sc.prepared[level - 1] ?? 0;
      if (p1 !== p0) {
        gains.prepared = { from: p0, to: p1 };
        choices.push({
          key: 'prepared',
          title: sc.spellbook ? 'Magias preparadas (do grimório)' : 'Magias preparadas novas',
          def: {
            kind: 'prepared',
            count: p1 - p0,
            maxCircle,
            lists,
            fromSpellbook: Boolean(sc.spellbook),
          },
          required: false,
        });
      }
      if (sc.cantrips) {
        choices.push({
          key: 'replace-cantrip',
          title: 'Trocar um truque (opcional)',
          def: { kind: 'replace-cantrip', lists },
          required: false,
        });
      }
      if (sc.swap === 'level-up') {
        choices.push({
          key: 'replace-spell',
          title: 'Trocar uma magia (opcional)',
          def: { kind: 'replace-spell', maxCircle, lists },
          required: false,
        });
      }
    }
    steps.push({ level, gains, choices });
  }
  return steps;
}

function savedOption(sheet: LocalSheet, sub: SubclassDef): string | undefined {
  const ids = new Set(sub.features.map((f) => f.id));
  for (const r of sheet.progression?.levels ?? []) {
    for (const c of r.choices) {
      if (c.kind !== 'option' || !c.id) continue;
      const [feature, option] = c.id.split(':');
      if (feature && ids.has(feature)) return option;
    }
  }
  return undefined;
}

function choiceSlot(f: FeatureDef, level: number): LevelChoiceSlot {
  const def = f.choice!;
  const required =
    def.kind === 'subclass' ||
    def.kind === 'asi' ||
    def.kind === 'epic-boon' ||
    def.kind === 'option' ||
    def.kind === 'fighting-style';
  return { key: `${f.id}-${level}`, featureId: f.id, title: f.name, text: f.text, def, required };
}

/** Maior círculo de magia do meio-conjurador no nível (para listas de Paladino/Guardião). */
export function halfCasterMaxCircle(level: number): number {
  const row = HALF_CASTER_SLOTS[Math.min(20, Math.max(1, level)) - 1] ?? [];
  return row.length;
}

/** Perícias em que o personagem já tem proficiência (para Especialização). */
export function skillsWithProficiency(sheet: LocalSheet): SkillKey[] {
  return (Object.entries(sheet.build.skillProficiencies) as [SkillKey, number][])
    .filter(([, v]) => v >= 1)
    .map(([k]) => k);
}
