/**
 * O rascunho do assistente de criação (RF-20) e a validação de cada etapa (RF-22).
 * A ordem das etapas é a do Livro do Jogador (2024): Classe → Origem → Atributos → Detalhes.
 * Entre Atributos e Detalhes entra Magias, só para quem conjura no nível 1 ou tem o talento
 * Iniciado em Magia (cap. 3: "Conjuração"; cap. 5: Iniciado em Magia).
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
  WEAPONS,
  type BackgroundDef,
  type ClassDef,
  type ClassId,
  type FightingStyleId,
  type OriginFeatId,
  type SpeciesDef,
  type WeaponId,
} from './content';
import { CLASS_PROGRESSIONS } from '../classes';
import { masteryOptions } from './mastery';

export const CREATION_STEPS = ['class', 'origin', 'abilities', 'spells', 'details'] as const;
export type CreationStep = (typeof CREATION_STEPS)[number];

/** Listas que o Iniciado em Magia pode usar (cap. 5). */
export const INITIATE_LISTS = ['cleric', 'druid', 'wizard'] as const;
export type InitiateList = (typeof INITIATE_LISTS)[number];
export const INITIATE_ABILITIES = ['int', 'wis', 'cha'] as const;
export type InitiateAbility = (typeof INITIATE_ABILITIES)[number];

/** Um talento Iniciado em Magia: lista, atributo de conjuração, 2 truques e 1 magia de 1º círculo. */
export interface InitiateChoice {
  list: InitiateList | null;
  ability: InitiateAbility | null;
  cantrips: string[];
  spell: string | null;
}

export const emptyInitiate = (): InitiateChoice => ({
  list: null,
  ability: null,
  cantrips: [],
  spell: null,
});

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
  /** Maestria em Arma: tipos de arma escolhidos (Bárbaro, Guerreiro, Paladino, Guardião, Ladino). */
  weaponMasteries: WeaponId[];
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
  // Etapa 4 — Magias (ids das magias; só para quem conjura ou tem Iniciado em Magia)
  cantrips: string[];
  /** Magias de 1º círculo preparadas (Mago: escolhidas do grimório). */
  preparedSpells: string[];
  /** Mago: as 6 magias de 1º círculo do grimório. */
  spellbook: string[];
  /** Um por talento Iniciado em Magia, na ordem de `draftOriginFeats`. */
  initiates: InitiateChoice[];
  // Etapa 5 — Detalhes
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
    weaponMasteries: [],
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
    cantrips: [],
    preparedSpells: [],
    spellbook: [],
    initiates: [],
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

// ---------- magias do nível 1 ----------

/** O antecedente diz a lista do Iniciado em Magia ("Iniciado em Magia (Clérigo)"). */
const FEAT_NOTE_LIST: Record<string, InitiateList> = {
  Clérigo: 'cleric',
  Druida: 'druid',
  Mago: 'wizard',
};

export interface SpellNeeds {
  /** Lista da classe (`null` = a classe não conjura no nível 1). */
  classList: ClassId | null;
  cantrips: number;
  prepared: number;
  /** Mago: magias do grimório. */
  spellbook: number;
  /** Um por Iniciado em Magia; `fixedList` quando o antecedente já define a lista. */
  initiates: { fixedList: InitiateList | null }[];
}

/**
 * Quantas magias o personagem escolhe no nível 1 (tabela da classe, cap. 3): truques, magias
 * preparadas e, no Mago, o grimório. Clérigo Taumaturgo e Druida Mágico ganham 1 truque a mais.
 */
export function spellNeeds(d: CreationDraft): SpellNeeds {
  const cls = draftClass(d);
  const def = cls ? CLASS_PROGRESSIONS[cls.id].spellcasting : undefined;
  const extraCantrip =
    (cls?.id === 'cleric' && d.classOptionId === 'thaumaturge') ||
    (cls?.id === 'druid' && d.classOptionId === 'magician')
      ? 1
      : 0;
  const cantrips = def?.cantrips ? def.cantrips[0]! + extraCantrip : 0;
  const prepared = def ? def.prepared[0]! : 0;
  const spellbook = def?.spellbook?.initial ?? 0;
  const bg = draftBackground(d);
  const feats = draftOriginFeats(d);
  const initiates = feats.flatMap((feat, i) => {
    if (feat !== 'magic-initiate') return [];
    // O 1º talento é o do antecedente; o do antecedente "Outro" e o do Humano escolhem a lista.
    const fromBackground = i === 0 && d.backgroundId !== CUSTOM_ID;
    const note = fromBackground ? bg?.featNote : undefined;
    return [{ fixedList: (note && FEAT_NOTE_LIST[note]) || null }];
  });
  return {
    classList: def && (cantrips || prepared) ? cls!.id : null,
    cantrips,
    prepared,
    spellbook,
    initiates,
  };
}

/** A etapa Magias aparece? (classe que conjura no nível 1 ou Iniciado em Magia) */
export function hasSpellStep(d: CreationDraft): boolean {
  const n = spellNeeds(d);
  return n.classList !== null || n.initiates.length > 0;
}

/** As etapas deste rascunho, na ordem (Magias só quando faz sentido). */
export function creationSteps(d: CreationDraft): CreationStep[] {
  return CREATION_STEPS.filter((s) => s !== 'spells' || hasSpellStep(d));
}

/** Escolhas de cada Iniciado em Magia (a lista fixa do antecedente já vem preenchida). */
export function initiateChoices(d: CreationDraft): InitiateChoice[] {
  return spellNeeds(d).initiates.map((need, i) => {
    const c = d.initiates[i] ?? emptyInitiate();
    return need.fixedList ? { ...c, list: need.fixedList } : c;
  });
}

// ---------- validação de cada etapa ----------

export type CreationIssue =
  | 'class-missing'
  | 'class-option-missing'
  | 'fighting-style-missing'
  | 'class-skills-count'
  | 'class-equipment-invalid'
  | 'weapon-mastery-count'
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
  | 'spell-cantrips-count'
  | 'spell-prepared-count'
  | 'spellbook-count'
  | 'spell-prepared-not-in-book'
  | 'initiate-incomplete'
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
  const mastery = cls.weaponMastery?.count ?? 0;
  if (mastery) {
    const allowedWeapons = masteryOptions(cls);
    const valid = d.weaponMasteries.filter((w) => allowedWeapons.includes(w));
    if (valid.length !== mastery || new Set(d.weaponMasteries).size !== d.weaponMasteries.length) {
      issues.push('weapon-mastery-count');
    }
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

const distinct = (ids: string[]) => new Set(ids).size === ids.length;

/**
 * Magias: só a quantidade e a forma (a lista de cada classe fica no pacote das magias, que a
 * página carrega sob demanda; o seletor só oferece as magias certas).
 */
function spellIssues(d: CreationDraft): CreationIssue[] {
  if (!hasSpellStep(d)) return [];
  const n = spellNeeds(d);
  const issues: CreationIssue[] = [];
  if (d.cantrips.length !== n.cantrips || !distinct(d.cantrips)) {
    issues.push('spell-cantrips-count');
  }
  if (n.spellbook) {
    if (d.spellbook.length !== n.spellbook || !distinct(d.spellbook)) {
      issues.push('spellbook-count');
    }
    if (d.preparedSpells.some((id) => !d.spellbook.includes(id))) {
      issues.push('spell-prepared-not-in-book');
    }
  }
  if (d.preparedSpells.length !== n.prepared || !distinct(d.preparedSpells)) {
    issues.push('spell-prepared-count');
  }
  const incomplete = initiateChoices(d).some(
    (c) => !c.list || !c.ability || c.cantrips.length !== 2 || !distinct(c.cantrips) || !c.spell,
  );
  if (incomplete) issues.push('initiate-incomplete');
  return issues;
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
    case 'spells':
      return spellIssues(d);
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
    weaponMasteries: [],
    expertise: [],
    languages: d.languages.slice(0, 2),
    cantrips: [],
    preparedSpells: [],
    spellbook: [],
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
    initiates: [],
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
    initiates: [],
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
const SPELL_ID = /^[a-z0-9-]{1,60}$/;
function spellIds(value: unknown, max: number): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string' && SPELL_ID.test(v)).slice(0, max)
    : [];
}
function initiates(value: unknown): InitiateChoice[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 2).map((raw) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    return {
      list: (INITIATE_LISTS as readonly string[]).includes(r.list as string)
        ? (r.list as InitiateList)
        : null,
      ability: (INITIATE_ABILITIES as readonly string[]).includes(r.ability as string)
        ? (r.ability as InitiateAbility)
        : null,
      cantrips: spellIds(r.cantrips, 2),
      spell: typeof r.spell === 'string' && SPELL_ID.test(r.spell) ? r.spell : null,
    };
  });
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
    weaponMasteries: Array.isArray(r.weaponMasteries)
      ? ([
          ...new Set(
            r.weaponMasteries.filter(
              (w): w is WeaponId => typeof w === 'string' && Object.hasOwn(WEAPONS, w),
            ),
          ),
        ].slice(0, 4) as WeaponId[])
      : [],
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
    cantrips: spellIds(r.cantrips, 6),
    preparedSpells: spellIds(r.preparedSpells, 6),
    spellbook: spellIds(r.spellbook, 6),
    initiates: initiates(r.initiates),
    name: str(r.name, 100),
    playerName: str(r.playerName, 80),
    alignment: str(r.alignment, 40),
    appearance: str(r.appearance, 2000),
    backstory: str(r.backstory, 2000),
    expertise: skills(r.expertise),
  };
}
