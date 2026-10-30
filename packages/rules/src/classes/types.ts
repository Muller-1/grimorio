import type { AbilityKey, DamageType, SkillKey } from '@grimorio/shared';
import type { ClassId } from '../creation/content';

/**
 * Progressão das classes do nível 1 ao 20 (ADR-010), com o conteúdo do SRD 5.2 (CC BY 4.0).
 * Nomes e termos do Livro do Jogador 2024 em português (ADR-004); os textos são resumos
 * escritos para o site.
 *
 * Além do texto, cada característica pode declarar o que o motor calcula sozinho:
 * - `resource`: usos e quando voltam (Fúria, Canalizar Divindade…);
 * - `activation`: o que muda nas contas quando o jogador liga a habilidade (Fúria, Bênção…);
 * - `passive`: efeitos sempre ligados (Sentido de Perigo, Crítico Aprimorado…);
 * - `choice`: o que o jogador escolhe ao ganhar a característica (subclasse, talento…).
 */

// ---------- valores que crescem com o nível ----------

/**
 * Um número que pode depender do personagem:
 * - número fixo;
 * - `column`: coluna da tabela da classe no nível atual (ex.: "rageDamage");
 * - `ability`: modificador de atributo (com mínimo opcional);
 * - `classLevel`: o nível na classe (× multiplicador);
 * - `proficiency`: o Bônus de Proficiência.
 */
export type Scaling =
  | number
  | { column: string }
  | { ability: AbilityKey; min?: number }
  | { classLevel: true; times?: number }
  | { proficiency: true };

/** Dados que crescem: "1d10", ou `count` dados de `die` lados (os dois podem vir da tabela). */
export type DiceScaling = string | { count: Scaling; die: number | { column: string } };

// ---------- efeitos ----------

/** Quais ataques um efeito alcança. Sem filtro = todos. */
export interface AttackFilter {
  /** O ataque usa este atributo (Fúria: Força). */
  ability?: AbilityKey;
  /** Corpo a corpo ou à distância (pela arma). */
  range?: 'melee' | 'ranged';
  /** Ataque Furtivo: arma com Acuidade ou à distância. */
  finesseOrRanged?: boolean;
  /** Só armas (não magias). */
  weapon?: boolean;
}

/** Onde vale uma vantagem (ex.: "save:dex", "check:str", "attack:str", "initiative"). */
export type AdvantageTarget =
  | `save:${AbilityKey}`
  | `check:${AbilityKey}`
  | `attack:${AbilityKey}`
  | 'attack'
  | 'spell-attack'
  | 'initiative'
  | 'concentration';

export type Effect =
  | { type: 'attack-bonus'; value: Scaling; filter?: AttackFilter }
  | { type: 'damage-bonus'; value: Scaling; filter?: AttackFilter }
  /** Dados extras de dano (Ataque Furtivo, Frenesi, Marca do Predador). */
  | {
      type: 'extra-damage';
      dice: DiceScaling;
      filter?: AttackFilter;
      oncePerTurn?: boolean;
      /** Sem tipo = o mesmo da arma. */
      damageType?: DamageType;
    }
  /** Dado somado à jogada (Bênção: +1d4 em ataques e salvaguardas). */
  | { type: 'roll-bonus-dice'; dice: string; on: ('attack' | 'save')[] }
  | { type: 'advantage'; on: AdvantageTarget[] }
  /** Desvantagem (Envenenado: ataques e testes). Com Vantagem junto, as duas se anulam. */
  | { type: 'disadvantage'; on: AdvantageTarget[] }
  /** Dado tirado da jogada (Perdição: −1d4 em ataques e salvaguardas; Raio do Enfraquecimento: −1d8 no dano). */
  | { type: 'roll-penalty-dice'; dice: string; on: ('attack' | 'save' | 'damage')[] }
  /** Soma em todo Teste de D20: ataques, salvaguardas, testes e Iniciativa (Exaustão: −2 por nível). */
  | { type: 'd20-modifier'; value: number }
  /** Multiplica o Deslocamento no fim das contas (Lentidão: metade; Contido: 0). */
  | { type: 'speed-multiplier'; factor: number }
  | { type: 'resistance'; damage: DamageType[] }
  /** Soma na CA. `requiresArmor`: só vestindo armadura Leve, Média ou Pesada (Estilo Defesa). */
  | { type: 'ac-bonus'; value: Scaling; requiresArmor?: boolean }
  /** Defesa sem Armadura: CA base = 10 + Destreza + estes atributos (sem armadura). */
  | { type: 'ac-formula'; base: number; abilities: AbilityKey[]; shield: boolean }
  /** CA mínima (Pele-Casca: 17). */
  | { type: 'ac-minimum'; value: number }
  | { type: 'save-bonus'; value: Scaling; on?: AbilityKey[] }
  | { type: 'speed-bonus'; ft: Scaling }
  /** Crítico com 19–20 (Campeão) ou 18–20. */
  | { type: 'crit-range'; min: number }
  /** PV máximo a mais (Resistência Dracônica: +1 por nível). */
  | { type: 'hp-max-bonus'; value: Scaling }
  /** CD das suas magias (Feitiçaria Inata: +1). */
  | { type: 'spell-dc-bonus'; value: Scaling }
  /** Proficiência em salvaguardas (Sobrevivente Disciplinado do Monge: todas). */
  | { type: 'save-proficiency'; on: AbilityKey[] }
  /** Pau pra Toda Obra: metade da proficiência em testes de perícia sem proficiência. */
  | { type: 'half-proficiency-checks' }
  /** Lembrete sem conta (ex.: "Ataques contra você têm Vantagem"). */
  | { type: 'note'; text: string };

/** Usos de uma característica: máximo e recarga. */
export interface ResourceDef {
  id: string;
  name: string;
  max: Scaling;
  /** `short-one`: o descanso curto devolve 1 uso; o longo, todos (Fúria). */
  recharge: 'short' | 'long' | 'short-one';
  /** A partir deste nível, o descanso curto devolve todos (Fonte de Inspiração do Bardo). */
  shortRestFrom?: number;
  /** Recurso medido em pontos (Cura pelas Mãos, Pontos de Foco): gasta-se mais de 1 por vez. */
  pool?: boolean;
  /** Dado do recurso (Inspiração de Bardo: d6 → d12). */
  die?: Scaling;
}

/** Uma habilidade que o jogador liga ou usa na ficha. */
export interface ActivationDef {
  id: string;
  name: string;
  /** Liga/desliga (Fúria) ou uso único (Retomar o Fôlego). */
  mode: 'toggle' | 'use';
  /** Gasta usos de um recurso ao ligar/usar. */
  cost?: { resource: string; amount: number };
  /** Só pode ligar com estas habilidades ativas (Frenesi: Fúria + Ataque Imprudente). */
  requires?: string[];
  effects: Effect[];
  /** Uso que cura (Retomar o Fôlego: 1d10 + nível de Guerreiro). */
  heal?: { dice: DiceScaling; plus?: Scaling };
  /** PV temporários ao ativar (Forma Selvagem: o nível de Druida; Incansável: 1d8 + Sabedoria). */
  tempHp?: { dice?: DiceScaling; plus?: Scaling };
}

// ---------- escolhas ao ganhar a característica ----------

export type ChoiceDef =
  | { kind: 'subclass' }
  /** Aumento no Valor de Atributo (+2, ou +1/+1) ou um talento. */
  | { kind: 'asi' }
  | { kind: 'epic-boon' }
  | { kind: 'expertise'; count: number; from?: SkillKey[] }
  | { kind: 'skill'; count: number; from: SkillKey[] }
  | { kind: 'fighting-style'; alternatives?: { id: string; name: string; text: string }[] }
  | { kind: 'option'; label: string; options: { id: string; name: string; text: string }[] }
  | { kind: 'metamagic'; count: number }
  /** Invocações Místicas: a quantidade nova vem da coluna "invocations". */
  | { kind: 'invocations' }
  /** Arcano Místico do Bruxo: uma magia do círculo indicado. */
  | { kind: 'arcanum'; circle: number }
  | { kind: 'languages'; count: number }
  /** Magias específicas escolhidas da lista da classe ou do grimório (Maestria de Magias). */
  | {
      kind: 'chosen-spells';
      label: string;
      picks: { circle: number; count: number; maxCircle?: boolean; school?: string }[];
      from: 'spellbook' | 'class';
      /** Vão para o grimório (Versado em Evocação) em vez de ficarem sempre preparadas. */
      toSpellbook?: boolean;
    }
  /** Magias de outras listas, sempre preparadas (Descobertas Mágicas do Colégio do Conhecimento). */
  | { kind: 'extra-spells'; count: number; lists: string[]; cantripsAllowed?: boolean };

// ---------- características e classes ----------

export interface FeatureDef {
  /** Id estável (ex.: "rage", "brutal-strike-17"). */
  id: string;
  level: number;
  name: string;
  text: string;
  choice?: ChoiceDef;
  resource?: ResourceDef;
  activation?: ActivationDef[];
  passive?: Effect[];
  /** Efeitos da opção escolhida em `choice` do tipo "option" (ex.: Golpe Divino). */
  optionEffects?: Record<string, Effect[]>;
  /** Efeitos que valem sozinhos quando todas estas habilidades estão ativas (Frenesi). */
  conditional?: { when: string[]; effects: Effect[] }[];
  /** Magias sempre preparadas que a característica dá (e conjurações grátis por descanso longo). */
  grantedSpells?: { ids: string[]; freePerLongRest?: number };
  /** Aumento automático de atributos (Campeão Primitivo: For e Con +4, máximo 25). */
  abilityIncrease?: { abilities: Partial<Record<AbilityKey, number>>; max: number };
}

export interface SubclassDef {
  id: string;
  name: string;
  /** Uma frase sobre a subclasse. */
  tagline: string;
  features: FeatureDef[];
  /** Magias sempre preparadas da subclasse por nível de classe (Domínio da Vida…). */
  spells?: Record<number, string[]>;
  /** Magias que dependem de uma opção da subclasse (tipo de terreno do Círculo da Terra). */
  optionSpells?: Record<string, Record<number, string[]>>;
}

export interface SpellcastingDef {
  ability: AbilityKey;
  /** Tabela de espaços: conjurador pleno, meio-conjurador ou Magia de Pacto (Bruxo). */
  kind: 'full' | 'half' | 'pact';
  /** Truques conhecidos por nível (índice 0 = nível 1); sem a coluna = não tem truques. */
  cantrips?: readonly number[];
  /** Magias preparadas por nível. */
  prepared: readonly number[];
  /** Quando dá para trocar as preparadas: em todo descanso longo ou uma ao subir de nível. */
  swap: 'long-rest' | 'level-up' | 'long-rest-one';
  /** Grimório do Mago: magias no nível 1 e a cada nível. */
  spellbook?: { initial: number; perLevel: number };
}

export interface ClassProgression {
  classId: ClassId;
  /** Colunas da tabela da classe por nível (índice 0 = nível 1). */
  columns: Record<string, readonly (number | string)[]>;
  /** Nome de cada coluna, como no livro. */
  columnNames: Record<string, string>;
  spellcasting?: SpellcastingDef;
  features: FeatureDef[];
  /** Níveis de "Característica de Subclasse" (para subclasses do livro, fora do SRD). */
  subclassLevels: readonly number[];
  subclasses: SubclassDef[];
}
