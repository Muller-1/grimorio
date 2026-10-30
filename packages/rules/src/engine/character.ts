import type { AbilityKey, LocalSheet } from '@grimorio/shared';
import { CLASS_PROGRESSIONS, columnAt } from '../classes';
import type {
  ActivationDef,
  ClassProgression,
  Effect,
  FeatureDef,
  ResourceDef,
  SubclassDef,
} from '../classes/types';
import type { ClassId } from '../creation/content';
import { SPELL_EFFECTS } from '../spells/effects';
import { CONDITION_PREFIX, DEBUFF_PREFIX, onYouEntry } from './on-you';
import { evalDice, evalScaling, type ScalingContext } from './scaling';

/**
 * Motor das habilidades (ADR-010): a partir da classe, do nível e das escolhas guardadas na
 * ficha, diz quais características o personagem tem, quantos usos sobram de cada recurso, o
 * que dá para ligar e quais efeitos estão valendo agora. Nada disso é salvo: a ficha guarda só
 * `state.resources` (usos gastos) e `state.active` (o que está ligado).
 */

export interface ClassInfo {
  classId: ClassId;
  progression: ClassProgression;
  level: number;
  /** Subclasse do SRD escolhida. */
  subclass?: SubclassDef;
  /** Subclasse do livro (fora do SRD), só com o nome. */
  customSubclass?: string;
}

export function classInfo(sheet: LocalSheet): ClassInfo | null {
  const p = sheet.progression;
  if (!p || !(p.classId in CLASS_PROGRESSIONS)) return null;
  const progression = CLASS_PROGRESSIONS[p.classId as ClassId];
  const subclass = progression.subclasses.find((s) => s.id === p.subclassId);
  return {
    classId: progression.classId,
    progression,
    level: sheet.build.level,
    ...(subclass ? { subclass } : {}),
    ...(p.subclassId === 'custom' && p.subclassName ? { customSubclass: p.subclassName } : {}),
  };
}

export interface UnlockedFeature {
  def: FeatureDef;
  source: 'class' | 'subclass';
}

/** Características da classe e da subclasse até o nível atual, em ordem de nível. */
export function unlockedFeatures(info: ClassInfo): UnlockedFeature[] {
  const fromClass = info.progression.features
    .filter((f) => f.level <= info.level)
    .map((def) => ({ def, source: 'class' as const }));
  const fromSub = (info.subclass?.features ?? [])
    .filter((f) => f.level <= info.level)
    .map((def) => ({ def, source: 'subclass' as const }));
  return [...fromClass, ...fromSub].sort((a, b) => a.def.level - b.def.level);
}

/** Escolhas de todos os níveis de um tipo (ex.: "invocation", "metamagic"). */
export function choicesOf(sheet: LocalSheet, kind: string) {
  return (sheet.progression?.levels ?? []).flatMap((r) => r.choices.filter((c) => c.kind === kind));
}

/** Opção escolhida em cada característica do tipo "option" (id da característica → opção). */
export function chosenOptions(sheet: LocalSheet): Map<string, string> {
  const out = new Map<string, string>();
  for (const c of choicesOf(sheet, 'option')) {
    const [feature, option] = (c.id ?? '').split(':');
    if (feature && option) out.set(feature, option);
  }
  return out;
}

export function scalingContext(
  info: ClassInfo | null,
  level: number,
  mods: Record<AbilityKey, number>,
  proficiency: number,
): ScalingContext {
  return {
    column: (name) => {
      if (!info) return undefined;
      const v = columnAt(info.progression, name, level);
      return typeof v === 'number' ? v : undefined;
    },
    mods,
    classLevel: level,
    proficiency,
  };
}

// ---------- recursos ----------

export interface ResourceView {
  id: string;
  name: string;
  max: number;
  spent: number;
  remaining: number;
  /** O que o descanso curto devolve: tudo, 1 uso ou nada. */
  shortRest: 'all' | 'one' | 'none';
  /** Dado do recurso no nível atual (Inspiração de Bardo: 8 = d8). */
  die?: number;
  pool: boolean;
  featureName: string;
}

function shortRestOf(def: ResourceDef, level: number): ResourceView['shortRest'] {
  if (def.shortRestFrom !== undefined && level >= def.shortRestFrom) return 'all';
  if (def.recharge === 'short') return 'all';
  if (def.recharge === 'short-one') return 'one';
  return 'none';
}

// ---------- ativações ----------

export interface ActivationView {
  id: string;
  name: string;
  featureName: string;
  mode: ActivationDef['mode'];
  cost?: { resource: string; amount: number; resourceName: string };
  requires: string[];
  active: boolean;
  /** Dá para ligar/usar agora (tem usos e o que é exigido está ligado). */
  available: boolean;
  /** Por que não dá: sem usos ou falta ligar outra habilidade. */
  blockedBy?: 'no-uses' | 'requires';
  /** Rolagem de cura do uso (Retomar o Fôlego: "1d10+5"). */
  heal?: string;
  /** PV temporários ao usar (expressão ou número). */
  tempHp?: string;
  effects: Effect[];
}

// ---------- efeitos ----------

export type EffectSource =
  | { kind: 'feature'; name: string }
  | { kind: 'activation'; name: string }
  | { kind: 'spell'; name: string }
  | { kind: 'fighting-style'; name: string }
  /** Condição ou magia de outra criatura que atrapalha (Envenenado, Perdição…). */
  | { kind: 'condition'; name: string };

export interface SourcedEffect {
  effect: Effect;
  source: EffectSource;
}

/** Efeitos dos Estilos de Luta escolhidos ao subir de nível (os outros são lembretes). */
const FIGHTING_STYLE_EFFECTS: Record<string, { name: string; effects: Effect[] }> = {
  archery: {
    name: 'Arquearia',
    effects: [{ type: 'attack-bonus', value: 2, filter: { range: 'ranged', weapon: true } }],
  },
  defense: {
    name: 'Defesa',
    effects: [{ type: 'ac-bonus', value: 1, requiresArmor: true }],
  },
};

/** Prefixo das magias ligadas em `state.active` (ex.: "spell:bless"). */
export const SPELL_ACTIVE_PREFIX = 'spell:';

export interface CharacterEngine {
  info: ClassInfo | null;
  features: UnlockedFeature[];
  resources: ResourceView[];
  activations: ActivationView[];
  effects: SourcedEffect[];
  scaling: ScalingContext;
}

/** Monta tudo de uma vez (deriveSheet chama a cada mudança da ficha). */
export function characterEngine(
  sheet: LocalSheet,
  mods: Record<AbilityKey, number>,
  proficiency: number,
): CharacterEngine {
  const info = classInfo(sheet);
  const level = sheet.build.level;
  const scaling = scalingContext(info, level, mods, proficiency);
  const features = info ? unlockedFeatures(info) : [];
  const active = new Set(sheet.state.active);
  const options = chosenOptions(sheet);

  const resources: ResourceView[] = [];
  for (const { def } of features) {
    if (!def.resource) continue;
    const r = def.resource;
    const max = Math.max(0, evalScaling(r.max, scaling));
    const spent = Math.min(max, sheet.state.resources[r.id] ?? 0);
    const die = r.die !== undefined ? evalScaling(r.die, scaling) : undefined;
    resources.push({
      id: r.id,
      name: r.name,
      max,
      spent,
      remaining: max - spent,
      shortRest: shortRestOf(r, level),
      ...(die ? { die } : {}),
      pool: Boolean(r.pool),
      featureName: def.name,
    });
  }
  const resourceById = new Map(resources.map((r) => [r.id, r]));

  const activations: ActivationView[] = [];
  for (const { def } of features) {
    for (const a of def.activation ?? []) {
      const resource = a.cost ? resourceById.get(a.cost.resource) : undefined;
      const isActive = a.mode === 'toggle' && active.has(a.id);
      const requires = a.requires ?? [];
      const missing = requires.some((id) => !active.has(id));
      const noUses = Boolean(a.cost && (!resource || resource.remaining < a.cost.amount));
      const heal = a.heal ? evalDice(a.heal.dice, scaling) : null;
      const healPlus = a.heal?.plus !== undefined ? evalScaling(a.heal.plus, scaling) : 0;
      const tempDice = a.tempHp?.dice ? evalDice(a.tempHp.dice, scaling) : null;
      const tempPlus = a.tempHp?.plus !== undefined ? evalScaling(a.tempHp.plus, scaling) : 0;
      activations.push({
        id: a.id,
        name: a.name,
        featureName: def.name,
        mode: a.mode,
        ...(a.cost
          ? {
              cost: {
                resource: a.cost.resource,
                amount: a.cost.amount,
                resourceName: resource?.name ?? a.cost.resource,
              },
            }
          : {}),
        requires,
        active: isActive,
        available: isActive || (!missing && !noUses),
        ...(!isActive && missing
          ? { blockedBy: 'requires' as const }
          : !isActive && noUses
            ? { blockedBy: 'no-uses' as const }
            : {}),
        ...(heal ? { heal: plusText(heal, healPlus) } : {}),
        ...(a.tempHp
          ? { tempHp: tempDice ? plusText(tempDice, tempPlus) : String(Math.max(0, tempPlus)) }
          : {}),
        effects: a.effects,
      });
    }
  }

  const effects: SourcedEffect[] = [];
  for (const { def } of features) {
    for (const effect of def.passive ?? []) {
      effects.push({ effect, source: { kind: 'feature', name: def.name } });
    }
    const option = options.get(def.id);
    for (const effect of (option && def.optionEffects?.[option]) || []) {
      effects.push({ effect, source: { kind: 'feature', name: def.name } });
    }
    for (const cond of def.conditional ?? []) {
      if (cond.when.every((id) => active.has(id))) {
        for (const effect of cond.effects) {
          effects.push({ effect, source: { kind: 'feature', name: def.name } });
        }
      }
    }
  }
  for (const a of activations) {
    if (!a.active) continue;
    for (const effect of a.effects) {
      effects.push({ effect, source: { kind: 'activation', name: a.name } });
    }
  }
  // Estilos escolhidos ao subir de nível e o do nível 1 (assistente de criação).
  const styles = new Set([
    ...choicesOf(sheet, 'fighting-style').map((c) => c.id),
    sheet.creation?.fightingStyleId,
  ]);
  for (const id of styles) {
    const style = id ? FIGHTING_STYLE_EFFECTS[id] : undefined;
    for (const effect of style?.effects ?? []) {
      effects.push({ effect, source: { kind: 'fighting-style', name: style!.name } });
    }
  }
  for (const id of active) {
    if (!id.startsWith(SPELL_ACTIVE_PREFIX)) continue;
    const spell = SPELL_EFFECTS[id.slice(SPELL_ACTIVE_PREFIX.length)];
    for (const effect of spell?.effects ?? []) {
      effects.push({ effect, source: { kind: 'spell', name: spell!.name } });
    }
  }

  for (const id of active) {
    if (!id.startsWith(CONDITION_PREFIX) && !id.startsWith(DEBUFF_PREFIX)) continue;
    const entry = onYouEntry(id);
    for (const effect of entry?.effects ?? []) {
      effects.push({ effect, source: { kind: 'condition', name: entry!.name } });
    }
  }

  return { info, features, resources, activations, effects, scaling };
}

function plusText(dice: string, plus: number): string {
  if (plus === 0) return dice;
  return plus > 0 ? `${dice}+${plus}` : `${dice}-${Math.abs(plus)}`;
}
