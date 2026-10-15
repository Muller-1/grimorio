import {
  asiFeatures,
  byLevel,
  epicBoon,
  extraAttack,
  HALF_PREPARED,
  subclassFeature,
} from './common';
import type { ClassProgression } from './types';

export const PALADIN: ClassProgression = {
  classId: 'paladin',
  columns: {
    channelDivinity: byLevel([
      [1, 0],
      [3, 2],
      [11, 3],
    ]),
    layOnHands: Array.from({ length: 20 }, (_, i) => 5 * (i + 1)),
  },
  columnNames: { channelDivinity: 'Canalizar Divindade', layOnHands: 'Mãos Consagradas' },
  spellcasting: { ability: 'cha', kind: 'half', prepared: HALF_PREPARED, swap: 'long-rest-one' },
  subclassLevels: [3, 7, 15, 20],
  features: [
    {
      id: 'lay-on-hands',
      level: 1,
      name: 'Mãos Consagradas',
      text: 'Reserva de cura igual a 5 × seu nível de Paladino, recuperada no Descanso Longo. Ação Bônus: toque uma criatura (pode ser você) e restaure PV gastando da reserva. Gastar 5 pontos remove a condição Envenenado (sem curar).',
      resource: {
        id: 'lay-on-hands',
        name: 'Mãos Consagradas',
        max: { column: 'layOnHands' },
        recharge: 'long',
        pool: true,
      },
    },
    {
      id: 'spellcasting',
      level: 1,
      name: 'Conjuração',
      text: 'Conjura magias de Paladino com Carisma (meio-conjurador). A cada Descanso Longo, pode trocar uma magia preparada. Foco: símbolo sagrado.',
    },
    {
      id: 'weapon-mastery',
      level: 1,
      name: 'Maestria em Arma',
      text: 'Use as propriedades de maestria de dois tipos de arma em que você tem proficiência. Pode trocá-los a cada Descanso Longo.',
    },
    {
      id: 'fighting-style',
      level: 2,
      name: 'Estilo de Luta',
      text: 'Um talento de Estilo de Luta, ou Guerreiro Abençoado: dois truques de Clérigo, que contam como magias de Paladino (Carisma); a cada nível, pode trocar um.',
      choice: {
        kind: 'fighting-style',
        alternatives: [
          {
            id: 'blessed-warrior',
            name: 'Guerreiro Abençoado',
            text: 'Dois truques de Clérigo (Orientação e Chama Sagrada são os recomendados), conjurados com Carisma.',
          },
        ],
      },
    },
    {
      id: 'paladins-smite',
      level: 2,
      name: 'Destruição do Paladino',
      text: 'Sempre tem Destruição Divina preparada e pode conjurá-la uma vez sem espaço por Descanso Longo.',
      grantedSpells: { ids: ['divine-smite'], freePerLongRest: 1 },
    },
    {
      id: 'channel-divinity',
      level: 3,
      name: 'Canalizar Divindade',
      text: 'Dois usos (três no nível 11); Descanso Curto devolve 1, Longo todos. Sentido Divino (Ação Bônus): por 10 minutos, sabe onde estão Celestiais, Ínferos e Mortos-Vivos a até 18 m, e lugares consagrados ou profanados.',
      resource: {
        id: 'channel-divinity',
        name: 'Canalizar Divindade',
        max: { column: 'channelDivinity' },
        recharge: 'short-one',
      },
    },
    subclassFeature(3, 'Paladino'),
    ...asiFeatures([4, 8, 12, 16]),
    extraAttack(5),
    {
      id: 'faithful-steed',
      level: 5,
      name: 'Montaria Fiel',
      text: 'Sempre tem Convocar Montaria preparada e pode conjurá-la uma vez sem espaço por Descanso Longo.',
      grantedSpells: { ids: ['find-steed'], freePerLongRest: 1 },
    },
    {
      id: 'aura-of-protection',
      level: 6,
      name: 'Aura de Proteção',
      text: 'Emanação de 3 m (9 m no nível 18): você e aliados nela somam seu modificador de Carisma (mínimo +1) às salvaguardas. Não funciona se você estiver Incapacitado.',
      passive: [{ type: 'save-bonus', value: { ability: 'cha', min: 1 } }],
    },
    {
      id: 'abjure-foes',
      level: 9,
      name: 'Repudiar Inimigos',
      text: 'Ação Usar Magia, gaste um Canalizar Divindade: até Carisma (mínimo 1) criaturas que você vê a até 18 m fazem salvaguarda de Sabedoria ou ficam Amedrontadas por 1 minuto ou até sofrer dano; nesse estado, só se movem, ou fazem uma ação, ou uma Ação Bônus por turno.',
    },
    {
      id: 'aura-of-courage',
      level: 10,
      name: 'Aura de Coragem',
      text: 'Você e aliados na sua Aura de Proteção têm Imunidade a Amedrontado.',
    },
    {
      id: 'radiant-strikes',
      level: 11,
      name: 'Golpes Radiantes',
      text: 'Ao acertar com arma corpo a corpo ou Ataque Desarmado, o alvo sofre +1d8 de dano Radiante.',
      passive: [
        {
          type: 'extra-damage',
          dice: '1d8',
          filter: { range: 'melee' },
          damageType: 'radiant',
        },
      ],
    },
    {
      id: 'restoring-touch',
      level: 14,
      name: 'Toque Restaurador',
      text: 'Com Mãos Consagradas, remova Cego, Enfeitiçado, Surdo, Amedrontado, Paralisado ou Atordoado gastando 5 pontos da reserva por condição.',
    },
    {
      id: 'aura-expansion',
      level: 18,
      name: 'Aura Expandida',
      text: 'Sua Aura de Proteção passa a ser uma Emanação de 9 m.',
    },
    epicBoon('Dádiva da Visão Verdadeira'),
  ],
  subclasses: [
    {
      id: 'devotion',
      name: 'Juramento da Devoção',
      tagline: 'O cavaleiro de armadura brilhante: justiça, ordem e honra.',
      spells: {
        3: ['protection-from-evil-and-good', 'shield-of-faith'],
        5: ['aid', 'zone-of-truth'],
        9: ['beacon-of-hope', 'dispel-magic'],
        13: ['freedom-of-movement', 'guardian-of-faith'],
        17: ['commune', 'flame-strike'],
      },
      features: [
        {
          id: 'oath-of-devotion-spells',
          level: 3,
          name: 'Magias do Juramento da Devoção',
          text: 'Sempre preparadas: Proteção Contra o Bem e o Mal e Escudo da Fé (nível 3); Auxílio e Zona da Verdade (5); Sinal de Esperança e Dissipar Magia (9); Movimentação Livre e Defensor da Fé (13); Comunhão e Coluna de Chamas (17).',
        },
        {
          id: 'sacred-weapon',
          level: 3,
          name: 'Arma Sagrada',
          text: 'Ao usar a ação Atacar, gaste um Canalizar Divindade: por 10 minutos, uma arma corpo a corpo que você empunha soma seu Carisma (mínimo +1) às jogadas de ataque e pode causar dano Radiante. Emite Luz Plena em 6 m e Penumbra por mais 6 m.',
          activation: [
            {
              id: 'sacred-weapon',
              name: 'Arma Sagrada',
              mode: 'toggle',
              cost: { resource: 'channel-divinity', amount: 1 },
              effects: [
                {
                  type: 'attack-bonus',
                  value: { ability: 'cha', min: 1 },
                  filter: { range: 'melee', weapon: true },
                },
              ],
            },
          ],
        },
        {
          id: 'aura-of-devotion',
          level: 7,
          name: 'Aura de Devoção',
          text: 'Você e aliados na sua Aura de Proteção têm Imunidade a Enfeitiçado.',
        },
        {
          id: 'smite-of-protection',
          level: 15,
          name: 'Destruição Protetora',
          text: 'Ao conjurar Destruição Divina, você e aliados na sua Aura de Proteção têm Meia Cobertura até o início do seu próximo turno.',
        },
        {
          id: 'holy-nimbus',
          level: 20,
          name: 'Resplendor Sagrado',
          text: 'Ação Bônus, por 10 minutos: Vantagem em salvaguardas forçadas por Ínferos ou Mortos-Vivos; inimigos que começam o turno na aura sofrem dano Radiante igual a Carisma + Bônus de Proficiência; a aura é Luz Plena de luz solar. Uma vez por Descanso Longo (ou gaste um espaço de 5º círculo).',
          resource: { id: 'holy-nimbus', name: 'Resplendor Sagrado', max: 1, recharge: 'long' },
        },
      ],
    },
  ],
};
