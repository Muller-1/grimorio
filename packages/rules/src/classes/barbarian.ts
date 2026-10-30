import { asiFeatures, byLevel, epicBoon, extraAttack, subclassFeature } from './common';
import type { ClassProgression } from './types';

const STR_ATTACK = { ability: 'str' } as const;

export const BARBARIAN: ClassProgression = {
  classId: 'barbarian',
  columns: {
    rages: byLevel([
      [1, 2],
      [3, 3],
      [6, 4],
      [12, 5],
      [17, 6],
    ]),
    rageDamage: byLevel([
      [1, 2],
      [9, 3],
      [16, 4],
    ]),
    weaponMastery: byLevel([
      [1, 2],
      [4, 3],
      [10, 4],
    ]),
    brutalStrikeDice: byLevel([
      [1, 0],
      [9, 1],
      [17, 2],
    ]),
  },
  columnNames: {
    rages: 'Fúrias',
    rageDamage: 'Dano de Fúria',
    weaponMastery: 'Maestria em Arma',
    brutalStrikeDice: 'Dados do Golpe Brutal',
  },
  subclassLevels: [3, 6, 10, 14],
  features: [
    {
      id: 'rage',
      level: 1,
      name: 'Fúria',
      text: 'Ação Bônus, sem armadura Pesada. Enquanto dura: Resistência a dano Contundente, Cortante e Perfurante; bônus de Dano de Fúria nos ataques que usam Força; Vantagem em testes e salvaguardas de Força; sem Concentração e sem conjurar magias. Dura até o fim do seu próximo turno e se estende atacando um inimigo, forçando uma salvaguarda ou com uma Ação Bônus (até 10 minutos). Descanso Curto devolve 1 uso; Longo, todos.',
      resource: { id: 'rage', name: 'Fúria', max: { column: 'rages' }, recharge: 'short-one' },
      activation: [
        {
          id: 'rage',
          name: 'Fúria',
          mode: 'toggle',
          cost: { resource: 'rage', amount: 1 },
          effects: [
            { type: 'damage-bonus', value: { column: 'rageDamage' }, filter: STR_ATTACK },
            { type: 'resistance', damage: ['bludgeoning', 'piercing', 'slashing'] },
            { type: 'advantage', on: ['check:str', 'save:str'] },
            { type: 'note', text: 'Sem Concentração e sem conjurar magias.' },
          ],
        },
      ],
    },
    {
      id: 'unarmored-defense',
      level: 1,
      name: 'Defesa sem Armadura',
      text: 'Sem armadura, sua CA base é 10 + Destreza + Constituição. Pode usar Escudo.',
      passive: [{ type: 'ac-formula', base: 10, abilities: ['con'], shield: true }],
    },
    {
      id: 'weapon-mastery',
      level: 1,
      name: 'Maestria em Arma',
      text: 'Use as propriedades de maestria de tipos de arma corpo a corpo à sua escolha (a quantidade cresce com o nível). A cada Descanso Longo, pode trocar uma escolha.',
    },
    {
      id: 'danger-sense',
      level: 2,
      name: 'Sentido de Perigo',
      text: 'Vantagem em salvaguardas de Destreza, a menos que esteja Incapacitado.',
      passive: [{ type: 'advantage', on: ['save:dex'] }],
    },
    {
      id: 'reckless-attack',
      level: 2,
      name: 'Ataque Imprudente',
      text: 'Ao fazer o primeiro ataque do turno, você pode atacar de forma imprudente: Vantagem nos ataques com Força até o início do seu próximo turno, mas ataques contra você também têm Vantagem.',
      activation: [
        {
          id: 'reckless-attack',
          name: 'Ataque Imprudente',
          mode: 'toggle',
          effects: [
            { type: 'advantage', on: ['attack:str'] },
            {
              type: 'note',
              text: 'Ataques contra você têm Vantagem até o início do seu próximo turno.',
            },
          ],
        },
      ],
    },
    subclassFeature(3, 'Bárbaro'),
    {
      id: 'primal-knowledge',
      level: 3,
      name: 'Conhecimento Primordial',
      text: 'Proficiência em mais uma perícia da lista do Bárbaro. Em Fúria, testes de Acrobacia, Furtividade, Intimidação, Percepção e Sobrevivência podem usar Força.',
      choice: {
        kind: 'skill',
        count: 1,
        from: ['animal-handling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'],
      },
    },
    ...asiFeatures([4, 8, 12, 16]),
    extraAttack(5),
    {
      id: 'fast-movement',
      level: 5,
      name: 'Movimento Rápido',
      text: 'Seu Deslocamento aumenta em 3 metros enquanto não usa armadura Pesada.',
      passive: [{ type: 'speed-bonus', ft: 10 }],
    },
    {
      id: 'feral-instinct',
      level: 7,
      name: 'Instintos Primitivos',
      text: 'Vantagem nas jogadas de Iniciativa.',
      passive: [{ type: 'advantage', on: ['initiative'] }],
    },
    {
      id: 'instinctive-pounce',
      level: 7,
      name: 'Bote Instintivo',
      text: 'Na Ação Bônus de entrar em Fúria, você pode se mover até metade do seu Deslocamento.',
    },
    {
      id: 'brutal-strike',
      level: 9,
      name: 'Golpe Brutal',
      text: 'Com Ataque Imprudente, abra mão da Vantagem em um ataque de Força do turno (sem Desvantagem). Se acertar: +1d10 de dano do mesmo tipo e um efeito à escolha — Golpe Forçado (empurra 4,5 m e você pode se aproximar até metade do Deslocamento sem provocar Ataques de Oportunidade) ou Golpe Incapacitante (Deslocamento do alvo −4,5 m até o início do seu próximo turno).',
      activation: [
        {
          id: 'brutal-strike',
          name: 'Golpe Brutal',
          mode: 'toggle',
          requires: ['reckless-attack'],
          effects: [
            {
              type: 'extra-damage',
              dice: { count: { column: 'brutalStrikeDice' }, die: 10 },
              filter: STR_ATTACK,
              oncePerTurn: true,
            },
            { type: 'note', text: 'Esse ataque é feito sem a Vantagem do Ataque Imprudente.' },
          ],
        },
      ],
    },
    {
      id: 'relentless-rage',
      level: 11,
      name: 'Fúria Implacável',
      text: 'Se cair a 0 PV em Fúria sem morrer na hora, faça uma salvaguarda de Constituição CD 10: com sucesso, fica com PV iguais ao dobro do seu nível de Bárbaro. A CD sobe 5 a cada uso e volta a 10 num Descanso Curto ou Longo.',
    },
    {
      id: 'improved-brutal-strike-13',
      level: 13,
      name: 'Golpe Brutal Fortalecido',
      text: 'Novos efeitos do Golpe Brutal: Golpe Cambaleante (o alvo tem Desvantagem na próxima salvaguarda e não faz Ataques de Oportunidade até o início do seu próximo turno) e Golpe Destruidor (o próximo ataque de outra criatura contra o alvo, antes do seu próximo turno, ganha +5).',
    },
    {
      id: 'persistent-rage',
      level: 15,
      name: 'Fúria Persistente',
      text: 'Ao rolar Iniciativa, pode recuperar todos os usos de Fúria (uma vez por Descanso Longo). A Fúria dura 10 minutos sem precisar ser estendida e só termina se ficar Inconsciente ou vestir armadura Pesada.',
    },
    {
      id: 'improved-brutal-strike-17',
      level: 17,
      name: 'Golpe Brutal Fortalecido',
      text: 'O dano extra do Golpe Brutal sobe para 2d10, e você pode aplicar dois efeitos diferentes a cada uso.',
    },
    {
      id: 'indomitable-might',
      level: 18,
      name: 'Força Indomável',
      text: 'Se o total de um teste ou salvaguarda de Força for menor que o seu valor de Força, use o valor de Força no lugar.',
    },
    epicBoon('Dádiva do Ataque Irresistível'),
    {
      id: 'primal-champion',
      level: 20,
      name: 'Campeão Primitivo',
      text: 'Força e Constituição aumentam em 4, até o máximo de 25.',
      abilityIncrease: { abilities: { str: 4, con: 4 }, max: 25 },
    },
  ],
  subclasses: [
    {
      id: 'berserker',
      name: 'Trilha do Berserker',
      tagline: 'Canaliza a Fúria em violência descontrolada.',
      features: [
        {
          id: 'frenzy',
          level: 3,
          name: 'Frenesi',
          text: 'Com a Fúria ativa e usando Ataque Imprudente, o primeiro alvo que você acerta no turno com um ataque de Força sofre dano extra: role tantos d6 quanto o seu bônus de Dano de Fúria. O dano é do mesmo tipo da arma ou do Ataque Desarmado.',
          conditional: [
            {
              when: ['rage', 'reckless-attack'],
              effects: [
                {
                  type: 'extra-damage',
                  dice: { count: { column: 'rageDamage' }, die: 6 },
                  filter: STR_ATTACK,
                  oncePerTurn: true,
                },
              ],
            },
          ],
        },
        {
          id: 'mindless-rage',
          level: 6,
          name: 'Fúria Irracional',
          text: 'Em Fúria, Imunidade às condições Enfeitiçado e Amedrontado; se já estiver assim ao entrar em Fúria, a condição termina.',
        },
        {
          id: 'retaliation',
          level: 10,
          name: 'Retaliação',
          text: 'Ao sofrer dano de uma criatura a até 1,5 m, use sua Reação para fazer um ataque corpo a corpo contra ela.',
        },
        {
          id: 'intimidating-presence',
          level: 14,
          name: 'Presença Intimidante',
          text: 'Ação Bônus: criaturas à sua escolha numa Emanação de 9 m fazem salvaguarda de Sabedoria (CD 8 + Força + Bônus de Proficiência) ou ficam Amedrontadas por 1 minuto, repetindo a salvaguarda no fim de cada turno delas. Uma vez por Descanso Longo, ou gaste um uso de Fúria para usar de novo.',
          resource: {
            id: 'intimidating-presence',
            name: 'Presença Intimidante',
            max: 1,
            recharge: 'long',
          },
        },
      ],
    },
  ],
};
