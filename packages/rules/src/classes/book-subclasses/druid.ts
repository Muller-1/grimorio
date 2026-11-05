import type { SubclassDef } from '../types';

/** Subclasses do Livro do Jogador 2024 que o SRD não traz (texto nosso). */
export const BOOK_SUBCLASSES: SubclassDef[] = [
  {
    id: 'moon',
    source: 'book',
    name: 'Círculo da Lua',
    tagline: 'Druidas que se transformam sob a lua em feras poderosas.',
    spells: {
      3: ['cure-wounds', 'starry-wisp', 'moonbeam'],
      5: ['conjure-animals'],
      7: ['fount-of-moonlight'],
      9: ['mass-cure-wounds'],
    },
    features: [
      {
        id: 'moon-circle-forms',
        level: 3,
        name: 'Formas Animais dos Círculos Druídicos',
        text: 'Na Forma Selvagem, o ND máximo da Fera é seu nível de Druida ÷ 3 (arredondado para baixo). Sua CA vira 13 + modificador de Sabedoria, se for maior que a da Fera, e você ganha PV Temporários iguais a 3 × seu nível de Druida.',
      },
      {
        id: 'moon-circle-spells',
        level: 3,
        name: 'Magias do Círculo da Lua',
        text: 'Magias sempre preparadas: Curar Ferimentos, Fagulha Estelar e Raio Lunar (nível 3); Invocar Animais (5); Fonte do Luar (7); Curar Ferimentos em Massa (9). Você pode conjurá-las enquanto estiver em Forma Selvagem.',
      },
      {
        id: 'moon-improved-forms',
        level: 6,
        name: 'Formas Animais dos Círculos Druídicos Aprimorada',
        text: 'Na Forma Selvagem, cada ataque pode causar o dano normal ou Radiante, à sua escolha a cada acerto. Você soma o modificador de Sabedoria às salvaguardas de Constituição.',
      },
      {
        id: 'moon-step',
        level: 10,
        name: 'Passo Lunar',
        text: 'Ação Bônus: teleporte-se até 9 m para um espaço desocupado à vista e tenha Vantagem na próxima jogada de ataque deste turno. Usos iguais ao modificador de Sabedoria (mínimo 1) por Descanso Longo; também recupera um uso gastando um espaço de 2º círculo ou superior (sem ação).',
        resource: {
          id: 'moon-step',
          name: 'Passo Lunar',
          max: { ability: 'wis', min: 1 },
          recharge: 'long',
        },
      },
      {
        id: 'lunar-form',
        level: 14,
        name: 'Forma Lunar',
        text: 'Uma vez por turno, causa 2d10 de dano Radiante extra num alvo que você acerta com um ataque da Forma Selvagem. Ao usar Passo Lunar, pode levar junto uma criatura voluntária a até 3 m, que chega a até 3 m do seu destino.',
      },
    ],
  },
  {
    id: 'stars',
    source: 'book',
    name: 'Círculo das Estrelas',
    tagline: 'Druidas que leem as constelações e brilham com seus poderes.',
    features: [
      {
        id: 'starry-form',
        level: 3,
        name: 'Forma Estrelada',
        text: 'Ação Bônus, gastando um uso de Forma Selvagem: assume uma forma luminosa por 10 minutos (sem multimorfar). Emite Luz Plena em 3 m e Meia-luz por mais 3 m. Ao assumir, escolha uma constelação: Arqueiro (Ação Bônus para ataque mágico à distância, 18 m, 1d8 Radiante + Sabedoria), Dragão (resultado 9 ou menos vira 10 em testes de Inteligência e Sabedoria e em salvaguardas de Constituição para Concentração) ou Taça (ao conjurar magia que cure com espaço, você ou outra criatura a até 9 m recupera 1d8 + Sabedoria).',
        activation: [
          {
            id: 'starry-form',
            name: 'Forma Estrelada',
            mode: 'toggle',
            cost: { resource: 'wild-shape', amount: 1 },
            effects: [
              {
                type: 'note',
                text: 'Constelação à escolha: Arqueiro, Dragão ou Taça. Você mantém suas estatísticas.',
              },
            ],
          },
        ],
        choice: {
          kind: 'option',
          label: 'Constelação',
          options: [
            {
              id: 'archer',
              name: 'Arqueiro',
              text: 'Ação Bônus: ataque mágico à distância (18 m), 1d8 Radiante + Sabedoria.',
            },
            {
              id: 'dragon',
              name: 'Dragão',
              text: 'Resultado 9 ou menos no d20 vira 10 em testes de Int e Sab e em salvaguardas de Con para Concentração.',
            },
            {
              id: 'chalice',
              name: 'Taça',
              text: 'Ao conjurar magia de cura com espaço, você ou criatura a até 9 m recupera 1d8 + Sabedoria.',
            },
          ],
        },
      },
      {
        id: 'star-map',
        level: 3,
        name: 'Mapa Estelar',
        text: 'Seu mapa estelar (objeto Minúsculo) serve de Foco de Conjuração. Com ele em mãos, você tem Orientação e Raio Guia preparadas e conjura Raio Guia sem espaço, um número de vezes igual ao modificador de Sabedoria (mínimo 1) por Descanso Longo. Se o perder, uma cerimônia de 1 hora cria outro.',
        resource: {
          id: 'star-map-guiding-bolt',
          name: 'Raio Guia (Mapa Estelar)',
          max: { ability: 'wis', min: 1 },
          recharge: 'long',
        },
        grantedSpells: { ids: ['guidance', 'guiding-bolt'] },
      },
      {
        id: 'cosmic-omen',
        level: 6,
        name: 'Presságio Cósmico',
        text: 'Após um Descanso Longo, jogue um dado: par é Prosperidade, ímpar é Infortúnio. Pela duração, use uma Reação quando uma criatura a até 9 m, à vista, fizer um Teste de D20 para somar (par) ou subtrair (ímpar) 1d6. Usos iguais ao modificador de Sabedoria (mínimo 1) por Descanso Longo.',
        resource: {
          id: 'cosmic-omen',
          name: 'Presságio Cósmico',
          max: { ability: 'wis', min: 1 },
          recharge: 'long',
        },
      },
      {
        id: 'twinkling-constellations',
        level: 10,
        name: 'Constelações Cintilantes',
        text: 'O 1d8 do Arqueiro e da Taça vira 2d8, e o Dragão dá Deslocamento de Voo de 6 m e permite pairar. No início de cada turno seu na Forma Estrelada, você pode trocar de constelação.',
      },
      {
        id: 'full-of-stars',
        level: 14,
        name: 'Repleto de Estrelas',
        text: 'Na Forma Estrelada, você fica parcialmente incorpóreo e tem Resistência a dano Contundente, Cortante e Perfurante.',
        conditional: [
          {
            when: ['starry-form'],
            effects: [{ type: 'resistance', damage: ['bludgeoning', 'slashing', 'piercing'] }],
          },
        ],
      },
    ],
  },
  {
    id: 'sea',
    source: 'book',
    name: 'Círculo do Mar',
    tagline: 'Druidas que canalizam as marés e as tempestades.',
    spells: {
      3: ['shatter', 'gust-of-wind', 'fog-cloud', 'thunderwave', 'ray-of-frost'],
      5: ['lightning-bolt', 'water-breathing'],
      7: ['control-water', 'ice-storm'],
      9: ['conjure-elemental', 'hold-monster'],
    },
    features: [
      {
        id: 'wrath-of-the-sea',
        level: 3,
        name: 'Ira do Mar',
        text: 'Ação Bônus, gastando um uso de Forma Selvagem: Emanação de 1,5 m de água por 10 minutos. Ao criar e, depois, como Ação Bônus, escolha uma criatura na Emanação: salvaguarda de Constituição contra sua CD ou sofre dano Gélido (d6s iguais ao modificador de Sabedoria, mínimo 1) e, se for Grande ou menor, é empurrada até 4,5 m.',
        activation: [
          {
            id: 'sea-wrath',
            name: 'Ira do Mar',
            mode: 'toggle',
            cost: { resource: 'wild-shape', amount: 1 },
            effects: [
              {
                type: 'note',
                text: 'Emanação de 1,5 m (3 m a partir do nível 6). Dano Gélido: Sabedoria d6 (mín. 1).',
              },
            ],
          },
        ],
      },
      {
        id: 'sea-circle-spells',
        level: 3,
        name: 'Magias do Círculo do Mar',
        text: 'Magias sempre preparadas: Despedaçar, Lufada de Vento, Névoa Obscurecente, Onda Trovejante e Raio de Gelo (nível 3); Relâmpago e Respirar na Água (5); Controlar Água e Tempestade Glacial (7); Invocar Elemental e Paralisar Monstro (9).',
      },
      {
        id: 'aquatic-affinity',
        level: 6,
        name: 'Afinidade Aquática',
        text: 'A Emanação da Ira do Mar passa a ter 3 m. Você ganha Deslocamento de Natação igual ao seu Deslocamento.',
      },
      {
        id: 'stormborn',
        level: 10,
        name: 'Filho da Tempestade',
        text: 'Com a Ira do Mar ativa, você tem Deslocamento de Voo igual ao seu Deslocamento e Resistência a dano Elétrico, Gélido e Trovejante.',
        conditional: [
          {
            when: ['sea-wrath'],
            effects: [{ type: 'resistance', damage: ['lightning', 'cold', 'thunder'] }],
          },
        ],
      },
      {
        id: 'oceanic-gift',
        level: 14,
        name: 'Manifestação Oceânica',
        text: 'Pode manifestar a Emanação ao redor de uma criatura voluntária a até 18 m, que ganha os benefícios usando sua CD e seu modificador de Sabedoria. Gastando dois usos de Forma Selvagem, a Emanação surge ao redor de você e dela.',
      },
    ],
  },
];
