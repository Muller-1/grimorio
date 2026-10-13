/**
 * Passo 3 do Livro do Jogador (2024): valores de atributo.
 * - Conjunto Padrão: 15, 14, 13, 12, 10, 8 (cada um usado uma vez);
 * - Custo de Pontos: 27 pontos, valores de 8 a 15;
 * - Geração Aleatória: 4d6 descartando o menor, seis vezes;
 * - Manual: o jogador digita (ex.: regra da mesa).
 * Depois, o antecedente soma +2/+1 ou +1/+1/+1 em três atributos dele (máximo 20).
 */
import { ABILITY_KEYS, type AbilityKey, type AbilityMethod } from '@grimorio/shared';
import type { Rng } from '../dice/rng';

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;

export const POINT_BUY_BUDGET = 27;
export const POINT_BUY_MIN = 8;
export const POINT_BUY_MAX = 15;
const POINT_BUY_COST: Record<number, number> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
};

/** Custo de um valor na compra de pontos (`null` se fora de 8–15). */
export function pointBuyCost(score: number): number | null {
  return POINT_BUY_COST[score] ?? null;
}

export function pointBuySpent(scores: Partial<Record<AbilityKey, number | null>>): number {
  return ABILITY_KEYS.reduce((sum, k) => sum + (pointBuyCost(scores[k] ?? POINT_BUY_MIN) ?? 0), 0);
}

export const MANUAL_MIN = 3;
export const MANUAL_MAX = 18;
export const SCORE_CAP = 20;

export type BaseScores = Record<AbilityKey, number | null>;

export const EMPTY_SCORES: BaseScores = {
  str: null,
  dex: null,
  con: null,
  int: null,
  wis: null,
  cha: null,
};

export type AbilityIssue =
  | 'incomplete'
  | 'standard-array-mismatch'
  | 'point-buy-over-budget'
  | 'point-buy-out-of-range'
  | 'rolled-not-rolled'
  | 'rolled-mismatch'
  | 'manual-out-of-range';

/** Os seis números de uma lista, cada um usado uma vez? */
function usesExactly(values: readonly number[], pool: readonly number[]): boolean {
  return [...values].sort((a, b) => a - b).join(',') === [...pool].sort((a, b) => a - b).join(',');
}

export function validateBaseScores(
  method: AbilityMethod,
  scores: BaseScores,
  rolled: readonly number[] | null,
): AbilityIssue[] {
  const values = ABILITY_KEYS.map((k) => scores[k]);
  if (values.some((v) => v === null)) return ['incomplete'];
  const nums = values as number[];
  switch (method) {
    case 'standard-array':
      return usesExactly(nums, STANDARD_ARRAY) ? [] : ['standard-array-mismatch'];
    case 'point-buy': {
      if (nums.some((n) => n < POINT_BUY_MIN || n > POINT_BUY_MAX)) {
        return ['point-buy-out-of-range'];
      }
      return pointBuySpent(scores) > POINT_BUY_BUDGET ? ['point-buy-over-budget'] : [];
    }
    case 'rolled':
      if (!rolled || rolled.length !== 6) return ['rolled-not-rolled'];
      return usesExactly(nums, rolled) ? [] : ['rolled-mismatch'];
    case 'manual':
      return nums.some((n) => n < MANUAL_MIN || n > MANUAL_MAX) ? ['manual-out-of-range'] : [];
  }
}

/** Uma rolagem de 4d6 descartando o menor: os 4 dados e o total dos 3 maiores. */
export interface AbilityRoll {
  dice: [number, number, number, number];
  dropped: number;
  total: number;
}

export function rollAbilityScore(rng: Rng): AbilityRoll {
  const dice = [rng.int(1, 6), rng.int(1, 6), rng.int(1, 6), rng.int(1, 6)] as AbilityRoll['dice'];
  const dropped = dice.indexOf(Math.min(...dice));
  const total = dice.reduce((sum, d, i) => (i === dropped ? sum : sum + d), 0);
  return { dice, dropped, total };
}

export function rollAbilityScores(rng: Rng): AbilityRoll[] {
  return Array.from({ length: 6 }, () => rollAbilityScore(rng));
}

// ---------- bônus do antecedente ----------

export type BonusMode = 'two-one' | 'one-one-one';
export type BonusIssue = 'bonus-wrong-shape' | 'bonus-outside-background' | 'bonus-over-cap';

/** +2/+1 em dois atributos diferentes ou +1 nos três, só nos atributos do antecedente. */
export function validateBackgroundBonus(
  bonus: Partial<Record<AbilityKey, number>>,
  allowed: readonly AbilityKey[],
  base: BaseScores,
): BonusIssue[] {
  const entries = Object.entries(bonus).filter(([, v]) => (v ?? 0) > 0) as [AbilityKey, number][];
  if (entries.some(([k]) => !allowed.includes(k))) return ['bonus-outside-background'];
  const shape = entries
    .map(([, v]) => v)
    .sort()
    .join(',');
  if (shape !== '1,2' && shape !== '1,1,1') return ['bonus-wrong-shape'];
  if (entries.some(([k, v]) => (base[k] ?? 0) + v > SCORE_CAP)) return ['bonus-over-cap'];
  return [];
}

/** Sugestão: +2 no melhor atributo da classe que o antecedente permite e +1 no seguinte. */
export function suggestBackgroundBonus(
  allowed: readonly AbilityKey[],
  priority: readonly AbilityKey[],
): Partial<Record<AbilityKey, number>> {
  const ordered = [...allowed].sort((a, b) => {
    const ia = priority.indexOf(a);
    const ib = priority.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  return { [ordered[0]!]: 2, [ordered[1]!]: 1 };
}

/** Valores finais (base + antecedente, até 20). */
export function finalScores(
  base: BaseScores,
  bonus: Partial<Record<AbilityKey, number>>,
): Record<AbilityKey, number> {
  return Object.fromEntries(
    ABILITY_KEYS.map((k) => [k, Math.min(SCORE_CAP, (base[k] ?? 8) + (bonus[k] ?? 0))]),
  ) as Record<AbilityKey, number>;
}
