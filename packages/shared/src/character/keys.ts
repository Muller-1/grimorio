/**
 * Chaves canônicas (em inglês) usadas em todo o código. A interface traduz.
 * Glossário interface ↔ código: plano v2, seção 22.
 */

export const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
export type AbilityKey = (typeof ABILITY_KEYS)[number];

/** As 18 perícias e o atributo de cada uma (iguais nas regras de 2014 e 2024). */
export const SKILL_ABILITY = {
  acrobatics: 'dex',
  'animal-handling': 'wis',
  arcana: 'int',
  athletics: 'str',
  deception: 'cha',
  history: 'int',
  insight: 'wis',
  intimidation: 'cha',
  investigation: 'int',
  medicine: 'wis',
  nature: 'int',
  perception: 'wis',
  performance: 'cha',
  persuasion: 'cha',
  religion: 'int',
  'sleight-of-hand': 'dex',
  stealth: 'dex',
  survival: 'wis',
} as const satisfies Record<string, AbilityKey>;

export type SkillKey = keyof typeof SKILL_ABILITY;
export const SKILL_KEYS = Object.keys(SKILL_ABILITY) as SkillKey[];

/** 0 = nenhuma, 0.5 = metade, 1 = proficiente, 2 = especialização. */
export const PROFICIENCY_LEVELS = [0, 0.5, 1, 2] as const;
export type ProficiencyLevel = (typeof PROFICIENCY_LEVELS)[number];

export const DAMAGE_TYPES = [
  'acid',
  'bludgeoning',
  'cold',
  'fire',
  'force',
  'lightning',
  'necrotic',
  'piercing',
  'poison',
  'psychic',
  'radiant',
  'slashing',
  'thunder',
] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

export const HIT_DIE_SIDES = [6, 8, 10, 12] as const;
export type HitDieSides = (typeof HIT_DIE_SIDES)[number];
