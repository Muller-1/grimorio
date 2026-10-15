import {
  ABILITY_KEYS,
  LocalSheetSchema,
  SKILL_KEYS,
  type AbilityKey,
  type FeatureSource,
  type GrantedSpell,
  type LevelChoice,
  type LocalSheet,
  type SkillKey,
} from '@grimorio/shared';
import { LEVEL_FEATS } from '../classes/feats';
import { METAMAGIC } from '../classes/sorcerer';
import { INVOCATIONS } from '../classes/warlock';
import type { ChoiceDef } from '../classes/types';
import { CLASSES, FIGHTING_STYLES, type FightingStyleId } from '../creation/content';
import { deriveSheet } from '../sheet/derive';
import { levelUpSteps, progressionFor, subclassOf, type PlanOptions } from './plan';

/**
 * Aplica a subida de nível (ADR-010). Cada nível vira um registro em `progression.levels` com o
 * PV rolado e as escolhas; os efeitos das escolhas vão para a ficha (atributos, perícias,
 * magias, características). Desfazer = voltar para a ficha anterior (a interface guarda).
 *
 * Tipos de escolha (`LevelChoice.kind`):
 * subclass (id ou "custom" + text), asi (ability + amount), feat (id ou "custom" + text, ability),
 * expertise / skill (id = perícia), fighting-style (id), option (id = "característica:opção"),
 * metamagic, invocation, arcanum (id = magia), language (text), cantrip, spell, spellbook,
 * extra-spell, chosen-spell (id = magia), replace-cantrip / replace-spell (id = nova, text = antiga).
 */

export interface LevelUpInput {
  level: number;
  /** Resultado do Dado de Vida; sem valor = média. */
  hpRolled?: number;
  choices: LevelChoice[];
}

export interface ApplyContext {
  newId: () => string;
  /** Classe escolhida agora (ficha feita à mão). */
  classId?: string;
}

const isSkill = (id: string | undefined): id is SkillKey =>
  Boolean(id) && (SKILL_KEYS as readonly string[]).includes(id!);
const isAbility = (a: string | undefined): a is AbilityKey =>
  Boolean(a) && (ABILITY_KEYS as readonly string[]).includes(a!);

/** Nome legível de uma escolha (para a lista de características da ficha) e de onde vem. */
function choiceFeature(
  c: LevelChoice,
  def: ChoiceDef | undefined,
  subclassFeatureIds: ReadonlySet<string>,
): { name: string; text: string; source: FeatureSource } | null {
  const fromClass = (x: { name: string; text: string } | null) =>
    x ? { ...x, source: 'class' as const } : null;
  switch (c.kind) {
    case 'feat': {
      const feat = LEVEL_FEATS.find((f) => f.id === c.id);
      if (feat) return { name: `Talento: ${feat.name}`, text: feat.text, source: 'feat' };
      return c.text
        ? {
            name: `Talento: ${c.text}`,
            text: 'Talento do livro (anote os detalhes).',
            source: 'feat',
          }
        : null;
    }
    case 'fighting-style': {
      const style = FIGHTING_STYLES[c.id as FightingStyleId];
      const alt =
        def?.kind === 'fighting-style' ? def.alternatives?.find((a) => a.id === c.id) : undefined;
      const entry = style ?? alt;
      return fromClass(entry ? { name: `Estilo de Luta: ${entry.name}`, text: entry.text } : null);
    }
    case 'option': {
      if (def?.kind !== 'option') return null;
      const [featureId, optionId] = c.id?.split(':') ?? [];
      const option = def.options.find((o) => o.id === optionId);
      if (!option) return null;
      return {
        name: `${def.label}: ${option.name}`,
        text: option.text,
        source: featureId && subclassFeatureIds.has(featureId) ? 'subclass' : 'class',
      };
    }
    case 'metamagic': {
      const m = METAMAGIC.find((x) => x.id === c.id);
      return fromClass(m ? { name: `Metamagia: ${m.name}`, text: m.text } : null);
    }
    case 'invocation': {
      const inv = INVOCATIONS.find((x) => x.id === c.id);
      return fromClass(inv ? { name: `Invocação: ${inv.name}`, text: inv.text } : null);
    }
    case 'language':
      return c.text
        ? { name: `Idioma: ${c.text}`, text: 'Aprendido ao subir de nível.', source: 'training' }
        : null;
    default:
      return null;
  }
}

/** Monta a ficha depois de subir os níveis. `null` se algo não fechar com o formato. */
export function applyLevelUp(
  sheet: LocalSheet,
  inputs: LevelUpInput[],
  ctx: ApplyContext,
): LocalSheet | null {
  const p = progressionFor(sheet, ctx.classId);
  if (!p || inputs.length === 0) return null;
  const next = JSON.parse(JSON.stringify(sheet)) as LocalSheet;
  const oldMax = deriveSheet(sheet).hpMax.value;
  const sorted = [...inputs].sort((a, b) => a.level - b.level);
  const target = sorted[sorted.length - 1]!.level;

  // Ficha feita à mão: a classe passa a valer a partir de agora.
  if (!next.progression || next.progression.classId !== p.classId) {
    next.progression = { classId: p.classId, levels: [] };
    next.combat.hitDie = CLASSES[p.classId].hitDie;
    if (!next.identity.className) next.identity.className = CLASSES[p.classId].name;
  }
  const subChoice = sorted.flatMap((i) => i.choices).find((c) => c.kind === 'subclass');
  const options: Record<string, string> = {};
  for (const c of sorted.flatMap((i) => i.choices)) {
    const [feature, option] = c.kind === 'option' ? (c.id ?? '').split(':') : [];
    if (feature && option) options[feature] = option;
  }
  const plan: PlanOptions = {
    ...(ctx.classId ? { classId: ctx.classId } : {}),
    ...(subChoice?.id && subChoice.id !== 'custom' ? { subclassId: subChoice.id } : {}),
    options,
  };
  const steps = levelUpSteps(sheet, target, plan);

  const spells = next.spells;
  const addUnique = (list: string[], id: string | undefined) => {
    if (id && !list.includes(id)) list.push(id);
  };
  const grant = (id: string, source: GrantedSpell['source'], extra: Partial<GrantedSpell> = {}) => {
    if (!spells.granted.some((g) => g.id === id)) spells.granted.push({ id, source, ...extra });
  };
  const addFeature = (name: string, text: string, source: FeatureSource) =>
    next.features.push({
      id: ctx.newId(),
      name: name.slice(0, 80),
      text: text.slice(0, 4000),
      source,
    });
  const raise = (ability: AbilityKey, amount: number, max: number) => {
    const current = next.build.abilities[ability];
    next.build.abilities[ability] = Math.max(current, Math.min(max, current + amount));
  };

  for (const input of sorted) {
    const step = steps.find((s) => s.level === input.level);
    if (!step) return null;
    const defs = new Map(step.choices.map((c) => [c.featureId ?? c.key, c.def]));

    for (const f of step.gains.features) addFeature(f.name, f.text, f.source);
    for (const g of step.gains.grantedSpells) {
      grant(g.id, g.source, g.source === 'species' ? { freePerLongRest: 1 } : {});
    }
    for (const f of p.features) {
      if (f.level === input.level && f.abilityIncrease) {
        for (const [a, n] of Object.entries(f.abilityIncrease.abilities)) {
          if (isAbility(a) && n) raise(a, n, f.abilityIncrease.max);
        }
      }
    }

    for (const c of input.choices) {
      const def = c.id?.includes(':') ? defs.get(c.id.split(':')[0]!) : undefined;
      switch (c.kind) {
        case 'subclass':
          if (c.id === 'custom') {
            next.progression.subclassId = 'custom';
            if (c.text) next.progression.subclassName = c.text.slice(0, 80);
            addFeature(
              `Subclasse: ${c.text ?? ''}`.trim(),
              'Subclasse do livro: anote aqui as características dela.',
              'subclass',
            );
          } else if (c.id && subclassOf(p, c.id)) {
            next.progression.subclassId = c.id;
            delete next.progression.subclassName;
            const sub = subclassOf(p, c.id)!;
            addFeature(`Subclasse: ${sub.name}`, sub.tagline, 'subclass');
          }
          break;
        case 'asi':
          if (isAbility(c.ability) && c.amount) raise(c.ability, c.amount, 20);
          break;
        case 'feat': {
          const feat = LEVEL_FEATS.find((f) => f.id === c.id);
          if (isAbility(c.ability)) raise(c.ability, 1, feat?.abilityIncrease?.max ?? 20);
          break;
        }
        case 'expertise':
          if (isSkill(c.id)) next.build.skillProficiencies[c.id] = 2;
          break;
        case 'skill':
          if (isSkill(c.id) && !next.build.skillProficiencies[c.id]) {
            next.build.skillProficiencies[c.id] = 1;
          }
          break;
        case 'cantrip':
          addUnique(spells.cantrips, c.id);
          break;
        case 'spell':
          addUnique(spells.prepared, c.id);
          break;
        case 'spellbook':
          addUnique(spells.spellbook, c.id);
          break;
        case 'extra-spell':
        case 'chosen-spell':
          if (c.id) grant(c.id, 'class');
          break;
        case 'arcanum':
          if (c.id) grant(c.id, 'class', { freePerLongRest: 1 });
          break;
        case 'replace-cantrip':
        case 'replace-spell': {
          const list = c.kind === 'replace-cantrip' ? spells.cantrips : spells.prepared;
          const i = c.text ? list.indexOf(c.text) : -1;
          if (i >= 0 && c.id && !list.includes(c.id)) list[i] = c.id;
          break;
        }
      }
      const subIds = new Set(
        subclassOf(p, next.progression.subclassId)?.features.map((f) => f.id) ?? [],
      );
      const feature = choiceFeature(
        c,
        (def as ChoiceDef | undefined) ?? findDef(step.choices, c),
        subIds,
      );
      if (feature) addFeature(feature.name, feature.text, feature.source);
    }

    next.progression.levels = [
      ...next.progression.levels.filter((r) => r.level !== input.level),
      {
        level: input.level,
        ...(input.hpRolled !== undefined ? { hpRolled: input.hpRolled } : {}),
        choices: input.choices,
      },
    ].sort((a, b) => a.level - b.level);
    next.build.level = input.level;
  }

  // Espaços e usos novos chegam cheios; os PV atuais sobem o mesmo que o máximo.
  const newMax = deriveSheet(next).hpMax.value;
  next.state.hp.current = Math.min(newMax, Math.max(0, next.state.hp.current + (newMax - oldMax)));

  const parsed = LocalSheetSchema.safeParse(next);
  return parsed.success ? parsed.data : null;
}

function findDef(choices: { def: { kind: string } }[], c: LevelChoice): ChoiceDef | undefined {
  const kindMap: Record<string, string> = {
    'fighting-style': 'fighting-style',
    metamagic: 'metamagic',
    invocation: 'invocations',
    option: 'option',
  };
  const wanted = kindMap[c.kind];
  return choices.find((x) => x.def.kind === wanted)?.def as ChoiceDef | undefined;
}
