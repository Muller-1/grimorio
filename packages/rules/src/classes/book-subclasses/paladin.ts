import type { SubclassDef } from '../types';

/** Subclasses do Livro do Jogador 2024 que o SRD não traz (texto nosso). */
export const BOOK_SUBCLASSES: SubclassDef[] = [
  {
    id: 'glory',
    source: 'book',
    name: 'Juramento da Glória',
    tagline: 'Herói treinado que inspira aliados e busca a fama por atos grandiosos.',
    spells: {
      3: ['heroism', 'guiding-bolt'],
      5: ['enhance-ability', 'magic-weapon'],
      9: ['haste', 'protection-from-energy'],
      13: ['compulsion', 'freedom-of-movement'],
      17: ['legend-lore', 'yolandes-regal-presence'],
    },
    features: [
      {
        id: 'oath-of-glory-spells',
        level: 3,
        name: 'Magias do Juramento da Glória',
        text: 'Sempre preparadas: Heroísmo e Raio Guia (nível 3); Aprimorar Atributo e Arma Mágica (5); Celeridade e Proteção contra Energia (9); Compulsão e Movimentação Livre (13); Lendas e Histórias e Presença Régia de Yolande (17).',
      },
      {
        id: 'peerless-athlete',
        level: 3,
        name: 'Atleta Inigualável',
        text: 'Como Ação Bônus, gaste um Canalizar Divindade: por 1 hora você tem Vantagem em Atletismo e Acrobacia, e seus Saltos Longos e em Altura ganham 3 m (a distância extra gasta movimento).',
        activation: [
          {
            id: 'peerless-athlete',
            name: 'Atleta Inigualável',
            mode: 'use',
            cost: { resource: 'channel-divinity', amount: 1 },
            effects: [],
          },
        ],
      },
      {
        id: 'inspiring-smite',
        level: 3,
        name: 'Destruição Inspiradora',
        text: 'Logo após conjurar Destruição Divina, gaste um Canalizar Divindade: distribua 2d8 + nível de Paladino PV Temporários, como quiser, entre criaturas à sua escolha a até 9 m (você incluído).',
        activation: [
          {
            id: 'inspiring-smite',
            name: 'Destruição Inspiradora',
            mode: 'use',
            cost: { resource: 'channel-divinity', amount: 1 },
            effects: [],
            tempHp: { dice: '2d8', plus: { classLevel: true } },
          },
        ],
      },
      {
        id: 'aura-of-alacrity',
        level: 7,
        name: 'Aura de Vivacidade',
        text: 'Seu Deslocamento aumenta em 3 m. Aliado que entra na sua Aura de Proteção pela primeira vez no turno, ou começa o turno nela, ganha +3 m de Deslocamento até o fim do próximo turno dele.',
        passive: [{ type: 'speed-bonus', ft: 10 }],
      },
      {
        id: 'glorious-defense',
        level: 15,
        name: 'Defesa Gloriosa',
        text: 'Reação: quando você ou uma criatura a até 3 m e à sua vista é atingida por um ataque, some seu modificador de Carisma (mínimo +1) à CA do alvo, podendo fazer o ataque errar. Se errar, você pode atacar o agressor com uma arma, se ao alcance. Usos: Carisma (mínimo 1) por Descanso Longo.',
        resource: {
          id: 'glorious-defense',
          name: 'Defesa Gloriosa',
          max: { ability: 'cha', min: 1 },
          recharge: 'long',
        },
      },
      {
        id: 'living-legend',
        level: 20,
        name: 'Lenda Viva',
        text: 'Ação Bônus, por 10 minutos: Vantagem em todos os testes de Carisma; uma vez por turno, transforme um erro de ataque com arma em acerto; e, com a Reação, jogue de novo uma salvaguarda falha (vale o novo resultado). Uma vez por Descanso Longo, ou gaste um espaço de 5º círculo.',
        resource: { id: 'living-legend', name: 'Lenda Viva', max: 1, recharge: 'long' },
        activation: [
          {
            id: 'living-legend',
            name: 'Lenda Viva',
            mode: 'toggle',
            cost: { resource: 'living-legend', amount: 1 },
            effects: [
              { type: 'advantage', on: ['check:cha'] },
              {
                type: 'note',
                text: 'Golpe Infalível: uma vez por turno, um erro de ataque com arma vira acerto. Reação para jogar de novo uma salvaguarda falha.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'vengeance',
    source: 'book',
    name: 'Juramento da Vingança',
    tagline: 'Caçador implacável que pune os malfeitores e não deixa o inimigo fugir.',
    spells: {
      3: ['hunters-mark', 'bane'],
      5: ['hold-person', 'misty-step'],
      9: ['haste', 'protection-from-energy'],
      13: ['banishment', 'dimension-door'],
      17: ['hold-monster', 'scrying'],
    },
    features: [
      {
        id: 'oath-of-vengeance-spells',
        level: 3,
        name: 'Magias do Juramento da Vingança',
        text: 'Sempre preparadas: Marca do Predador e Perdição (nível 3); Paralisar Pessoa e Passo Nebuloso (5); Celeridade e Proteção contra Energia (9); Banimento e Porta Dimensional (13); Paralisar Monstro e Vidência (17).',
      },
      {
        id: 'vow-of-enmity',
        level: 3,
        name: 'Voto de Inimizade',
        text: 'Ao usar a ação Atacar, gaste um Canalizar Divindade para jurar inimizade a uma criatura à vista a até 9 m: Vantagem nos ataques contra ela por 1 minuto ou até usar de novo. Se ela cair a 0 PV, você transfere o voto para outra criatura a até 9 m.',
        activation: [
          {
            id: 'vow-of-enmity',
            name: 'Voto de Inimizade',
            mode: 'toggle',
            cost: { resource: 'channel-divinity', amount: 1 },
            effects: [{ type: 'advantage', on: ['attack'] }],
          },
        ],
      },
      {
        id: 'relentless-avenger',
        level: 7,
        name: 'Vingador Implacável',
        text: 'Ao atingir uma criatura com um Ataque de Oportunidade, reduza o Deslocamento dela a 0 até o fim do turno e mova-se até metade do seu Deslocamento na mesma Reação, sem provocar Ataques de Oportunidade.',
      },
      {
        id: 'soul-of-vengeance',
        level: 15,
        name: 'Alma Vingativa',
        text: 'Logo após uma criatura sob seu Voto de Inimizade acertar ou errar um ataque, você pode usar a Reação para atacá-la corpo a corpo, se ela estiver ao seu alcance.',
      },
      {
        id: 'avenging-angel',
        level: 20,
        name: 'Anjo Vingador',
        text: 'Ação Bônus, por 10 minutos: inimigo que começa o turno na sua Aura de Proteção faz salvaguarda de Sabedoria ou fica Amedrontado por 1 minuto (ou até sofrer dano), e ataques contra ele têm Vantagem. Você ganha Deslocamento de Voo de 18 m e pode pairar. Uma vez por Descanso Longo, ou gaste um espaço de 5º círculo.',
        resource: { id: 'avenging-angel', name: 'Anjo Vingador', max: 1, recharge: 'long' },
        activation: [
          {
            id: 'avenging-angel',
            name: 'Anjo Vingador',
            mode: 'toggle',
            cost: { resource: 'avenging-angel', amount: 1 },
            effects: [
              {
                type: 'note',
                text: 'Deslocamento de Voo 18 m; Aura Amedrontadora (Sabedoria ou Amedrontado; ataques contra o Amedrontado têm Vantagem).',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ancients',
    source: 'book',
    name: 'Juramento dos Anciões',
    tagline: 'Guardião da vida e da luz que prende inimigos com videiras e resiste à magia.',
    spells: {
      3: ['speak-with-animals', 'ensnaring-strike'],
      5: ['misty-step', 'moonbeam'],
      9: ['plant-growth', 'protection-from-energy'],
      13: ['stoneskin', 'ice-storm'],
      17: ['commune-with-nature', 'tree-stride'],
    },
    features: [
      {
        id: 'oath-of-ancients-spells',
        level: 3,
        name: 'Magias do Juramento dos Anciões',
        text: 'Sempre preparadas: Falar com Animais e Golpe Constritor (nível 3); Passo Nebuloso e Raio Lunar (5); Crescimento de Plantas e Proteção contra Energia (9); Pele-Rocha e Tempestade Glacial (13); Comunhão com a Natureza e Passo Arbóreo (17).',
      },
      {
        id: 'natures-wrath',
        level: 3,
        name: 'A Ira da Natureza',
        text: 'Com a ação Usar Magia, gaste um Canalizar Divindade: videiras espectrais cercam criaturas à sua escolha a até 4,5 m. Cada uma faz salvaguarda de Força ou fica Contida por 1 minuto, repetindo a salvaguarda no fim de cada turno dela.',
        activation: [
          {
            id: 'natures-wrath',
            name: 'A Ira da Natureza',
            mode: 'use',
            cost: { resource: 'channel-divinity', amount: 1 },
            effects: [],
          },
        ],
      },
      {
        id: 'aura-of-warding',
        level: 7,
        name: 'Aura de Resistência',
        text: 'Você e seus aliados têm Resistência a dano Necrótico, Psíquico e Radiante enquanto estiverem na sua Aura de Proteção.',
        passive: [{ type: 'resistance', damage: ['necrotic', 'psychic', 'radiant'] }],
      },
      {
        id: 'undying-sentinel',
        level: 15,
        name: 'Sentinela Imortal',
        text: 'Ao cair a 0 PV sem morrer na hora, você fica com 1 PV e recupera 3 × seu nível de Paladino em PV. Uma vez por Descanso Longo. Você também não envelhece magicamente.',
        resource: { id: 'undying-sentinel', name: 'Sentinela Imortal', max: 1, recharge: 'long' },
      },
      {
        id: 'elder-champion',
        level: 20,
        name: 'Campeão Ancestral',
        text: 'Ação Bônus, por 1 minuto: inimigos na sua aura têm Desvantagem em salvaguardas contra suas magias e opções de Canalizar Divindade; magias de 1 ação podem ser conjuradas com Ação Bônus; no início de cada turno você recupera 10 PV. Uma vez por Descanso Longo, ou gaste um espaço de 5º círculo.',
        resource: { id: 'elder-champion', name: 'Campeão Ancestral', max: 1, recharge: 'long' },
        activation: [
          {
            id: 'elder-champion',
            name: 'Campeão Ancestral',
            mode: 'toggle',
            cost: { resource: 'elder-champion', amount: 1 },
            effects: [
              {
                type: 'note',
                text: 'Inimigos na aura com Desvantagem nas salvaguardas contra suas magias e Canalizar Divindade; magias de 1 ação como Ação Bônus; recupera 10 PV no início de cada turno.',
              },
            ],
          },
        ],
      },
    ],
  },
];
