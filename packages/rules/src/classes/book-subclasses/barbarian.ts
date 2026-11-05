import type { SubclassDef } from '../types';

/** Subclasses do Livro do Jogador 2024 que o SRD não traz (texto nosso). */

// Tudo, menos estes tipos, entra na Resistência do Urso (a Fúria já cobre os físicos).

// Dados do Campeão dos Deuses: 4 no 3, 5 no 6, 6 no 12, 7 no 17.
const DADOS_CAMPEAO = [0, 0, 4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 7, 7, 7, 7] as const;

export const BOOK_SUBCLASSES: SubclassDef[] = [
  {
    id: 'world-tree',
    source: 'book',
    name: 'Trilha da Árvore do Mundo',
    tagline: 'Liga a Fúria à árvore cósmica para ganhar vitalidade e cruzar distâncias.',
    features: [
      {
        id: 'world-tree-invigorating-strength',
        level: 3,
        name: 'Força Revigorante',
        text: 'No início de cada turno seu com a Fúria ativa, escolha outra criatura a até 3 m: ela ganha Pontos de Vida Temporários, rolando tantos d6 quanto o seu bônus de Dano da Fúria. Os que sobrarem somem quando a Fúria acaba.',
      },
      {
        id: 'world-tree-vitality-surge',
        level: 3,
        name: 'Surto de Vitalidade',
        text: 'Ao ativar a Fúria, você ganha Pontos de Vida Temporários iguais ao seu nível de Bárbaro.',
      },
      {
        id: 'world-tree-branches',
        level: 6,
        name: 'Ramos da Árvore',
        text: 'Com a Fúria ativa, quando uma criatura que você vê começa o turno a até 9 m, use sua Reação: ela faz salvaguarda de Força (CD 8 + Força + Bônus de Proficiência) ou é teleportada para um espaço livre a até 1,5 m de você. Depois, você pode reduzir o Deslocamento dela a 0 até o fim do turno.',
      },
      {
        id: 'world-tree-battering-roots',
        level: 10,
        name: 'Raízes Devastadoras',
        text: 'No seu turno, o alcance das suas armas corpo a corpo com propriedade Pesada ou Versátil aumenta em 3 m. Ao acertar com elas no seu turno, você pode ativar a maestria Derrubar ou Empurrar além de outra maestria que estiver usando.',
        passive: [
          {
            type: 'note',
            text: 'No seu turno, +3 m de alcance com armas corpo a corpo Pesadas ou Versáteis.',
            situational: true,
          },
        ],
      },
      {
        id: 'world-tree-travel-along',
        level: 14,
        name: 'Percorrer a Árvore',
        text: 'Ao ativar a Fúria, e como Ação Bônus enquanto ela durar, você se teleporta até 18 m para um espaço livre à vista. Uma vez por Fúria, o alcance sobe para 45 m e você leva até seis criaturas voluntárias a até 3 m, que chegam a até 3 m do destino.',
      },
    ],
  },
  {
    id: 'wild-heart',
    source: 'book',
    name: 'Trilha do Coração Selvagem',
    tagline: 'Parente dos animais, extrai poder bestial da própria Fúria.',
    features: [
      {
        id: 'wild-heart-speaker-for-the-fauna',
        level: 3,
        name: 'Arauto da Fauna',
        text: 'Você conjura Falar com Animais e Sentido Feral, só como Rituais, usando Sabedoria como atributo de conjuração.',
        grantedSpells: { ids: ['speak-with-animals', 'beast-sense'] },
      },
      {
        id: 'wild-heart-rage-of-the-wilds',
        level: 3,
        name: 'Fúria dos Selvagens',
        text: 'Cada vez que ativa a Fúria, você escolhe uma opção animal que dura enquanto ela estiver ativa.',
        choice: {
          kind: 'option',
          label: 'Animal da Fúria',
          options: [
            {
              id: 'eagle',
              name: 'Águia',
              text: 'Correr e Desengajar como parte da Ação Bônus da Fúria e, depois, como Ação Bônus enquanto ela durar.',
            },
            {
              id: 'wolf',
              name: 'Lobo',
              text: 'Seus aliados têm Vantagem nos ataques contra inimigos a até 1,5 m de você.',
            },
            {
              id: 'bear',
              name: 'Urso',
              text: 'Resistência a todos os tipos de dano, exceto Energético, Necrótico, Psíquico e Radiante.',
            },
          ],
        },
        optionEffects: {
          eagle: [
            {
              type: 'note',
              text: 'Correr e Desengajar como parte da Ação Bônus da Fúria e como Ação Bônus durante ela.',
            },
          ],
          wolf: [
            {
              type: 'note',
              text: 'Aliados têm Vantagem nos ataques contra inimigos a até 1,5 m de você.',
              situational: true,
            },
          ],
          // Só vale em Fúria, e o motor não junta "opção escolhida" com "Fúria ligada": lembrete.
          bear: [
            {
              type: 'note',
              text: 'Em Fúria: Resistência a todos os tipos de dano, exceto Energético, Necrótico, Psíquico e Radiante.',
              situational: true,
            },
          ],
        },
      },
      {
        id: 'wild-heart-aspect-of-the-wilds',
        level: 6,
        name: 'Aspecto dos Selvagens',
        text: 'Escolha uma opção animal permanente; você pode trocá-la a cada Descanso Longo.',
        choice: {
          kind: 'option',
          label: 'Aspecto',
          options: [
            {
              id: 'owl',
              name: 'Coruja',
              text: 'Visão no Escuro de 18 m (ou +18 m se você já a tem).',
            },
            {
              id: 'panther',
              name: 'Pantera',
              text: 'Deslocamento de Escalada igual ao seu Deslocamento.',
            },
            {
              id: 'salmon',
              name: 'Salmão',
              text: 'Deslocamento de Natação igual ao seu Deslocamento.',
            },
          ],
        },
      },
      {
        id: 'wild-heart-nature-speaker',
        level: 10,
        name: 'Arauto da Natureza',
        text: 'Você conjura Comunhão com a Natureza, só como Ritual, usando Sabedoria como atributo de conjuração.',
        grantedSpells: { ids: ['commune-with-nature'] },
      },
      {
        id: 'wild-heart-power-of-the-wilds',
        level: 14,
        name: 'Poder dos Selvagens',
        text: 'Cada vez que ativa a Fúria, você escolhe uma opção animal que dura enquanto ela estiver ativa.',
        choice: {
          kind: 'option',
          label: 'Animal do Poder',
          options: [
            {
              id: 'ram',
              name: 'Carneiro',
              text: 'Ao acertar um ataque corpo a corpo, pode deixar uma criatura Grande ou menor Caída.',
            },
            {
              id: 'falcon',
              name: 'Falcão',
              text: 'Deslocamento de Voo igual ao seu Deslocamento, se não usar armadura.',
            },
            {
              id: 'lion',
              name: 'Leão',
              text: 'Inimigos a até 1,5 m têm Desvantagem nos ataques contra outros alvos que não você ou outro Bárbaro com esta opção.',
            },
          ],
        },
        optionEffects: {
          ram: [
            {
              type: 'note',
              text: 'Ataque corpo a corpo que acerta pode impor Caído em criatura Grande ou menor.',
              situational: true,
            },
          ],
          falcon: [
            {
              type: 'note',
              text: 'Deslocamento de Voo igual ao Deslocamento, sem armadura.',
              situational: true,
            },
          ],
          lion: [
            {
              type: 'note',
              text: 'Inimigos a até 1,5 m têm Desvantagem contra alvos que não sejam você ou outro Bárbaro com a opção Leão.',
              situational: true,
            },
          ],
        },
      },
    ],
  },
  {
    id: 'zealot',
    source: 'book',
    name: 'Trilha do Fanático',
    tagline: 'Vive a Fúria como êxtase divino, golpeando e se curando com poder dos deuses.',
    columns: { zealotDice: DADOS_CAMPEAO },
    features: [
      {
        id: 'zealot-champion-of-the-gods',
        level: 3,
        name: 'Campeão dos Deuses',
        text: 'Você tem uma reserva de d12s (4 no nível 3, 5 no 6, 6 no 12, 7 no 17). Como Ação Bônus, gaste dados, role-os e recupere Pontos de Vida iguais ao total. Descanso Longo restaura todos.',
        resource: {
          id: 'zealot-champion-dice',
          name: 'Campeão dos Deuses',
          max: { column: 'zealotDice' },
          recharge: 'long',
          pool: true,
          die: 12,
        },
      },
      {
        id: 'zealot-divine-fury',
        level: 3,
        name: 'Fúria Divina',
        text: 'Em cada turno seu com a Fúria ativa, a primeira criatura que você atinge com arma ou Ataque Desarmado sofre 1d6 mais metade do seu nível de Bárbaro (arredondado para baixo) de dano extra, Necrótico ou Radiante à sua escolha a cada vez.',
      },
      {
        id: 'zealot-fanatical-focus',
        level: 6,
        name: 'Concentração Fanática',
        text: 'Uma vez por Fúria, ao falhar numa salvaguarda, você pode jogá-la de novo com bônus igual ao seu bônus de Dano da Fúria e deve ficar com o novo resultado.',
      },
      {
        id: 'zealot-zealous-presence',
        level: 10,
        name: 'Presença Zelosa',
        text: 'Ação Bônus: até dez outras criaturas à sua escolha a até 18 m têm Vantagem em jogadas de ataque e salvaguardas até o início do seu próximo turno. Uma vez por Descanso Longo, ou gaste um uso de Fúria para recuperar o uso.',
        resource: {
          id: 'zealot-zealous-presence',
          name: 'Presença Zelosa',
          max: 1,
          recharge: 'long',
        },
      },
      {
        id: 'zealot-rage-of-the-gods',
        level: 14,
        name: 'Fúria dos Deuses',
        text: 'Ao ativar a Fúria, você pode assumir a forma de um combatente divino por 1 minuto ou até chegar a 0 PV. Ganha Resistência a dano Necrótico, Psíquico e Radiante e Deslocamento de Voo igual ao Deslocamento, podendo pairar. Como Reação, gaste um uso de Fúria para deixar um aliado a até 9 m que chegaria a 0 PV com PV iguais ao seu nível de Bárbaro. Uma vez por Descanso Longo.',
        resource: {
          id: 'zealot-rage-of-the-gods',
          name: 'Fúria dos Deuses',
          max: 1,
          recharge: 'long',
        },
        activation: [
          {
            id: 'zealot-rage-of-the-gods',
            name: 'Fúria dos Deuses',
            mode: 'toggle',
            cost: { resource: 'zealot-rage-of-the-gods', amount: 1 },
            effects: [
              { type: 'resistance', damage: ['necrotic', 'psychic', 'radiant'] },
              { type: 'note', text: 'Deslocamento de Voo igual ao Deslocamento; pode pairar.' },
            ],
          },
        ],
      },
    ],
  },
];
