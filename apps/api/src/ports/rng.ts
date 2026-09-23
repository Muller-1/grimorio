import { cryptoRng, seededRng, type Rng } from '@grimorio/rules';

/** Gerador que a API de teste pode fixar numa semente (plano v2, 15.4: `/__test__/rng`). */
export interface ControllableRng extends Rng {
  /** `null` volta ao gerador criptográfico. */
  reseed(seed: number | null): void;
}

export function controllableRng(base: Rng = cryptoRng): ControllableRng {
  let current = base;
  return {
    int: (min, max) => current.int(min, max),
    reseed(seed) {
      current = seed === null ? base : seededRng(seed);
    },
  };
}

export function isControllableRng(rng: Rng): rng is ControllableRng {
  return typeof (rng as Partial<ControllableRng>).reseed === 'function';
}
