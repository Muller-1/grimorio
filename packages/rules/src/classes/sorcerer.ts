import { asiFeatures, byLevel, epicBoon, subclassFeature } from './common';
import type { ClassProgression } from './types';

/** Opções de Metamagia (custo em Pontos de Feitiçaria). */
export const METAMAGIC: { id: string; name: string; text: string }[] = [
  {
    id: 'careful',
    name: 'Magia Cuidadosa (1)',
    text: 'Em magia com salvaguarda, até Carisma (mínimo 1) criaturas passam automaticamente e não sofrem dano se sofreriam metade.',
  },
  {
    id: 'distant',
    name: 'Magia Distante (1)',
    text: 'Dobra o alcance (mínimo 1,5 m) ou transforma Toque em 9 m.',
  },
  {
    id: 'empowered',
    name: 'Magia Potencializada (1)',
    text: 'Role de novo até Carisma (mínimo 1) dados de dano da magia. Pode somar a outra Metamagia.',
  },
  {
    id: 'extended',
    name: 'Magia Estendida (1)',
    text: 'Dobra a duração de 1 minuto ou mais (máximo 24 horas); com Concentração, Vantagem para mantê-la.',
  },
  {
    id: 'heightened',
    name: 'Magia Elevada (2)',
    text: 'Um alvo tem Desvantagem nas salvaguardas contra a magia.',
  },
  {
    id: 'quickened',
    name: 'Magia Acelerada (2)',
    text: 'Magia de uma ação vira Ação Bônus (sem outra magia de 1º círculo ou mais no turno).',
  },
  {
    id: 'seeking',
    name: 'Magia Buscadora (1)',
    text: 'Ao errar um ataque de magia, role o d20 de novo. Pode somar a outra Metamagia.',
  },
  {
    id: 'subtle',
    name: 'Magia Sutil (1)',
    text: 'Sem componentes Verbais, Somáticos ou Materiais (menos os consumidos ou com custo).',
  },
  {
    id: 'transmuted',
    name: 'Magia Transmutada (1)',
    text: 'Troca o tipo de dano entre Ácido, Gélido, Ígneo, Elétrico, Venenoso e Trovejante.',
  },
  {
    id: 'twinned',
    name: 'Magia Duplicada (1)',
    text: 'Em magia que ganha alvos com espaço maior, aumenta o círculo efetivo em 1.',
  },
];

export const SORCERER: ClassProgression = {
  classId: 'sorcerer',
  columns: {
    sorceryPoints: Array.from({ length: 20 }, (_, i) => (i === 0 ? 0 : i + 1)),
  },
  columnNames: { sorceryPoints: 'Pontos de Feitiçaria' },
  spellcasting: {
    ability: 'cha',
    kind: 'full',
    cantrips: byLevel([
      [1, 4],
      [4, 5],
      [10, 6],
    ]),
    prepared: [2, 4, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
    swap: 'level-up',
  },
  subclassLevels: [3, 6, 14, 18],
  features: [
    {
      id: 'spellcasting',
      level: 1,
      name: 'Conjuração',
      text: 'Conjura magias de Feiticeiro com Carisma. A cada nível, pode trocar um truque e uma magia preparada. Foco: foco arcano.',
    },
    {
      id: 'innate-sorcery',
      level: 1,
      name: 'Feitiçaria Inata',
      text: 'Ação Bônus, por 1 minuto: +1 na CD das suas magias de Feiticeiro e Vantagem nas jogadas de ataque delas. Dois usos por Descanso Longo.',
      resource: { id: 'innate-sorcery', name: 'Feitiçaria Inata', max: 2, recharge: 'long' },
      activation: [
        {
          id: 'innate-sorcery',
          name: 'Feitiçaria Inata',
          mode: 'toggle',
          cost: { resource: 'innate-sorcery', amount: 1 },
          effects: [
            { type: 'spell-dc-bonus', value: 1 },
            { type: 'advantage', on: ['spell-attack'] },
          ],
        },
      ],
    },
    {
      id: 'font-of-magic',
      level: 2,
      name: 'Fonte de Magia',
      text: 'Pontos de Feitiçaria iguais ao seu nível (a partir do 2), recuperados no Descanso Longo. Sem ação, gaste um espaço para ganhar pontos iguais ao círculo. Ação Bônus: crie um espaço gastando pontos — 1º círculo: 2; 2º: 3; 3º: 5 (nível 5); 4º: 6 (nível 7); 5º: 7 (nível 9). Espaços criados somem no Descanso Longo.',
      resource: {
        id: 'sorcery-points',
        name: 'Pontos de Feitiçaria',
        max: { column: 'sorceryPoints' },
        recharge: 'long',
        pool: true,
      },
    },
    {
      id: 'metamagic-2',
      level: 2,
      name: 'Metamagia',
      text: 'Duas opções de Metamagia (gastam Pontos de Feitiçaria; uma por magia). A cada nível, pode trocar uma.',
      choice: { kind: 'metamagic', count: 2 },
    },
    subclassFeature(3, 'Feiticeiro'),
    ...asiFeatures([4, 8, 12, 16]),
    {
      id: 'sorcerous-restoration',
      level: 5,
      name: 'Restauração Feiticeira',
      text: 'Ao terminar um Descanso Curto, recupere Pontos de Feitiçaria até metade do seu nível (arredondado para baixo). Uma vez por Descanso Longo.',
    },
    {
      id: 'sorcery-incarnate',
      level: 7,
      name: 'Feitiçaria Encarnada',
      text: 'Sem usos de Feitiçaria Inata, ative-a gastando 2 Pontos de Feitiçaria. Com ela ativa, use até duas Metamagias por magia.',
    },
    {
      id: 'metamagic-10',
      level: 10,
      name: 'Metamagia',
      text: 'Mais duas opções de Metamagia.',
      choice: { kind: 'metamagic', count: 2 },
    },
    {
      id: 'metamagic-17',
      level: 17,
      name: 'Metamagia',
      text: 'Mais duas opções de Metamagia.',
      choice: { kind: 'metamagic', count: 2 },
    },
    epicBoon('Dádiva da Viagem Dimensional'),
    {
      id: 'arcane-apotheosis',
      level: 20,
      name: 'Apoteose Arcana',
      text: 'Com a Feitiçaria Inata ativa, use uma Metamagia por turno sem gastar Pontos de Feitiçaria.',
    },
  ],
  subclasses: [
    {
      id: 'draconic',
      name: 'Feitiçaria Dracônica',
      tagline: 'Magia herdada de um dragão.',
      spells: {
        3: ['alter-self', 'chromatic-orb', 'command', 'dragons-breath'],
        5: ['fear', 'fly'],
        7: ['arcane-eye', 'charm-monster'],
        9: ['legend-lore', 'summon-dragon'],
      },
      features: [
        {
          id: 'draconic-resilience',
          level: 3,
          name: 'Resiliência Dracônica',
          text: 'PV máximo +3, e +1 a cada nível de Feiticeiro depois disso. Sem armadura, sua CA base é 10 + Destreza + Carisma.',
          passive: [
            { type: 'hp-max-bonus', value: { classLevel: true } },
            { type: 'ac-formula', base: 10, abilities: ['cha'], shield: true },
          ],
        },
        {
          id: 'draconic-spells',
          level: 3,
          name: 'Magias Dracônicas',
          text: 'Sempre preparadas: Alterar-se, Orbe Cromático, Comando e Sopro de Dragão (nível 3); Medo e Voo (5); Olho Arcano e Enfeitiçar Monstro (7); Lendas e Histórias e Invocar Dragão (9).',
        },
        {
          id: 'elemental-affinity',
          level: 6,
          name: 'Afinidade Elemental',
          text: 'Escolha Ácido, Gélido, Ígneo, Elétrico ou Venenoso: Resistência a esse dano, e some o Carisma a uma jogada de dano das magias desse tipo.',
          choice: {
            kind: 'option',
            label: 'Tipo de dano',
            options: [
              { id: 'acid', name: 'Ácido', text: 'Resistência a dano Ácido.' },
              { id: 'cold', name: 'Gélido', text: 'Resistência a dano Gélido.' },
              { id: 'fire', name: 'Ígneo', text: 'Resistência a dano Ígneo.' },
              { id: 'lightning', name: 'Elétrico', text: 'Resistência a dano Elétrico.' },
              { id: 'poison', name: 'Venenoso', text: 'Resistência a dano Venenoso.' },
            ],
          },
          optionEffects: {
            acid: [{ type: 'resistance', damage: ['acid'] }],
            cold: [{ type: 'resistance', damage: ['cold'] }],
            fire: [{ type: 'resistance', damage: ['fire'] }],
            lightning: [{ type: 'resistance', damage: ['lightning'] }],
            poison: [{ type: 'resistance', damage: ['poison'] }],
          },
        },
        {
          id: 'dragon-wings',
          level: 14,
          name: 'Asas de Dragão',
          text: 'Ação Bônus: asas por 1 hora, com Deslocamento de Voo de 18 m. Uma vez por Descanso Longo (ou gaste 3 Pontos de Feitiçaria).',
          resource: { id: 'dragon-wings', name: 'Asas de Dragão', max: 1, recharge: 'long' },
        },
        {
          id: 'dragon-companion',
          level: 18,
          name: 'Companheiro Dracônico',
          text: 'Conjure Invocar Dragão sem componente material e uma vez sem espaço por Descanso Longo; pode dispensar a Concentração (duração vira 1 minuto).',
        },
      ],
    },
  ],
};
