/**
 * Antecedentes, talentos de Origem e Estilos de Luta do Livro do Jogador 2024 que o SRD não
 * traz. As regras (atributos, talento, perícias, ferramentas, equipamento, benefícios) seguem
 * o livro; os textos são nossos, resumidos com palavras próprias. Fica num arquivo à parte, de
 * propósito: para tirar este conteúdo do site basta apagar este arquivo e as linhas que o
 * juntam ao SRD em `./content.ts`.
 */
import type {
  BackgroundDef,
  BookFightingStyleId,
  BookOriginFeatId,
  EquipmentPack,
  FeatDef,
  FightingStyleDef,
} from './content';

export const BOOK_ORIGIN_FEATS: Record<BookOriginFeatId, FeatDef> = {
  crafter: {
    id: 'crafter',
    name: 'Artifista',
    source: 'book',
    text: 'Proficiência com 3 Ferramentas de Artesão à escolha, dentre as da tabela de Fabricação Rápida (Carpinteiro, Coureiro, Entalhador, Ferreiro, Funileiro, Oleiro, Pedreiro e Tecelão). 20% de desconto ao comprar itens não mágicos. Ao terminar um Descanso Longo, fabrique um item simples da tabela (escada, tocha, corda, rede, pá…) se tiver a ferramenta certa e proficiência; ele se desfaz no próximo Descanso Longo.',
  },
  healer: {
    id: 'healer',
    name: 'Curandeiro',
    source: 'book',
    text: 'Com um Kit de Curandeiro, gaste um uso e a ação Usar Objeto para tratar uma criatura a até 1,5 m: ela gasta um Dado de Vida e recupera o resultado mais a sua Proficiência. Sempre que jogar dados de cura de uma magia ou deste talento, pode jogar de novo cada 1 (vale o novo resultado).',
  },
  lucky: {
    id: 'lucky',
    name: 'Sortudo',
    source: 'book',
    text: 'Você tem Pontos de Sorte iguais à Proficiência, que voltam num Descanso Longo. Gaste 1 para ter Vantagem num Teste de D20 seu, ou para impor Desvantagem num ataque feito contra você.',
  },
  musician: {
    id: 'musician',
    name: 'Músico',
    source: 'book',
    text: 'Proficiência com 3 Instrumentos Musicais à escolha. Ao terminar um Descanso Curto ou Longo, toque uma canção e dê Inspiração Heroica a aliados que a ouçam, em número igual à sua Proficiência.',
  },
  'tavern-brawler': {
    id: 'tavern-brawler',
    name: 'Valentão de Taverna',
    source: 'book',
    text: 'Seu Ataque Desarmado pode causar 1d4 + Força de dano Contundente. Você pode jogar de novo um 1 no dado de dano desarmado. Proficiência com armas improvisadas. Uma vez por turno, ao acertar um Ataque Desarmado na ação Atacar, também empurra o alvo 1,5 m para longe.',
  },
  tough: {
    id: 'tough',
    name: 'Vigoroso',
    source: 'book',
    text: 'Seus PV máximos aumentam em 2 por nível de personagem (ao pegar o talento) e em mais 2 a cada nível que você alcançar depois.',
  },
};

export const BOOK_FIGHTING_STYLES: Record<BookFightingStyleId, FightingStyleDef> = {
  'thrown-weapon': {
    id: 'thrown-weapon',
    name: 'Combate com Armas de Arremesso',
    source: 'book',
    text: '+2 no dano ao acertar um ataque à distância com uma arma que tenha a propriedade Arremesso.',
  },
  unarmed: {
    id: 'unarmed',
    name: 'Combate Desarmado',
    source: 'book',
    text: 'Seu Ataque Desarmado causa 1d6 + Força de dano Contundente (1d8 se as duas mãos estiverem livres, sem arma nem Escudo). No início de cada turno seu, cause 1d4 de dano Contundente a uma criatura que você esteja imobilizando.',
  },
  dueling: {
    id: 'dueling',
    name: 'Duelismo',
    source: 'book',
    text: '+2 no dano com uma arma corpo a corpo empunhada com uma só mão, sem nenhuma outra arma na outra mão.',
  },
  interception: {
    id: 'interception',
    name: 'Interceptação',
    source: 'book',
    text: 'Quando uma criatura que você vê acerta outra a até 1,5 m de você, use a Reação para reduzir o dano em 1d10 + Proficiência. Exige estar segurando um Escudo ou uma arma Simples ou Marcial.',
  },
  'blind-fighting': {
    id: 'blind-fighting',
    name: 'Luta às Cegas',
    source: 'book',
    text: 'Visão às Cegas com alcance de 3 m.',
  },
  protection: {
    id: 'protection',
    name: 'Protetivo',
    source: 'book',
    text: 'Quando uma criatura que você vê ataca alguém a até 1,5 m de você (que não seja você), use a Reação para interpor o Escudo: o ataque tem Desvantagem, e todos os ataques contra esse alvo também, até o início do seu próximo turno, enquanto você estiver a 1,5 m dele. Exige estar com um Escudo.',
  },
};

const goldOnly = (gold: number): EquipmentPack => ({
  option: 'B',
  items: [],
  weapons: [],
  armor: [],
  gold,
});

export const BOOK_BACKGROUNDS: Record<string, BackgroundDef> = {
  wayfarer: {
    id: 'wayfarer',
    name: 'Andarilho',
    source: 'book',
    summary:
      'Cresceu nas ruas, entre amigos e rivais, vivendo de bicos e, quando a fome apertava, de furtos — sem perder o orgulho nem a esperança.',
    abilities: ['dex', 'wis', 'cha'],
    feat: 'lucky',
    skills: ['stealth', 'insight'],
    tool: 'Ferramentas de Ladrão',
    equipment: [
      {
        option: 'A',
        items: [
          '2 Adagas',
          'Ferramentas de Ladrão',
          'Kit de Jogos (qualquer um)',
          '2 Algibeiras',
          'Roupas de Viagem',
          'Saco de Dormir',
        ],
        weapons: [{ id: 'dagger', quantity: 2 }],
        armor: [],
        gold: 16,
      },
      goldOnly(50),
    ],
  },
  artisan: {
    id: 'artisan',
    name: 'Artesão',
    source: 'book',
    summary:
      'Começou varrendo o chão de uma oficina e virou aprendiz: sabe fazer peças básicas, lidar com clientes exigentes e reparar nos detalhes.',
    abilities: ['str', 'dex', 'int'],
    feat: 'crafter',
    skills: ['investigation', 'persuasion'],
    tool: '1 tipo de Ferramentas de Artesão',
    equipment: [
      {
        option: 'A',
        items: [
          'Ferramentas de Artesão (as mesmas da proficiência)',
          '2 Algibeiras',
          'Roupas de Viagem',
        ],
        weapons: [],
        armor: [],
        gold: 32,
      },
      goldOnly(50),
    ],
  },
  entertainer: {
    id: 'entertainer',
    name: 'Artista',
    source: 'book',
    summary:
      'Passou a juventude em feiras e festivais, aprendendo com músicos e acrobatas, e vive dos aplausos do público.',
    abilities: ['str', 'dex', 'cha'],
    feat: 'musician',
    skills: ['acrobatics', 'performance'],
    tool: '1 tipo de Instrumento Musical',
    equipment: [
      {
        option: 'A',
        items: [
          'Instrumento Musical (o mesmo da proficiência)',
          'Espelho',
          '2 Fantasias',
          'Perfume',
          'Roupas de Viagem',
        ],
        weapons: [],
        armor: [],
        gold: 11,
      },
      goldOnly(50),
    ],
  },
  charlatan: {
    id: 'charlatan',
    name: 'Charlatão',
    source: 'book',
    summary:
      'Rodou o circuito de tavernas aprendendo a vender mentiras reconfortantes: poções falsas, árvores genealógicas forjadas e o que mais rendesse.',
    abilities: ['dex', 'con', 'cha'],
    feat: 'skilled',
    skills: ['deception', 'sleight-of-hand'],
    tool: 'Kit de Falsificação',
    equipment: [
      {
        option: 'A',
        items: ['Kit de Falsificação', 'Fantasia', 'Roupas Finas'],
        weapons: [],
        armor: [],
        gold: 15,
      },
      goldOnly(50),
    ],
  },
  hermit: {
    id: 'hermit',
    name: 'Eremita',
    source: 'book',
    summary:
      'Viveu isolado numa cabana ou mosteiro, com a natureza por companhia e muito tempo para refletir sobre os mistérios da criação.',
    abilities: ['con', 'wis', 'cha'],
    feat: 'healer',
    skills: ['medicine', 'religion'],
    tool: 'Kit de Herbalismo',
    equipment: [
      {
        option: 'A',
        items: [
          'Cajado',
          'Kit de Herbalismo',
          'Lâmpada',
          'Livro (filosofia)',
          'Óleo (3 frascos)',
          'Roupas de Viagem',
          'Saco de Dormir',
        ],
        weapons: [{ id: 'quarterstaff', quantity: 1 }],
        armor: [],
        gold: 16,
      },
      goldOnly(50),
    ],
  },
  scribe: {
    id: 'scribe',
    name: 'Escriba',
    source: 'book',
    summary:
      'Formou-se num scriptorium, mosteiro ou repartição, onde aprendeu a escrever com mão firme e a nunca deixar um erro passar.',
    abilities: ['dex', 'int', 'wis'],
    feat: 'skilled',
    skills: ['investigation', 'perception'],
    tool: 'Suprimentos de Calígrafo',
    equipment: [
      {
        option: 'A',
        items: [
          'Suprimentos de Calígrafo',
          'Lâmpada',
          'Óleo (3 frascos)',
          'Pergaminho (12 folhas)',
          'Roupas Finas',
        ],
        weapons: [],
        armor: [],
        gold: 23,
      },
      goldOnly(50),
    ],
  },
  farmer: {
    id: 'farmer',
    name: 'Fazendeiro',
    source: 'book',
    summary:
      'Cresceu perto da terra, cuidando de animais e plantações — o que lhe deu paciência, boa saúde e respeito pela força da natureza.',
    abilities: ['str', 'con', 'wis'],
    feat: 'tough',
    skills: ['animal-handling', 'nature'],
    tool: 'Ferramentas de Carpinteiro',
    equipment: [
      {
        option: 'A',
        items: ['Foice', 'Ferramentas de Carpinteiro', 'Kit de Curandeiro', 'Balde de Ferro', 'Pá'],
        weapons: [{ id: 'sickle', quantity: 1 }],
        armor: [],
        gold: 30,
      },
      goldOnly(50),
    ],
  },
  guard: {
    id: 'guard',
    name: 'Guarda',
    source: 'book',
    summary:
      'Passou incontáveis horas num posto de vigia, com um olho nos saqueadores lá fora e o outro nos encrenqueiros dentro da muralha.',
    abilities: ['str', 'int', 'wis'],
    feat: 'alert',
    skills: ['athletics', 'perception'],
    tool: '1 tipo de Kit de Jogos',
    equipment: [
      {
        option: 'A',
        items: [
          'Lança',
          'Besta Leve',
          '20 Virotes',
          'Kit de Jogos (o mesmo da proficiência)',
          'Aljava',
          'Grilhões',
          'Lanterna Coberta',
          'Roupas de Viagem',
        ],
        weapons: [
          { id: 'spear', quantity: 1 },
          { id: 'light-crossbow', quantity: 1 },
        ],
        armor: [],
        gold: 12,
      },
      goldOnly(50),
    ],
  },
  guide: {
    id: 'guide',
    name: 'Guia',
    source: 'book',
    summary:
      'Cresceu longe das povoações, aprendendo a se virar entre maravilhas e perigos da natureza — e a guiar sacerdotes que lhe ensinaram a canalizar a magia dela.',
    abilities: ['dex', 'con', 'wis'],
    feat: 'magic-initiate',
    featNote: 'Druida',
    skills: ['stealth', 'survival'],
    tool: 'Ferramentas de Cartógrafo',
    equipment: [
      {
        option: 'A',
        items: [
          'Arco Curto',
          '20 Flechas',
          'Ferramentas de Cartógrafo',
          'Aljava',
          'Roupas de Viagem',
          'Saco de Dormir',
          'Tenda',
        ],
        weapons: [{ id: 'shortbow', quantity: 1 }],
        armor: [],
        gold: 3,
      },
      goldOnly(50),
    ],
  },
  sailor: {
    id: 'sailor',
    name: 'Marinheiro',
    source: 'book',
    summary:
      'Viveu no mar, com o vento nas costas e o convés balançando, e já trocou histórias em mais portos do que consegue contar.',
    abilities: ['str', 'dex', 'wis'],
    feat: 'tavern-brawler',
    skills: ['acrobatics', 'perception'],
    tool: 'Ferramentas de Navegador',
    equipment: [
      {
        option: 'A',
        items: ['Adaga', 'Ferramentas de Navegador', 'Corda', 'Roupas de Viagem'],
        weapons: [{ id: 'dagger', quantity: 1 }],
        armor: [],
        gold: 20,
      },
      goldOnly(50),
    ],
  },
  merchant: {
    id: 'merchant',
    name: 'Mercador',
    source: 'book',
    summary:
      'Foi aprendiz de comerciante, mestre de caravana ou lojista: viajou bastante e ganhou a vida comprando e vendendo mercadorias.',
    abilities: ['con', 'int', 'cha'],
    feat: 'lucky',
    skills: ['animal-handling', 'persuasion'],
    tool: 'Ferramentas de Navegador',
    equipment: [
      {
        option: 'A',
        items: ['Ferramentas de Navegador', '2 Algibeiras', 'Roupas de Viagem'],
        weapons: [],
        armor: [],
        gold: 22,
      },
      goldOnly(50),
    ],
  },
  noble: {
    id: 'noble',
    name: 'Nobre',
    source: 'book',
    summary:
      'Foi criado num castelo, entre riqueza e privilégio, com educação de primeira e muitas horas observando a família na corte — o que ensina bastante sobre liderança.',
    abilities: ['str', 'int', 'cha'],
    feat: 'skilled',
    skills: ['history', 'persuasion'],
    tool: '1 tipo de Kit de Jogos',
    equipment: [
      {
        option: 'A',
        items: ['Kit de Jogos (o mesmo da proficiência)', 'Perfume', 'Roupas Finas'],
        weapons: [],
        armor: [],
        gold: 29,
      },
      goldOnly(50),
    ],
  },
};
