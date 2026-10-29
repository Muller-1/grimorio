import type { AbilityKey, DamageType } from '@grimorio/shared';
import type { Effect } from '../classes/types';

/**
 * Magias do SRD 5.2 (CC BY 4.0) — ADR-010 — e, à parte, as do livro que o SRD não traz
 * (`source: 'book'`, em `data/book.ts`, descritas com palavras nossas).
 *
 * Os dados ficam no código (`./data`, uma lista por círculo) e o navegador só baixa quando
 * abre a parte de magias. Nomes e termos seguem o Livro do Jogador 2024 em português
 * (ADR-004); os textos são escritos para o site a partir do SRD, nunca copiados do livro.
 * A ficha guarda só os ids (`spells.cantrips`, `spells.prepared`…).
 */

export const SPELL_SCHOOLS = [
  'abjuration',
  'conjuration',
  'divination',
  'enchantment',
  'evocation',
  'illusion',
  'necromancy',
  'transmutation',
] as const;
export type SpellSchool = (typeof SPELL_SCHOOLS)[number];

/** Classes com lista de magias. */
export const SPELL_CLASSES = [
  'bard',
  'cleric',
  'druid',
  'paladin',
  'ranger',
  'sorcerer',
  'warlock',
  'wizard',
] as const;
export type SpellClass = (typeof SPELL_CLASSES)[number];

export type SpellLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface SpellDamage {
  /** Dados de dano no círculo base (ou no nível 1, para truques): "8d6", "10d6+40". */
  dice: string;
  type: DamageType;
  /** Soma o modificador do atributo de conjuração (Lâmina Flamejante, Arma Espiritual…). */
  addMod?: boolean;
}

export interface SpellDef {
  /** Id estável, do nome em inglês (ex.: "fireball"). */
  id: string;
  /** De onde vem: ausente = SRD; `book` = só no livro (regras fiéis, texto nosso). */
  source?: 'srd' | 'book';
  name: string;
  /** 0 = truque. */
  level: SpellLevel;
  school: SpellSchool;
  classes: SpellClass[];
  castingTime: string;
  ritual: boolean;
  range: string;
  /** `m`: o componente material (texto) ou `true` quando não é descrito. */
  components: { v: boolean; s: boolean; m?: string | true };
  duration: string;
  concentration: boolean;
  text: string;
  /** "Usando um Espaço de Círculo Superior" / "Aprimoramento de Truque". */
  higher?: string;

  // ---------- o que o site calcula sozinho ----------

  /** Jogada de ataque de magia corpo a corpo ou à distância. */
  attack?: 'melee' | 'ranged';
  /** Salvaguarda que o alvo faz contra a sua CD. */
  save?: AbilityKey;
  /** Até dois tipos de dano (Coluna de Chamas: Ígneo + Radiante). */
  damage?: SpellDamage[];
  heal?: { dice: string; addMod: boolean };
  /** Dados a mais por círculo acima do base (Bola de Fogo: "1d6"). */
  perSlot?: string;
  /** O `perSlot` vale para todos os tipos de dano (Flecha Relâmpago), não só para o primeiro. */
  perSlotAll?: boolean;
  /** Truque cujo dano cresce nos níveis 5, 11 e 17. */
  cantripScaling?: boolean;
  /** Rajada Mística: mais raios (não mais dados) nos níveis 5, 11 e 17. */
  beams?: boolean;
  /** Efeitos ligados enquanto a magia está ativa (Bênção, Armadura Arcana, Escudo da Fé…). */
  effects?: Effect[];
  /** PV temporários ao conjurar (Vitalidade Falsa). */
  tempHp?: string;
}

/** Quantas vezes os dados de um truque se multiplicam no nível do personagem (1, 2, 3 ou 4). */
export function cantripTier(characterLevel: number): number {
  if (characterLevel >= 17) return 4;
  if (characterLevel >= 11) return 3;
  if (characterLevel >= 5) return 2;
  return 1;
}
