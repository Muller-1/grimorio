import { byLevel } from '../common';
import type { SubclassDef } from '../types';

/** Subclasses do Livro do Jogador 2024 que o SRD não traz (texto nosso). */
export const BOOK_SUBCLASSES: SubclassDef[] = [
  {
    id: 'soulknife',
    source: 'book',
    name: 'Adaga Espiritual',
    tagline: 'Ladino psiônico que ataca com lâminas de energia psíquica e usa a mente como arma.',
    // Tabela "Dados de Energia do Adaga Espiritual": tipo e quantidade por nível de Ladino.
    columns: {
      psionicDie: byLevel([
        [1, 0],
        [3, 6],
        [5, 8],
        [11, 10],
        [17, 12],
      ]),
      psionicDice: byLevel([
        [1, 0],
        [3, 4],
        [5, 6],
        [9, 8],
        [13, 10],
        [17, 12],
      ]),
    },
    features: [
      {
        id: 'psychic-blades',
        level: 3,
        name: 'Lâminas Psíquicas',
        text: 'Ao Atacar ou fazer um Ataque de Oportunidade, manifeste uma lâmina na mão livre: arma Simples corpo a corpo, 1d6 Psíquico + o modificador do ataque, Acuidade, Arremesso (18/36 m) e Maestria Afligir (não conta no limite). Some na mão livre, após atacar, um segundo ataque como Ação Bônus com 1d4.',
      },
      {
        id: 'psionic-power',
        level: 3,
        name: 'Poder Psiônico',
        text: 'Você tem Dados de Energia Psiônica (tipo e quantidade na tabela da subclasse) que alimentam os poderes desta subclasse. Recupera um dado gasto num Descanso Curto e todos num Descanso Longo.',
        resource: {
          id: 'psionic-energy',
          name: 'Dados de Energia Psiônica',
          max: { column: 'psionicDice' },
          recharge: 'short-one',
          die: { column: 'psionicDie' },
        },
      },
      {
        id: 'psi-bolstered-knack',
        level: 3,
        name: 'Aptidão Reforçada Psiquicamente',
        text: 'Ao falhar num teste com perícia ou ferramenta em que tem proficiência, jogue um Dado de Energia Psiônica e some ao teste. O dado só é gasto se o teste passar a ser bem-sucedido.',
      },
      {
        id: 'psychic-whispers',
        level: 3,
        name: 'Sussurros Psíquicos',
        text: 'Ação Usar Magia: escolha criaturas à vista até seu Bônus de Proficiência e jogue um Dado de Energia Psiônica; por esse número de horas elas conversam telepaticamente com você a até 1,5 km. A primeira vez após um Descanso Longo não gasta o dado.',
      },
      {
        id: 'homing-strikes',
        level: 9,
        name: 'Golpes Teleguiados',
        text: 'Ao errar com a Lâmina Psíquica, jogue um Dado de Energia Psiônica e some à jogada de ataque. O dado só é gasto se o ataque passar a acertar.',
      },
      {
        id: 'psychic-teleportation',
        level: 9,
        name: 'Teleporte Psíquico',
        text: 'Ação Bônus: manifeste uma Lâmina Psíquica, gaste e jogue um Dado de Energia Psiônica e arremesse-a a um espaço desocupado à vista, a até 3 m vezes o resultado. Você se teleporta para lá e a lâmina some.',
      },
      {
        id: 'psychic-veil',
        level: 13,
        name: 'Véu Psíquico',
        text: 'Ação Usar Magia: fica Invisível por 1 hora ou até encerrar (sem ação). Acaba se causar dano ou forçar uma salvaguarda. Volta num Descanso Longo ou gastando um Dado de Energia Psiônica (sem ação).',
        resource: { id: 'psychic-veil', name: 'Véu Psíquico', max: 1, recharge: 'long' },
      },
      {
        id: 'rend-mind',
        level: 17,
        name: 'Rasgar Mente',
        text: 'Ao causar Ataque Furtivo com Lâmina Psíquica, force salvaguarda de Sabedoria (CD 8 + Destreza + Proficiência): em falha, Atordoado por 1 minuto, repetindo no fim de cada turno dele. Volta num Descanso Longo ou gastando três Dados de Energia Psiônica.',
        resource: { id: 'rend-mind', name: 'Rasgar Mente', max: 1, recharge: 'long' },
      },
    ],
  },
  {
    id: 'assassin',
    source: 'book',
    name: 'Assassino',
    tagline: 'Furtividade, veneno e disfarce a serviço da eliminação eficiente de alvos.',
    features: [
      {
        id: 'assassinate-initiative',
        level: 3,
        name: 'Assassinar: Iniciativa',
        text: 'Você tem Vantagem nas jogadas de Iniciativa.',
        passive: [{ type: 'advantage', on: ['initiative'] }],
      },
      {
        id: 'assassinate-surprise',
        level: 3,
        name: 'Assassinar: Golpe Surpreendente',
        text: 'Na primeira rodada de cada combate, você tem Vantagem nos ataques contra criaturas que ainda não jogaram o turno. Se seu Ataque Furtivo acertar nessa rodada, o alvo sofre dano extra, do tipo da arma, igual ao seu nível de Ladino.',
        passive: [
          {
            type: 'note',
            text: 'Primeira rodada: Vantagem contra quem não agiu e Ataque Furtivo com dano extra igual ao nível de Ladino.',
            situational: true,
          },
        ],
      },
      {
        id: 'assassin-tools',
        level: 3,
        name: 'Ferramentas de Assassino',
        text: 'Você recebe um Kit de Disfarce e um Kit de Veneno, com proficiência neles.',
      },
      {
        id: 'infiltration-expertise',
        level: 9,
        name: 'Especialista em Infiltração',
        text: 'Imite perfeitamente a fala ou a caligrafia de alguém após 1 hora de estudo. Além disso, a Mira Firme não reduz mais seu Deslocamento a 0.',
      },
      {
        id: 'envenom-weapons',
        level: 13,
        name: 'Armas Venenosas',
        text: 'Quando um alvo falha na salvaguarda do Envenenar do seu Golpe Astuto, ele também sofre 2d6 de dano Venenoso, que ignora Resistência a dano Venenoso.',
      },
      {
        id: 'death-strike',
        level: 17,
        name: 'Golpe Mortal',
        text: 'Se seu Ataque Furtivo acertar na primeira rodada de um combate, o alvo faz salvaguarda de Constituição (CD 8 + Destreza + Proficiência); em falha, o dano do ataque dobra.',
      },
    ],
  },
  {
    id: 'arcane-trickster',
    source: 'book',
    name: 'Trapaceiro Arcano',
    tagline: 'Ladino que alia furtividade e agilidade a truques e magias arcanas de Mago.',
    spellcasting: {
      ability: 'int',
      kind: 'third',
      list: 'wizard',
      cantrips: byLevel([
        [1, 0],
        [3, 3],
        [10, 4],
      ]),
      prepared: [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13],
      swap: 'level-up',
    },
    features: [
      {
        id: 'arcane-trickster-spellcasting',
        level: 3,
        name: 'Conjuração',
        text: 'Conjura magias de Mago com Inteligência (pode usar Foco Arcano). Conhece Mãos Mágicas e mais dois truques de Mago (um quarto no nível 10). Prepara magias de 1º círculo ou superior conforme a tabela e troca um truque (menos Mãos Mágicas) e uma magia a cada nível de Ladino. Recupera espaços num Descanso Longo.',
      },
      {
        id: 'mage-hand-legerdemain',
        level: 3,
        name: 'Mãos Mágicas Ligeiras',
        text: 'Conjure Mãos Mágicas como Ação Bônus e torne a mão Invisível. Controle-a como Ação Bônus e use-a para testes de Destreza (Prestidigitação).',
      },
      {
        id: 'magical-ambush',
        level: 9,
        name: 'Emboscada Mágica',
        text: 'Se estiver Invisível ao conjurar uma magia em uma criatura, ela tem Desvantagem em qualquer salvaguarda contra a magia nesse turno.',
      },
      {
        id: 'versatile-trickster',
        level: 13,
        name: 'Trapaceiro Versátil',
        text: 'Ao usar um efeito de Golpe Astuto num ataque, aplique-o também a outra criatura a até 1,5 m da mão espectral.',
      },
      {
        id: 'spell-thief',
        level: 17,
        name: 'Ladrão de Magias',
        text: 'Reação, logo após uma criatura conjurar magia que o alveje ou o inclua: ela faz salvaguarda de Inteligência (sua CD de magia). Em falha, você anula o efeito contra si e, se for de 1º círculo ou de um círculo que você conjure, a tem preparada por 8 horas e ela não pode conjurá-la. Volta num Descanso Longo.',
        resource: { id: 'spell-thief', name: 'Ladrão de Magias', max: 1, recharge: 'long' },
      },
    ],
  },
];
