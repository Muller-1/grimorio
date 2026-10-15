import { asiFeatures, byLevel, epicBoon, subclassFeature } from './common';
import type { ClassProgression } from './types';

export const ROGUE: ClassProgression = {
  classId: 'rogue',
  columns: {
    sneakAttack: byLevel(
      Array.from({ length: 10 }, (_, i) => [2 * i + 1, i + 1] as [number, number]),
    ),
  },
  columnNames: { sneakAttack: 'Ataque Furtivo' },
  subclassLevels: [3, 9, 13, 17],
  features: [
    {
      id: 'expertise-1',
      level: 1,
      name: 'Especialista',
      text: 'Especialização em duas perícias em que você tem proficiência (sugestões: Prestidigitação e Furtividade). Escolhida na criação.',
    },
    {
      id: 'sneak-attack',
      level: 1,
      name: 'Ataque Furtivo',
      text: 'Uma vez por turno, ao acertar uma criatura com arma de Acuidade ou à distância, cause dano extra (1d6, +1d6 a cada dois níveis) se tiver Vantagem no ataque, ou se um aliado não Incapacitado estiver a até 1,5 m do alvo e você não tiver Desvantagem. O dano é do tipo da arma.',
      activation: [
        {
          id: 'sneak-attack',
          name: 'Ataque Furtivo',
          mode: 'toggle',
          effects: [
            {
              type: 'extra-damage',
              dice: { count: { column: 'sneakAttack' }, die: 6 },
              filter: { finesseOrRanged: true },
              oncePerTurn: true,
            },
          ],
        },
      ],
    },
    {
      id: 'thieves-cant',
      level: 1,
      name: 'Gíria do Ladrão',
      text: 'Você conhece a Gíria do Ladrão e mais um idioma à sua escolha.',
    },
    {
      id: 'weapon-mastery',
      level: 1,
      name: 'Maestria em Arma',
      text: 'Use as propriedades de maestria de dois tipos de arma em que você tem proficiência. Pode trocá-los a cada Descanso Longo.',
    },
    {
      id: 'cunning-action',
      level: 2,
      name: 'Ação Ardilosa',
      text: 'No seu turno, Disparada, Desengajar ou Esconder como Ação Bônus.',
    },
    subclassFeature(3, 'Ladino'),
    {
      id: 'steady-aim',
      level: 3,
      name: 'Mira Firme',
      text: 'Ação Bônus, se você não se moveu no turno: Vantagem no próximo ataque deste turno; seu Deslocamento fica 0 até o fim do turno.',
    },
    ...asiFeatures([4, 8, 10, 12, 16]),
    {
      id: 'cunning-strike',
      level: 5,
      name: 'Golpe Astuto',
      text: 'Ao causar dano de Ataque Furtivo, abra mão de dados para um efeito (CD 8 + Destreza + Bônus de Proficiência): Veneno (1d6, salvaguarda de Constituição ou Envenenado por 1 minuto; precisa de kit de envenenador), Derrubar (1d6, criatura Grande ou menor faz salvaguarda de Destreza ou fica Caída) ou Recuar (1d6, mova-se até metade do Deslocamento sem provocar Ataques de Oportunidade).',
    },
    {
      id: 'uncanny-dodge',
      level: 5,
      name: 'Esquiva Sobrenatural',
      text: 'Reação quando um atacante que você vê acerta você: o dano desse ataque cai à metade.',
    },
    {
      id: 'expertise-6',
      level: 6,
      name: 'Especialista',
      text: 'Especialização em mais duas perícias em que você tem proficiência.',
      choice: { kind: 'expertise', count: 2 },
    },
    {
      id: 'evasion',
      level: 7,
      name: 'Evasão',
      text: 'Em salvaguardas de Destreza para sofrer metade do dano: nenhum dano no sucesso e metade na falha (não vale Incapacitado).',
    },
    {
      id: 'reliable-talent',
      level: 7,
      name: 'Talento Confiável',
      text: 'Em testes de atributo com perícia ou ferramenta em que você tem proficiência, trate um 9 ou menos no d20 como 10.',
    },
    {
      id: 'improved-cunning-strike',
      level: 11,
      name: 'Golpe Astuto Aprimorado',
      text: 'Até dois efeitos de Golpe Astuto por Ataque Furtivo, pagando o custo de cada um.',
    },
    {
      id: 'devious-strikes',
      level: 14,
      name: 'Golpes Sujos',
      text: 'Novos efeitos de Golpe Astuto: Atordoar (2d6, salvaguarda de Constituição ou no próximo turno só se move, ou faz uma ação, ou uma Ação Bônus), Nocautear (6d6, salvaguarda de Constituição ou Inconsciente por 1 minuto ou até sofrer dano) e Obscurecer (3d6, salvaguarda de Destreza ou Cego até o fim do próximo turno dele).',
    },
    {
      id: 'slippery-mind',
      level: 15,
      name: 'Mente Escorregadia',
      text: 'Proficiência em salvaguardas de Sabedoria e Carisma.',
      passive: [{ type: 'save-proficiency', on: ['wis', 'cha'] }],
    },
    {
      id: 'elusive',
      level: 18,
      name: 'Elusivo',
      text: 'Nenhuma jogada de ataque tem Vantagem contra você, a menos que você esteja Incapacitado.',
    },
    epicBoon('Dádiva do Espírito da Noite'),
    {
      id: 'stroke-of-luck',
      level: 20,
      name: 'Golpe de Sorte',
      text: 'Ao falhar num Teste de D20, transforme o resultado em 20. Volta num Descanso Curto ou Longo.',
      resource: { id: 'stroke-of-luck', name: 'Golpe de Sorte', max: 1, recharge: 'short' },
    },
  ],
  subclasses: [
    {
      id: 'thief',
      name: 'Ladrão',
      tagline: 'Arrombador, caçador de tesouros e explorador: o aventureiro clássico.',
      features: [
        {
          id: 'fast-hands',
          level: 3,
          name: 'Mão Leve',
          text: 'Ação Bônus: um teste de Destreza (Prestidigitação) para abrir fechadura, desarmar armadilha ou bater carteira; ou a ação Usar Objeto, ou Usar Magia para ativar um item mágico.',
        },
        {
          id: 'second-story-work',
          level: 3,
          name: 'Andarilho de Telhados',
          text: 'Deslocamento de Escalada igual ao seu Deslocamento, e o salto usa Destreza em vez de Força.',
        },
        {
          id: 'supreme-sneak',
          level: 9,
          name: 'Furtividade Suprema',
          text: 'Novo efeito de Golpe Astuto: Ataque Furtivo Oculto (1d6) — se estiver Invisível pela ação Esconder, o ataque não acaba com isso se terminar o turno atrás de Três Quartos de Cobertura ou Cobertura Total.',
        },
        {
          id: 'use-magic-device',
          level: 13,
          name: 'Usar Dispositivo Mágico',
          text: 'Sintonize até quatro itens mágicos; ao gastar cargas de um item, role 1d6 — com 6, não gasta; use qualquer Pergaminho de Magia com Inteligência (truques e 1º círculo sem teste; acima disso, teste de Inteligência (Arcanismo) CD 10 + círculo).',
        },
        {
          id: 'thiefs-reflexes',
          level: 17,
          name: 'Reflexos de Ladrão',
          text: 'Na primeira rodada de cada combate, você joga dois turnos: um na sua Iniciativa e outro na Iniciativa − 10.',
        },
      ],
    },
  ],
};
