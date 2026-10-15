import { asiFeatures, byLevel, epicBoon, subclassFeature } from './common';
import type { ClassProgression } from './types';

export const WIZARD: ClassProgression = {
  classId: 'wizard',
  columns: {},
  columnNames: {},
  spellcasting: {
    ability: 'int',
    kind: 'full',
    cantrips: byLevel([
      [1, 3],
      [4, 4],
      [10, 5],
    ]),
    prepared: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 18, 19, 21, 22, 23, 24, 25],
    swap: 'long-rest',
    spellbook: { initial: 6, perLevel: 2 },
  },
  subclassLevels: [3, 6, 10, 14],
  features: [
    {
      id: 'spellcasting',
      level: 1,
      name: 'Conjuração',
      text: 'Conjura magias de Mago com Inteligência. O grimório começa com seis magias de 1º círculo e ganha duas a cada nível; você prepara magias do grimório e pode trocá-las a cada Descanso Longo (e um truque também). Copiar uma magia encontrada: 2 horas e 50 PO por círculo. Foco: foco arcano ou o grimório.',
    },
    {
      id: 'ritual-adept',
      level: 1,
      name: 'Adepto de Ritual',
      text: 'Conjure como Ritual qualquer magia com a etiqueta Ritual que esteja no seu grimório, mesmo sem prepará-la (lendo o livro).',
    },
    {
      id: 'arcane-recovery',
      level: 1,
      name: 'Recuperação Arcana',
      text: 'Ao terminar um Descanso Curto, recupere espaços gastos somando até metade do seu nível de Mago (arredondado para cima), nenhum de 6º círculo ou mais. Uma vez por Descanso Longo.',
      resource: { id: 'arcane-recovery', name: 'Recuperação Arcana', max: 1, recharge: 'long' },
    },
    {
      id: 'scholar',
      level: 2,
      name: 'Acadêmico',
      text: 'Especialização numa perícia em que você tem proficiência entre Arcanismo, História, Investigação, Medicina, Natureza e Religião.',
      choice: {
        kind: 'expertise',
        count: 1,
        from: ['arcana', 'history', 'investigation', 'medicine', 'nature', 'religion'],
      },
    },
    subclassFeature(3, 'Mago'),
    ...asiFeatures([4, 8, 12, 16]),
    {
      id: 'memorize-spell',
      level: 5,
      name: 'Memorizar Magia',
      text: 'Ao terminar um Descanso Curto, troque uma magia preparada de 1º círculo ou mais por outra do grimório.',
    },
    {
      id: 'spell-mastery',
      level: 18,
      name: 'Maestria de Magias',
      text: 'Escolha uma magia de 1º e uma de 2º círculo do grimório com tempo de conjuração de uma ação: ficam sempre preparadas e você as conjura no círculo mais baixo sem gastar espaço. A cada Descanso Longo, pode trocá-las.',
      choice: {
        kind: 'chosen-spells',
        label: 'Maestria de Magias',
        picks: [
          { circle: 1, count: 1 },
          { circle: 2, count: 1 },
        ],
        from: 'spellbook',
      },
    },
    epicBoon('Dádiva da Recordação de Magia'),
    {
      id: 'signature-spells',
      level: 20,
      name: 'Assinatura Mágica',
      text: 'Escolha duas magias de 3º círculo do grimório: ficam sempre preparadas e cada uma pode ser conjurada uma vez em 3º círculo sem espaço por Descanso Curto ou Longo.',
      choice: {
        kind: 'chosen-spells',
        label: 'Assinatura Mágica',
        picks: [{ circle: 3, count: 2 }],
        from: 'spellbook',
      },
    },
  ],
  subclasses: [
    {
      id: 'evoker',
      name: 'Evocador',
      tagline: 'Magias elementais explosivas: frio, fogo, trovão, relâmpago e ácido.',
      features: [
        {
          id: 'evocation-savant',
          level: 3,
          name: 'Versado em Evocação',
          text: 'Acrescente de graça ao grimório duas magias de Evocação de Mago de até 2º círculo. Sempre que ganhar um novo círculo de espaços, acrescente de graça mais uma magia de Evocação desse círculo ou menor.',
          choice: {
            kind: 'chosen-spells',
            label: 'Versado em Evocação',
            picks: [{ circle: 2, count: 2, maxCircle: true, school: 'evocation' }],
            from: 'class',
            toSpellbook: true,
          },
        },
        {
          id: 'potent-cantrip',
          level: 3,
          name: 'Truque Potente',
          text: 'Quando um alvo passa na salvaguarda ou você erra o ataque de um truque, o alvo ainda sofre metade do dano (sem outros efeitos).',
        },
        {
          id: 'sculpt-spells',
          level: 6,
          name: 'Esculpir Magias',
          text: 'Ao conjurar uma Evocação que afeta criaturas que você vê, escolha até 1 + o círculo da magia: elas passam automaticamente na salvaguarda e não sofrem dano se sofreriam metade.',
        },
        {
          id: 'empowered-evocation',
          level: 10,
          name: 'Evocação Potencializada',
          text: 'Some a Inteligência a uma jogada de dano das suas magias de Evocação de Mago.',
        },
        {
          id: 'overchannel',
          level: 14,
          name: 'Sobrecarga',
          text: 'Ao conjurar uma magia de Mago de dano com espaço de 1º a 5º círculo, cause o dano máximo no turno. O primeiro uso é seguro; usos seguintes antes de um Descanso Longo causam a você 2d12 de dano Necrótico por círculo (+1d12 por círculo a cada novo uso), que ignora Resistência e Imunidade.',
        },
      ],
    },
  ],
};
