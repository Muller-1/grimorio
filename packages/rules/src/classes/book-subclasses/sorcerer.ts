import type { SubclassDef } from '../types';

/** Subclasses do Livro do Jogador 2024 que o SRD não traz (texto nosso). */
export const BOOK_SUBCLASSES: SubclassDef[] = [
  {
    id: 'aberrant',
    source: 'book',
    name: 'Feitiçaria Aberrante',
    tagline: 'Poder psiônico vindo de uma influência alienígena.',
    spells: {
      3: ['calm-emotions', 'arms-of-hadar', 'detect-thoughts', 'dissonant-whispers', 'mind-sliver'],
      5: ['hunger-of-hadar', 'sending'],
      7: ['summon-aberration', 'black-tentacles'],
      9: ['telepathic-bond', 'telekinesis'],
    },
    features: [
      {
        id: 'telepathic-speech',
        level: 3,
        name: 'Fala Telepática',
        text: 'Ação Bônus: escolha uma criatura à vista a até 9 m. Vocês conversam por telepatia a até 1,5 km × modificador de Carisma (mínimo 1,5 km) de distância, cada um usando um idioma que o outro conheça. Dura minutos iguais ao seu nível de Feiticeiro e termina se você ligar outra criatura.',
      },
      {
        id: 'psionic-spells',
        level: 3,
        name: 'Magias Psiônicas',
        text: 'Magias sempre preparadas: Acalmar Emoções, Braços de Hadar, Detectar Pensamentos, Sussurros Dissonantes e Talho Mental (nível 3); Fome de Hadar e Remeter (5); Invocar Aberração e Tentáculos Negros de Evard (7); Ligação Telepática de Rary e Telecinese (9).',
      },
      {
        id: 'psychic-defenses',
        level: 6,
        name: 'Defesas Psíquicas',
        text: 'Resistência a dano Psíquico e Vantagem em salvaguardas para evitar ou encerrar as condições Amedrontado e Enfeitiçado.',
        passive: [
          { type: 'resistance', damage: ['psychic'] },
          {
            type: 'note',
            text: 'Vantagem em salvaguardas contra Amedrontado e Enfeitiçado.',
            situational: true,
          },
        ],
      },
      {
        id: 'psionic-sorcery',
        level: 6,
        name: 'Feitiçaria Psiônica',
        text: 'Magias de 1º círculo ou superior de Magias Psiônicas podem ser conjuradas com um espaço normal ou com Pontos de Feitiçaria iguais ao círculo. Com Pontos, não exigem componentes Verbais, Somáticos nem Materiais (salvo os consumidos ou com custo).',
      },
      {
        id: 'revelation-in-flesh',
        level: 14,
        name: 'Revelação em Carne',
        text: 'Ação Bônus: gaste 1 ou mais Pontos de Feitiçaria e transforme o corpo por 10 minutos. Cada ponto dá um benefício: Adaptação Aquática (natação ao dobro do Deslocamento e respirar na água), Movimento Vermiforme (passa por espaços de 2,5 cm e escapa de restrições gastando 1,5 m), Ver o Invisível (18 m) ou Voo Reluzente (voo igual ao Deslocamento, paira).',
      },
      {
        id: 'warping-implosion',
        level: 18,
        name: 'Implosão de Distorção',
        text: 'Ação Usar Magia: teleporte-se até 36 m para um espaço desocupado à vista. Criaturas a até 9 m do ponto de partida fazem salvaguarda de Força: na falha, sofrem 3d10 de dano Energético e são puxadas para lá (metade no sucesso). Recupere o uso com Descanso Longo ou gastando 5 Pontos de Feitiçaria.',
        resource: {
          id: 'warping-implosion',
          name: 'Implosão de Distorção',
          max: 1,
          recharge: 'long',
        },
      },
    ],
  },
  {
    id: 'clockwork',
    source: 'book',
    name: 'Feitiçaria Mecânica',
    tagline: 'Magia da ordem cósmica de Mecanos e dos modrons.',
    spells: {
      3: ['alarm', 'aid', 'protection-from-evil-and-good', 'lesser-restoration'],
      5: ['dispel-magic', 'protection-from-energy'],
      7: ['summon-construct', 'freedom-of-movement'],
      9: ['wall-of-force', 'greater-restoration'],
    },
    features: [
      {
        id: 'clockwork-spells',
        level: 3,
        name: 'Magias Mecânicas',
        text: 'Magias sempre preparadas: Alarme, Auxílio, Proteção Contra o Bem e o Mal e Restauração Menor (nível 3); Dissipar Magia e Proteção Contra Energia (5); Invocar Constructo e Movimentação Livre (7); Muralha de Energia e Restauração Maior (9). Você também escolhe (ou joga 1d6) como a ordem se manifesta quando você conjura.',
      },
      {
        id: 'restore-balance',
        level: 3,
        name: 'Restaurar Equilíbrio',
        text: 'Reação: quando uma criatura à vista a até 18 m for jogar um d20 com Vantagem ou Desvantagem, o teste não é afetado por elas. Usos iguais ao modificador de Carisma (mínimo 1) por Descanso Longo.',
        resource: {
          id: 'restore-balance',
          name: 'Restaurar Equilíbrio',
          max: { ability: 'cha', min: 1 },
          recharge: 'long',
        },
      },
      {
        id: 'bastion-of-law',
        level: 6,
        name: 'Bastião da Lei',
        text: 'Ação Usar Magia: gaste de 1 a 5 Pontos de Feitiçaria para criar uma proteção em você ou numa criatura à vista a até 9 m, com tantos d8 quanto os pontos gastos. Ao sofrer dano, a criatura gasta e joga esses dados para reduzir o dano. Dura até o próximo Descanso Longo ou novo uso.',
      },
      {
        id: 'trance-of-order',
        level: 14,
        name: 'Transe da Ordem',
        text: 'Ação Bônus: por 1 minuto, ataques contra você não têm Vantagem e, em qualquer Teste de D20, resultado 9 ou menos vira 10. Recupere o uso com Descanso Longo ou gastando 5 Pontos de Feitiçaria.',
        resource: { id: 'trance-of-order', name: 'Transe da Ordem', max: 1, recharge: 'long' },
        activation: [
          {
            id: 'trance-of-order',
            name: 'Transe da Ordem',
            mode: 'toggle',
            cost: { resource: 'trance-of-order', amount: 1 },
            effects: [
              {
                type: 'note',
                text: 'Ataques contra você sem Vantagem; d20 de 9 ou menos conta como 10.',
              },
            ],
          },
        ],
      },
      {
        id: 'clockwork-cavalcade',
        level: 18,
        name: 'Cavalgada Mecânica',
        text: 'Ação Usar Magia: espíritos de ordem agem num Cubo de 9 m originado em você. Curam até 100 PV divididos entre criaturas à sua escolha, encerram magias de 6º círculo ou inferior em criaturas e objetos à sua escolha e reparam objetos danificados. Recupere o uso com Descanso Longo ou gastando 7 Pontos de Feitiçaria.',
        resource: {
          id: 'clockwork-cavalcade',
          name: 'Cavalgada Mecânica',
          max: 1,
          recharge: 'long',
        },
      },
    ],
  },
  {
    id: 'wild-magic',
    source: 'book',
    name: 'Feitiçaria Selvagem',
    tagline: 'Magia bruta e caótica que surge sem aviso.',
    features: [
      {
        id: 'tides-of-chaos',
        level: 3,
        name: 'Marés do Caos',
        text: 'Ganhe Vantagem num Teste de D20 à sua escolha, antes de jogá-lo. Depois, só recupera o uso ao conjurar uma magia de Feiticeiro com espaço (o que causa um Surto de Magia Selvagem automático e recarrega a característica) ou num Descanso Longo.',
        resource: { id: 'tides-of-chaos', name: 'Marés do Caos', max: 1, recharge: 'long' },
      },
      {
        id: 'wild-magic-surge',
        level: 3,
        name: 'Surto de Magia Selvagem',
        text: 'Uma vez por turno, após conjurar magia de Feiticeiro com espaço, jogue 1d20: com 20, jogue na tabela de Surto de Magia Selvagem (d100) para gerar um efeito aleatório, de benefícios a azares. Se o efeito for uma magia, a Metamagia não a afeta.',
      },
      {
        id: 'bend-luck',
        level: 6,
        name: 'Distorcer a Sorte',
        text: 'Reação, gastando 1 Ponto de Feitiçaria: logo após uma criatura à vista jogar o d20 de um Teste de D20, jogue 1d4 e some ou subtraia o resultado (à sua escolha) do teste.',
      },
      {
        id: 'controlled-chaos',
        level: 14,
        name: 'Caos Controlado',
        text: 'Ao jogar na tabela de Surto de Magia Selvagem, você pode jogar duas vezes e usar qualquer um dos resultados.',
      },
      {
        id: 'controlled-surge-feature',
        level: 18,
        name: 'Surto Controlado',
        text: 'Logo após conjurar magia de Feiticeiro com espaço, escolha qualquer efeito da tabela de Surto de Magia Selvagem, exceto a última linha, em vez de jogar. Se houver jogada, você a faz. Uma vez por Descanso Longo.',
        resource: { id: 'controlled-surge', name: 'Surto Controlado', max: 1, recharge: 'long' },
      },
    ],
  },
];
