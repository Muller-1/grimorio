/**
 * O rascunho do assistente de criação (RF-20) e a validação de cada etapa (RF-22).
 * A ordem das etapas é a do Livro do Jogador (2024): Classe → Origem → Atributos → Detalhes.
 *
 * O motor devolve CÓDIGOS de problema; a interface traduz (plano v2, 9.4).
 */
import {
  ABILITY_KEYS,
  SKILL_ABILITY,
  type AbilityKey,
  type AbilityMethod,
  type SkillKey,
} from '@grimorio/shared';
import {
  EMPTY_SCORES,
  validateBackgroundBonus,
  validateBaseScores,
  type AbilityIssue,
  type BaseScores,
  type BonusIssue,
} from './abilities';
import {
  BACKGROUNDS,
  CLASSES,
  CUSTOM_ID,
  ORIGIN_FEATS,
  SPECIES,
  STANDARD_LANGUAGES,
  type BackgroundDef,
  type ClassDef,
  type ClassId,
  type FightingStyleId,
  type OriginFeatId,
  type SpeciesDef,
} from './content';

export const CREATION_STEPS = ['class', 'origin', 'abilities', 'details'] as const;
export type CreationStep = (typeof CREATION_STEPS)[number];

export interface CustomBackground {
  name: string;
  abilities: AbilityKey[];
  skills: SkillKey[];
  feat: OriginFeatId;
  tool: string;
}

export interface CustomSpecies {
  name: string;
  speedFt: number;
  traits: string;
}

export interface CreationDraft {
  // Etapa 1 — Classe
  classId: ClassId | null;
  /** Ordem Divina (Clérigo) ou Ordem Primal (Druida). */
  classOptionId: string | null;
  fightingStyleId: FightingStyleId | null;
  classSkills: SkillKey[];
  classEquipment: 'A' | 'B' | 'C';
  // Etapa 2 — Origem
  backgroundId: string | null;
  customBackground: CustomBackground;
  backgroundEquipment: 'A' | 'B';
  speciesId: string | null;
  customSpecies: CustomSpecies;
  speciesOptionId: string | null;
  speciesSize: 'medium' | 'small';
  /** Sentidos Aguçados (Elfo) ou Hábil (Humano). */
  speciesSkills: SkillKey[];
  /** Versátil (Humano): talento de Origem extra. */
  speciesFeatId: OriginFeatId | null;
  /** Perícias escolhidas pelo talento Habilidoso (3 por talento). */
  featSkills: SkillKey[];
  /** Além do Comum: 2 da tabela de idiomas comuns (+1 do Ladino). */
  languages: string[];
  // Etapa 3 — Atributos
  abilityMethod: AbilityMethod;
  baseScores: BaseScores;
  /** Os 6 totais de 4d6 (descartando o menor), quando o método é rolagem. */
  rolled: number[] | null;
  backgroundBonus: Partial<Record<AbilityKey, number>>;
  // Etapa 4 — Detalhes
  name: string;
  playerName: string;
  alignment: string;
  appearance: string;
  backstory: string;
  expertise: SkillKey[];
}

export function emptyDraft(): CreationDraft {
  return {
    classId: null,
    classOptionId: null,
    fightingStyleId: null,
    classSkills: [],
    classEquipment: 'A',
    backgroundId: null,
    customBackground: { name: '', abilities: [], skills: [], feat: 'skilled', tool: '' },
    backgroundEquipment: 'A',
    speciesId: null,
    customSpecies: { name: '', speedFt: 30, traits: '' },
    speciesOptionId: null,
    speciesSize: 'medium',
    speciesSkills: [],
    speciesFeatId: null,
    featSkills: [],
    languages: [],
    abilityMethod: 'standard-array',
    baseScores: { ...EMPTY_SCORES },
    rolled: null,
    backgroundBonus: {},
    name: '',
    playerName: '',
    alignment: '',
    appearance: '',
    backstory: '',
    expertise: [],
  };
}

// ---------- o que as escolhas significam ----------

export function draftClass(d: CreationDraft): ClassDef | null {
  return d.classId ? CLASSES[d.classId] : null;
}

export function draftSpecies(d: CreationDraft): SpeciesDef | null {
  if (!d.speciesId || d.speciesId === CUSTOM_ID) return null;
  return SPECIES[d.speciesId] ?? null;
}

/** O antecedente escolhido, já com os dados do "Outro (do livro)" se for o caso. */
export function draftBackground(d: CreationDraft): BackgroundDef | null {
  if (!d.backgroundId) return null;
  if (d.backgroundId !== CUSTOM_ID) return BACKGROUNDS[d.backgroundId] ?? null;
  const c = d.customBackground;
  if (c.abilities.length !== 3 || c.skills.length !== 2) return null;
  return {
    id: CUSTOM_ID,
    name: c.name.trim(),
    summary: '',
    abilities: c.abilities as [AbilityKey, AbilityKey, AbilityKey],
    feat: c.feat,
    skills: c.skills as [SkillKey, SkillKey],
    tool: c.tool.trim(),
    equipment: [
      { option: 'A', items: [], weapons: [], armor: [], gold: 50 },
      { option: 'B', items: [], weapons: [], armor: [], gold: 50 },
    ],
  };
}

/** Talentos de Origem do personagem: o do antecedente e, no Humano, o de Versátil. */
export function draftOriginFeats(d: CreationDraft): OriginFeatId[] {
  const feats: OriginFeatId[] = [];
  const background = d.backgroundId === CUSTOM_ID ? d.customBackground.feat : null;
  const bg = background ?? (d.backgroundId ? BACKGROUNDS[d.backgroundId]?.feat : undefined);
  if (bg) feats.push(bg);
  if (draftSpecies(d)?.extraOriginFeat && d.speciesFeatId) feats.push(d.speciesFeatId);
  return feats;
}

/** Quantas perícias o(s) talento(s) Habilidoso pedem. */
export function featSkillCount(d: CreationDraft): number {
  return draftOriginFeats(d).reduce((n, f) => n + (ORIGIN_FEATS[f].skillChoices ?? 0), 0);
}

/** Perícias fixas do antecedente (as do "Outro" também contam quando preenchidas). */
export function backgroundSkills(d: CreationDraft): SkillKey[] {
  if (d.backgroundId === CUSTOM_ID) return d.customBackground.skills;
  return d.backgroundId ? [...(BACKGROUNDS[d.backgroundId]?.skills ?? [])] : [];
}

/** Todas as perícias com proficiência, sem repetição. */
export function proficientSkills(d: CreationDraft): SkillKey[] {
  return [
    ...new Set([...d.classSkills, ...backgroundSkills(d), ...d.speciesSkills, ...d.featSkills]),
  ];
}

/** Perícias da classe que o antecedente também dá (o jogador pode querer trocar). */
export function overlappingSkills(d: CreationDraft): SkillKey[] {
  const bg = backgroundSkills(d);
  return d.classSkills.filter((s) => bg.includes(s));
}

export function languageChoiceCount(d: CreationDraft): number {
  return 2 + (draftClass(d)?.languages?.choose ?? 0);
}

// ---------- validação de cada etapa ----------

export type CreationIssue =
  | 'class-missing'
  | 'class-option-missing'
  | 'fighting-style-missing'
  | 'class-skills-count'
  | 'class-equipment-invalid'
  | 'background-missing'
  | 'custom-background-incomplete'
  | 'species-missing'
  | 'custom-species-incomplete'
  | 'species-option-missing'
  | 'species-skills-count'
  | 'species-feat-missing'
  | 'feat-skills-count'
  | 'languages-count'
  | AbilityIssue
  | BonusIssue
  | 'name-missing'
  | 'expertise-count';

function classIssues(d: CreationDraft): CreationIssue[] {
  const cls = draftClass(d);
  if (!cls) return ['class-missing'];
  const issues: CreationIssue[] = [];
  if (cls.option && !cls.option.choices.some((c) => c.id === d.classOptionId)) {
    issues.push('class-option-missing');
  }
  if (cls.fightingStyle && !d.fightingStyleId) issues.push('fighting-style-missing');
  const allowed = cls.skills.from;
  const validSkills = d.classSkills.filter((s) => allowed === 'any' || allowed.includes(s));
  if (
    validSkills.length !== cls.skills.count ||
    new Set(d.classSkills).size !== d.classSkills.length
  ) {
    issues.push('class-skills-count');
  }
  if (!cls.equipment.some((p) => p.option === d.classEquipment)) {
    issues.push('class-equipment-invalid');
  }
  return issues;
}

function originIssues(d: CreationDraft): CreationIssue[] {
  const issues: CreationIssue[] = [];
  if (!d.backgroundId) issues.push('background-missing');
  else if (d.backgroundId === CUSTOM_ID) {
    const c = d.customBackground;
    const ok =
      c.name.trim().length > 0 &&
      new Set(c.abilities).size === 3 &&
      c.abilities.length === 3 &&
      new Set(c.skills).size === 2 &&
      c.skills.length === 2;
    if (!ok) issues.push('custom-background-incomplete');
  }

  if (!d.speciesId) issues.push('species-missing');
  else if (d.speciesId === CUSTOM_ID) {
    const c = d.customSpecies;
    if (!c.name.trim() || c.speedFt < 5 || c.speedFt > 120) {
      issues.push('custom-species-incomplete');
    }
  } else {
    const species = draftSpecies(d);
    if (species?.option && !species.option.choices.some((o) => o.id === d.speciesOptionId)) {
      issues.push('species-option-missing');
    }
    const need = species?.skillChoice?.count ?? 0;
    const from = species?.skillChoice?.from;
    const valid = d.speciesSkills.filter((s) => from === 'any' || (from ?? []).includes(s));
    if (valid.length !== need || d.speciesSkills.length !== need) {
      issues.push('species-skills-count');
    }
    if (species?.extraOriginFeat && !d.speciesFeatId) issues.push('species-feat-missing');
  }

  const featSkills = featSkillCount(d);
  if (d.featSkills.length !== featSkills || new Set(d.featSkills).size !== d.featSkills.length) {
    issues.push('feat-skills-count');
  }

  const langs = d.languages.filter((l) => (STANDARD_LANGUAGES as readonly string[]).includes(l));
  if (langs.length !== languageChoiceCount(d) || new Set(langs).size !== langs.length) {
    issues.push('languages-count');
  }
  return issues;
}

function abilityIssues(d: CreationDraft): CreationIssue[] {
  const base = validateBaseScores(d.abilityMethod, d.baseScores, d.rolled);
  if (base.length > 0) return base;
  const bg = draftBackground(d);
  if (!bg) return ['background-missing'];
  return validateBackgroundBonus(d.backgroundBonus, bg.abilities, d.baseScores);
}

function detailIssues(d: CreationDraft): CreationIssue[] {
  const issues: CreationIssue[] = [];
  if (!d.name.trim()) issues.push('name-missing');
  const need = draftClass(d)?.expertise ?? 0;
  const proficient = proficientSkills(d);
  const valid = d.expertise.filter((s) => proficient.includes(s));
  if (valid.length !== need || new Set(d.expertise).size !== d.expertise.length) {
    issues.push('expertise-count');
  }
  return issues;
}

export function stepIssues(d: CreationDraft, step: CreationStep): CreationIssue[] {
  switch (step) {
    case 'class':
      return classIssues(d);
    case 'origin':
      return originIssues(d);
    case 'abilities':
      return abilityIssues(d);
    case 'details':
      return detailIssues(d);
  }
}

/** A primeira etapa com pendências (ou `null` se está tudo pronto para criar). */
export function firstIncompleteStep(d: CreationDraft): CreationStep | null {
  return CREATION_STEPS.find((s) => stepIssues(d, s).length > 0) ?? null;
}

/** Ao trocar de classe/antecedente/espécie, limpa as escolhas que dependiam da anterior. */
export function withClass(d: CreationDraft, classId: ClassId): CreationDraft {
  if (d.classId === classId) return d;
  return {
    ...d,
    classId,
    classOptionId: null,
    fightingStyleId: null,
    classSkills: [],
    classEquipment: 'A',
    expertise: [],
    languages: d.languages.slice(0, 2),
  };
}

export function withBackground(d: CreationDraft, backgroundId: string): CreationDraft {
  if (d.backgroundId === backgroundId) return d;
  return {
    ...d,
    backgroundId,
    backgroundEquipment: 'A',
    backgroundBonus: {},
    featSkills: [],
    expertise: [],
  };
}

export function withSpecies(d: CreationDraft, speciesId: string): CreationDraft {
  if (d.speciesId === speciesId) return d;
  const species = SPECIES[speciesId];
  return {
    ...d,
    speciesId,
    speciesOptionId: null,
    speciesSize: species?.size === 'small' ? 'small' : 'medium',
    speciesSkills: [],
    speciesFeatId: null,
    featSkills: [],
    expertise: [],
  };
}

/** Todos os atributos (para listas na interface). */
export const ABILITIES: readonly AbilityKey[] = ABILITY_KEYS;

// ---------- rascunho salvo no navegador ----------

const SKILL_SET = new Set<string>(Object.keys(SKILL_ABILITY));
const ABILITY_SET = new Set<string>(ABILITY_KEYS);

function str(value: unknown, max = 4000): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}
function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}
function idOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= 80 ? value : null;
}
function skills(value: unknown): SkillKey[] {
  return Array.isArray(value)
    ? (value.filter((v) => typeof v === 'string' && SKILL_SET.has(v)).slice(0, 18) as SkillKey[])
    : [];
}
function strings(value: unknown, max: number): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string' && v.length <= 60).slice(0, max)
    : [];
}

/**
 * Lê um rascunho salvo (localStorage) sem confiar nele: o que tiver tipo errado volta ao padrão.
 * Valores fora das regras continuam (a validação das etapas aponta), mas nunca quebram a tela.
 */
export function sanitizeDraft(raw: unknown): CreationDraft {
  const base = emptyDraft();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  const classId = idOrNull(r.classId);
  const scores = (r.baseScores ?? {}) as Record<string, unknown>;
  const bonus = (r.backgroundBonus ?? {}) as Record<string, unknown>;
  const customBg = (r.customBackground ?? {}) as Record<string, unknown>;
  const customSp = (r.customSpecies ?? {}) as Record<string, unknown>;
  const feats = Object.keys(ORIGIN_FEATS) as OriginFeatId[];
  const score = (v: unknown) =>
    typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 30 ? v : null;
  return {
    ...base,
    classId: classId && classId in CLASSES ? (classId as ClassId) : null,
    classOptionId: idOrNull(r.classOptionId),
    fightingStyleId: (['archery', 'defense', 'great-weapon', 'two-weapon'] as const).includes(
      r.fightingStyleId as FightingStyleId,
    )
      ? (r.fightingStyleId as FightingStyleId)
      : null,
    classSkills: skills(r.classSkills),
    classEquipment: oneOf(r.classEquipment, ['A', 'B', 'C'] as const, 'A'),
    backgroundId: idOrNull(r.backgroundId),
    customBackground: {
      name: str(customBg.name, 60),
      abilities: Array.isArray(customBg.abilities)
        ? (customBg.abilities
            .filter((a) => typeof a === 'string' && ABILITY_SET.has(a))
            .slice(0, 3) as AbilityKey[])
        : [],
      skills: skills(customBg.skills).slice(0, 2),
      feat: oneOf(customBg.feat, feats, 'skilled'),
      tool: str(customBg.tool, 80),
    },
    backgroundEquipment: oneOf(r.backgroundEquipment, ['A', 'B'] as const, 'A'),
    speciesId: idOrNull(r.speciesId),
    customSpecies: {
      name: str(customSp.name, 60),
      speedFt:
        typeof customSp.speedFt === 'number' && customSp.speedFt >= 5 && customSp.speedFt <= 120
          ? Math.round(customSp.speedFt / 5) * 5
          : 30,
      traits: str(customSp.traits, 2000),
    },
    speciesOptionId: idOrNull(r.speciesOptionId),
    speciesSize: oneOf(r.speciesSize, ['medium', 'small'] as const, 'medium'),
    speciesSkills: skills(r.speciesSkills),
    speciesFeatId: feats.includes(r.speciesFeatId as OriginFeatId)
      ? (r.speciesFeatId as OriginFeatId)
      : null,
    featSkills: skills(r.featSkills),
    languages: strings(r.languages, 5),
    abilityMethod: oneOf(
      r.abilityMethod,
      ['standard-array', 'point-buy', 'rolled', 'manual'] as const,
      'standard-array',
    ),
    baseScores: Object.fromEntries(ABILITY_KEYS.map((k) => [k, score(scores[k])])) as BaseScores,
    rolled:
      Array.isArray(r.rolled) &&
      r.rolled.length === 6 &&
      r.rolled.every((n) => typeof n === 'number' && n >= 3 && n <= 18)
        ? (r.rolled as number[])
        : null,
    backgroundBonus: Object.fromEntries(
      ABILITY_KEYS.flatMap((k) => (bonus[k] === 1 || bonus[k] === 2 ? [[k, bonus[k]]] : [])),
    ) as Partial<Record<AbilityKey, number>>,
    name: str(r.name, 100),
    playerName: str(r.playerName, 80),
    alignment: str(r.alignment, 40),
    appearance: str(r.appearance, 2000),
    backstory: str(r.backstory, 2000),
    expertise: skills(r.expertise),
  };
}
