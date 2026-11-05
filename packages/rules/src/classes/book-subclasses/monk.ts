import type { SubclassDef } from '../types';

/** Subclasses do Livro do Jogador 2024 que o SRD não traz (texto nosso). */
export const BOOK_SUBCLASSES: SubclassDef[] = [
  {
    id: 'mercy',
    source: 'book',
    name: 'Combatente da Misericórdia',
    tagline: 'Curandeiro mascarado que controla a força vital: cura aliados e pune inimigos.',
    features: [
      {
        id: 'mercy-implements',
        level: 3,
        name: 'Implementos de Misericórdia',
        text: 'Você ganha proficiência em Intuição, Medicina e no Kit de Herbalismo.',
      },
      {
        id: 'hand-of-healing',
        level: 3,
        name: 'Mão de Cura',
        text: 'Com a ação Usar Magia, gaste 1 Ponto de Foco para tocar uma criatura e curar uma jogada do dado de Artes Marciais + modificador de Sabedoria. Na Torrente de Golpes, pode trocar um Ataque Desarmado por essa cura sem gastar o ponto.',
        activation: [
          {
            id: 'hand-of-healing',
            name: 'Mão de Cura',
            mode: 'use',
            cost: { resource: 'focus-points', amount: 1 },
            effects: [],
            heal: {
              dice: { count: 1, die: { column: 'martialArts' } },
              plus: { ability: 'wis' },
            },
          },
        ],
      },
      {
        id: 'hand-of-harm',
        level: 3,
        name: 'Mão de Dolo',
        text: 'Uma vez por turno, ao causar dano com um Ataque Desarmado, gaste 1 Ponto de Foco para causar dano Necrótico extra igual a uma jogada do dado de Artes Marciais + modificador de Sabedoria.',
      },
      {
        id: 'physicians-touch',
        level: 6,
        name: 'Toque de Médico',
        text: 'Mão de Cura também encerra uma condição na criatura curada: Atordoado, Cego, Envenenado, Paralisado ou Surdo. Mão de Dolo também deixa o alvo Envenenado até o fim do seu próximo turno.',
      },
      {
        id: 'flurry-of-healing-and-harm',
        level: 11,
        name: 'Torrente de Cura e Dolo',
        text: 'Na Torrente de Golpes, cada Ataque Desarmado pode ser trocado por Mão de Cura sem gastar Pontos de Foco, e um ataque que cause dano pode usar Mão de Dolo sem gastar ponto (ainda só uma vez por turno). Usos: modificador de Sabedoria (mínimo 1) por Descanso Longo.',
        resource: {
          id: 'flurry-of-healing-and-harm',
          name: 'Torrente de Cura e Dolo',
          max: { ability: 'wis', min: 1 },
          recharge: 'long',
        },
      },
      {
        id: 'hand-of-ultimate-mercy',
        level: 17,
        name: 'Mão da Misericórdia Final',
        text: 'Com a ação Usar Magia, gaste 5 Pontos de Foco e toque o cadáver de uma criatura morta nas últimas 24 horas: ela volta à vida com 4d10 + modificador de Sabedoria PV e perde as condições Atordoado, Cego, Envenenado, Paralisado e Surdo. Uma vez por Descanso Longo.',
        resource: {
          id: 'hand-of-ultimate-mercy',
          name: 'Mão da Misericórdia Final',
          max: 1,
          recharge: 'long',
        },
        activation: [
          {
            id: 'hand-of-ultimate-mercy',
            name: 'Mão da Misericórdia Final',
            mode: 'use',
            cost: { resource: 'hand-of-ultimate-mercy', amount: 1 },
            effects: [],
          },
        ],
      },
    ],
  },
  {
    id: 'shadow',
    source: 'book',
    name: 'Combatente das Sombras',
    tagline: 'Mestre da furtividade que salta entre sombras e se torna quase incorpóreo.',
    features: [
      {
        id: 'shadow-arts',
        level: 3,
        name: 'Artes das Sombras',
        text: 'Gaste 1 Ponto de Foco para conjurar Escuridão sem componentes; você enxerga dentro dela e pode mover a área até 18 m de você no início de cada turno seu. Você conhece Ilusão Menor (Sabedoria). Ganha Visão no Escuro de 18 m (ou +18 m se já tiver).',
        activation: [
          {
            id: 'shadow-arts-darkness',
            name: 'Escuridão (Artes das Sombras)',
            mode: 'use',
            cost: { resource: 'focus-points', amount: 1 },
            effects: [],
          },
        ],
        grantedSpells: { ids: ['minor-illusion'] },
      },
      {
        id: 'shadow-step',
        level: 6,
        name: 'Passo da Sombra',
        text: 'Inteiramente em Meia-luz ou Escuridão, use uma Ação Bônus para se teleportar até 18 m para um espaço livre à vista também em Meia-luz ou Escuridão. Você tem Vantagem no próximo ataque corpo a corpo antes do fim do turno.',
      },
      {
        id: 'improved-shadow-step',
        level: 11,
        name: 'Passo da Sombra Aprimorado',
        text: 'Ao usar Passo da Sombra, gaste 1 Ponto de Foco para ignorar a exigência de começar ou terminar em Meia-luz ou Escuridão. Na mesma Ação Bônus, pode fazer um Ataque Desarmado logo após o teleporte.',
      },
      {
        id: 'cloak-of-shadows',
        level: 17,
        name: 'Manto da Sombra',
        text: 'Com a ação Usar Magia, inteiramente em Meia-luz ou Escuridão, gaste 3 Pontos de Foco: por 1 minuto você fica Invisível, atravessa espaços ocupados como Terreno Difícil e usa a Torrente de Golpes sem gastar pontos. Termina se ficar Incapacitado ou encerrar o turno em Luz Plena.',
        activation: [
          {
            id: 'cloak-of-shadows',
            name: 'Manto da Sombra',
            mode: 'toggle',
            cost: { resource: 'focus-points', amount: 3 },
            effects: [
              {
                type: 'note',
                text: 'Invisível; move-se por espaços ocupados como Terreno Difícil; Torrente de Golpes sem custo de Pontos de Foco.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'elements',
    source: 'book',
    name: 'Combatente dos Elementos',
    tagline: 'Canaliza o Caos Elemental para golpear, voar e explodir inimigos.',
    features: [
      {
        id: 'elemental-attunement-spell',
        level: 3,
        name: 'Manipular Elementos',
        text: 'Você conhece a magia Elementalismo, usando Sabedoria para conjurá-la.',
        grantedSpells: { ids: ['elementalism'] },
      },
      {
        id: 'elemental-attunement',
        level: 3,
        name: 'Sintonia Elemental',
        text: 'No início do seu turno, gaste 1 Ponto de Foco: por 10 minutos (ou até ficar Incapacitado) seus Ataques Desarmados podem causar dano Ácido, Elétrico, Gélido, Ígneo ou Trovejante, e o alcance deles aumenta em 3 m. Ao causar um desses danos, pode forçar salvaguarda de Força: se falhar, o alvo é movido até 3 m para perto ou para longe de você.',
        activation: [
          {
            id: 'elemental-attunement',
            name: 'Sintonia Elemental',
            mode: 'toggle',
            cost: { resource: 'focus-points', amount: 1 },
            effects: [
              {
                type: 'note',
                text: 'Ataques Desarmados com dano elemental à escolha e alcance +3 m.',
              },
            ],
          },
        ],
      },
      {
        id: 'elemental-burst',
        level: 6,
        name: 'Explosão Elemental',
        text: 'Com a ação Usar Magia, gaste 2 Pontos de Foco: uma Esfera de 6 m de raio num ponto a até 36 m, com um tipo de dano elemental à escolha (Ácido, Elétrico, Gélido, Ígneo ou Trovejante). Salvaguarda de Destreza: falha sofre 3 jogadas do dado de Artes Marciais, sucesso sofre metade.',
        activation: [
          {
            id: 'elemental-burst',
            name: 'Explosão Elemental',
            mode: 'use',
            cost: { resource: 'focus-points', amount: 2 },
            effects: [],
          },
        ],
      },
      {
        id: 'stride-of-the-elements',
        level: 11,
        name: 'Passo dos Elementos',
        text: 'Com a Sintonia Elemental ativa, você também tem Deslocamento de Natação e de Voo iguais ao seu Deslocamento.',
      },
      {
        id: 'elemental-epitome',
        level: 17,
        name: 'Ápice Elemental',
        text: 'Com a Sintonia Elemental ativa: uma vez por turno, um Ataque Desarmado que acerte causa dano extra de uma jogada do dado de Artes Marciais, do mesmo tipo do ataque. Passo do Vento dá +6 m de Deslocamento e causa essa mesma jogada de dano (tipo elemental à escolha, uma vez por turno por criatura) a quem você passar a até 1,5 m. Você tem Resistência a um tipo elemental, trocável no início de cada turno.',
      },
    ],
  },
];
