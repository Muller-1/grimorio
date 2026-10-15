import {
  asiFeatures,
  byLevel,
  epicBoon,
  extraAttack,
  HALF_PREPARED,
  subclassFeature,
} from './common';
import type { ClassProgression } from './types';

export const RANGER: ClassProgression = {
  classId: 'ranger',
  columns: {
    favoredEnemy: byLevel([
      [1, 2],
      [5, 3],
      [9, 4],
      [13, 5],
      [17, 6],
    ]),
  },
  columnNames: { favoredEnemy: 'Inimigo Favorito' },
  spellcasting: { ability: 'wis', kind: 'half', prepared: HALF_PREPARED, swap: 'long-rest-one' },
  subclassLevels: [3, 7, 11, 15],
  features: [
    {
      id: 'spellcasting',
      level: 1,
      name: 'Conjuração',
      text: 'Conjura magias de Guardião com Sabedoria (meio-conjurador). A cada Descanso Longo, pode trocar uma magia preparada. Foco: foco druídico.',
    },
    {
      id: 'favored-enemy',
      level: 1,
      name: 'Inimigo Favorito',
      text: 'Sempre tem Marca do Predador preparada e pode conjurá-la sem espaço 2 vezes por Descanso Longo (3 no nível 5, 4 no 9, 5 no 13, 6 no 17).',
      grantedSpells: { ids: ['hunters-mark'] },
      resource: {
        id: 'favored-enemy',
        name: 'Marca do Predador sem espaço',
        max: { column: 'favoredEnemy' },
        recharge: 'long',
      },
    },
    {
      id: 'weapon-mastery',
      level: 1,
      name: 'Maestria em Arma',
      text: 'Use as propriedades de maestria de dois tipos de arma em que você tem proficiência. Pode trocá-los a cada Descanso Longo.',
    },
    {
      id: 'deft-explorer',
      level: 2,
      name: 'Explorador Hábil',
      text: 'Especialização numa perícia em que você tem proficiência e dois idiomas à sua escolha.',
      choice: { kind: 'expertise', count: 1 },
    },
    {
      id: 'deft-explorer-languages',
      level: 2,
      name: 'Explorador Hábil: idiomas',
      text: 'Você aprende dois idiomas à sua escolha.',
      choice: { kind: 'languages', count: 2 },
    },
    {
      id: 'fighting-style',
      level: 2,
      name: 'Estilo de Luta',
      text: 'Um talento de Estilo de Luta, ou Guerreiro Druídico: dois truques de Druida, que contam como magias de Guardião (Sabedoria); a cada nível, pode trocar um.',
      choice: {
        kind: 'fighting-style',
        alternatives: [
          {
            id: 'druidic-warrior',
            name: 'Guerreiro Druídico',
            text: 'Dois truques de Druida (Orientação e Fagulha Estelar são os recomendados), conjurados com Sabedoria.',
          },
        ],
      },
    },
    subclassFeature(3, 'Guardião'),
    ...asiFeatures([4, 8, 12, 16]),
    extraAttack(5),
    {
      id: 'roving',
      level: 6,
      name: 'Errante',
      text: 'Sem armadura Pesada, seu Deslocamento aumenta em 3 m, e você ganha Deslocamento de Escalada e de Natação iguais ao seu Deslocamento.',
      passive: [{ type: 'speed-bonus', ft: 10 }],
    },
    {
      id: 'expertise-9',
      level: 9,
      name: 'Especialista',
      text: 'Especialização em duas perícias em que você tem proficiência.',
      choice: { kind: 'expertise', count: 2 },
    },
    {
      id: 'tireless',
      level: 10,
      name: 'Incansável',
      text: 'Ação Usar Magia: ganhe 1d8 + Sabedoria (mínimo 1) em PV temporários; usos iguais à Sabedoria (mínimo 1) por Descanso Longo. Cada Descanso Curto reduz sua Exaustão em 1.',
      resource: {
        id: 'tireless',
        name: 'Incansável',
        max: { ability: 'wis', min: 1 },
        recharge: 'long',
      },
      activation: [
        {
          id: 'tireless',
          name: 'Incansável',
          mode: 'use',
          cost: { resource: 'tireless', amount: 1 },
          effects: [],
          tempHp: { dice: '1d8', plus: { ability: 'wis', min: 1 } },
        },
      ],
    },
    {
      id: 'relentless-hunter',
      level: 13,
      name: 'Predador Implacável',
      text: 'Sofrer dano não quebra sua Concentração em Marca do Predador.',
    },
    {
      id: 'natures-veil',
      level: 14,
      name: 'Véu da Natureza',
      text: 'Ação Bônus: fique Invisível até o fim do seu próximo turno. Usos iguais à Sabedoria (mínimo 1) por Descanso Longo.',
      resource: {
        id: 'natures-veil',
        name: 'Véu da Natureza',
        max: { ability: 'wis', min: 1 },
        recharge: 'long',
      },
    },
    {
      id: 'precise-hunter',
      level: 17,
      name: 'Caçador Preciso',
      text: 'Vantagem nos ataques contra a criatura marcada pela sua Marca do Predador.',
    },
    {
      id: 'feral-senses',
      level: 18,
      name: 'Sentidos Selvagens',
      text: 'Percepção às Cegas de 9 m.',
    },
    epicBoon('Dádiva da Viagem Dimensional'),
    {
      id: 'foe-slayer',
      level: 20,
      name: 'Matador de Inimigos Favoritos',
      text: 'O dado de dano da sua Marca do Predador passa a ser d10 em vez de d6.',
    },
  ],
  subclasses: [
    {
      id: 'hunter',
      name: 'Caçador',
      tagline: 'Persegue presas perigosas para proteger a natureza e as pessoas.',
      features: [
        {
          id: 'hunters-lore',
          level: 3,
          name: 'Saber do Caçador',
          text: 'Enquanto uma criatura está marcada pela sua Marca do Predador, você sabe se ela tem Imunidades, Resistências ou Vulnerabilidades, e quais são.',
        },
        {
          id: 'hunters-prey',
          level: 3,
          name: 'Presa do Caçador',
          text: 'Escolha (pode trocar a cada Descanso Curto ou Longo): Matador de Colossos (uma vez por turno, ao acertar com arma uma criatura que não está com PV cheios, +1d8 de dano) ou Destruidor de Hordas (uma vez por turno, um ataque a mais com a mesma arma contra outra criatura a até 1,5 m do alvo original).',
          choice: {
            kind: 'option',
            label: 'Presa do Caçador',
            options: [
              {
                id: 'colossus-slayer',
                name: 'Matador de Colossos',
                text: '+1d8 uma vez por turno contra criatura sem PV cheios.',
              },
              {
                id: 'horde-breaker',
                name: 'Destruidor de Hordas',
                text: 'Um ataque a mais contra outra criatura a até 1,5 m do alvo.',
              },
            ],
          },
          optionEffects: {
            'colossus-slayer': [
              { type: 'extra-damage', dice: '1d8', filter: { weapon: true }, oncePerTurn: true },
            ],
          },
        },
        {
          id: 'defensive-tactics',
          level: 7,
          name: 'Táticas Defensivas',
          text: 'Escolha (pode trocar a cada descanso): Escapar da Horda (Ataques de Oportunidade contra você têm Desvantagem) ou Defesa contra Ataques Múltiplos (quem acerta você tem Desvantagem nos outros ataques contra você neste turno).',
          choice: {
            kind: 'option',
            label: 'Táticas Defensivas',
            options: [
              {
                id: 'escape-the-horde',
                name: 'Escapar da Horda',
                text: 'Ataques de Oportunidade contra você têm Desvantagem.',
              },
              {
                id: 'multiattack-defense',
                name: 'Defesa contra Ataques Múltiplos',
                text: 'Quem acerta você tem Desvantagem nos outros ataques contra você no turno.',
              },
            ],
          },
        },
        {
          id: 'superior-hunters-prey',
          level: 11,
          name: 'Presa do Caçador Superior',
          text: 'Uma vez por turno, ao causar dano a uma criatura marcada, cause também o dano extra da Marca do Predador a outra criatura que você vê a até 9 m dela.',
        },
        {
          id: 'superior-hunters-defense',
          level: 15,
          name: 'Defesa do Caçador',
          text: 'Reação ao sofrer dano: Resistência a esse dano e a outros do mesmo tipo até o fim do turno.',
        },
      ],
    },
  ],
};
