import type { SubclassDef } from '../types';

/** Subclasses do Livro do Jogador 2024 que o SRD não traz (texto nosso). */

// d4 do Golpes Terríveis do Andarilho Feérico: vira d6 no nível 11 de Guardião.
const DREADFUL_DIE = [0, 0, 4, 4, 4, 4, 4, 4, 4, 4, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6];
// Dano psíquico do Golpe Terrível do Vigilante das Sombras: 2d6, e 2d8 no nível 11.
const GLOOM_DIE = [0, 0, 6, 6, 6, 6, 6, 6, 6, 6, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8];

export const BOOK_SUBCLASSES: SubclassDef[] = [
  {
    id: 'fey-wanderer',
    source: 'book',
    name: 'Andarilho Feérico',
    tagline: 'Magia feérica que une charme, fúria psíquica e passos pelo véu de Faéria.',
    columns: { dreadfulDie: DREADFUL_DIE },
    spells: {
      3: ['charm-person'],
      5: ['misty-step'],
      9: ['summon-fey'],
      13: ['dimension-door'],
      17: ['mislead'],
    },
    features: [
      {
        id: 'fey-wanderer-otherworldly-glamour',
        level: 3,
        name: 'Glamour Transcendental',
        text: 'Em testes de Carisma, soma seu modificador de Sabedoria (mínimo +1). Ganha proficiência em Atuação, Enganação ou Persuasão, à sua escolha.',
        choice: {
          kind: 'skill',
          count: 1,
          from: ['performance', 'deception', 'persuasion'],
        },
        passive: [
          { type: 'note', text: 'Testes de Carisma: some o modificador de Sabedoria (mínimo +1).' },
        ],
      },
      {
        id: 'fey-wanderer-dreadful-strikes',
        level: 3,
        name: 'Golpes Terríveis',
        text: 'Uma vez por turno, ao atingir uma criatura com uma arma, causa 1d4 de dano Psíquico adicional. Passa a 1d6 no nível 11 de Guardião.',
        passive: [
          {
            type: 'extra-damage',
            dice: { count: 1, die: { column: 'dreadfulDie' } },
            filter: { weapon: true },
            oncePerTurn: true,
            damageType: 'psychic',
          },
        ],
      },
      {
        id: 'fey-wanderer-spells',
        level: 3,
        name: 'Magias do Andarilho Feérico',
        text: 'Sempre tem preparadas: Enfeitiçar Pessoa (3), Passo Nebuloso (5), Convocar Feérico (9), Porta Dimensional (13) e Despistar (17). Também ganha uma Dádiva de Faéria cosmética, escolhida ou sorteada em 1d6.',
      },
      {
        id: 'fey-wanderer-beguiling-twist',
        level: 7,
        name: 'Detalhe Sedutor',
        text: 'Vantagem em salvaguardas contra Amedrontado e Enfeitiçado. Quando você ou uma criatura que veja a até 36 m passa numa salvaguarda contra uma dessas condições, use sua Reação: outra criatura à vista a até 36 m faz salvaguarda de Sabedoria ou fica Amedrontada ou Enfeitiçada (sua escolha) por 1 minuto, repetindo a salvaguarda no fim de cada turno dela.',
        passive: [
          {
            type: 'note',
            text: 'Vantagem em salvaguardas contra Amedrontado e Enfeitiçado.',
            situational: true,
          },
        ],
      },
      {
        id: 'fey-wanderer-fey-reinforcements',
        level: 11,
        name: 'Reforços Feéricos',
        text: 'Conjura Convocar Feérico sem componente Material e, uma vez por Descanso Longo, sem espaço de magia. Ao conjurá-la, pode abrir mão da Concentração: a duração passa a 1 minuto.',
        resource: {
          id: 'fey-wanderer-reinforcements',
          name: 'Reforços Feéricos (Convocar Feérico)',
          max: 1,
          recharge: 'long',
        },
      },
      {
        id: 'fey-wanderer-misty-wanderer',
        level: 15,
        name: 'Andarilho Nebuloso',
        text: 'Conjura Passo Nebuloso sem espaço de magia, um número de vezes igual ao modificador de Sabedoria (mínimo 1) por Descanso Longo. Ao conjurá-la, leva junto uma criatura voluntária a até 1,5 m, que surge a até 1,5 m do seu destino.',
        resource: {
          id: 'fey-wanderer-misty-step',
          name: 'Andarilho Nebuloso (Passo Nebuloso)',
          max: { ability: 'wis', min: 1 },
          recharge: 'long',
        },
      },
    ],
  },
  {
    id: 'beast-master',
    source: 'book',
    name: 'Senhor das Feras',
    tagline: 'Vínculo místico com uma fera primal que luta ao seu lado.',
    features: [
      {
        id: 'beast-master-primal-companion',
        level: 3,
        name: 'Companheiro Primal',
        text: 'Invoca uma fera primal Amigável (Terra, Céu ou Mar) que obedece a você e some se você morrer. Em combate age no seu turno, só Esquiva sozinha, a menos que você use uma Ação Bônus para comandá-la ou sacrifique um ataque para o Golpe da Fera. PV: 4 ou 5 + 5 por nível de Guardião; CA 13 + Sabedoria; soma seu Bônus de Proficiência em testes e salvaguardas; ataque usa seu modificador de ataque mágico. Se morreu na última hora, uma ação Usar Magia e um espaço de magia a ressuscitam após 1 minuto. Após Descanso Longo, pode invocar outra.',
        choice: {
          kind: 'option',
          label: 'Fera Primal',
          options: [
            {
              id: 'beast-of-the-land',
              name: 'Fera da Terra',
              text: 'Média; Deslocamento 12 m e Escalada 12 m; Golpe 1d8+2+Sabedoria (Contundente, Cortante ou Perfurante); com 6 m de investida, +1d6 e Caído (Grande ou menor).',
            },
            {
              id: 'beast-of-the-sky',
              name: 'Fera do Céu',
              text: 'Pequena; Deslocamento 3 m e Voo 18 m; Golpe 1d4+3+Sabedoria (Cortante); Sobrevoo evita Ataques de Oportunidade ao voar para longe.',
            },
            {
              id: 'beast-of-the-sea',
              name: 'Fera do Mar',
              text: 'Média; Deslocamento 1,5 m e Natação 18 m; Golpe 1d6+2+Sabedoria (Contundente ou Perfurante); alvo Imobilizado (CD da sua magia); Anfíbia.',
            },
          ],
        },
      },
      {
        id: 'beast-master-exceptional-training',
        level: 7,
        name: 'Treinamento Excepcional',
        text: 'Ao comandar a fera com Ação Bônus, ela também usa a própria Ação Bônus para Ajudar, Correr, Desengajar ou Esquivar. Quando ela causa dano com um ataque, pode escolher dano Energético ou o tipo normal.',
      },
      {
        id: 'beast-master-bestial-fury',
        level: 11,
        name: 'Fúria Bestial',
        text: 'Ao ordenar o Golpe da Fera, ela o usa duas vezes. Na primeira vez por turno que atinge uma criatura sob Marca do Predador, causa dano Energético adicional igual ao dano extra dessa magia.',
      },
      {
        id: 'beast-master-share-spells',
        level: 15,
        name: 'Compartilhar Magias',
        text: 'Ao conjurar uma magia em si mesmo, também pode afetar a fera se ela estiver a até 9 m de você.',
      },
    ],
  },
  {
    id: 'gloom-stalker',
    source: 'book',
    name: 'Vigilante das Sombras',
    tagline: 'Caça nas trevas com magia do Sombral, emboscadas e medo.',
    columns: { gloomDie: GLOOM_DIE },
    spells: {
      3: ['disguise-self'],
      5: ['rope-trick'],
      9: ['fear'],
      13: ['greater-invisibility'],
      17: ['seeming'],
    },
    features: [
      {
        id: 'gloom-stalker-umbral-ambusher',
        level: 3,
        name: 'Emboscador das Sombras',
        text: 'Soma o modificador de Sabedoria na Iniciativa. No início do seu primeiro turno de cada combate, ganha +3 m de Deslocamento até o fim dele.',
        passive: [
          { type: 'note', text: 'Iniciativa: some o modificador de Sabedoria.' },
          {
            type: 'note',
            text: 'Primeiro turno do combate: +3 m de Deslocamento.',
            situational: true,
          },
        ],
      },
      {
        id: 'gloom-stalker-dreadful-strike',
        level: 3,
        name: 'Golpe Terrível',
        text: 'Uma vez por turno, ao atingir uma criatura com uma arma, causa 2d6 de dano Psíquico adicional (2d8 no nível 11). Usos: modificador de Sabedoria (mínimo 1) por Descanso Longo.',
        resource: {
          id: 'gloom-stalker-dreadful-strike',
          name: 'Golpe Terrível',
          max: { ability: 'wis', min: 1 },
          recharge: 'long',
        },
        activation: [
          {
            id: 'gloom-stalker-dreadful-strike',
            name: 'Golpe Terrível',
            mode: 'toggle',
            cost: { resource: 'gloom-stalker-dreadful-strike', amount: 1 },
            effects: [
              {
                type: 'extra-damage',
                dice: { count: 2, die: { column: 'gloomDie' } },
                filter: { weapon: true },
                oncePerTurn: true,
                damageType: 'psychic',
              },
            ],
          },
        ],
      },
      {
        id: 'gloom-stalker-spells',
        level: 3,
        name: 'Magias do Vigilante das Sombras',
        text: 'Sempre tem preparadas: Disfarçar-se (3), Corda Extradimensional (5), Medo (9), Invisibilidade Maior (13) e Similaridade (17).',
      },
      {
        id: 'gloom-stalker-umbral-sight',
        level: 3,
        name: 'Visão Umbrosa',
        text: 'Ganha Visão no Escuro de 18 m (ou +18 m se já tem). Totalmente na Escuridão, você fica Invisível para criaturas que dependem de Visão no Escuro para vê-lo.',
      },
      {
        id: 'gloom-stalker-iron-mind',
        level: 7,
        name: 'Mente de Ferro',
        text: 'Ganha proficiência em salvaguardas de Sabedoria. Se já tiver, escolhe Carisma ou Inteligência.',
        passive: [{ type: 'save-proficiency', on: ['wis'] }],
      },
      {
        id: 'gloom-stalker-stalkers-flurry',
        level: 11,
        name: 'Torrente do Vigilante',
        text: 'O Golpe Terrível passa a 2d8. Ao usá-lo, escolha um extra: Golpe Repentino (outro ataque com a mesma arma contra criatura a até 1,5 m do alvo, no alcance) ou Medo em Massa (alvo e criaturas a até 3 m: salvaguarda de Sabedoria ou Amedrontado até o início do seu próximo turno).',
      },
      {
        id: 'gloom-stalker-shadowy-dodge',
        level: 15,
        name: 'Esquiva Sombria',
        text: 'Quando uma criatura faz um ataque contra você, use sua Reação para impor Desvantagem. Acertando ou errando, você pode se teleportar até 9 m para um espaço desocupado à sua vista.',
      },
    ],
  },
];
