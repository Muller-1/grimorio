/** Sorteios com semente (mulberry32): a mesma semente repete o mesmo teste. */
export interface Rng {
  /** 0 ≤ n < 1 */
  next(): number;
  /** Inteiro entre min e max, inclusive. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  /** Cópia com outra sequência (um por jogador, para um não mexer na sorte do outro). */
  fork(salt: number): Rng;
}

export function seededRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng: Rng = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)]!,
    fork: (salt) => seededRng((seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0),
  };
  return rng;
}
