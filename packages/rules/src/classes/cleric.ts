import { asiFeatures, byLevel, epicBoon, FULL_PREPARED, subclassFeature } from './common';
import type { ClassProgression } from './types';

export const CLERIC: ClassProgression = {
  classId: 'cleric',
  columns: {
    channelDivinity: byLevel([
      [1, 0],
      [2, 2],
      [6, 3],
      [18, 4],
    ]),
    divineSparkDice: byLevel([
      [1, 1],
      [7, 2],
      [13, 3],
      [18, 4],
    ]),
    divineStrikeDice: byLevel([
      [1, 1],
      [14, 2],
    ]),
  },
  columnNames: {
    channelDivinity: 'Canalizar Divindade',
    divineSparkDice: 'Dados da Centelha Divina',
    divineStrikeDice: 'Dados do Golpe Divino',
  },
  spellcasting: {
    ability: 'wis',
    kind: 'full',
    cantrips: byLevel([
      [1, 3],
      [4, 4],
      [10, 5],
    ]),
    prepared: FULL_PREPARED,
    swap: 'long-rest',
  },
  subclassLevels: [3, 6, 17],
  features: [
    {
      id: 'spellcasting',
      level: 1,
      name: 'Conjuração',
      text: 'Conjura magias de Clérigo com Sabedoria. A cada Descanso Longo, pode trocar toda a lista de magias preparadas; a cada nível, pode trocar um truque. Foco: símbolo sagrado.',
    },
    {
      id: 'divine-order',
      level: 1,
      name: 'Ordem Divina',
      text: 'Protetor (armas Marciais e armadura Pesada) ou Taumaturgo (um truque a mais e bônus igual à Sabedoria, mínimo +1, em Arcanismo e Religião). Escolhida na criação.',
    },
    {
      id: 'channel-divinity',
      level: 2,
      name: 'Canalizar Divindade',
      text: 'Usos por descanso (Curto devolve 1, Longo todos). Centelha Divina (ação Usar Magia, 9 m): role 1d8 + Sabedoria e cure esse total ou cause dano Necrótico ou Radiante (salvaguarda de Constituição para metade); +1d8 nos níveis 7, 13 e 18. Expulsar Mortos-Vivos: mortos-vivos a até 9 m fazem salvaguarda de Sabedoria ou ficam Amedrontados e Incapacitados por 1 minuto, fugindo de você.',
      resource: {
        id: 'channel-divinity',
        name: 'Canalizar Divindade',
        max: { column: 'channelDivinity' },
        recharge: 'short-one',
      },
      activation: [
        {
          id: 'divine-spark',
          name: 'Centelha Divina (cura)',
          mode: 'use',
          cost: { resource: 'channel-divinity', amount: 1 },
          effects: [],
          heal: {
            dice: { count: { column: 'divineSparkDice' }, die: 8 },
            plus: { ability: 'wis' },
          },
        },
      ],
    },
    subclassFeature(3, 'Clérigo'),
    ...asiFeatures([4, 8, 12, 16]),
    {
      id: 'sear-undead',
      level: 5,
      name: 'Fulminar Mortos-Vivos',
      text: 'Ao usar Expulsar Mortos-Vivos, role tantos d8 quanto o seu modificador de Sabedoria (mínimo 1): cada morto-vivo que falhar na salvaguarda sofre esse dano Radiante.',
    },
    {
      id: 'blessed-strikes',
      level: 7,
      name: 'Golpes Abençoados',
      text: 'Escolha: Golpe Divino (uma vez por turno, ao acertar com arma, +1d8 de dano Necrótico ou Radiante) ou Conjuração Potente (some a Sabedoria ao dano dos truques de Clérigo).',
      choice: {
        kind: 'option',
        label: 'Golpes Abençoados',
        options: [
          {
            id: 'divine-strike',
            name: 'Golpe Divino',
            text: 'Uma vez por turno, ao acertar com arma: +1d8 Necrótico ou Radiante.',
          },
          {
            id: 'potent-spellcasting',
            name: 'Conjuração Potente',
            text: 'Some a Sabedoria ao dano dos truques de Clérigo.',
          },
        ],
      },
      optionEffects: {
        'divine-strike': [
          {
            type: 'extra-damage',
            dice: { count: { column: 'divineStrikeDice' }, die: 8 },
            filter: { weapon: true },
            oncePerTurn: true,
            damageType: 'radiant',
          },
        ],
      },
    },
    {
      id: 'divine-intervention',
      level: 10,
      name: 'Intervenção Divina',
      text: 'Ação Usar Magia: conjure qualquer magia de Clérigo de até 5º círculo (que não use Reação) sem gastar espaço nem componentes materiais. Uma vez por Descanso Longo.',
      resource: { id: 'divine-intervention', name: 'Intervenção Divina', max: 1, recharge: 'long' },
    },
    {
      id: 'improved-blessed-strikes',
      level: 14,
      name: 'Golpes Abençoados Aprimorados',
      text: 'Golpe Divino passa a 2d8. Conjuração Potente: ao causar dano com um truque de Clérigo, você ou uma criatura a até 18 m ganha PV temporários iguais ao dobro da sua Sabedoria.',
    },
    epicBoon('Dádiva do Destino'),
    {
      id: 'greater-divine-intervention',
      level: 20,
      name: 'Intervenção Divina Maior',
      text: 'A Intervenção Divina pode conjurar Desejo. Se fizer isso, só poderá usar a Intervenção de novo depois de 2d4 Descansos Longos.',
    },
  ],
  subclasses: [
    {
      id: 'life',
      name: 'Domínio da Vida',
      tagline: 'Mestre da cura, canaliza a energia positiva que sustenta a vida.',
      spells: {
        3: ['aid', 'bless', 'cure-wounds', 'lesser-restoration'],
        5: ['mass-healing-word', 'revivify'],
        7: ['aura-of-life', 'death-ward'],
        9: ['greater-restoration', 'mass-cure-wounds'],
      },
      features: [
        {
          id: 'disciple-of-life',
          level: 3,
          name: 'Discípulo da Vida',
          text: 'Quando uma magia conjurada com espaço restaura PV, o alvo recupera mais 2 + o círculo do espaço.',
        },
        {
          id: 'life-domain-spells',
          level: 3,
          name: 'Magias de Domínio da Vida',
          text: 'Sempre preparadas: Auxílio, Bênção, Curar Ferimentos e Restauração Menor (nível 3); Palavra Curativa em Massa e Revivificar (5); Aura de Vida e Proteção Contra a Morte (7); Restauração Maior e Curar Ferimentos em Massa (9).',
        },
        {
          id: 'preserve-life',
          level: 3,
          name: 'Preservar a Vida',
          text: 'Gaste um Canalizar Divindade (ação Usar Magia): divida PV iguais a 5 × seu nível de Clérigo entre criaturas Sangrando a até 9 m (incluindo você), sem passar da metade do PV máximo de cada uma.',
        },
        {
          id: 'blessed-healer',
          level: 6,
          name: 'Curandeiro Abençoado',
          text: 'Logo depois de conjurar, com espaço, uma magia que cure outras criaturas, você recupera 2 + o círculo do espaço em PV.',
        },
        {
          id: 'supreme-healing',
          level: 17,
          name: 'Cura Suprema',
          text: 'Os dados de cura das suas magias e do Canalizar Divindade dão sempre o valor máximo (2d6 cura 12).',
        },
      ],
    },
  ],
};
