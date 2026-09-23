import { cryptoRng, type Rng } from '@grimorio/rules';

/**
 * Porta de aleatoriedade do front (plano v2, 6.5). Em produção, sempre o gerador
 * criptográfico. Os ganchos de teste (Etapa 6) poderão trocar por `seededRng`.
 */
let current: Rng = cryptoRng;

export function getRng(): Rng {
  return current;
}

export function setRng(rng: Rng | null): void {
  current = rng ?? cryptoRng;
}
