import type { FeatureDef } from './types';

/** Valor por nível a partir de uma lista de [nível inicial, valor] (ex.: [[1, 2], [3, 3]]). */
export function byLevel<T extends number | string>(steps: [number, T][]): T[] {
  const out: T[] = [];
  let current = steps[0]![1];
  for (let level = 1; level <= 20; level++) {
    const step = steps.find(([l]) => l === level);
    if (step) current = step[1];
    out.push(current);
  }
  return out;
}

/** Aumento no Valor de Atributo nos níveis indicados. */
export function asiFeatures(levels: number[]): FeatureDef[] {
  return levels.map((level) => ({
    id: `asi-${level}`,
    level,
    name: 'Aumento no Valor de Atributo',
    text: 'Aumente um atributo em 2, ou dois atributos em 1 (máximo 20), ou escolha um talento para o qual você se qualifique.',
    choice: { kind: 'asi' },
  }));
}

export function epicBoon(recommended?: string): FeatureDef {
  return {
    id: 'epic-boon',
    level: 19,
    name: 'Dádiva Épica',
    text: `Escolha um talento de Dádiva Épica ou outro talento para o qual você se qualifique.${
      recommended ? ` Recomendado: ${recommended}.` : ''
    }`,
    choice: { kind: 'epic-boon' },
  };
}

export function subclassFeature(level: number, className: string): FeatureDef {
  return {
    id: 'subclass',
    level,
    name: `Subclasse de ${className}`,
    text: `Escolha uma subclasse de ${className}. Ela dá características nos níveis indicados na tabela da classe.`,
    choice: { kind: 'subclass' },
  };
}

export function extraAttack(
  level: number,
  text = 'Você ataca duas vezes, em vez de uma, quando usa a ação Atacar no seu turno.',
): FeatureDef {
  return { id: 'extra-attack', level, name: 'Ataque Extra', text };
}

/** Espaços por círculo do conjurador pleno (Bardo, Clérigo, Druida, Feiticeiro, Mago). */
export const FULL_CASTER_SLOTS: readonly (readonly number[])[] = [
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

/** Meio-conjurador de 2024 (Paladino, Guardião): já conjura no nível 1. */
export const HALF_CASTER_SLOTS: readonly (readonly number[])[] = [
  [2],
  [2],
  [3],
  [3],
  [4, 2],
  [4, 2],
  [4, 3],
  [4, 3],
  [4, 3, 2],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2],
];

/** Magia de Pacto do Bruxo: quantos espaços e de que círculo, por nível. */
export const PACT_SLOTS: readonly { count: number; circle: number }[] = [
  { count: 1, circle: 1 },
  { count: 2, circle: 1 },
  { count: 2, circle: 2 },
  { count: 2, circle: 2 },
  { count: 2, circle: 3 },
  { count: 2, circle: 3 },
  { count: 2, circle: 4 },
  { count: 2, circle: 4 },
  { count: 2, circle: 5 },
  { count: 2, circle: 5 },
  { count: 3, circle: 5 },
  { count: 3, circle: 5 },
  { count: 3, circle: 5 },
  { count: 3, circle: 5 },
  { count: 3, circle: 5 },
  { count: 3, circle: 5 },
  { count: 4, circle: 5 },
  { count: 4, circle: 5 },
  { count: 4, circle: 5 },
  { count: 4, circle: 5 },
];

/** Magias preparadas dos conjuradores plenos de Sabedoria/Carisma (Bardo, Clérigo, Druida). */
export const FULL_PREPARED = [
  4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22,
] as const;

/** Magias preparadas de Paladino e Guardião. */
export const HALF_PREPARED = [
  2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15,
] as const;
