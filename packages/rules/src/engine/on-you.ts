import type { AdvantageTarget, Effect } from '../classes/types';

/**
 * O que está afetando o personagem e a ficha calcula: condições do glossário
 * do Livro do Jogador 2024 (nomes da edição brasileira) e magias que atrapalham. As magias que
 * ajudam ficam em `spells/effects.ts`. Textos curtos escritos para o site.
 *
 * Na ficha, ficam em `state.active` como "cond:<id>" (Exaustão: "cond:exhaustion:<nível>") e
 * "debuff:<id>".
 */

export const CONDITION_PREFIX = 'cond:';
export const DEBUFF_PREFIX = 'debuff:';
export const EXHAUSTION_ID = 'exhaustion';

export interface OnYouDef {
  id: string;
  name: string;
  /** Uma frase: o que muda para o personagem. */
  text: string;
  effects: Effect[];
}

// Escrito por extenso de propósito: usar ABILITY_KEYS aqui, no carregamento do módulo, quebra a
// ficha no site (o pedaço "rules" e o da ficha se importam um ao outro; ver vite.config.ts).
const allChecks: AdvantageTarget[] = [
  'check:str',
  'check:dex',
  'check:con',
  'check:int',
  'check:wis',
  'check:cha',
];
const note = (text: string): Effect => ({ type: 'note', text });
/** Depende de posição, visão ou alvo: a ficha avisa, a mesa decide. */
const situational = (text: string): Effect => ({ type: 'note', text, situational: true });
/** Incapacitado (e quem inclui: Atordoado, Paralisado, Petrificado, Inconsciente). */
const INCAPACITATED: Effect = {
  type: 'cannot-act',
  what: ['actions', 'bonus-actions', 'reactions'],
  breaksConcentration: true,
};
const FAIL_STR_DEX: Effect = { type: 'auto-fail-save', on: ['str', 'dex'] };
const ADVANTAGE_AGAINST = note('Ataques contra você têm Vantagem.');
const MELEE_CRITS = note('Ataques contra você têm Vantagem; acertos a até 1,5 m são Críticos.');

/** Condições (Livro do Jogador 2024, Apêndice C). Exaustão tem níveis: ver `exhaustionEffects`. */
export const CONDITIONS: OnYouDef[] = [
  {
    id: 'frightened',
    name: 'Amedrontado',
    text: 'Desvantagem em testes de atributo e ataques enquanto vê a fonte do medo; não pode se aproximar dela.',
    effects: [
      { type: 'disadvantage', on: ['attack', ...allChecks] },
      situational(
        'Amedrontado: a Desvantagem só vale enquanto você vê a fonte do medo; não pode se aproximar dela por vontade própria.',
      ),
    ],
  },
  {
    id: 'stunned',
    name: 'Atordoado',
    text: 'Incapacitado; falha nas salvaguardas de Força e Destreza; ataques contra você têm Vantagem.',
    effects: [INCAPACITATED, FAIL_STR_DEX, ADVANTAGE_AGAINST],
  },
  {
    id: 'prone',
    name: 'Caído',
    text: 'Desvantagem nos ataques; ataques a até 1,5 m têm Vantagem contra você (de longe, Desvantagem).',
    effects: [
      { type: 'disadvantage', on: ['attack'] },
      note('Caído: só rasteja; levantar gasta metade do Deslocamento.'),
      note('Ataques a até 1,5 m têm Vantagem contra você; de mais longe, Desvantagem.'),
    ],
  },
  {
    id: 'blinded',
    name: 'Cego',
    text: 'Desvantagem nos ataques; ataques contra você têm Vantagem; falha em testes que dependem da visão.',
    effects: [
      { type: 'disadvantage', on: ['attack'] },
      situational('Cego: falha automaticamente nos testes que dependem da visão.'),
      ADVANTAGE_AGAINST,
    ],
  },
  {
    id: 'restrained',
    name: 'Contido',
    text: 'Deslocamento 0; Desvantagem nos ataques e nas salvaguardas de Destreza; ataques contra você têm Vantagem.',
    effects: [
      { type: 'speed-multiplier', factor: 0 },
      { type: 'disadvantage', on: ['attack', 'save:dex'] },
      ADVANTAGE_AGAINST,
    ],
  },
  {
    id: 'charmed',
    name: 'Enfeitiçado',
    text: 'Não pode atacar quem o enfeitiçou; essa criatura tem Vantagem nos testes para interagir com você.',
    effects: [
      {
        type: 'cannot-attack-target',
        text: 'Enfeitiçado: não pode atacar nem prejudicar quem o enfeitiçou.',
      },
      note('Quem o enfeitiçou tem Vantagem nos testes de interação social com você.'),
    ],
  },
  {
    id: 'poisoned',
    name: 'Envenenado',
    text: 'Desvantagem nas jogadas de ataque e nos testes de atributo.',
    effects: [{ type: 'disadvantage', on: ['attack', ...allChecks] }],
  },
  {
    id: 'grappled',
    name: 'Imobilizado',
    text: 'Deslocamento 0; Desvantagem nos ataques contra quem não for o imobilizador.',
    effects: [
      { type: 'speed-multiplier', factor: 0 },
      situational(
        'Imobilizado: Desvantagem nos ataques contra qualquer alvo que não seja quem o imobiliza; ele pode arrastar você.',
      ),
    ],
  },
  {
    id: 'incapacitated',
    name: 'Incapacitado',
    text: 'Sem ações, Ações Bônus nem Reações; perde a Concentração e não pode falar.',
    effects: [
      INCAPACITATED,
      { type: 'disadvantage', on: ['initiative'] },
      note('Incapacitado: não pode falar.'),
    ],
  },
  {
    id: 'unconscious',
    name: 'Inconsciente',
    text: 'Incapacitado e Caído, larga o que segura; falha nas salvaguardas de Força e Destreza.',
    effects: [
      INCAPACITATED,
      { type: 'speed-multiplier', factor: 0 },
      FAIL_STR_DEX,
      note('Inconsciente: Caído, larga o que segura e não percebe o que acontece.'),
      MELEE_CRITS,
    ],
  },
  {
    id: 'invisible',
    name: 'Invisível',
    text: 'Vantagem nos ataques e na Iniciativa; ataques contra você têm Desvantagem.',
    effects: [
      { type: 'advantage', on: ['attack', 'initiative'] },
      note('Invisível: ataques contra você têm Desvantagem (de quem não o vê).'),
    ],
  },
  {
    id: 'paralyzed',
    name: 'Paralisado',
    text: 'Incapacitado, Deslocamento 0; falha nas salvaguardas de Força e Destreza; acertos a até 1,5 m são Críticos.',
    effects: [INCAPACITATED, { type: 'speed-multiplier', factor: 0 }, FAIL_STR_DEX, MELEE_CRITS],
  },
  {
    id: 'petrified',
    name: 'Petrificado',
    text: 'Vira pedra: Incapacitado, Deslocamento 0, Resistência a todo dano; falha nas salvaguardas de Força e Destreza.',
    effects: [
      INCAPACITATED,
      { type: 'speed-multiplier', factor: 0 },
      {
        type: 'resistance',
        damage: [
          'acid',
          'bludgeoning',
          'cold',
          'fire',
          'force',
          'lightning',
          'necrotic',
          'piercing',
          'poison',
          'psychic',
          'radiant',
          'slashing',
          'thunder',
        ],
      },
      FAIL_STR_DEX,
      ADVANTAGE_AGAINST,
    ],
  },
  {
    id: 'deafened',
    name: 'Surdo',
    text: 'Não ouve; falha em testes que dependem da audição.',
    effects: [situational('Surdo: falha automaticamente nos testes que dependem da audição.')],
  },
];

/** Exaustão (1 a 6): −2 por nível nos Testes de D20 e −1,5 m de Deslocamento por nível. */
export function exhaustionEffects(level: number): Effect[] {
  const l = Math.min(6, Math.max(1, Math.floor(level)));
  return [
    { type: 'd20-modifier', value: -2 * l },
    { type: 'speed-bonus', ft: -5 * l },
    note(
      l >= 6
        ? 'Exaustão 6: o personagem morre.'
        : `Exaustão ${l}: cada Descanso Longo tira 1 nível.`,
    ),
  ];
}

/** Magias de outras criaturas que atrapalham você. */
export const DEBUFF_SPELLS: OnYouDef[] = [
  {
    id: 'reduce',
    name: 'Aumentar/Reduzir (Reduzir)',
    text: '−1d4 no dano das armas; Desvantagem em testes e salvaguardas de Força.',
    effects: [
      { type: 'roll-penalty-dice', dice: '1d4', on: ['damage'] },
      { type: 'disadvantage', on: ['check:str', 'save:str'] },
    ],
  },
  {
    id: 'hex',
    name: 'Danação',
    text: 'Desvantagem nos testes de um atributo escolhido por quem conjurou; sofre dano Necrótico extra.',
    effects: [
      situational('Danação: Desvantagem nos testes do atributo escolhido por quem conjurou.'),
    ],
  },
  {
    id: 'faerie-fire',
    name: 'Fogo das Fadas',
    text: 'Você brilha: ataques contra você têm Vantagem e não pode ficar Invisível.',
    effects: [
      note(
        'Fogo das Fadas: ataques contra você têm Vantagem; não pode se beneficiar de Invisível.',
      ),
    ],
  },
  {
    id: 'slow',
    name: 'Lentidão',
    text: 'Deslocamento pela metade; −2 na CA e nas salvaguardas de Destreza; sem Reações.',
    effects: [
      { type: 'speed-multiplier', factor: 0.5 },
      { type: 'ac-bonus', value: -2 },
      { type: 'save-bonus', value: -2, on: ['dex'] },
      { type: 'cannot-act', what: ['reactions'] },
      note('Lentidão: no turno, uma ação ou uma Ação Bônus (não as duas) e só um ataque.'),
    ],
  },
  {
    id: 'bane',
    name: 'Perdição',
    text: '−1d4 nas jogadas de ataque e nas salvaguardas.',
    effects: [{ type: 'roll-penalty-dice', dice: '1d4', on: ['attack', 'save'] }],
  },
  {
    id: 'ray-of-enfeeblement',
    name: 'Raio do Enfraquecimento',
    text: 'Desvantagem nos Testes de D20 com Força; −1d8 nas jogadas de dano.',
    effects: [
      { type: 'disadvantage', on: ['attack:str', 'check:str', 'save:str'] },
      { type: 'roll-penalty-dice', dice: '1d8', on: ['damage'] },
    ],
  },
  {
    id: 'bestow-curse',
    name: 'Rogar Maldição',
    text: 'A maldição escolhida por quem conjurou (Desvantagem num atributo, nos ataques contra ele…).',
    effects: [situational('Rogar Maldição: veja com o Mestre qual efeito foi escolhido.')],
  },
];

const BY_KEY = new Map<string, OnYouDef>([
  ...CONDITIONS.map((c) => [`${CONDITION_PREFIX}${c.id}`, c] as const),
  ...DEBUFF_SPELLS.map((d) => [`${DEBUFF_PREFIX}${d.id}`, d] as const),
]);

/** Nível de Exaustão em `state.active` (0 = sem Exaustão). */
export function exhaustionLevel(active: readonly string[]): number {
  const entry = active.find((id) => id.startsWith(`${CONDITION_PREFIX}${EXHAUSTION_ID}:`));
  return entry ? Number(entry.split(':')[2]) || 0 : 0;
}

/** Definição (nome, texto e efeitos) de uma entrada "cond:"/"debuff:" de `state.active`. */
export function onYouEntry(key: string): OnYouDef | undefined {
  if (key.startsWith(`${CONDITION_PREFIX}${EXHAUSTION_ID}:`)) {
    const level = Number(key.split(':')[2]) || 1;
    return {
      id: EXHAUSTION_ID,
      name: `Exaustão ${level}`,
      text: `−${2 * level} nos Testes de D20 e −${(1.5 * level).toString().replace('.', ',')} m de Deslocamento.`,
      effects: exhaustionEffects(level),
    };
  }
  return BY_KEY.get(key);
}

export function isOnYouKey(key: string): boolean {
  return onYouEntry(key) !== undefined;
}
