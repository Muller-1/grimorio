import type { SubclassDef } from '../types';

/** Subclasses do Livro do Jogador 2024 que o SRD não traz (texto nosso). */

// Colunas por nível de Guerreiro (0 nos níveis 1–2).
const SUPERIORITY_DICE = [0, 0, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6];
const SUPERIORITY_DIE = [0, 0, 8, 8, 8, 8, 8, 8, 8, 10, 10, 10, 10, 10, 10, 10, 10, 12, 12, 12];
const PSIONIC_DICE = [0, 0, 4, 4, 6, 6, 6, 6, 8, 8, 8, 8, 10, 10, 10, 10, 12, 12, 12, 12];
const PSIONIC_DIE = [0, 0, 6, 6, 8, 8, 8, 8, 8, 8, 10, 10, 10, 10, 10, 10, 12, 12, 12, 12];

const MANEUVERS = [
  [
    'parry',
    'Aparar',
    'Reação ao sofrer dano de ataque corpo a corpo: reduz o dano pelo dado + Força ou Destreza.',
  ],
  [
    'menacing-attack',
    'Ataque Ameaçador',
    'Ao acertar: dado no dano; salvaguarda de Sabedoria ou Amedrontado até o fim do seu próximo turno.',
  ],
  [
    'sweeping-attack',
    'Ataque de Varredura',
    'Ao acertar corpo a corpo: outra criatura a até 1,5 m do alvo e ao seu alcance sofre o dado de dano se o ataque original a acertaria.',
  ],
  [
    'lunging-attack',
    'Ataque Estendido',
    'Ação Bônus: Correr. Se andar 1,5 m em linha reta antes de um ataque corpo a corpo, soma o dado ao dano.',
  ],
  [
    'distracting-strike',
    'Ataque para Distrair',
    'Ao acertar: dado no dano; o próximo ataque de outro atacante contra o alvo tem Vantagem até seu próximo turno.',
  ],
  [
    'precision-attack',
    'Ataque Preciso',
    'Ao errar um ataque: soma o dado à jogada, podendo acertar.',
  ],
  [
    'goading-attack',
    'Ataque Provocante',
    'Ao acertar: dado no dano; salvaguarda de Sabedoria ou Desvantagem em ataques contra outros que não você.',
  ],
  [
    'tactical-assessment',
    'Avaliação Tática',
    'Soma o dado em testes de Inteligência (História ou Investigação) ou Sabedoria (Intuição).',
  ],
  [
    'riposte',
    'Contra-ataque',
    'Reação quando uma criatura erra um ataque corpo a corpo contra você: ataca-a e, se acertar, soma o dado ao dano.',
  ],
  [
    'disarming-attack',
    'Desarme',
    'Ao acertar: dado no dano; salvaguarda de Força ou solta um objeto à sua escolha.',
  ],
  [
    'ambush',
    'Emboscada',
    'Soma o dado em testes de Destreza (Furtividade) ou na Iniciativa, se não estiver Incapacitado.',
  ],
  [
    'pushing-attack',
    'Encontrão',
    'Ao acertar: dado no dano; alvo Grande ou menor faz salvaguarda de Força ou é empurrado até 4,5 m.',
  ],
  [
    'feinting-attack',
    'Finta',
    'Ação Bônus contra criatura a até 1,5 m: Vantagem no próximo ataque contra ela no turno e, se acertar, soma o dado ao dano.',
  ],
  [
    'bait-and-switch',
    'Gato Por Lebre',
    'Troca de lugar com criatura voluntária a até 1,5 m, sem provocar; você ou ela ganha CA igual ao dado até seu próximo turno.',
  ],
  [
    'commanders-strike',
    'Golpe do Comandante',
    'Troca um ataque para um aliado usar a Reação num ataque, somando o dado ao dano se acertar.',
  ],
  [
    'maneuvering-attack',
    'Manobrar',
    'Ao acertar: dado no dano; um aliado usa a Reação para se mover até metade do Deslocamento sem provocar do alvo.',
  ],
  [
    'evasive-footwork',
    'Movimentação Evasiva',
    'Ação Bônus: Desengajar e soma o dado à CA até seu próximo turno.',
  ],
  [
    'rally',
    'Recuperar Energia',
    'Ação Bônus: aliado a até 9 m ganha PV Temporários iguais ao dado + metade do seu nível de Guerreiro.',
  ],
  [
    'commanding-presence',
    'Presença de Autoridade',
    'Soma o dado em testes de Carisma (Atuação, Intimidação ou Persuasão).',
  ],
  [
    'trip-attack',
    'Prostrar',
    'Ao acertar: dado no dano; alvo Grande ou menor faz salvaguarda de Força ou fica Caído.',
  ],
] as const;

/** "Nome: efeito." das manobras de `from` até `to`. */
const maneuverText = (from: number, to?: number) =>
  MANEUVERS.slice(from, to)
    .map(([, name, text]) => `${name}: ${text}`)
    .join(' ');

export const BOOK_SUBCLASSES: SubclassDef[] = [
  {
    id: 'eldritch-knight',
    source: 'book',
    name: 'Cavaleiro Místico',
    tagline: 'Junta o combate marcial a magias arcanas de proteção e explosão.',
    spellcasting: {
      ability: 'int',
      kind: 'third',
      list: 'wizard',
      cantrips: [0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
      prepared: [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13],
      swap: 'level-up',
    },
    features: [
      {
        id: 'eldritch-knight-spellcasting',
        level: 3,
        name: 'Conjuração',
        text: 'Conjura magias de Mago com Inteligência (um terço de conjurador) e usa um Foco Arcano. Conhece 2 truques (3 no nível 10) e prepara de 3 a 13 magias, conforme a tabela. A cada nível de Guerreiro, pode trocar um truque ou uma magia preparada.',
      },
      {
        id: 'eldritch-knight-weapon-bond',
        level: 3,
        name: 'Vínculo com Arma',
        text: 'Ritual de 1 hora (pode ser num Descanso Curto) vincula uma arma a você. Ela não pode ser desarmada, a menos que você esteja Incapacitado, e você a chama à mão com uma Ação Bônus. Até duas armas vinculadas, uma chamada por vez.',
      },
      {
        id: 'eldritch-knight-war-magic',
        level: 7,
        name: 'Magia de Guerra',
        text: 'Ao usar a ação Atacar, pode trocar um dos ataques por um truque de Mago de 1 ação.',
      },
      {
        id: 'eldritch-knight-eldritch-strike',
        level: 10,
        name: 'Golpe Místico',
        text: 'Ao atingir uma criatura com arma, ela tem Desvantagem na próxima salvaguarda contra uma magia sua conjurada antes do fim do seu próximo turno.',
      },
      {
        id: 'eldritch-knight-arcane-charge',
        level: 15,
        name: 'Investida Mística',
        text: 'Ao usar o Surto de Ação, pode se teleportar até 9 m para um espaço desocupado à vista, antes ou depois da ação adicional.',
      },
      {
        id: 'eldritch-knight-improved-war-magic',
        level: 18,
        name: 'Magia de Guerra Aprimorada',
        text: 'Ao usar a ação Atacar, pode trocar dois ataques por uma magia de Mago de 1º ou 2º círculo de 1 ação.',
      },
    ],
  },
  {
    id: 'psi-warrior',
    source: 'book',
    name: 'Combatente Psíquico',
    tagline: 'Reforça o corpo com energia psiônica, telecinese e barreiras mentais.',
    columns: { psionicDice: PSIONIC_DICE, psionicDie: PSIONIC_DIE },
    features: [
      {
        id: 'psi-warrior-psionic-power',
        level: 3,
        name: 'Poder Psiônico',
        text: 'Tem Dados de Energia Psiônica (4 d6 no nível 3, até 12 d12 no 17, conforme a tabela). Recupera 1 dado gasto no Descanso Curto e todos no Longo. Golpe Psiônico: 1x por turno, após causar dano com arma a alvo a até 9 m, gasta um dado e causa dano Energético igual ao resultado + modificador de Inteligência.',
        resource: {
          id: 'psi-warrior-psionic-energy',
          name: 'Dados de Energia Psiônica',
          max: { column: 'psionicDice' },
          recharge: 'short-one',
          die: { column: 'psionicDie' },
        },
      },
      {
        id: 'psi-warrior-telekinetic-movement',
        level: 3,
        name: 'Movimento Telecinético',
        text: 'Ação Usar Magia: move um objeto solto Grande ou menor, ou criatura voluntária, até 9 m dentro de 9 m de você (objeto Minúsculo pode ir à sua mão). Um uso por Descanso Curto ou Longo; gastar um Dado de Energia Psiônica o recupera.',
        resource: {
          id: 'psi-warrior-telekinetic-movement',
          name: 'Movimento Telecinético',
          max: 1,
          recharge: 'short',
        },
      },
      {
        id: 'psi-warrior-protective-field',
        level: 3,
        name: 'Vínculo Protetivo',
        text: 'Reação quando você ou criatura à vista a até 9 m sofre dano: gasta um Dado de Energia Psiônica e reduz o dano pelo resultado + modificador de Inteligência (mínimo 1).',
      },
      {
        id: 'psi-warrior-telekinetic-adept',
        level: 7,
        name: 'Estocada Telecinética',
        text: 'Ao causar dano com o Golpe Psiônico, o alvo faz salvaguarda de Força (CD 8 + Inteligência + Proficiência); se falhar, fica Caído ou é movido até 3 m na horizontal.',
      },
      {
        id: 'psi-warrior-psi-powered-leap',
        level: 7,
        name: 'Salto com Impulsão Psíquica',
        text: 'Ação Bônus: Deslocamento de Voo igual ao dobro do seu até o fim do turno. Um uso por Descanso Curto ou Longo; gastar um Dado de Energia Psiônica o recupera.',
        resource: {
          id: 'psi-warrior-leap',
          name: 'Salto com Impulsão Psíquica',
          max: 1,
          recharge: 'short',
        },
      },
      {
        id: 'psi-warrior-guarded-mind',
        level: 10,
        name: 'Resguardo Mental',
        text: 'Resistência a dano Psíquico. Ao começar o turno Amedrontado ou Enfeitiçado, gasta um Dado de Energia Psiônica e encerra esses efeitos em você.',
        passive: [{ type: 'resistance', damage: ['psychic'] }],
      },
      {
        id: 'psi-warrior-bulwark-of-force',
        level: 15,
        name: 'Baluarte de Energia',
        text: 'Ação Bônus: criaturas à sua escolha a até 9 m (incluindo você, até seu modificador de Inteligência, mínimo 1) têm Cobertura Parcial por 1 minuto ou até você ficar Incapacitado. Um uso por Descanso Longo; gastar um Dado de Energia Psiônica o recupera.',
        resource: {
          id: 'psi-warrior-bulwark',
          name: 'Baluarte de Energia',
          max: 1,
          recharge: 'long',
        },
      },
      {
        id: 'psi-warrior-telekinetic-master',
        level: 18,
        name: 'Mestre Telecinético',
        text: 'Sempre tem Telecinese preparada e a conjura sem espaço nem componentes, com Inteligência. Enquanto a mantém, faz um ataque com arma como Ação Bônus por turno. Uma vez por Descanso Longo; gastar um Dado de Energia Psiônica recupera o uso.',
        grantedSpells: { ids: ['telekinesis'], freePerLongRest: 1 },
      },
    ],
  },
  {
    id: 'battle-master',
    source: 'book',
    name: 'Mestre da Batalha',
    tagline: 'Estudioso da guerra que luta com manobras movidas a dados especiais.',
    columns: { superiorityDice: SUPERIORITY_DICE, superiorityDie: SUPERIORITY_DIE },
    features: [
      {
        id: 'battle-master-student-of-war',
        level: 3,
        name: 'Estudioso da Guerra',
        text: 'Ganha proficiência com um tipo de Ferramentas de Artesão e em uma perícia à escolha entre as de Guerreiro no nível 1.',
        choice: {
          kind: 'skill',
          count: 1,
          from: [
            'acrobatics',
            'animal-handling',
            'athletics',
            'history',
            'insight',
            'intimidation',
            'persuasion',
            'perception',
            'survival',
          ],
        },
      },
      {
        id: 'battle-master-combat-superiority',
        level: 3,
        name: 'Superioridade em Combate',
        text: 'Tem 4 Dados de Superioridade (d8), 5 no nível 7 e 6 no 15, restaurados em Descanso Curto ou Longo. Aprende 3 manobras (mais 2 nos níveis 7, 10 e 15, podendo trocar uma a cada vez); só uma manobra por ataque. CD de salvaguarda: 8 + Força ou Destreza + Proficiência.',
        resource: {
          id: 'battle-master-superiority-dice',
          name: 'Dados de Superioridade',
          max: { column: 'superiorityDice' },
          recharge: 'short',
          die: { column: 'superiorityDie' },
        },
      },
      // O jogador aprende várias manobras de uma vez (3 no nível 3), e a escolha de opção do
      // motor pega uma só: a lista fica no texto, em três partes (cada texto tem limite).
      {
        id: 'battle-master-maneuvers',
        level: 3,
        name: 'Opções de Manobra',
        text: `Você conhece 3 manobras (5 no nível 7, 7 no 10 e 9 no 15) e troca uma ao aprender novas; anote as suas. Uma por ataque, gastando um Dado de Superioridade. ${maneuverText(0, 6)}`,
      },
      {
        id: 'battle-master-maneuvers-2',
        level: 3,
        name: 'Opções de Manobra (continuação)',
        text: maneuverText(6, 13),
      },
      {
        id: 'battle-master-maneuvers-3',
        level: 3,
        name: 'Opções de Manobra (fim)',
        text: maneuverText(13),
      },
      {
        id: 'battle-master-know-your-enemy',
        level: 7,
        name: 'Conheça Seu Inimigo',
        text: 'Ação Bônus: sabe se uma criatura à vista a até 9 m tem Imunidades, Resistências ou Vulnerabilidades, e quais. Um uso por Descanso Longo; gastar um Dado de Superioridade recupera o uso.',
        resource: {
          id: 'battle-master-know-your-enemy',
          name: 'Conheça Seu Inimigo',
          max: 1,
          recharge: 'long',
        },
      },
      {
        id: 'battle-master-improved-combat-superiority',
        level: 10,
        name: 'Superioridade em Combate Aprimorada',
        text: 'Seus Dados de Superioridade passam a ser d10.',
      },
      {
        id: 'battle-master-relentless',
        level: 15,
        name: 'Implacável',
        text: 'Uma vez por turno, ao usar uma manobra, pode jogar 1d8 e usar o resultado em vez de gastar um Dado de Superioridade.',
      },
      {
        id: 'battle-master-ultimate-combat-superiority',
        level: 18,
        name: 'Superioridade em Combate Suprema',
        text: 'Seus Dados de Superioridade passam a ser d12.',
      },
    ],
  },
];
