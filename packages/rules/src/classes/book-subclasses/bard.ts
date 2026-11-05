import type { SubclassDef } from '../types';

/** Subclasses do Livro do Jogador 2024 que o SRD não traz (texto nosso). */
export const BOOK_SUBCLASSES: SubclassDef[] = [
  {
    id: 'valor',
    source: 'book',
    name: 'Colégio da Bravura',
    tagline: 'Canta os feitos dos heróis antigos e luta ao lado de quem os repete.',
    features: [
      {
        id: 'valor-combat-inspiration',
        level: 3,
        name: 'Inspiração em Combate',
        text: 'Quem tem um dado de Inspiração de Bardo seu pode usá-lo de duas formas. Defensivo: ao ser atingido, use a Reação e some o dado à CA contra aquele ataque. Ofensivo: logo após acertar um ataque, some o dado ao dano.',
      },
      {
        id: 'valor-martial-training',
        level: 3,
        name: 'Treinamento Marcial',
        text: 'Você ganha proficiência com armas Marciais, armaduras Médias e treinamento com Escudos. Também pode usar uma arma Simples ou Marcial como Foco de Conjuração para suas magias de Bardo.',
      },
      {
        id: 'valor-extra-attack',
        level: 6,
        name: 'Ataque Extra',
        text: 'Ao executar a ação Atacar, você ataca duas vezes. Pode trocar um desses ataques por um truque seu com tempo de conjuração de uma ação.',
      },
      {
        id: 'valor-battle-magic',
        level: 14,
        name: 'Magia de Batalha',
        text: 'Depois de conjurar uma magia com tempo de conjuração de uma ação, você pode atacar com uma arma como Ação Bônus.',
      },
    ],
  },
  {
    id: 'dance',
    source: 'book',
    name: 'Colégio da Dança',
    tagline: 'Move-se em harmonia com o cosmos, com agilidade, velocidade e graça.',
    features: [
      {
        id: 'dance-dazzling-footwork',
        level: 3,
        name: 'Ginga Fascinante',
        text: 'Sem armadura nem Escudo: Vantagem em testes de Carisma (Atuação) dançando; pode usar Destreza nos Ataques Desarmados e, no lugar do dano normal, causar dano Contundente igual ao dado de Inspiração de Bardo mais Destreza (sem gastar o dado); CA base 10 + Destreza + Carisma; ao gastar Inspiração de Bardo numa ação, Ação Bônus ou Reação, faz um Ataque Desarmado junto.',
        passive: [
          { type: 'ac-formula', base: 10, abilities: ['cha'], shield: false },
          {
            type: 'note',
            text: 'Sem armadura nem Escudo: Vantagem em Atuação ao dançar; Ataque Desarmado com Destreza.',
            situational: true,
          },
        ],
      },
      {
        id: 'dance-tandem-footwork',
        level: 6,
        name: 'Gingado Coordenado',
        text: 'Ao jogar Iniciativa, se não estiver Incapacitado, você pode gastar um uso de Inspiração de Bardo e rolar o dado: você e cada aliado a até 9 m que o veja ou ouça somam o resultado à Iniciativa.',
      },
      {
        id: 'dance-leading-evasion-motion',
        level: 6,
        name: 'Movimento Inspirador',
        text: 'Quando um inimigo à vista termina o turno a até 1,5 m de você, use a Reação e gaste uma Inspiração de Bardo para se mover até metade do Deslocamento; um aliado a até 9 m também pode se mover até metade do dele com a própria Reação. Sem Ataques de Oportunidade.',
      },
      {
        id: 'dance-leading-evasion',
        level: 14,
        name: 'Evasão Liderada',
        text: 'Em salvaguardas de Destreza para metade do dano, você não sofre dano se passar e só metade se falhar. Pode estender isso a criaturas a até 1,5 m que também façam a salvaguarda. Não vale se você estiver Incapacitado.',
      },
    ],
  },
  {
    id: 'glamour',
    source: 'book',
    name: 'Colégio do Glamour',
    tagline: 'Tece magia feérica de beleza e terror e se envolve em majestade sobrenatural.',
    spells: {
      3: ['charm-person', 'mirror-image'],
      6: ['command'],
    },
    features: [
      {
        id: 'glamour-beguiling-magic',
        level: 3,
        name: 'Magia Fascinante',
        text: 'Você sempre tem Enfeitiçar Pessoa e Reflexos preparadas. Após conjurar uma magia de Encantamento ou Ilusão com espaço de magia, uma criatura à vista a até 18 m faz salvaguarda de Sabedoria contra sua CD ou fica Amedrontada ou Enfeitiçada (sua escolha) por 1 minuto, repetindo a salvaguarda no fim de cada turno dela. Uma vez por Descanso Longo, ou gaste uma Inspiração de Bardo para recuperar o uso.',
        resource: {
          id: 'glamour-beguiling-magic',
          name: 'Magia Fascinante',
          max: 1,
          recharge: 'long',
        },
      },
      {
        id: 'glamour-mantle-of-inspiration',
        level: 3,
        name: 'Manto de Inspiração',
        text: 'Ação Bônus: gaste uma Inspiração de Bardo e role o dado. Escolha criaturas a até 18 m, em número igual ao seu modificador de Carisma (mínimo 1). Cada uma ganha Pontos de Vida Temporários iguais a duas vezes o resultado e pode usar a Reação para se mover até o Deslocamento sem Ataques de Oportunidade.',
      },
      {
        id: 'glamour-mantle-of-majesty',
        level: 6,
        name: 'Manto de Majestade',
        text: 'Você sempre tem Comando preparada. Como Ação Bônus, conjure Comando sem espaço de magia e assuma aparência sobrenatural por 1 minuto (Concentração): nesse tempo, conjura Comando como Ação Bônus sem gastar espaço. Criaturas Enfeitiçadas por você falham automaticamente na salvaguarda contra esse Comando. Uma vez por Descanso Longo, ou gaste um espaço de 3º círculo ou superior.',
        resource: {
          id: 'glamour-mantle-of-majesty',
          name: 'Manto de Majestade',
          max: 1,
          recharge: 'long',
        },
      },
      {
        id: 'glamour-unbreakable-majesty',
        level: 14,
        name: 'Majestade Inquebrável',
        text: 'Ação Bônus: assuma uma presença majestosa por 1 minuto ou até ficar Incapacitado. Na primeira vez em cada turno que uma criatura o atinge com ataque, ela faz salvaguarda de Carisma contra sua CD ou o ataque falha. Uma vez por Descanso Curto ou Longo.',
        resource: {
          id: 'glamour-unbreakable-majesty',
          name: 'Majestade Inquebrável',
          max: 1,
          recharge: 'short',
        },
      },
    ],
  },
];
