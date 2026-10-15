import type { AbilityKey } from '@grimorio/shared';

/**
 * Talentos que a subida de nível oferece (SRD 5.2): os Gerais, os de Estilo de Luta (no
 * conteúdo da criação) e as Dádivas Épicas. Os outros talentos do livro entram como
 * "Outro talento (do livro)", escrito pelo jogador.
 */
export interface LevelFeatDef {
  id: string;
  name: string;
  text: string;
  category: 'general' | 'epic-boon';
  minLevel: number;
  /** +1 num destes atributos (o jogador escolhe), até o máximo indicado. */
  abilityIncrease?: { from: AbilityKey[]; max: number };
  /** Pré-requisito de atributo (algum destes com 13 ou mais). */
  requiresAbility?: AbilityKey[];
  /** Só para quem conjura magias. */
  requiresSpellcasting?: boolean;
}

const ALL: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export const LEVEL_FEATS: LevelFeatDef[] = [
  {
    id: 'grappler',
    name: 'Imobilizador',
    category: 'general',
    minLevel: 4,
    requiresAbility: ['str', 'dex'],
    abilityIncrease: { from: ['str', 'dex'], max: 20 },
    text: '+1 em Força ou Destreza (máximo 20). Uma vez por turno, ao acertar um Ataque Desarmado na ação Atacar, use o Dano e o Agarrar juntos. Vantagem nos ataques contra criaturas que você está agarrando, e não gasta movimento extra para arrastar quem é do seu tamanho ou menor.',
  },
  {
    id: 'boon-of-combat-prowess',
    name: 'Dádiva da Proeza em Combate',
    category: 'epic-boon',
    minLevel: 19,
    abilityIncrease: { from: ALL, max: 30 },
    text: '+1 num atributo (máximo 30). Ao errar uma jogada de ataque, você pode acertar em vez disso (uma vez até o início do seu próximo turno).',
  },
  {
    id: 'boon-of-dimensional-travel',
    name: 'Dádiva da Viagem Dimensional',
    category: 'epic-boon',
    minLevel: 19,
    abilityIncrease: { from: ALL, max: 30 },
    text: '+1 num atributo (máximo 30). Logo depois de usar a ação Atacar ou Usar Magia, teleporte-se até 9 m para um espaço desocupado que você vê.',
  },
  {
    id: 'boon-of-fate',
    name: 'Dádiva do Destino',
    category: 'epic-boon',
    minLevel: 19,
    abilityIncrease: { from: ALL, max: 30 },
    text: '+1 num atributo (máximo 30). Quando você ou uma criatura a até 18 m passa ou falha num Teste de D20, role 2d4 e aplique como bônus ou penalidade. Volta quando rolar Iniciativa ou num Descanso Curto ou Longo.',
  },
  {
    id: 'boon-of-irresistible-offense',
    name: 'Dádiva do Ataque Irresistível',
    category: 'epic-boon',
    minLevel: 19,
    abilityIncrease: { from: ['str', 'dex'], max: 30 },
    text: '+1 em Força ou Destreza (máximo 30). Seu dano Contundente, Cortante e Perfurante ignora Resistência. Com 20 no d20 de ataque, cause dano extra igual ao valor do atributo que aumentou.',
  },
  {
    id: 'boon-of-spell-recall',
    name: 'Dádiva da Recordação de Magia',
    category: 'epic-boon',
    minLevel: 19,
    requiresSpellcasting: true,
    abilityIncrease: { from: ['int', 'wis', 'cha'], max: 30 },
    text: '+1 em Inteligência, Sabedoria ou Carisma (máximo 30). Ao conjurar com espaço de 1º a 4º círculo, role 1d4: se der o círculo do espaço, ele não é gasto.',
  },
  {
    id: 'boon-of-the-night-spirit',
    name: 'Dádiva do Espírito da Noite',
    category: 'epic-boon',
    minLevel: 19,
    abilityIncrease: { from: ALL, max: 30 },
    text: '+1 num atributo (máximo 30). Em Penumbra ou Escuridão: fique Invisível com uma Ação Bônus (termina ao fazer uma ação, Ação Bônus ou Reação) e tenha Resistência a todo dano menos Psíquico e Radiante.',
  },
  {
    id: 'boon-of-truesight',
    name: 'Dádiva da Visão Verdadeira',
    category: 'epic-boon',
    minLevel: 19,
    abilityIncrease: { from: ALL, max: 30 },
    text: '+1 num atributo (máximo 30). Visão Verdadeira de 18 m.',
  },
];
