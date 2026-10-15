import { asiFeatures, byLevel, epicBoon, subclassFeature } from './common';
import type { ClassProgression } from './types';

export interface InvocationDef {
  id: string;
  name: string;
  text: string;
  /** Nível mínimo de Bruxo. */
  minLevel: number;
  /** Outra invocação exigida (ex.: Pacto da Lâmina). */
  requires?: string;
  /** Pode ser escolhida mais de uma vez (com truque ou talento diferente). */
  repeatable?: boolean;
}

/** Opções de Invocação Mística do SRD 5.2 (nomes do livro em português). */
export const INVOCATIONS: InvocationDef[] = [
  {
    id: 'agonizing-blast',
    name: 'Explosão Agonizante',
    minLevel: 2,
    repeatable: true,
    text: 'Escolha um truque de Bruxo que causa dano: some o Carisma às jogadas de dano dele.',
  },
  {
    id: 'armor-of-shadows',
    name: 'Armadura de Sombras',
    minLevel: 1,
    text: 'Conjure Armadura Arcana em si mesmo sem gastar espaço.',
  },
  {
    id: 'ascendant-step',
    name: 'Passo Ascendente',
    minLevel: 5,
    text: 'Conjure Levitação em si mesmo sem gastar espaço.',
  },
  {
    id: 'devils-sight',
    name: 'Visão Diabólica',
    minLevel: 2,
    text: 'Você enxerga normalmente em Penumbra e Escuridão, mágicas ou não, a até 36 m.',
  },
  {
    id: 'devouring-blade',
    name: 'Lâmina Devoradora',
    minLevel: 12,
    requires: 'thirsting-blade',
    text: 'O Ataque Extra da Lâmina Sedenta passa a dar dois ataques extras.',
  },
  {
    id: 'eldritch-mind',
    name: 'Mente Mística',
    minLevel: 1,
    text: 'Vantagem nas salvaguardas de Constituição para manter Concentração.',
  },
  {
    id: 'eldritch-smite',
    name: 'Punição Mística',
    minLevel: 5,
    requires: 'pact-of-the-blade',
    text: 'Uma vez por turno, ao acertar com a arma de pacto, gaste um espaço de Magia de Pacto: +1d8 de dano Energético, +1d8 por círculo do espaço, e pode deixar o alvo Caído (Enorme ou menor).',
  },
  {
    id: 'eldritch-spear',
    name: 'Lança Mística',
    minLevel: 2,
    repeatable: true,
    text: 'Um truque de Bruxo que causa dano e tem alcance de 3 m ou mais ganha alcance extra de 9 m × seu nível de Bruxo.',
  },
  {
    id: 'fiendish-vigor',
    name: 'Vigor Ínfero',
    minLevel: 2,
    text: 'Conjure Vitalidade Vazia em si mesmo sem gastar espaço, ganhando o máximo no dado de PV temporários.',
  },
  {
    id: 'gaze-of-two-minds',
    name: 'Olhar de Duas Mentes',
    minLevel: 5,
    text: 'Ação Bônus: toque uma criatura voluntária e perceba pelos sentidos dela até o fim do seu próximo turno (renovável com Ação Bônus); a até 18 m, pode conjurar como se estivesse no espaço dela.',
  },
  {
    id: 'gift-of-the-depths',
    name: 'Presente das Profundezas',
    minLevel: 5,
    text: 'Respira debaixo d’água e ganha Deslocamento de Natação igual ao Deslocamento; conjure Respirar na Água uma vez sem espaço por Descanso Longo.',
  },
  {
    id: 'gift-of-the-protectors',
    name: 'Presente dos Protetores',
    minLevel: 9,
    requires: 'pact-of-the-tome',
    text: 'Uma página no Livro das Sombras recebe até Carisma (mínimo 1) nomes; a primeira dessas criaturas a cair a 0 PV sem morrer fica com 1 PV (uma vez por Descanso Longo).',
  },
  {
    id: 'investment-of-the-chain-master',
    name: 'Investimento do Mestre da Corrente',
    minLevel: 5,
    requires: 'pact-of-the-chain',
    text: 'Seu familiar ganha voo ou natação de 12 m, ataca com sua Ação Bônus, pode causar dano Necrótico ou Radiante, usa a sua CD e, com sua Reação, ganha Resistência a um dano.',
  },
  {
    id: 'lessons-of-the-first-ones',
    name: 'Lições dos Grandes Antigos',
    minLevel: 2,
    repeatable: true,
    text: 'Ganhe um talento de Origem à sua escolha.',
  },
  {
    id: 'lifedrinker',
    name: 'Sorvedouro de Vida',
    minLevel: 9,
    requires: 'pact-of-the-blade',
    text: 'Uma vez por turno, ao acertar com a arma de pacto: +1d6 de dano Necrótico, Psíquico ou Radiante, e pode gastar um Dado de Vida para recuperar o resultado + Constituição (mínimo 1).',
  },
  {
    id: 'mask-of-many-faces',
    name: 'Máscara das Muitas Faces',
    minLevel: 2,
    text: 'Conjure Disfarçar-se sem gastar espaço.',
  },
  {
    id: 'master-of-myriad-forms',
    name: 'Mestre das Infindáveis Formas',
    minLevel: 5,
    text: 'Conjure Alterar-se sem gastar espaço.',
  },
  {
    id: 'misty-visions',
    name: 'Visões Nebulosas',
    minLevel: 2,
    text: 'Conjure Imagem Silenciosa sem gastar espaço.',
  },
  {
    id: 'one-with-shadows',
    name: 'Uno com as Sombras',
    minLevel: 5,
    text: 'Em Penumbra ou Escuridão, conjure Invisibilidade em si mesmo sem gastar espaço.',
  },
  {
    id: 'otherworldly-leap',
    name: 'Salto Sobrenatural',
    minLevel: 2,
    text: 'Conjure Salto em si mesmo sem gastar espaço.',
  },
  {
    id: 'pact-of-the-blade',
    name: 'Pacto da Lâmina',
    minLevel: 1,
    text: 'Ação Bônus: conjure uma arma corpo a corpo Simples ou Marcial (ou vincule-se a uma arma mágica). Você tem proficiência com ela, pode usá-la como foco e usar Carisma no ataque e no dano, causando dano Necrótico, Psíquico, Radiante ou o normal.',
  },
  {
    id: 'pact-of-the-chain',
    name: 'Pacto da Corrente',
    minLevel: 1,
    text: 'Aprende Convocar Familiar e conjura sem espaço (ação Usar Magia), com formas especiais (diabrete, pseudodragão, quasit, esqueleto, esfinge das maravilhas, sprite, serpente venenosa). Ao Atacar, pode trocar um ataque seu por um ataque do familiar.',
  },
  {
    id: 'pact-of-the-tome',
    name: 'Pacto do Tomo',
    minLevel: 1,
    text: 'Um Livro das Sombras com três truques e duas magias de 1º círculo com Ritual, de qualquer lista; ficam preparadas como magias de Bruxo enquanto você o carrega. Serve como foco.',
  },
  {
    id: 'repelling-blast',
    name: 'Explosão Repulsiva',
    minLevel: 2,
    repeatable: true,
    text: 'Ao acertar uma criatura Grande ou menor com um truque de Bruxo de ataque, empurre-a até 3 m.',
  },
  {
    id: 'thirsting-blade',
    name: 'Lâmina Sedenta',
    minLevel: 5,
    requires: 'pact-of-the-blade',
    text: 'Ataque Extra com a arma de pacto: dois ataques quando usa a ação Atacar.',
  },
  {
    id: 'visions-of-distant-realms',
    name: 'Visões de Reinos Distantes',
    minLevel: 9,
    text: 'Conjure Olho Arcano sem gastar espaço.',
  },
  {
    id: 'whispers-of-the-grave',
    name: 'Lamento das Sepulturas',
    minLevel: 7,
    text: 'Conjure Falar com Mortos sem gastar espaço.',
  },
  {
    id: 'witch-sight',
    name: 'Visão Bruxa',
    minLevel: 15,
    text: 'Visão Verdadeira de 9 m.',
  },
];

export const WARLOCK: ClassProgression = {
  classId: 'warlock',
  columns: {
    invocations: byLevel([
      [1, 1],
      [2, 3],
      [5, 5],
      [7, 6],
      [9, 7],
      [12, 8],
      [15, 9],
      [18, 10],
    ]),
  },
  columnNames: { invocations: 'Invocações Místicas' },
  spellcasting: {
    ability: 'cha',
    kind: 'pact',
    cantrips: byLevel([
      [1, 2],
      [4, 3],
      [10, 4],
    ]),
    prepared: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
    swap: 'level-up',
  },
  subclassLevels: [3, 6, 10, 14],
  features: [
    {
      id: 'eldritch-invocations',
      level: 1,
      name: 'Invocações Místicas',
      text: 'Fragmentos de conhecimento proibido que dão habilidades mágicas. A quantidade cresce com o nível; a cada nível, pode trocar uma (menos se for pré-requisito de outra).',
    },
    {
      id: 'pact-magic',
      level: 1,
      name: 'Magia de Pacto',
      text: 'Conjura magias de Bruxo com Carisma. Todos os espaços de Magia de Pacto são do mesmo círculo e voltam num Descanso Curto ou Longo. A cada nível, pode trocar um truque e uma magia preparada. Foco: foco arcano.',
    },
    {
      id: 'magical-cunning',
      level: 2,
      name: 'Astúcia Mágica',
      text: 'Rito de 1 minuto: recupere espaços de Magia de Pacto gastos, até metade do máximo (arredondado para cima). Uma vez por Descanso Longo.',
      resource: { id: 'magical-cunning', name: 'Astúcia Mágica', max: 1, recharge: 'long' },
    },
    subclassFeature(3, 'Bruxo'),
    ...asiFeatures([4, 8, 12, 16]),
    {
      id: 'contact-patron',
      level: 9,
      name: 'Contatar Patrono',
      text: 'Sempre tem Contato Extraplanar preparada; uma vez por Descanso Longo, conjure-a sem espaço para falar com seu patrono, passando automaticamente na salvaguarda.',
      grantedSpells: { ids: ['contact-other-plane'], freePerLongRest: 1 },
    },
    {
      id: 'mystic-arcanum-11',
      level: 11,
      name: 'Arcana Mística (6º círculo)',
      text: 'Escolha uma magia de Bruxo de 6º círculo: conjure-a uma vez sem espaço por Descanso Longo. A cada nível, pode trocá-la por outra do mesmo círculo.',
      choice: { kind: 'arcanum', circle: 6 },
    },
    {
      id: 'mystic-arcanum-13',
      level: 13,
      name: 'Arcana Mística (7º círculo)',
      text: 'Uma magia de Bruxo de 7º círculo, uma vez sem espaço por Descanso Longo.',
      choice: { kind: 'arcanum', circle: 7 },
    },
    {
      id: 'mystic-arcanum-15',
      level: 15,
      name: 'Arcana Mística (8º círculo)',
      text: 'Uma magia de Bruxo de 8º círculo, uma vez sem espaço por Descanso Longo.',
      choice: { kind: 'arcanum', circle: 8 },
    },
    {
      id: 'mystic-arcanum-17',
      level: 17,
      name: 'Arcana Mística (9º círculo)',
      text: 'Uma magia de Bruxo de 9º círculo, uma vez sem espaço por Descanso Longo.',
      choice: { kind: 'arcanum', circle: 9 },
    },
    epicBoon('Dádiva do Destino'),
    {
      id: 'eldritch-master',
      level: 20,
      name: 'Mestre Místico',
      text: 'A Astúcia Mágica recupera todos os espaços de Magia de Pacto gastos.',
    },
  ],
  subclasses: [
    {
      id: 'fiend',
      name: 'Patrono Ínfero',
      tagline: 'Um pacto com os Planos Inferiores.',
      spells: {
        3: ['burning-hands', 'command', 'scorching-ray', 'suggestion'],
        5: ['fireball', 'stinking-cloud'],
        7: ['fire-shield', 'wall-of-fire'],
        9: ['geas', 'insect-plague'],
      },
      features: [
        {
          id: 'dark-ones-blessing',
          level: 3,
          name: 'Bênção do Tenebroso',
          text: 'Ao reduzir um inimigo a 0 PV (ou quando outro o faz a até 3 m de você), ganhe PV temporários iguais a Carisma + seu nível de Bruxo (mínimo 1).',
        },
        {
          id: 'fiend-spells',
          level: 3,
          name: 'Magias de Pacto do Ínfero',
          text: 'Sempre preparadas: Mãos Flamejantes, Comando, Raio Ardente e Sugestão (nível 3); Bola de Fogo e Nuvem Fétida (5); Escudo Ardente e Muralha de Fogo (7); Missão e Praga de Insetos (9).',
        },
        {
          id: 'dark-ones-own-luck',
          level: 6,
          name: 'A Sorte do Próprio Tenebroso',
          text: 'Some 1d10 a um teste de atributo ou salvaguarda (depois de ver o dado, antes do efeito). Usos: Carisma (mínimo 1) por Descanso Longo, no máximo um por jogada.',
          resource: {
            id: 'dark-ones-own-luck',
            name: 'A Sorte do Próprio Tenebroso',
            max: { ability: 'cha', min: 1 },
            recharge: 'long',
          },
        },
        {
          id: 'fiendish-resilience',
          level: 10,
          name: 'Resistência Ínfera',
          text: 'A cada Descanso Curto ou Longo, escolha um tipo de dano (menos Energético): você tem Resistência a ele até escolher outro.',
        },
        {
          id: 'hurl-through-hell',
          level: 14,
          name: 'Lançar no Inferno',
          text: 'Uma vez por turno, ao acertar uma jogada de ataque, o alvo faz salvaguarda de Carisma contra a sua CD: na falha, some pelos Planos Inferiores, sofre 8d10 de dano Psíquico (se não for Ínfero) e fica Incapacitado até o fim do seu próximo turno. Uma vez por Descanso Longo (ou gaste um espaço de Magia de Pacto).',
          resource: {
            id: 'hurl-through-hell',
            name: 'Lançar no Inferno',
            max: 1,
            recharge: 'long',
          },
        },
      ],
    },
  ],
};
