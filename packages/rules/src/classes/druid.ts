import { asiFeatures, byLevel, epicBoon, FULL_PREPARED, subclassFeature } from './common';
import type { ClassProgression } from './types';

export const DRUID: ClassProgression = {
  classId: 'druid',
  columns: {
    wildShape: byLevel([
      [1, 0],
      [2, 2],
      [6, 3],
      [17, 4],
    ]),
    primalStrikeDice: byLevel([
      [1, 1],
      [15, 2],
    ]),
    landsAidDice: byLevel([
      [1, 2],
      [10, 3],
      [14, 4],
    ]),
  },
  columnNames: {
    wildShape: 'Forma Selvagem',
    primalStrikeDice: 'Dados do Golpe Primal',
    landsAidDice: 'Dados do Auxílio da Terra',
  },
  spellcasting: {
    ability: 'wis',
    kind: 'full',
    cantrips: byLevel([
      [1, 2],
      [4, 3],
      [10, 4],
    ]),
    prepared: FULL_PREPARED,
    swap: 'long-rest',
  },
  subclassLevels: [3, 6, 10, 14],
  features: [
    {
      id: 'spellcasting',
      level: 1,
      name: 'Conjuração',
      text: 'Conjura magias de Druida com Sabedoria. A cada Descanso Longo, pode trocar toda a lista de magias preparadas; a cada nível, pode trocar um truque. Foco: foco druídico.',
    },
    {
      id: 'druidic',
      level: 1,
      name: 'Idioma Druídico',
      text: 'Você conhece o Druídico e sempre tem Falar com Animais preparada.',
      grantedSpells: { ids: ['speak-with-animals'] },
    },
    {
      id: 'primal-order',
      level: 1,
      name: 'Ordem Primal',
      text: 'Mago (um truque a mais e bônus igual à Sabedoria, mínimo +1, em Arcanismo e Natureza) ou Guardião (armas Marciais e armadura Média). Escolhida na criação.',
    },
    {
      id: 'wild-shape',
      level: 2,
      name: 'Forma Selvagem',
      text: 'Ação Bônus: assume a forma de uma Fera que você conhece (4 formas de ND até 1/4 sem voo; 6 até ND 1/2 no nível 4; 8 até ND 1 com voo no nível 8). Dura metade do seu nível de Druida em horas. Ganha PV temporários iguais ao seu nível de Druida; mantém PV, Int, Sab, Car, características e proficiências; não conjura magias. Descanso Curto devolve 1 uso; Longo, todos.',
      resource: {
        id: 'wild-shape',
        name: 'Forma Selvagem',
        max: { column: 'wildShape' },
        recharge: 'short-one',
      },
      activation: [
        {
          id: 'wild-shape',
          name: 'Forma Selvagem',
          mode: 'toggle',
          cost: { resource: 'wild-shape', amount: 1 },
          tempHp: { plus: { classLevel: true } },
          effects: [{ type: 'note', text: 'Use as estatísticas da Fera; sem conjurar magias.' }],
        },
      ],
    },
    {
      id: 'wild-companion',
      level: 2,
      name: 'Companheiro Selvagem',
      text: 'Ação Usar Magia: gaste um espaço de magia ou um uso de Forma Selvagem para conjurar Convocar Familiar sem componentes materiais. O familiar é Feérico e some no Descanso Longo.',
    },
    subclassFeature(3, 'Druida'),
    ...asiFeatures([4, 8, 12, 16]),
    {
      id: 'wild-resurgence',
      level: 5,
      name: 'Ressurgimento Selvagem',
      text: 'Uma vez por turno, sem usos de Forma Selvagem, gaste um espaço de magia para ganhar um uso. E uma vez por Descanso Longo, gaste um uso de Forma Selvagem para ganhar um espaço de 1º círculo.',
    },
    {
      id: 'elemental-fury',
      level: 7,
      name: 'Fúria Elemental',
      text: 'Escolha: Conjuração Potente (some a Sabedoria ao dano dos truques de Druida) ou Golpe Primal (uma vez por turno, ao acertar com arma ou com ataque de Fera, +1d8 de dano Gélido, Ígneo, Elétrico ou Trovejante).',
      choice: {
        kind: 'option',
        label: 'Fúria Elemental',
        options: [
          {
            id: 'potent-spellcasting',
            name: 'Conjuração Potente',
            text: 'Some a Sabedoria ao dano dos truques de Druida.',
          },
          {
            id: 'primal-strike',
            name: 'Golpe Primal',
            text: 'Uma vez por turno, ao acertar com arma ou Fera: +1d8 Gélido, Ígneo, Elétrico ou Trovejante.',
          },
        ],
      },
      optionEffects: {
        'primal-strike': [
          {
            type: 'extra-damage',
            dice: { count: { column: 'primalStrikeDice' }, die: 8 },
            filter: { weapon: true },
            oncePerTurn: true,
            damageType: 'thunder',
          },
        ],
      },
    },
    {
      id: 'improved-elemental-fury',
      level: 15,
      name: 'Fúria Elemental Aprimorada',
      text: 'Conjuração Potente: truques de Druida com alcance de 3 m ou mais ganham +90 m de alcance. Golpe Primal: o dano extra passa a 2d8.',
    },
    {
      id: 'beast-spells',
      level: 18,
      name: 'Magias Bestiais',
      text: 'Em Forma Selvagem, você pode conjurar magias (menos as com componente material de custo indicado ou consumido).',
    },
    epicBoon('Dádiva da Viagem Dimensional'),
    {
      id: 'archdruid',
      level: 20,
      name: 'Arquidruida',
      text: 'Ao rolar Iniciativa sem usos de Forma Selvagem, recupera um. Uma vez por Descanso Longo, converte usos de Forma Selvagem num espaço de magia (cada uso vale 2 círculos). Você envelhece 1 ano a cada 10.',
    },
  ],
  subclasses: [
    {
      id: 'land',
      name: 'Círculo da Terra',
      tagline: 'Guarda o saber antigo ligado a um tipo de terra.',
      optionSpells: {
        arid: {
          3: ['blur', 'burning-hands', 'fire-bolt'],
          5: ['fireball'],
          7: ['blight'],
          9: ['wall-of-stone'],
        },
        polar: {
          3: ['fog-cloud', 'hold-person', 'ray-of-frost'],
          5: ['sleet-storm'],
          7: ['ice-storm'],
          9: ['cone-of-cold'],
        },
        temperate: {
          3: ['misty-step', 'shocking-grasp', 'sleep'],
          5: ['lightning-bolt'],
          7: ['freedom-of-movement'],
          9: ['tree-stride'],
        },
        tropical: {
          3: ['acid-splash', 'ray-of-sickness', 'web'],
          5: ['stinking-cloud'],
          7: ['polymorph'],
          9: ['insect-plague'],
        },
      },
      features: [
        {
          id: 'circle-of-the-land-spells',
          level: 3,
          name: 'Magias do Círculo da Terra',
          text: 'A cada Descanso Longo, escolha um tipo de terra: as magias dele ficam sempre preparadas. Árida: Turvar, Mãos Flamejantes, Raio de Fogo; Bola de Fogo (5); Malogro (7); Muralha de Pedra (9). Polar: Névoa Obscurecente, Paralisar Pessoa, Raio de Gelo; Nevasca (5); Tempestade Glacial (7); Cone de Frio (9). Temperada: Passo Nebuloso, Toque Chocante, Sono; Relâmpago (5); Movimentação Livre (7); Passo Arbóreo (9). Tropical: Bolha Ácida, Raio Nauseante, Teia; Nuvem Fétida (5); Polimorfia (7); Praga de Insetos (9).',
          choice: {
            kind: 'option',
            label: 'Tipo de terra',
            options: [
              { id: 'arid', name: 'Árida', text: 'Resistência a dano Ígneo (Proteção Natural).' },
              { id: 'polar', name: 'Polar', text: 'Resistência a dano Gélido (Proteção Natural).' },
              {
                id: 'temperate',
                name: 'Temperada',
                text: 'Resistência a dano Elétrico (Proteção Natural).',
              },
              {
                id: 'tropical',
                name: 'Tropical',
                text: 'Resistência a dano Venenoso (Proteção Natural).',
              },
            ],
          },
        },
        {
          id: 'lands-aid',
          level: 3,
          name: 'Auxílio da Terra',
          text: 'Ação Usar Magia: gaste uma Forma Selvagem e escolha um ponto a até 18 m. Criaturas à sua escolha numa Esfera de 3 m de raio fazem salvaguarda de Constituição contra a sua CD: 2d6 de dano Necrótico (metade no sucesso). Uma criatura à sua escolha na área recupera 2d6 PV. Vira 3d6 no nível 10 e 4d6 no 14.',
        },
        {
          id: 'natural-recovery',
          level: 6,
          name: 'Recuperação Natural',
          text: 'Uma vez por Descanso Longo: conjure uma magia de círculo do terreno sem gastar espaço; e, num Descanso Curto, recupere espaços gastos somando até metade do seu nível de Druida (arredondado para cima), nenhum de 6º círculo ou mais.',
        },
        {
          id: 'natures-ward',
          level: 10,
          name: 'Proteção Natural',
          text: 'Imune à condição Envenenado e Resistência ao dano do seu terreno: Árido Ígneo, Polar Gélido, Temperado Elétrico, Tropical Venenoso.',
        },
        {
          id: 'natures-sanctuary',
          level: 14,
          name: 'Santuário Natural',
          text: 'Ação Usar Magia: gaste uma Forma Selvagem para criar um Cubo de 4,5 m de árvores espectrais a até 36 m por 1 minuto. Você e aliados ali têm Meia Cobertura, e os aliados ganham a Resistência da Proteção Natural. Ação Bônus: mova o Cubo até 18 m.',
        },
      ],
    },
  ],
};
