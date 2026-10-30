/**
 * Conteúdo de criação de personagem — regras de 2024 (Livro do Jogador, cap. 2 a 6).
 *
 * O QUE ENTRA AQUI (plano v2, 3.1 e 3.2): o que também está nas regras abertas (SRD 5.2,
 * CC BY 4.0): as 12 classes no nível 1, 9 espécies, 4 antecedentes e os talentos de Origem do
 * SRD. Os antecedentes, talentos de Origem e Estilos de Luta do livro que o SRD não traz ficam
 * em `./book-origins` (regras fiéis, texto nosso). O resto do livro entra pela opção
 * "Outro (do livro)", que o jogador preenche (RF-24).
 *
 * Nomes e termos seguem a edição brasileira (ADR-004). As descrições são RESUMOS escritos para
 * o site, com as nossas palavras — nunca cópia do texto do livro.
 */
import type { AbilityKey, DamageType, HitDieSides, SkillKey } from '@grimorio/shared';
import { BOOK_BACKGROUNDS, BOOK_FIGHTING_STYLES, BOOK_ORIGIN_FEATS } from './book-origins';

/** Muda quando uma regra/errata muda números (vai no registro da criação). */
export const CREATION_CONTENT_VERSION = 'srd52-ptbr-2';

export interface TextEntry {
  name: string;
  text: string;
}

// ---------- armas e armaduras (cap. 6) ----------

export type WeaponCategory = 'simple' | 'martial';

export interface WeaponDef {
  id: string;
  name: string;
  dice: string;
  damageType: DamageType;
  category: WeaponCategory;
  ranged: boolean;
  finesse: boolean;
  light: boolean;
  /** Propriedades como aparecem na ficha (inclui a maestria). */
  properties: string;
  /** Propriedade de maestria (Livro do Jogador 2024, cap. 6). */
  mastery: MasteryId;
}

/** Propriedades de maestria de arma (SRD 5.2). Texto próprio, em linguagem simples. */
export const MASTERY_PROPERTIES = {
  vex: {
    name: 'Afligir',
    text: 'Acertou e causou dano: você tem Vantagem no próximo ataque contra essa criatura até o fim do seu próximo turno.',
  },
  nick: {
    name: 'Ágil',
    text: 'O ataque extra da propriedade Leve pode ser feito dentro da ação Atacar, sem gastar a Ação Bônus (uma vez por turno).',
  },
  topple: {
    name: 'Derrubar',
    text: 'Acertou: a criatura faz uma salvaguarda de Constituição (CD 8 + o modificador usado no ataque + Bônus de Proficiência) ou fica Caída.',
  },
  sap: {
    name: 'Drenar',
    text: 'Acertou: a criatura tem Desvantagem na próxima jogada de ataque dela antes do início do seu próximo turno.',
  },
  push: {
    name: 'Empurrar',
    text: 'Acertou: você pode empurrar a criatura até 3 m para longe de você, se ela for Grande ou menor.',
  },
  graze: {
    name: 'Garantido',
    text: 'Errou: a criatura sofre mesmo assim dano igual ao modificador de atributo usado no ataque.',
  },
  slow: {
    name: 'Lentidão',
    text: 'Acertou e causou dano: o Deslocamento da criatura cai 3 m até o início do seu próximo turno (não acumula).',
  },
  cleave: {
    name: 'Trespassar',
    text: 'Acertou um ataque corpo a corpo: você pode atacar uma segunda criatura a até 1,5 m da primeira; esse dano não soma o modificador de atributo (uma vez por turno).',
  },
} as const satisfies Record<string, { name: string; text: string }>;

export type MasteryId = keyof typeof MASTERY_PROPERTIES;

export const WEAPONS = {
  dagger: {
    id: 'dagger',
    name: 'Adaga',
    dice: '1d4',
    damageType: 'piercing',
    category: 'simple',
    ranged: false,
    finesse: true,
    light: true,
    properties: 'Acuidade, Arremesso (6/18 m), Leve · Maestria: Ágil',
    mastery: 'nick',
  },
  handaxe: {
    id: 'handaxe',
    name: 'Machadinha',
    dice: '1d6',
    damageType: 'slashing',
    category: 'simple',
    ranged: false,
    finesse: false,
    light: true,
    properties: 'Arremesso (6/18 m), Leve · Maestria: Afligir',
    mastery: 'vex',
  },
  javelin: {
    id: 'javelin',
    name: 'Azagaia',
    dice: '1d6',
    damageType: 'piercing',
    category: 'simple',
    ranged: false,
    finesse: false,
    light: false,
    properties: 'Arremesso (9/36 m) · Maestria: Lentidão',
    mastery: 'slow',
  },
  mace: {
    id: 'mace',
    name: 'Maça',
    dice: '1d6',
    damageType: 'bludgeoning',
    category: 'simple',
    ranged: false,
    finesse: false,
    light: false,
    properties: 'Maestria: Drenar',
    mastery: 'sap',
  },
  quarterstaff: {
    id: 'quarterstaff',
    name: 'Cajado',
    dice: '1d6',
    damageType: 'bludgeoning',
    category: 'simple',
    ranged: false,
    finesse: false,
    light: false,
    properties: 'Versátil (1d8) · Maestria: Derrubar',
    mastery: 'topple',
  },
  sickle: {
    id: 'sickle',
    name: 'Foice',
    dice: '1d4',
    damageType: 'slashing',
    category: 'simple',
    ranged: false,
    finesse: false,
    light: true,
    properties: 'Leve · Maestria: Ágil',
    mastery: 'nick',
  },
  spear: {
    id: 'spear',
    name: 'Lança',
    dice: '1d6',
    damageType: 'piercing',
    category: 'simple',
    ranged: false,
    finesse: false,
    light: false,
    properties: 'Arremesso (6/18 m), Versátil (1d8) · Maestria: Drenar',
    mastery: 'sap',
  },
  shortbow: {
    id: 'shortbow',
    name: 'Arco Curto',
    dice: '1d6',
    damageType: 'piercing',
    category: 'simple',
    ranged: true,
    finesse: false,
    light: false,
    properties: 'Duas Mãos, Munição (24/96 m; Flecha) · Maestria: Afligir',
    mastery: 'vex',
  },
  scimitar: {
    id: 'scimitar',
    name: 'Cimitarra',
    dice: '1d6',
    damageType: 'slashing',
    category: 'martial',
    ranged: false,
    finesse: true,
    light: true,
    properties: 'Acuidade, Leve · Maestria: Ágil',
    mastery: 'nick',
  },
  shortsword: {
    id: 'shortsword',
    name: 'Espada Curta',
    dice: '1d6',
    damageType: 'piercing',
    category: 'martial',
    ranged: false,
    finesse: true,
    light: true,
    properties: 'Acuidade, Leve · Maestria: Afligir',
    mastery: 'vex',
  },
  greatsword: {
    id: 'greatsword',
    name: 'Espada Grande',
    dice: '2d6',
    damageType: 'slashing',
    category: 'martial',
    ranged: false,
    finesse: false,
    light: false,
    properties: 'Duas Mãos, Pesada · Maestria: Garantido',
    mastery: 'graze',
  },
  longsword: {
    id: 'longsword',
    name: 'Espada Longa',
    dice: '1d8',
    damageType: 'slashing',
    category: 'martial',
    ranged: false,
    finesse: false,
    light: false,
    properties: 'Versátil (1d10) · Maestria: Drenar',
    mastery: 'sap',
  },
  greataxe: {
    id: 'greataxe',
    name: 'Machado Grande',
    dice: '1d12',
    damageType: 'slashing',
    category: 'martial',
    ranged: false,
    finesse: false,
    light: false,
    properties: 'Duas Mãos, Pesada · Maestria: Trespassar',
    mastery: 'cleave',
  },
  flail: {
    id: 'flail',
    name: 'Mangual',
    dice: '1d8',
    damageType: 'bludgeoning',
    category: 'martial',
    ranged: false,
    finesse: false,
    light: false,
    properties: 'Maestria: Drenar',
    mastery: 'sap',
  },
  longbow: {
    id: 'longbow',
    name: 'Arco Longo',
    dice: '1d8',
    damageType: 'piercing',
    category: 'martial',
    ranged: true,
    finesse: false,
    light: false,
    properties: 'Duas Mãos, Munição (45/180 m; Flecha), Pesada · Maestria: Lentidão',
    mastery: 'slow',
  },
  club: {
    id: 'club',
    name: 'Clava',
    dice: '1d4',
    damageType: 'bludgeoning',
    category: 'simple',
    ranged: false,
    finesse: false,
    light: true,
    properties: 'Leve · Maestria: Lentidão',
    mastery: 'slow',
  },
  greatclub: {
    id: 'greatclub',
    name: 'Clava Grande',
    dice: '1d8',
    damageType: 'bludgeoning',
    category: 'simple',
    ranged: false,
    finesse: false,
    light: false,
    properties: 'Duas Mãos · Maestria: Empurrar',
    mastery: 'push',
  },
  'light-hammer': {
    id: 'light-hammer',
    name: 'Martelo Leve',
    dice: '1d4',
    damageType: 'bludgeoning',
    category: 'simple',
    ranged: false,
    finesse: false,
    light: true,
    properties: 'Arremesso (6/18 m), Leve · Maestria: Ágil',
    mastery: 'nick',
  },
  'light-crossbow': {
    id: 'light-crossbow',
    name: 'Besta Leve',
    dice: '1d8',
    damageType: 'piercing',
    category: 'simple',
    ranged: true,
    finesse: false,
    light: false,
    properties: 'Duas Mãos, Munição (24/96 m; Virote), Recarga · Maestria: Lentidão',
    mastery: 'slow',
  },
  dart: {
    id: 'dart',
    name: 'Dardo',
    dice: '1d4',
    damageType: 'piercing',
    category: 'simple',
    ranged: true,
    finesse: true,
    light: false,
    properties: 'Acuidade, Arremesso (6/18 m) · Maestria: Afligir',
    mastery: 'vex',
  },
  sling: {
    id: 'sling',
    name: 'Funda',
    dice: '1d4',
    damageType: 'bludgeoning',
    category: 'simple',
    ranged: true,
    finesse: false,
    light: false,
    properties: 'Munição (9/36 m; Bala) · Maestria: Lentidão',
    mastery: 'slow',
  },
  halberd: {
    id: 'halberd',
    name: 'Alabarda',
    dice: '1d10',
    damageType: 'slashing',
    category: 'martial',
    ranged: false,
    finesse: false,
    light: false,
    properties: 'Duas Mãos, Extensão, Pesada · Maestria: Trespassar',
    mastery: 'cleave',
  },
  whip: {
    id: 'whip',
    name: 'Chicote',
    dice: '1d4',
    damageType: 'slashing',
    category: 'martial',
    ranged: false,
    finesse: true,
    light: false,
    properties: 'Acuidade, Extensão · Maestria: Lentidão',
    mastery: 'slow',
  },
  glaive: {
    id: 'glaive',
    name: 'Glaive',
    dice: '1d10',
    damageType: 'slashing',
    category: 'martial',
    ranged: false,
    finesse: false,
    light: false,
    properties: 'Duas Mãos, Extensão, Pesada · Maestria: Garantido',
    mastery: 'graze',
  },
  lance: {
    id: 'lance',
    name: 'Lança de Montaria',
    dice: '1d10',
    damageType: 'piercing',
    category: 'martial',
    ranged: false,
    finesse: false,
    light: false,
    properties: 'Duas Mãos (a menos que montado), Extensão, Pesada · Maestria: Derrubar',
    mastery: 'topple',
  },
  pike: {
    id: 'pike',
    name: 'Lança Longa',
    dice: '1d10',
    damageType: 'piercing',
    category: 'martial',
    ranged: false,
    finesse: false,
    light: false,
    properties: 'Duas Mãos, Extensão, Pesada · Maestria: Empurrar',
    mastery: 'push',
  },
  morningstar: {
    id: 'morningstar',
    name: 'Maça Estrela',
    dice: '1d8',
    damageType: 'piercing',
    category: 'martial',
    ranged: false,
    finesse: false,
    light: false,
    properties: 'Maestria: Drenar',
    mastery: 'sap',
  },
  battleaxe: {
    id: 'battleaxe',
    name: 'Machado de Batalha',
    dice: '1d8',
    damageType: 'slashing',
    category: 'martial',
    ranged: false,
    finesse: false,
    light: false,
    properties: 'Versátil (1d10) · Maestria: Derrubar',
    mastery: 'topple',
  },
  maul: {
    id: 'maul',
    name: 'Malho',
    dice: '2d6',
    damageType: 'bludgeoning',
    category: 'martial',
    ranged: false,
    finesse: false,
    light: false,
    properties: 'Duas Mãos, Pesada · Maestria: Derrubar',
    mastery: 'topple',
  },
  warhammer: {
    id: 'warhammer',
    name: 'Martelo de Guerra',
    dice: '1d8',
    damageType: 'bludgeoning',
    category: 'martial',
    ranged: false,
    finesse: false,
    light: false,
    properties: 'Versátil (1d10) · Maestria: Empurrar',
    mastery: 'push',
  },
  'war-pick': {
    id: 'war-pick',
    name: 'Picareta de Guerra',
    dice: '1d8',
    damageType: 'piercing',
    category: 'martial',
    ranged: false,
    finesse: false,
    light: false,
    properties: 'Versátil (1d10) · Maestria: Drenar',
    mastery: 'sap',
  },
  rapier: {
    id: 'rapier',
    name: 'Rapieira',
    dice: '1d8',
    damageType: 'piercing',
    category: 'martial',
    ranged: false,
    finesse: true,
    light: false,
    properties: 'Acuidade · Maestria: Afligir',
    mastery: 'vex',
  },
  trident: {
    id: 'trident',
    name: 'Tridente',
    dice: '1d8',
    damageType: 'piercing',
    category: 'martial',
    ranged: false,
    finesse: false,
    light: false,
    properties: 'Arremesso (6/18 m), Versátil (1d10) · Maestria: Derrubar',
    mastery: 'topple',
  },
  'hand-crossbow': {
    id: 'hand-crossbow',
    name: 'Besta de Mão',
    dice: '1d6',
    damageType: 'piercing',
    category: 'martial',
    ranged: true,
    finesse: false,
    light: true,
    properties: 'Leve, Munição (9/36 m; Virote), Recarga · Maestria: Afligir',
    mastery: 'vex',
  },
  'heavy-crossbow': {
    id: 'heavy-crossbow',
    name: 'Besta Pesada',
    dice: '1d10',
    damageType: 'piercing',
    category: 'martial',
    ranged: true,
    finesse: false,
    light: false,
    properties: 'Duas Mãos, Munição (30/120 m; Virote), Pesada, Recarga · Maestria: Empurrar',
    mastery: 'push',
  },
  musket: {
    id: 'musket',
    name: 'Mosquete',
    dice: '1d12',
    damageType: 'piercing',
    category: 'martial',
    ranged: true,
    finesse: false,
    light: false,
    properties: 'Duas Mãos, Munição (12/36 m; Bala), Recarga · Maestria: Lentidão',
    mastery: 'slow',
  },
  pistol: {
    id: 'pistol',
    name: 'Pistola',
    dice: '1d10',
    damageType: 'piercing',
    category: 'martial',
    ranged: true,
    finesse: false,
    light: false,
    properties: 'Munição (9/27 m; Bala), Recarga · Maestria: Afligir',
    mastery: 'vex',
  },
  blowgun: {
    id: 'blowgun',
    name: 'Zarabatana',
    dice: '1',
    damageType: 'piercing',
    category: 'martial',
    ranged: true,
    finesse: false,
    light: false,
    properties: 'Munição (7,5/30 m; Agulha), Recarga · Maestria: Afligir',
    mastery: 'vex',
  },
} as const satisfies Record<string, WeaponDef>;

export type WeaponId = keyof typeof WEAPONS;

// Armaduras: a tabela completa do cap. 6 fica no Inventário (a ficha também usa).
export { ARMOR, type ArmorDef, type ArmorId, type ArmorKind } from '../inventory/armor';
import type { ArmorId, ArmorKind } from '../inventory/armor';

/** Um pacote de equipamento inicial (opção A, B ou C). */
export interface EquipmentPack {
  option: 'A' | 'B' | 'C';
  /** Tudo, como vai para a ficha (inclui armas e armaduras). */
  items: string[];
  weapons: { id: WeaponId; quantity: number }[];
  armor: ArmorId[];
  gold: number;
}

const goldOnly = (option: 'B' | 'C', gold: number): EquipmentPack => ({
  option,
  items: [],
  weapons: [],
  armor: [],
  gold,
});

// ---------- talentos de Origem e estilos de luta (cap. 5) ----------

type SrdOriginFeatId = 'alert' | 'magic-initiate' | 'savage-attacker' | 'skilled';
/** Talentos de Origem do livro que o SRD não traz (`./book-origins`). */
export type BookOriginFeatId =
  'crafter' | 'healer' | 'lucky' | 'musician' | 'tavern-brawler' | 'tough';
export type OriginFeatId = SrdOriginFeatId | BookOriginFeatId;

export interface FeatDef extends TextEntry {
  id: OriginFeatId;
  /** `book`: está no livro mas não no SRD (regras do livro, texto do site). */
  source?: 'book';
  /** Quantas perícias o talento deixa escolher (Habilidoso: 3). */
  skillChoices?: number;
  /** Alerta: soma o Bônus de Proficiência à Iniciativa. */
  initiativeProficiency?: boolean;
}

const SRD_ORIGIN_FEATS: Record<SrdOriginFeatId, FeatDef> = {
  alert: {
    id: 'alert',
    name: 'Alerta',
    text: 'Some o seu Bônus de Proficiência à Iniciativa. Logo depois de rolar Iniciativa, você pode trocar o seu resultado com o de um aliado voluntário (nenhum dos dois pode estar Incapacitado).',
    initiativeProficiency: true,
  },
  'magic-initiate': {
    id: 'magic-initiate',
    name: 'Iniciado em Magia',
    text: 'Aprenda 2 truques e 1 magia de 1º círculo de uma lista (Clérigo, Druida ou Mago). A magia fica sempre preparada e pode ser conjurada 1 vez sem espaço por Descanso Longo. Inteligência, Sabedoria ou Carisma é o atributo de conjuração (escolha ao pegar o talento).',
  },
  'savage-attacker': {
    id: 'savage-attacker',
    name: 'Atacante Selvagem',
    text: 'Uma vez por turno, ao acertar um alvo com uma arma, role os dados de dano da arma duas vezes e use o resultado que preferir.',
  },
  skilled: {
    id: 'skilled',
    name: 'Habilidoso',
    text: 'Proficiência em 3 perícias ou ferramentas à sua escolha. Pode ser pego mais de uma vez.',
    skillChoices: 3,
  },
};

export const ORIGIN_FEATS: Record<OriginFeatId, FeatDef> = {
  ...SRD_ORIGIN_FEATS,
  ...BOOK_ORIGIN_FEATS,
};

type SrdFightingStyleId = 'archery' | 'defense' | 'great-weapon' | 'two-weapon';
/** Estilos de Luta do livro que o SRD não traz (`./book-origins`). */
export type BookFightingStyleId =
  'thrown-weapon' | 'unarmed' | 'dueling' | 'interception' | 'blind-fighting' | 'protection';
export type FightingStyleId = SrdFightingStyleId | BookFightingStyleId;

export interface FightingStyleDef extends TextEntry {
  id: FightingStyleId;
  /** `book`: está no livro mas não no SRD (regras do livro, texto do site). */
  source?: 'book';
}

const SRD_FIGHTING_STYLES: Record<SrdFightingStyleId, FightingStyleDef> = {
  archery: {
    id: 'archery',
    name: 'Arquearia',
    text: '+2 nas jogadas de ataque com armas de ataque à distância.',
  },
  defense: {
    id: 'defense',
    name: 'Defesa',
    text: '+1 na Classe de Armadura enquanto usa armadura Leve, Média ou Pesada.',
  },
  'great-weapon': {
    id: 'great-weapon',
    name: 'Combate com Armas Grandes',
    text: 'Com arma corpo a corpo de Duas Mãos ou Versátil empunhada com as duas mãos, trate 1 ou 2 nos dados de dano como 3.',
  },
  'two-weapon': {
    id: 'two-weapon',
    name: 'Combate com Duas Armas',
    text: 'Ao fazer o ataque extra com uma arma Leve, some o modificador de atributo ao dano desse ataque.',
  },
};

export const FIGHTING_STYLES: Record<FightingStyleId, FightingStyleDef> = {
  ...SRD_FIGHTING_STYLES,
  ...BOOK_FIGHTING_STYLES,
};

// ---------- classes (cap. 3, nível 1) ----------

export type ClassId =
  | 'barbarian'
  | 'bard'
  | 'warlock'
  | 'cleric'
  | 'druid'
  | 'sorcerer'
  | 'ranger'
  | 'fighter'
  | 'rogue'
  | 'wizard'
  | 'monk'
  | 'paladin';

/** Quais armas a classe sabe usar (define a proficiência nas armas do equipamento). */
export type WeaponTraining = 'simple' | 'simple-martial' | 'rogue' | 'monk';

export interface ClassOption extends TextEntry {
  id: string;
  /** Efeitos que o site aplica: armas marciais, armadura extra. */
  martialWeapons?: boolean;
  armor?: ArmorKind;
}

export interface ClassDef {
  id: ClassId;
  name: string;
  /** Uma frase, para o cartão da classe. */
  tagline: string;
  primary: AbilityKey[];
  complexity: 'low' | 'medium' | 'high';
  hitDie: HitDieSides;
  saves: [AbilityKey, AbilityKey];
  skills: { count: number; from: SkillKey[] | 'any' };
  weaponTraining: WeaponTraining;
  weaponsText: string;
  armorTraining: ArmorKind[];
  toolsText?: string;
  equipment: EquipmentPack[];
  /** Tabela "Conjunto Padrão por Classe" (cap. 2). */
  standardArray: Record<AbilityKey, number>;
  features: TextEntry[];
  spellcasting?: { ability: AbilityKey; cantrips: number; prepared: number; slots: number };
  /** Escolha obrigatória no nível 1 (Ordem Divina, Ordem Primal, Invocação Mística do Bruxo). */
  option?: { label: string; choices: ClassOption[] };
  fightingStyle?: boolean;
  /** Bárbaro (Con) e Monge (Sab): CA sem armadura = 10 + Des + este atributo. */
  unarmoredDefense?: AbilityKey;
  /** Ladino: perícias com Especialização. */
  expertise?: number;
  /** Maestria em Arma (nível 1): quantos tipos de arma; `melee` = só corpo a corpo (Bárbaro). */
  weaponMastery?: { count: number; melee?: boolean };
  /** Idiomas extras: fixos (Druídico, Gíria dos Ladrões) e à escolha. */
  languages?: { fixed: string[]; choose: number };
}

const ALL_SKILLS = 'any' as const;

export const CLASSES: Record<ClassId, ClassDef> = {
  barbarian: {
    id: 'barbarian',
    name: 'Bárbaro',
    tagline: 'Combatente movido por uma Fúria primitiva que o torna quase impossível de derrubar.',
    primary: ['str'],
    complexity: 'medium',
    hitDie: 12,
    saves: ['str', 'con'],
    skills: {
      count: 2,
      from: ['animal-handling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'],
    },
    weaponTraining: 'simple-martial',
    weaponsText: 'Armas Simples e Marciais',
    armorTraining: ['light', 'medium', 'shield'],
    equipment: [
      {
        option: 'A',
        items: ['Machado Grande', '4 Machadinhas', 'Kit de Aventureiro'],
        weapons: [
          { id: 'greataxe', quantity: 1 },
          { id: 'handaxe', quantity: 4 },
        ],
        armor: [],
        gold: 15,
      },
      goldOnly('B', 75),
    ],
    standardArray: { str: 15, dex: 13, con: 14, int: 10, wis: 12, cha: 8 },
    unarmoredDefense: 'con',
    weaponMastery: { count: 2, melee: true },
    features: [
      {
        name: 'Fúria',
        text: 'Ação Bônus (sem armadura Pesada). 2 usos; recupera 1 no Descanso Curto e todos no Longo. Enquanto dura: Resistência a dano Contundente, Cortante e Perfurante; +2 no dano de ataques com Força; Vantagem em testes e salvaguardas de Força; sem Concentração e sem magias.',
      },
      {
        name: 'Defesa sem Armadura',
        text: 'Sem armadura, sua CA é 10 + Destreza + Constituição. Pode usar Escudo.',
      },
      {
        name: 'Maestria em Arma',
        text: 'Use a maestria de 2 tipos de armas corpo a corpo (Simples ou Marciais). Pode trocar uma delas a cada Descanso Longo.',
      },
    ],
  },
  bard: {
    id: 'bard',
    name: 'Bardo',
    tagline:
      'Artista que conjura magia com música e palavras, inspira aliados e sabe um pouco de tudo.',
    primary: ['cha'],
    complexity: 'high',
    hitDie: 8,
    saves: ['dex', 'cha'],
    skills: { count: 3, from: ALL_SKILLS },
    weaponTraining: 'simple',
    weaponsText: 'Armas Simples',
    armorTraining: ['light'],
    toolsText: '3 Instrumentos Musicais à sua escolha',
    equipment: [
      {
        option: 'A',
        items: ['Armadura de Couro', '2 Adagas', 'Instrumento Musical à escolha', 'Kit de Artista'],
        weapons: [{ id: 'dagger', quantity: 2 }],
        armor: ['leather'],
        gold: 19,
      },
      goldOnly('B', 90),
    ],
    standardArray: { str: 8, dex: 14, con: 12, int: 13, wis: 10, cha: 15 },
    spellcasting: { ability: 'cha', cantrips: 2, prepared: 4, slots: 2 },
    features: [
      {
        name: 'Inspiração de Bardo',
        text: 'Ação Bônus: dê um d6 a uma criatura a até 18 m que veja ou ouça você. Na próxima hora, ao falhar num Teste de D20, ela soma o dado. Usos = modificador de Carisma (mínimo 1), recuperados no Descanso Longo.',
      },
      {
        name: 'Conjuração',
        text: '2 truques e 4 magias preparadas da lista de Bardo; 2 espaços de magia de 1º círculo. Atributo: Carisma. Um Instrumento Musical serve de foco.',
      },
    ],
  },
  warlock: {
    id: 'warlock',
    name: 'Bruxo',
    tagline: 'Fez um pacto com uma entidade poderosa em troca de magia e segredos proibidos.',
    primary: ['cha'],
    complexity: 'high',
    hitDie: 8,
    saves: ['wis', 'cha'],
    skills: {
      count: 2,
      from: [
        'arcana',
        'deception',
        'history',
        'intimidation',
        'investigation',
        'nature',
        'religion',
      ],
    },
    weaponTraining: 'simple',
    weaponsText: 'Armas Simples',
    armorTraining: ['light'],
    equipment: [
      {
        option: 'A',
        items: [
          'Armadura de Couro',
          'Foice',
          '2 Adagas',
          'Foco Arcano (orbe)',
          'Livro (conhecimento oculto)',
          'Kit de Erudito',
        ],
        weapons: [
          { id: 'sickle', quantity: 1 },
          { id: 'dagger', quantity: 2 },
        ],
        armor: ['leather'],
        gold: 15,
      },
      goldOnly('B', 100),
    ],
    standardArray: { str: 8, dex: 14, con: 13, int: 12, wis: 10, cha: 15 },
    option: {
      label: 'Invocação Mística',
      choices: [
        {
          id: 'armor-of-shadows',
          name: 'Armadura de Sombras',
          text: 'Você pode conjurar Armadura Arcana em si mesmo sem gastar espaço de magia (CA 13 + Destreza sem armadura).',
        },
        {
          id: 'eldritch-mind',
          name: 'Mente Mística',
          text: 'Vantagem nas salvaguardas de Constituição para manter a Concentração.',
        },
        {
          id: 'pact-of-the-blade',
          name: 'Pacto da Lâmina',
          text: 'Ação Bônus: faz surgir uma arma de pacto corpo a corpo (ou se vincula a uma arma mágica). Você é proficiente com ela, pode usar Carisma no ataque e no dano e escolher dano Necrótico, Psíquico ou Radiante.',
        },
        {
          id: 'pact-of-the-chain',
          name: 'Pacto da Corrente',
          text: 'Você aprende Convocar Familiar e pode conjurá-la sem espaço de magia, com formas especiais (ex.: Diabrete, Pseudodragão). Ao Atacar, pode trocar um ataque seu por um ataque do familiar.',
        },
        {
          id: 'pact-of-the-tome',
          name: 'Pacto do Tomo',
          text: 'Um Livro das Sombras com 3 truques e 2 magias de 1º círculo com Ritual, de qualquer lista, sempre preparados. Escolha as magias na aba Magias da ficha (Outra magia, se vierem do livro).',
        },
      ],
    },
    spellcasting: { ability: 'cha', cantrips: 2, prepared: 2, slots: 1 },
    features: [
      {
        name: 'Invocações Místicas',
        text: 'Você tem 1 invocação: uma habilidade mágica permanente escolhida abaixo. Ganha mais ao subir de nível.',
      },
      {
        name: 'Magia de Pacto',
        text: '2 truques e 2 magias preparadas da lista de Bruxo; 1 espaço de magia de 1º círculo, recuperado no Descanso Curto ou Longo. Atributo: Carisma.',
      },
    ],
  },
  cleric: {
    id: 'cleric',
    name: 'Clérigo',
    tagline: 'Canaliza o poder de uma divindade para curar, proteger e punir.',
    primary: ['wis'],
    complexity: 'medium',
    hitDie: 8,
    saves: ['wis', 'cha'],
    skills: { count: 2, from: ['history', 'insight', 'medicine', 'persuasion', 'religion'] },
    weaponTraining: 'simple',
    weaponsText: 'Armas Simples',
    armorTraining: ['light', 'medium', 'shield'],
    equipment: [
      {
        option: 'A',
        items: ['Cota de Malha Parcial', 'Escudo', 'Maça', 'Símbolo Sagrado', 'Kit de Sacerdote'],
        weapons: [{ id: 'mace', quantity: 1 }],
        armor: ['chain-shirt', 'shield'],
        gold: 7,
      },
      goldOnly('B', 110),
    ],
    standardArray: { str: 14, dex: 8, con: 13, int: 10, wis: 15, cha: 12 },
    spellcasting: { ability: 'wis', cantrips: 3, prepared: 4, slots: 2 },
    option: {
      label: 'Ordem Divina',
      choices: [
        {
          id: 'protector',
          name: 'Protetor',
          text: 'Treinado para o combate: proficiência com armas Marciais e treinamento com armadura Pesada.',
          martialWeapons: true,
          armor: 'heavy',
        },
        {
          id: 'thaumaturge',
          name: 'Taumaturgo',
          text: '1 truque extra de Clérigo e, em testes de Inteligência (Arcanismo ou Religião), um bônus igual ao seu modificador de Sabedoria (mínimo +1).',
        },
      ],
    },
    features: [
      {
        name: 'Conjuração',
        text: '3 truques e 4 magias preparadas da lista de Clérigo; 2 espaços de magia de 1º círculo. Atributo: Sabedoria. O Símbolo Sagrado serve de foco.',
      },
    ],
  },
  druid: {
    id: 'druid',
    name: 'Druida',
    tagline: 'Sacerdote da natureza que conjura magia primal e fala com os animais.',
    primary: ['wis'],
    complexity: 'high',
    hitDie: 8,
    saves: ['int', 'wis'],
    skills: {
      count: 2,
      from: [
        'arcana',
        'animal-handling',
        'insight',
        'medicine',
        'nature',
        'perception',
        'religion',
        'survival',
      ],
    },
    weaponTraining: 'simple',
    weaponsText: 'Armas Simples',
    armorTraining: ['light', 'shield'],
    toolsText: 'Kit de Herbalismo',
    equipment: [
      {
        option: 'A',
        items: [
          'Armadura de Couro',
          'Escudo',
          'Foice',
          'Foco Druídico (cajado)',
          'Kit de Explorador',
          'Kit de Herbalismo',
        ],
        weapons: [{ id: 'sickle', quantity: 1 }],
        armor: ['leather', 'shield'],
        gold: 9,
      },
      goldOnly('B', 50),
    ],
    standardArray: { str: 8, dex: 12, con: 14, int: 13, wis: 15, cha: 10 },
    spellcasting: { ability: 'wis', cantrips: 2, prepared: 4, slots: 2 },
    languages: { fixed: ['Druídico'], choose: 0 },
    option: {
      label: 'Ordem Primal',
      choices: [
        {
          id: 'magician',
          name: 'Mágico',
          text: '1 truque extra de Druida e, em testes de Inteligência (Arcanismo ou Natureza), um bônus igual ao seu modificador de Sabedoria (mínimo +1).',
        },
        {
          id: 'warden',
          name: 'Guardião',
          text: 'Treinado para a batalha: proficiência com armas Marciais e treinamento com armadura Média.',
          martialWeapons: true,
          armor: 'medium',
        },
      ],
    },
    features: [
      {
        name: 'Conjuração',
        text: '2 truques e 4 magias preparadas da lista de Druida; 2 espaços de magia de 1º círculo. Atributo: Sabedoria. Um Foco Druídico serve de foco.',
      },
      {
        name: 'Idioma Druídico',
        text: 'Você conhece o Druídico, o idioma secreto dos druidas, e sempre tem a magia Falar com Animais preparada.',
      },
    ],
  },
  sorcerer: {
    id: 'sorcerer',
    name: 'Feiticeiro',
    tagline: 'Nasceu com magia no sangue e aprende a moldá-la por instinto.',
    primary: ['cha'],
    complexity: 'high',
    hitDie: 6,
    saves: ['con', 'cha'],
    skills: {
      count: 2,
      from: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'],
    },
    weaponTraining: 'simple',
    weaponsText: 'Armas Simples',
    armorTraining: [],
    equipment: [
      {
        option: 'A',
        items: ['Lança', '2 Adagas', 'Foco Arcano (cristal)', 'Kit de Explorador de Masmorras'],
        weapons: [
          { id: 'spear', quantity: 1 },
          { id: 'dagger', quantity: 2 },
        ],
        armor: [],
        gold: 28,
      },
      goldOnly('B', 50),
    ],
    standardArray: { str: 10, dex: 13, con: 14, int: 8, wis: 12, cha: 15 },
    spellcasting: { ability: 'cha', cantrips: 4, prepared: 2, slots: 2 },
    features: [
      {
        name: 'Conjuração',
        text: '4 truques e 2 magias preparadas da lista de Feiticeiro; 2 espaços de magia de 1º círculo. Atributo: Carisma. Um Foco Arcano serve de foco.',
      },
      {
        name: 'Feitiçaria Inata',
        text: 'Ação Bônus: por 1 minuto, +1 na CD das suas magias de Feiticeiro e Vantagem nas jogadas de ataque com elas. 2 usos por Descanso Longo.',
      },
    ],
  },
  ranger: {
    id: 'ranger',
    name: 'Guardião',
    tagline: 'Caçador dos ermos que mistura armas, rastreamento e magia primal.',
    primary: ['dex', 'wis'],
    complexity: 'medium',
    hitDie: 10,
    saves: ['str', 'dex'],
    skills: {
      count: 3,
      from: [
        'animal-handling',
        'athletics',
        'insight',
        'investigation',
        'nature',
        'perception',
        'stealth',
        'survival',
      ],
    },
    weaponTraining: 'simple-martial',
    weaponsText: 'Armas Simples e Marciais',
    armorTraining: ['light', 'medium', 'shield'],
    equipment: [
      {
        option: 'A',
        items: [
          'Armadura de Couro Batido',
          'Cimitarra',
          'Espada Curta',
          'Arco Longo',
          '20 Flechas',
          'Aljava',
          'Foco Druídico (ramo de visco)',
          'Kit de Aventureiro',
        ],
        weapons: [
          { id: 'scimitar', quantity: 1 },
          { id: 'shortsword', quantity: 1 },
          { id: 'longbow', quantity: 1 },
        ],
        armor: ['studded-leather'],
        gold: 7,
      },
      goldOnly('B', 150),
    ],
    standardArray: { str: 12, dex: 15, con: 13, int: 8, wis: 14, cha: 10 },
    weaponMastery: { count: 2 },
    spellcasting: { ability: 'wis', cantrips: 0, prepared: 2, slots: 2 },
    features: [
      {
        name: 'Conjuração',
        text: '2 magias preparadas da lista de Guardião; 2 espaços de magia de 1º círculo. Atributo: Sabedoria. Um Foco Druídico serve de foco.',
      },
      {
        name: 'Inimigo Favorito',
        text: 'Você sempre tem Marca do Caçador preparada e pode conjurá-la 2 vezes sem gastar espaço de magia (recupera no Descanso Longo).',
      },
      {
        name: 'Maestria em Arma',
        text: 'Use a maestria de 2 tipos de armas (Simples ou Marciais). Pode trocar uma delas a cada Descanso Longo.',
      },
    ],
  },
  fighter: {
    id: 'fighter',
    name: 'Guerreiro',
    tagline: 'Mestre de todas as armas e armaduras, firme na linha de frente.',
    primary: ['str', 'dex'],
    complexity: 'low',
    hitDie: 10,
    saves: ['str', 'con'],
    skills: {
      count: 2,
      from: [
        'acrobatics',
        'animal-handling',
        'athletics',
        'history',
        'insight',
        'intimidation',
        'persuasion',
        'perception',
        'survival',
      ],
    },
    weaponTraining: 'simple-martial',
    weaponsText: 'Armas Simples e Marciais',
    armorTraining: ['light', 'medium', 'heavy', 'shield'],
    equipment: [
      {
        option: 'A',
        items: [
          'Cota de Malha',
          'Espada Grande',
          'Mangual',
          '8 Azagaias',
          'Kit de Explorador de Masmorras',
        ],
        weapons: [
          { id: 'greatsword', quantity: 1 },
          { id: 'flail', quantity: 1 },
          { id: 'javelin', quantity: 8 },
        ],
        armor: ['chain-mail'],
        gold: 4,
      },
      {
        option: 'B',
        items: [
          'Armadura de Couro Batido',
          'Cimitarra',
          'Espada Curta',
          'Arco Longo',
          '20 Flechas',
          'Aljava',
          'Kit de Explorador de Masmorras',
        ],
        weapons: [
          { id: 'scimitar', quantity: 1 },
          { id: 'shortsword', quantity: 1 },
          { id: 'longbow', quantity: 1 },
        ],
        armor: ['studded-leather'],
        gold: 11,
      },
      goldOnly('C', 155),
    ],
    standardArray: { str: 15, dex: 14, con: 13, int: 8, wis: 10, cha: 12 },
    weaponMastery: { count: 3 },
    fightingStyle: true,
    features: [
      {
        name: 'Recuperar Fôlego',
        text: 'Ação Bônus: recupere 1d10 + nível de Guerreiro em PV. 2 usos; recupera 1 no Descanso Curto e todos no Longo.',
      },
      {
        name: 'Maestria em Arma',
        text: 'Use a maestria de 3 tipos de armas (Simples ou Marciais). Pode trocar uma delas a cada Descanso Longo.',
      },
    ],
  },
  rogue: {
    id: 'rogue',
    name: 'Ladino',
    tagline: 'Especialista furtivo que acerta onde dói e resolve problemas com astúcia.',
    primary: ['dex'],
    complexity: 'low',
    hitDie: 8,
    saves: ['dex', 'int'],
    skills: {
      count: 4,
      from: [
        'acrobatics',
        'athletics',
        'deception',
        'insight',
        'intimidation',
        'investigation',
        'perception',
        'persuasion',
        'sleight-of-hand',
        'stealth',
      ],
    },
    weaponTraining: 'rogue',
    weaponsText: 'Armas Simples e Marciais com Acuidade ou Leve',
    armorTraining: ['light'],
    toolsText: 'Ferramentas de Ladrão',
    equipment: [
      {
        option: 'A',
        items: [
          'Armadura de Couro',
          '2 Adagas',
          'Espada Curta',
          'Arco Curto',
          '20 Flechas',
          'Aljava',
          'Ferramentas de Ladrão',
          'Kit de Assaltante',
        ],
        weapons: [
          { id: 'dagger', quantity: 2 },
          { id: 'shortsword', quantity: 1 },
          { id: 'shortbow', quantity: 1 },
        ],
        armor: ['leather'],
        gold: 8,
      },
      goldOnly('B', 100),
    ],
    standardArray: { str: 12, dex: 15, con: 13, int: 14, wis: 10, cha: 8 },
    weaponMastery: { count: 2 },
    expertise: 2,
    languages: { fixed: ['Gíria dos Ladrões'], choose: 1 },
    features: [
      {
        name: 'Ataque Furtivo',
        text: 'Uma vez por turno, +1d6 de dano num ataque com arma de Acuidade ou à distância quando você tem Vantagem, ou quando um aliado está a até 1,5 m do alvo (e você não tem Desvantagem).',
      },
      {
        name: 'Especialização',
        text: 'Em 2 perícias em que você é proficiente, o Bônus de Proficiência conta em dobro.',
      },
      {
        name: 'Gíria dos Ladrões',
        text: 'Você conhece a Gíria dos Ladrões e mais um idioma à sua escolha.',
      },
      {
        name: 'Maestria em Arma',
        text: 'Use a maestria de 2 tipos de armas com que você tem proficiência. Pode trocar uma delas a cada Descanso Longo.',
      },
    ],
  },
  wizard: {
    id: 'wizard',
    name: 'Mago',
    tagline: 'Estudioso da magia arcana, com um livro cheio de magias para todo tipo de problema.',
    primary: ['int'],
    complexity: 'medium',
    hitDie: 6,
    saves: ['int', 'wis'],
    skills: {
      count: 2,
      from: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'nature', 'religion'],
    },
    weaponTraining: 'simple',
    weaponsText: 'Armas Simples',
    armorTraining: [],
    equipment: [
      {
        option: 'A',
        items: ['2 Adagas', 'Foco Arcano (cajado)', 'Kit de Erudito', 'Livro de Magias', 'Túnica'],
        weapons: [
          { id: 'dagger', quantity: 2 },
          { id: 'quarterstaff', quantity: 1 },
        ],
        armor: [],
        gold: 5,
      },
      goldOnly('B', 55),
    ],
    standardArray: { str: 8, dex: 12, con: 13, int: 15, wis: 14, cha: 10 },
    spellcasting: { ability: 'int', cantrips: 3, prepared: 4, slots: 2 },
    features: [
      {
        name: 'Conjuração',
        text: '3 truques; Livro de Magias com 6 magias de 1º círculo, das quais 4 ficam preparadas; 2 espaços de magia de 1º círculo. Atributo: Inteligência.',
      },
      {
        name: 'Adepto de Ritual',
        text: 'Conjure como Ritual qualquer magia de Ritual do seu Livro de Magias, mesmo sem prepará-la.',
      },
      {
        name: 'Recuperação Arcana',
        text: 'Uma vez por dia, ao terminar um Descanso Curto, recupere espaços de magia cujos círculos somem até metade do seu nível de Mago (arredondado para cima).',
      },
    ],
  },
  monk: {
    id: 'monk',
    name: 'Monge',
    tagline: 'Lutador disciplinado que usa o corpo como arma e se move como o vento.',
    primary: ['dex', 'wis'],
    complexity: 'high',
    hitDie: 8,
    saves: ['str', 'dex'],
    skills: {
      count: 2,
      from: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'],
    },
    weaponTraining: 'monk',
    weaponsText: 'Armas Simples e Marciais com Leve',
    armorTraining: [],
    toolsText: '1 tipo de Ferramentas de Artesão ou Instrumento Musical',
    equipment: [
      {
        option: 'A',
        items: [
          'Lança',
          '5 Adagas',
          'Ferramentas de Artesão ou Instrumento Musical (o mesmo da proficiência)',
          'Kit de Aventureiro',
        ],
        weapons: [
          { id: 'spear', quantity: 1 },
          { id: 'dagger', quantity: 5 },
        ],
        armor: [],
        gold: 11,
      },
      goldOnly('B', 50),
    ],
    standardArray: { str: 12, dex: 15, con: 13, int: 10, wis: 14, cha: 8 },
    unarmoredDefense: 'wis',
    features: [
      {
        name: 'Artes Marciais',
        text: 'Desarmado ou com armas de Monge, sem armadura nem escudo: use Destreza no lugar de Força, o Ataque Desarmado causa 1d6 e você pode fazer um Ataque Desarmado como Ação Bônus.',
      },
      {
        name: 'Defesa sem Armadura',
        text: 'Sem armadura nem escudo, sua CA é 10 + Destreza + Sabedoria.',
      },
    ],
  },
  paladin: {
    id: 'paladin',
    name: 'Paladino',
    tagline: 'Guerreiro sagrado unido por um juramento, que cura aliados e pune inimigos.',
    primary: ['str', 'cha'],
    complexity: 'medium',
    hitDie: 10,
    saves: ['wis', 'cha'],
    skills: {
      count: 2,
      from: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'],
    },
    weaponTraining: 'simple-martial',
    weaponsText: 'Armas Simples e Marciais',
    armorTraining: ['light', 'medium', 'heavy', 'shield'],
    equipment: [
      {
        option: 'A',
        items: [
          'Cota de Malha',
          'Escudo',
          'Espada Longa',
          '6 Azagaias',
          'Símbolo Sagrado',
          'Kit de Sacerdote',
        ],
        weapons: [
          { id: 'longsword', quantity: 1 },
          { id: 'javelin', quantity: 6 },
        ],
        armor: ['chain-mail', 'shield'],
        gold: 9,
      },
      goldOnly('B', 150),
    ],
    standardArray: { str: 15, dex: 10, con: 13, int: 8, wis: 12, cha: 14 },
    weaponMastery: { count: 2 },
    spellcasting: { ability: 'cha', cantrips: 0, prepared: 2, slots: 2 },
    features: [
      {
        name: 'Mãos Consagradas',
        text: 'Reserva de cura de 5 × nível de Paladino PV (5 no nível 1), restaurada no Descanso Longo. Ação Bônus: toque uma criatura e devolva PV da reserva; gastar 5 da reserva remove a condição Envenenado.',
      },
      {
        name: 'Conjuração',
        text: '2 magias preparadas da lista de Paladino; 2 espaços de magia de 1º círculo. Atributo: Carisma. O Símbolo Sagrado serve de foco.',
      },
      {
        name: 'Maestria em Arma',
        text: 'Use a maestria de 2 tipos de armas (Simples ou Marciais). Pode trocar uma delas a cada Descanso Longo.',
      },
    ],
  },
};

/** Ordem de exibição (a mesma da tabela "Visão Geral das Classes" do livro). */
export const CLASS_ORDER: ClassId[] = [
  'barbarian',
  'bard',
  'warlock',
  'cleric',
  'druid',
  'sorcerer',
  'ranger',
  'fighter',
  'rogue',
  'wizard',
  'monk',
  'paladin',
];

// ---------- antecedentes (cap. 4) ----------

export interface BackgroundDef {
  id: string;
  name: string;
  /** `book`: está no livro mas não no SRD (regras do livro, texto do site). */
  source?: 'book';
  summary: string;
  abilities: [AbilityKey, AbilityKey, AbilityKey];
  feat: OriginFeatId;
  /** Iniciado em Magia: a lista vem do antecedente. */
  featNote?: string;
  skills: [SkillKey, SkillKey];
  tool: string;
  equipment: [EquipmentPack, EquipmentPack];
}

const SRD_BACKGROUNDS: Record<string, BackgroundDef> = {
  acolyte: {
    id: 'acolyte',
    name: 'Acólito',
    summary: 'Serviu num templo, estudou religião e aprendeu a canalizar um pouco de poder divino.',
    abilities: ['int', 'wis', 'cha'],
    feat: 'magic-initiate',
    featNote: 'Clérigo',
    skills: ['insight', 'religion'],
    tool: 'Suprimentos de Calígrafo',
    equipment: [
      {
        option: 'A',
        items: [
          'Suprimentos de Calígrafo',
          'Livro (orações)',
          'Símbolo Sagrado',
          'Pergaminho (10 folhas)',
          'Túnica',
        ],
        weapons: [],
        armor: [],
        gold: 8,
      },
      goldOnly('B', 50),
    ],
  },
  criminal: {
    id: 'criminal',
    name: 'Criminoso',
    summary: 'Sobreviveu nas ruas e becos, entre furtos, golpes e gangues.',
    abilities: ['dex', 'con', 'int'],
    feat: 'alert',
    skills: ['sleight-of-hand', 'stealth'],
    tool: 'Ferramentas de Ladrão',
    equipment: [
      {
        option: 'A',
        items: [
          '2 Adagas',
          'Ferramentas de Ladrão',
          '2 Algibeiras',
          'Pé de Cabra',
          'Roupas de Viagem',
        ],
        weapons: [{ id: 'dagger', quantity: 2 }],
        armor: [],
        gold: 16,
      },
      goldOnly('B', 50),
    ],
  },
  sage: {
    id: 'sage',
    name: 'Sábio',
    summary: 'Passou anos em bibliotecas e mosteiros, estudando livros e pergaminhos.',
    abilities: ['con', 'int', 'wis'],
    feat: 'magic-initiate',
    featNote: 'Mago',
    skills: ['arcana', 'history'],
    tool: 'Suprimentos de Calígrafo',
    equipment: [
      {
        option: 'A',
        items: [
          'Cajado',
          'Suprimentos de Calígrafo',
          'Livro (história)',
          'Pergaminho (8 folhas)',
          'Túnica',
        ],
        weapons: [{ id: 'quarterstaff', quantity: 1 }],
        armor: [],
        gold: 8,
      },
      goldOnly('B', 50),
    ],
  },
  soldier: {
    id: 'soldier',
    name: 'Soldado',
    summary: 'Treinou para a guerra desde jovem e conhece a disciplina do campo de batalha.',
    abilities: ['str', 'dex', 'con'],
    feat: 'savage-attacker',
    skills: ['athletics', 'intimidation'],
    tool: '1 tipo de Kit de Jogos',
    equipment: [
      {
        option: 'A',
        items: [
          'Lança',
          'Arco Curto',
          '20 Flechas',
          'Kit de Curandeiro',
          'Kit de Jogos (o mesmo da proficiência)',
          'Aljava',
          'Roupas de Viagem',
        ],
        weapons: [
          { id: 'spear', quantity: 1 },
          { id: 'shortbow', quantity: 1 },
        ],
        armor: [],
        gold: 14,
      },
      goldOnly('B', 50),
    ],
  },
};

/** Os antecedentes (SRD + livro) em ordem alfabética. */
export const BACKGROUNDS: Record<string, BackgroundDef> = Object.fromEntries(
  Object.values({ ...SRD_BACKGROUNDS, ...BOOK_BACKGROUNDS })
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .map((b) => [b.id, b]),
);

/** Antecedente "Outro (do livro)": o jogador preenche; o equipamento vira 50 PO. */
export const CUSTOM_ID = 'custom';
export const CUSTOM_BACKGROUND_GOLD = 50;

// ---------- espécies (cap. 4) ----------

export interface SpeciesOption extends TextEntry {
  id: string;
  speedFt?: number;
  resistance?: DamageType;
  darkvisionM?: number;
}

export interface SpeciesDef {
  id: string;
  name: string;
  summary: string;
  size: 'medium' | 'small' | 'medium-or-small';
  speedFt: number;
  traits: TextEntry[];
  option?: { label: string; choices: SpeciesOption[] };
  /** Elfo (Sentidos Aguçados) e Humano (Hábil). */
  skillChoice?: { count: number; from: SkillKey[] | 'any' };
  /** Humano (Versátil): um talento de Origem extra. */
  extraOriginFeat?: boolean;
  /** Anão: +1 PV máximo por nível. */
  hpPerLevel?: number;
  resistance?: DamageType;
}

export const SPECIES: Record<string, SpeciesDef> = {
  dwarf: {
    id: 'dwarf',
    name: 'Anão',
    summary: 'Robustos filhos da pedra, resistentes a venenos e com mais vida que a maioria.',
    size: 'medium',
    speedFt: 30,
    resistance: 'poison',
    hpPerLevel: 1,
    traits: [
      { name: 'Visão no Escuro', text: 'Enxerga no escuro a até 36 m.' },
      {
        name: 'Resistência a Toxinas',
        text: 'Resistência a dano Venenoso e Vantagem em salvaguardas para evitar ou encerrar a condição Envenenado.',
      },
      {
        name: 'Tenacidade Anã',
        text: '+1 no PV máximo, e mais +1 a cada nível (já somado na ficha).',
      },
      {
        name: 'Conhecimento de Pedras',
        text: 'Ação Bônus, tocando pedra: Sismiconsciência de 18 m por 10 minutos. Usos = Bônus de Proficiência, por Descanso Longo.',
      },
    ],
  },
  dragonborn: {
    id: 'dragonborn',
    name: 'Draconato',
    summary:
      'Descendentes de dragões, com sopro elemental e escamas que resistem ao mesmo elemento.',
    size: 'medium',
    speedFt: 30,
    option: {
      label: 'Herança Dracônica',
      choices: [
        { id: 'black', name: 'Negro', text: 'Ácido', resistance: 'acid' },
        { id: 'blue', name: 'Azul', text: 'Elétrico', resistance: 'lightning' },
        { id: 'brass', name: 'Latão', text: 'Ígneo', resistance: 'fire' },
        { id: 'bronze', name: 'Bronze', text: 'Elétrico', resistance: 'lightning' },
        { id: 'copper', name: 'Cobre', text: 'Ácido', resistance: 'acid' },
        { id: 'gold', name: 'Ouro', text: 'Ígneo', resistance: 'fire' },
        { id: 'green', name: 'Verde', text: 'Venenoso', resistance: 'poison' },
        { id: 'red', name: 'Vermelho', text: 'Ígneo', resistance: 'fire' },
        { id: 'silver', name: 'Prata', text: 'Gélido', resistance: 'cold' },
        { id: 'white', name: 'Branco', text: 'Gélido', resistance: 'cold' },
      ],
    },
    traits: [
      {
        name: 'Ataque de Sopro',
        text: 'No lugar de um ataque da ação Atacar: Cone de 4,5 m ou Linha de 9 m. Salvaguarda de Destreza (CD 8 + Constituição + Bônus de Proficiência); 1d10 de dano do tipo da sua herança (metade se passar). Usos = Bônus de Proficiência, por Descanso Longo.',
      },
      { name: 'Resistência a Dano', text: 'Resistência ao tipo de dano da sua Herança Dracônica.' },
      { name: 'Visão no Escuro', text: 'Enxerga no escuro a até 18 m.' },
      {
        name: 'Voo Dracônico',
        text: 'A partir do nível 5: asas espectrais por 10 minutos, 1 vez por Descanso Longo.',
      },
    ],
  },
  elf: {
    id: 'elf',
    name: 'Elfo',
    summary: 'Povo feérico de vida longa, que medita em transe em vez de dormir.',
    size: 'medium',
    speedFt: 30,
    skillChoice: { count: 1, from: ['insight', 'perception', 'survival'] },
    option: {
      label: 'Linhagem Élfica',
      choices: [
        {
          id: 'high-elf',
          name: 'Alto Elfo',
          text: 'Conhece o truque Prestidigitação Arcana (pode trocar por outro truque de Mago a cada Descanso Longo). Nível 3: Detectar Magia; nível 5: Passo Nebuloso.',
        },
        {
          id: 'drow',
          name: 'Drow',
          text: 'Visão no Escuro de 36 m e o truque Luzes Dançantes. Nível 3: Fogo das Fadas; nível 5: Escuridão.',
          darkvisionM: 36,
        },
        {
          id: 'wood-elf',
          name: 'Elfo Silvestre',
          text: 'Deslocamento de 10,5 m e o truque Arte Druídica. Nível 3: Passos Largos; nível 5: Passos Sem Rastro.',
          speedFt: 35,
        },
      ],
    },
    traits: [
      { name: 'Visão no Escuro', text: 'Enxerga no escuro a até 18 m.' },
      {
        name: 'Ancestralidade Feérica',
        text: 'Vantagem em salvaguardas para evitar ou encerrar a condição Enfeitiçado.',
      },
      { name: 'Sentidos Aguçados', text: 'Proficiência em Intuição, Percepção ou Sobrevivência.' },
      {
        name: 'Transe',
        text: 'Completa um Descanso Longo em 4 horas meditando, sem dormir; magia não o faz dormir.',
      },
    ],
  },
  gnome: {
    id: 'gnome',
    name: 'Gnomo',
    summary: 'Pequenos, curiosos e mágicos, com uma mente difícil de enganar.',
    size: 'small',
    speedFt: 30,
    option: {
      label: 'Linhagem Gnômica',
      choices: [
        {
          id: 'rock-gnome',
          name: 'Gnomo das Rochas',
          text: 'Conhece Prestidigitação Arcana e Reparar, e fabrica pequenos dispositivos mecânicos com Prestidigitação Arcana.',
        },
        {
          id: 'forest-gnome',
          name: 'Gnomo do Bosque',
          text: 'Conhece Ilusão Menor e sempre tem Falar com Animais preparada (conjura sem espaço um número de vezes igual ao Bônus de Proficiência).',
        },
      ],
    },
    traits: [
      { name: 'Visão no Escuro', text: 'Enxerga no escuro a até 18 m.' },
      {
        name: 'Astúcia de Gnomo',
        text: 'Vantagem em salvaguardas de Inteligência, Sabedoria e Carisma.',
      },
    ],
  },
  goliath: {
    id: 'goliath',
    name: 'Golias',
    summary: 'Descendentes distantes de gigantes, altos e fortes, com um dom sobrenatural.',
    size: 'medium',
    speedFt: 35,
    option: {
      label: 'Ancestralidade Gigante',
      choices: [
        {
          id: 'cloud',
          name: 'Salto da Nuvem',
          text: 'Ação Bônus: teleporte até 9 m para um espaço que você veja.',
        },
        {
          id: 'fire',
          name: 'Queimadura de Fogo',
          text: 'Ao acertar e causar dano com uma jogada de ataque: +1d10 de dano Ígneo.',
        },
        {
          id: 'frost',
          name: 'Arrepio do Gelo',
          text: 'Ao acertar e causar dano: +1d6 de dano Gélido e −3 m no Deslocamento do alvo até o seu próximo turno.',
        },
        {
          id: 'hill',
          name: 'Tombo da Colina',
          text: 'Ao acertar e causar dano a uma criatura Grande ou menor: ela fica Caída.',
        },
        {
          id: 'stone',
          name: 'Resistência da Pedra',
          text: 'Reação ao sofrer dano: reduza o dano em 1d12 + Constituição.',
        },
        {
          id: 'storm',
          name: 'Trovão da Tempestade',
          text: 'Reação ao sofrer dano de uma criatura a até 18 m: 1d8 de dano Trovejante nela.',
        },
      ],
    },
    traits: [
      {
        name: 'Ancestralidade Gigante',
        text: 'O benefício escolhido pode ser usado um número de vezes igual ao Bônus de Proficiência, por Descanso Longo.',
      },
      {
        name: 'Forma Grande',
        text: 'A partir do nível 5: fica Grande por 10 minutos (Vantagem em testes de Força, +3 m de Deslocamento), 1 vez por Descanso Longo.',
      },
      {
        name: 'Porte Poderoso',
        text: 'Vantagem para escapar de Imobilizado; conta como um tamanho maior para capacidade de carga.',
      },
    ],
  },
  halfling: {
    id: 'halfling',
    name: 'Pequenino',
    summary: 'Pequenos, corajosos e sortudos, ótimos em passar despercebidos.',
    size: 'small',
    speedFt: 30,
    traits: [
      { name: 'Corajoso', text: 'Vantagem em salvaguardas para evitar ou encerrar Amedrontado.' },
      {
        name: 'Agilidade Pequenina',
        text: 'Pode atravessar o espaço de criaturas de tamanho maior que o seu (sem parar nele).',
      },
      {
        name: 'Sorte',
        text: 'Ao tirar 1 no d20 de um Teste de D20, role de novo e use o novo resultado.',
      },
      {
        name: 'Furtividade Natural',
        text: 'Pode se Esconder mesmo encoberto só por uma criatura pelo menos um tamanho maior.',
      },
    ],
  },
  human: {
    id: 'human',
    name: 'Humano',
    summary: 'Versáteis e ambiciosos, aprendem rápido e se adaptam a tudo.',
    size: 'medium-or-small',
    speedFt: 30,
    skillChoice: { count: 1, from: 'any' },
    extraOriginFeat: true,
    traits: [
      { name: 'Eficiente', text: 'Ganha Inspiração Heroica ao completar um Descanso Longo.' },
      { name: 'Hábil', text: 'Proficiência em uma perícia à sua escolha.' },
      {
        name: 'Versátil',
        text: 'Um talento de Origem à sua escolha (Habilidoso é o recomendado).',
      },
    ],
  },
  orc: {
    id: 'orc',
    name: 'Orc',
    summary: 'Resistentes e determinados, difíceis de derrubar e rápidos para avançar.',
    size: 'medium',
    speedFt: 30,
    traits: [
      {
        name: 'Pico de Adrenalina',
        text: 'Correr como Ação Bônus e ganhar PV temporários iguais ao Bônus de Proficiência. Usos = Bônus de Proficiência, por Descanso Curto ou Longo.',
      },
      { name: 'Visão no Escuro', text: 'Enxerga no escuro a até 36 m.' },
      {
        name: 'Vigor Implacável',
        text: 'Ao cair a 0 PV sem morrer na hora, fica com 1 PV. 1 vez por Descanso Longo.',
      },
    ],
  },
  tiefling: {
    id: 'tiefling',
    name: 'Tiferino',
    summary: 'Marcados por um legado dos Planos Inferiores, com magia e resistência sobrenaturais.',
    size: 'medium-or-small',
    speedFt: 30,
    option: {
      label: 'Legado Ínfero',
      choices: [
        {
          id: 'abyssal',
          name: 'Abissal',
          text: 'Resistência a dano Venenoso e o truque Rajada de Veneno. Nível 3: Raio Nauseante; nível 5: Paralisar Pessoa.',
          resistance: 'poison',
        },
        {
          id: 'chthonic',
          name: 'Ctônico',
          text: 'Resistência a dano Necrótico e o truque Toque Necrótico. Nível 3: Vitalidade Vazia; nível 5: Raio do Enfraquecimento.',
          resistance: 'necrotic',
        },
        {
          id: 'infernal',
          name: 'Infernal',
          text: 'Resistência a dano Ígneo e o truque Raio de Fogo. Nível 3: Repreensão Diabólica; nível 5: Escuridão.',
          resistance: 'fire',
        },
      ],
    },
    traits: [
      { name: 'Visão no Escuro', text: 'Enxerga no escuro a até 18 m.' },
      { name: 'Presença Sobrenatural', text: 'Conhece o truque Taumaturgia.' },
    ],
  },
};

export const SPECIES_ORDER = [
  'dwarf',
  'dragonborn',
  'elf',
  'gnome',
  'goliath',
  'human',
  'orc',
  'halfling',
  'tiefling',
] as const;

// ---------- idiomas e alinhamentos (cap. 2) ----------

/** Tabela "Idiomas Comuns". Todo personagem sabe Comum + 2 desta lista. */
export const STANDARD_LANGUAGES = [
  'Língua de Sinais Comum',
  'Dracônico',
  'Anão',
  'Élfico',
  'Gigante',
  'Gnômico',
  'Goblin',
  'Pequenino',
  'Orc',
] as const;

export const ALIGNMENTS = [
  'Ordeiro e Bom',
  'Neutro e Bom',
  'Caótico e Bom',
  'Ordeiro e Neutro',
  'Neutro',
  'Caótico e Neutro',
  'Ordeiro e Mau',
  'Neutro e Mau',
  'Caótico e Mau',
] as const;
