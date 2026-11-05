import type { SubclassDef } from '../types';

/** Subclasses do Livro do Jogador 2024 que o SRD não traz (texto nosso). */

// Reserva da Luz Medicinal: 1 + nível de Bruxo (0 antes do nível 3).
const LUZ_MEDICINAL = [0, 0, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

export const BOOK_SUBCLASSES: SubclassDef[] = [
  {
    id: 'archfey',
    source: 'book',
    name: 'Patrono Arquifada',
    tagline: 'Um pacto com os poderes enigmáticos e excêntricos de Faéria.',
    spells: {
      3: ['calm-emotions', 'faerie-fire', 'phantasmal-force', 'misty-step', 'sleep'],
      5: ['plant-growth', 'blink'],
      7: ['dominate-beast', 'greater-invisibility'],
      9: ['dominate-person', 'seeming'],
    },
    features: [
      {
        id: 'archfey-spells',
        level: 3,
        name: 'Magias de Pacto da Arquifada',
        text: 'Sempre preparadas: Acalmar Emoções, Fogo das Fadas, Força Espectral, Passo Nebuloso e Sono (nível 3); Crescimento de Plantas e Piscar (5); Dominar Fera e Invisibilidade Maior (7); Dominar Pessoa e Similaridade (9).',
      },
      {
        id: 'fey-steps',
        level: 3,
        name: 'Passos Feéricos',
        text: 'Conjure Passo Nebuloso sem espaço de magia, Carisma (mínimo 1) vezes por Descanso Longo. Ao conjurá-la, escolha um efeito extra: Passo Provocante (criaturas a até 1,5 m do ponto de partida, salvaguarda de Sabedoria ou Desvantagem em ataques contra outros que não você) ou Passo Revigorante (você ou criatura a até 3 m ganha 1d10 PV temporários).',
        resource: {
          id: 'fey-steps',
          name: 'Passos Feéricos',
          max: { ability: 'cha', min: 1 },
          recharge: 'long',
        },
      },
      {
        id: 'misty-escape',
        level: 6,
        name: 'Fuga em Névoa',
        text: 'Você pode conjurar Passo Nebuloso como Reação ao sofrer dano. Novas opções de Passos Feéricos: Passo Desvanecedor (Invisível até o início do seu próximo turno, ou até atacar, causar dano ou conjurar) e Passo Terrível (criaturas a até 1,5 m da saída ou da chegada, à sua escolha, fazem salvaguarda de Sabedoria ou sofrem 2d10 de dano Psíquico).',
      },
      {
        id: 'beguiling-defenses',
        level: 10,
        name: 'Defesas Sedutoras',
        text: 'Você é imune à condição Enfeitiçado. Quando uma criatura à vista acerta você, use a Reação para reduzir o dano à metade (arredondado para baixo); o atacante faz salvaguarda de Sabedoria e, na falha, sofre dano Psíquico igual ao dano que você sofreu. Volta no Descanso Longo ou gastando um espaço de Magia de Pacto.',
        resource: {
          id: 'beguiling-defenses',
          name: 'Defesas Sedutoras',
          max: 1,
          recharge: 'long',
        },
      },
      {
        id: 'bewitching-magic',
        level: 14,
        name: 'Magia Sedutora',
        text: 'Logo após conjurar uma magia de Encantamento ou Ilusão com uma ação e um espaço de magia, conjure Passo Nebuloso na mesma ação, sem gastar espaço.',
      },
    ],
  },
  {
    id: 'celestial',
    source: 'book',
    name: 'Patrono Celestial',
    tagline: 'Um pacto com os Planos Superiores que dá luz e cura.',
    columns: { healingLightDice: LUZ_MEDICINAL },
    spells: {
      3: ['aid', 'sacred-flame', 'cure-wounds', 'light', 'guiding-bolt', 'lesser-restoration'],
      5: ['daylight', 'revivify'],
      7: ['guardian-of-faith', 'wall-of-fire'],
      9: ['summon-celestial', 'greater-restoration'],
    },
    features: [
      {
        id: 'healing-light',
        level: 3,
        name: 'Luz Medicinal',
        text: 'Você tem uma reserva de d6s igual a 1 + nível de Bruxo. Com uma Ação Bônus, cure você ou criatura à vista a até 18 m gastando dados, no máximo Carisma (mínimo 1) por uso; role-os e restaure PV igual ao total. Recupera tudo no Descanso Longo.',
        resource: {
          id: 'healing-light',
          name: 'Luz Medicinal',
          max: { column: 'healingLightDice' },
          recharge: 'long',
          pool: true,
          die: 6,
        },
      },
      {
        id: 'celestial-spells',
        level: 3,
        name: 'Magias de Pacto do Celestial',
        text: 'Sempre preparadas: Auxílio, Chama Sagrada, Curar Ferimentos, Luz, Raio Guia e Restauração Menor (nível 3); Luz do Dia e Revivificar (5); Defensor da Fé e Muralha de Fogo (7); Convocar Celestial e Restauração Maior (9).',
      },
      {
        id: 'radiant-soul',
        level: 6,
        name: 'Alma Radiante',
        text: 'Você tem Resistência a dano Radiante. Uma vez por turno, ao conjurar uma magia que cause dano Ígneo ou Radiante, some seu modificador de Carisma ao dano contra um dos alvos.',
        passive: [{ type: 'resistance', damage: ['radiant'] }],
      },
      {
        id: 'celestial-resilience',
        level: 10,
        name: 'Resiliência Celestial',
        text: 'Ao usar Astúcia Mágica ou terminar um Descanso Curto ou Longo, você ganha PV temporários iguais ao nível de Bruxo + modificador de Carisma. Até cinco criaturas à vista ganham metade do nível de Bruxo + modificador de Carisma.',
      },
      {
        id: 'searing-vengeance',
        level: 14,
        name: 'Vingança Calcinante',
        text: 'Quando você ou aliado a até 18 m for fazer uma Salvaguarda Contra Morte, libere luz: a criatura recupera metade dos PV máximos e pode se levantar da condição Caído. Criaturas à sua escolha a até 9 m dela sofrem 2d8 + Carisma de dano Radiante e ficam Cegas até o fim do turno. Volta no Descanso Longo.',
        resource: {
          id: 'searing-vengeance',
          name: 'Vingança Calcinante',
          max: 1,
          recharge: 'long',
        },
      },
    ],
  },
  {
    id: 'great-old-one',
    source: 'book',
    name: 'Patrono O Grande Antigo',
    tagline: 'Um pacto com uma entidade incompreensível que sussurra segredos proibidos.',
    spells: {
      3: ['detect-thoughts', 'phantasmal-force', 'hideous-laughter', 'dissonant-whispers'],
      5: ['clairvoyance', 'hunger-of-hadar'],
      7: ['confusion', 'summon-aberration'],
      9: ['modify-memory', 'telekinesis'],
      10: ['hex'],
    },
    features: [
      {
        id: 'psychic-spells',
        level: 3,
        name: 'Magias Psíquicas',
        text: 'Ao conjurar uma magia de Bruxo que cause dano, você pode trocar o tipo do dano para Psíquico. Magias de Bruxo de Encantamento ou Ilusão podem ser conjuradas sem componentes Verbais ou Somáticos.',
      },
      {
        id: 'awakened-mind',
        level: 3,
        name: 'Mente Desperta',
        text: 'Com uma Ação Bônus, ligue-se telepaticamente a uma criatura à vista a até 9 m, a até 1,5 km × modificador de Carisma (mínimo 1,5 km). Ambos precisam usar mentalmente um idioma comum. Dura minutos iguais ao nível de Bruxo, ou até você ligar-se a outra criatura.',
      },
      {
        id: 'great-old-one-spells',
        level: 3,
        name: 'Magias de Pacto do Grande Antigo',
        text: 'Sempre preparadas: Detectar Pensamentos, Força Espectral, Gargalhada Nefasta e Sussurros Dissonantes (nível 3); Clarividência e Fome de Hadar (5); Confusão e Invocar Aberração (7); Modificar Memória e Telecinese (9).',
      },
      {
        id: 'clairvoyant-combatant',
        level: 6,
        name: 'Combatente Clarividente',
        text: 'Ao ligar-se a uma criatura com Mente Desperta, ela faz salvaguarda de Sabedoria; na falha, tem Desvantagem em ataques contra você e você tem Vantagem em ataques contra ela enquanto durar a ligação. Volta no Descanso Curto ou Longo, ou gastando um espaço de Magia de Pacto.',
        resource: {
          id: 'clairvoyant-combatant',
          name: 'Combatente Clarividente',
          max: 1,
          recharge: 'short',
        },
      },
      {
        id: 'mystic-hex',
        level: 10,
        name: 'Danação Mística',
        text: 'Você sempre tem Danação preparada. Ao conjurá-la e escolher um atributo, o alvo também tem Desvantagem nas salvaguardas desse atributo enquanto a magia durar.',
      },
      {
        id: 'mind-shield',
        level: 10,
        name: 'Escudo Mental',
        text: 'Seus pensamentos não podem ser lidos por telepatia ou outros meios sem a sua permissão. Você tem Resistência a dano Psíquico, e quem causar dano Psíquico a você sofre a mesma quantidade.',
        passive: [{ type: 'resistance', damage: ['psychic'] }],
      },
      {
        id: 'create-thrall',
        level: 14,
        name: 'Criar Servo',
        text: 'Ao conjurar Invocar Aberração, você pode torná-la sem Concentração: dura 1 minuto e a Aberração surge com PV temporários iguais ao nível de Bruxo + Carisma. Uma vez por turno, ao atingir criatura sob sua Danação, ela causa dano Psíquico extra igual ao dano bônus da magia.',
      },
    ],
  },
];
