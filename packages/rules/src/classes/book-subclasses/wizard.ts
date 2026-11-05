import { byLevel } from '../common';
import type { SubclassDef } from '../types';

/** Subclasses do Livro do Jogador 2024 que o SRD não traz (texto nosso). */
export const BOOK_SUBCLASSES: SubclassDef[] = [
  {
    id: 'abjurer',
    source: 'book',
    name: 'Abjurador',
    tagline:
      'Especialista em proteção, bloqueio e banimento, defende aliados e anula magias hostis.',
    spells: { 10: ['counterspell', 'dispel-magic'] },
    features: [
      {
        id: 'arcane-ward',
        level: 3,
        name: 'Proteção Arcana',
        text: 'Ao conjurar Abjuração com espaço, crie uma proteção em você até o próximo Descanso Longo, com PV máximos iguais a 2 × nível de Mago + Inteligência. Ela absorve seu dano antes de você (após Resistência e Vulnerabilidade); com 0 PV, o excedente passa. Conjurar Abjuração com espaço a cura em 2 × círculo; Ação Bônus gastando um espaço faz o mesmo. Só pode criá-la de novo após Descanso Longo.',
        resource: { id: 'arcane-ward', name: 'Proteção Arcana', max: 1, recharge: 'long' },
      },
      {
        id: 'abjuration-savant',
        level: 3,
        name: 'Versado em Abjuração',
        text: 'Acrescente de graça ao grimório duas magias de Abjuração de Mago de até 2º círculo. Ao ganhar um novo círculo de espaços, acrescente de graça mais uma de Abjuração desse círculo ou menor.',
        choice: {
          kind: 'chosen-spells',
          label: 'Versado em Abjuração',
          picks: [{ circle: 2, count: 2, maxCircle: true, school: 'abjuration' }],
          from: 'class',
          toSpellbook: true,
        },
      },
      {
        id: 'projected-ward',
        level: 6,
        name: 'Proteção Projetada',
        text: 'Reação: quando uma criatura à vista a até 9 m sofre dano, sua Proteção Arcana o absorve. Se ela zerar, a criatura sofre o restante, aplicando antes Resistência e Vulnerabilidade dela.',
      },
      {
        id: 'spell-breaker',
        level: 10,
        name: 'Rompe-Magia',
        text: 'Contramagia e Dissipar Magia ficam sempre preparadas. Dissipar Magia pode ser conjurada como Ação Bônus e você soma o Bônus de Proficiência ao teste. Se uma delas falhar em interromper a magia, o espaço não é gasto.',
      },
      {
        id: 'spell-resistance',
        level: 14,
        name: 'Resistência à Magia',
        text: 'Você tem Vantagem em salvaguardas contra magias e Resistência ao dano de magias.',
        passive: [
          {
            type: 'note',
            text: 'Vantagem em salvaguardas contra magias e Resistência a dano de magias.',
            situational: true,
          },
        ],
      },
    ],
  },
  {
    id: 'diviner',
    source: 'book',
    name: 'Adivinhador',
    tagline: 'Vê passado, presente e futuro, e muda o destino dos testes com jogadas previstas.',
    columns: {
      // Prodígio: 2 d20 e, no nível 14, 3 d20.
      portentDice: byLevel([
        [1, 0],
        [3, 2],
        [14, 3],
      ]),
    },
    features: [
      {
        id: 'portent',
        level: 3,
        name: 'Prodígio',
        text: 'Após um Descanso Longo, jogue 2 d20 e guarde os resultados. Antes de um Teste de D20 seu ou de criatura à vista, troque a jogada por um deles (uma vez por turno). Cada um vale um uso e os não usados somem no próximo Descanso Longo.',
        resource: {
          id: 'portent',
          name: 'Jogadas de Prodígio',
          max: { column: 'portentDice' },
          recharge: 'long',
        },
      },
      {
        id: 'divination-savant',
        level: 3,
        name: 'Versado em Adivinhação',
        text: 'Acrescente de graça ao grimório duas magias de Adivinhação de Mago de até 2º círculo. Ao ganhar um novo círculo de espaços, acrescente de graça mais uma de Adivinhação desse círculo ou menor.',
        choice: {
          kind: 'chosen-spells',
          label: 'Versado em Adivinhação',
          picks: [{ circle: 2, count: 2, maxCircle: true, school: 'divination' }],
          from: 'class',
          toSpellbook: true,
        },
      },
      {
        id: 'expert-divination',
        level: 6,
        name: 'Perito em Adivinhação',
        text: 'Ao conjurar Adivinhação com espaço de 2º círculo ou superior, recupere um espaço gasto de círculo menor que o usado, de no máximo 5º círculo.',
      },
      {
        id: 'third-eye',
        level: 10,
        name: 'O Terceiro Olho',
        text: 'Ação Bônus: escolha um benefício até o próximo Descanso Curto ou Longo: ler qualquer idioma, conjurar Ver o Invisível sem espaço ou Visão no Escuro de 36 m. Só de novo após um Descanso Curto ou Longo.',
        resource: { id: 'third-eye', name: 'O Terceiro Olho', max: 1, recharge: 'short' },
        choice: {
          kind: 'option',
          label: 'Benefício do Terceiro Olho',
          options: [
            {
              id: 'greater-comprehension',
              name: 'Compreensão Superior',
              text: 'Você lê qualquer idioma.',
            },
            {
              id: 'see-invisibility',
              name: 'Ver o Invisível',
              text: 'Conjura Ver o Invisível sem gastar espaço de magia.',
            },
            {
              id: 'darkvision',
              name: 'Visão no Escuro',
              text: 'Visão no Escuro com alcance de 36 m.',
            },
          ],
        },
      },
      {
        id: 'greater-portent',
        level: 14,
        name: 'Prodígio Maior',
        text: 'Na característica Prodígio, você joga três d20 em vez de dois.',
      },
    ],
  },
  {
    id: 'illusionist',
    source: 'book',
    name: 'Ilusionista',
    tagline: 'Tece ilusões que enganam sentidos e mente, até torná-las semirreais.',
    spells: { 6: ['summon-fey', 'summon-beast'] },
    features: [
      {
        id: 'improved-illusions',
        level: 3,
        name: 'Ilusões Aprimoradas',
        text: 'Conjure Ilusões sem componente Verbal; as de alcance 3 m ou mais ganham +18 m. Você conhece Ilusão Menor (ou outro truque de Mago, sem contar no limite), cria som e imagem numa só conjuração e a conjura como Ação Bônus.',
      },
      {
        id: 'illusion-savant',
        level: 3,
        name: 'Versado em Ilusão',
        text: 'Acrescente de graça ao grimório duas magias de Ilusão de Mago de até 2º círculo. Ao ganhar um novo círculo de espaços, acrescente de graça mais uma de Ilusão desse círculo ou menor.',
        choice: {
          kind: 'chosen-spells',
          label: 'Versado em Ilusão',
          picks: [{ circle: 2, count: 2, maxCircle: true, school: 'illusion' }],
          from: 'class',
          toSpellbook: true,
        },
      },
      {
        id: 'spectral-creatures',
        level: 6,
        name: 'Criaturas Espectrais',
        text: 'Convocar Feérico e Invocar Fera ficam sempre preparadas. Ao conjurá-las, pode mudar a escola para Ilusão (criatura espectral) e conjurar sem espaço, com a criatura com metade dos PV. Depois de conjurar uma delas sem espaço, só de novo após um Descanso Longo.',
      },
      {
        id: 'illusory-self',
        level: 10,
        name: 'Autoimagem Ilusória',
        text: 'Reação, ao ser atingido por um ataque: uma duplicata ilusória surge entre você e o atacante, que erra automaticamente. Volta num Descanso Curto ou Longo, ou gastando um espaço de 2º círculo ou superior (sem ação).',
        resource: { id: 'illusory-self', name: 'Autoimagem Ilusória', max: 1, recharge: 'short' },
      },
      {
        id: 'illusory-reality',
        level: 14,
        name: 'Realidade Ilusória',
        text: 'Ao conjurar Ilusão com espaço, escolha um objeto inanimado e não mágico da ilusão e torne-o real como Ação Bônus, no seu turno, enquanto a magia durar. Ele fica real por 1 minuto e não causa dano nem condições.',
      },
    ],
  },
];
