/**
 * Gerador de números aleatórios (plano v2, 12.3).
 *
 * A fonte de bytes é separada do mapeamento para a faixa pedida. Assim o mapeamento
 * (onde um bug de viés realmente poderia aparecer) é testado de forma determinística.
 */

export interface Rng {
  /** Inteiro uniforme entre `min` e `max`, inclusivo nos dois lados. */
  int(min: number, max: number): number;
}

/** Fonte de bytes aleatórios. Em produção, Web Crypto; nos testes, qualquer sequência. */
export type RandomSource = (out: Uint32Array) => void;

const RANGE_32 = 2 ** 32;

export function createRng(source: RandomSource): Rng {
  const buf = new Uint32Array(1);
  return {
    int(min, max) {
      if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max) {
        throw new RangeError(`faixa inválida: [${min}, ${max}]`);
      }
      const range = max - min + 1;
      if (range > RANGE_32) throw new RangeError(`faixa grande demais: ${range}`);
      // Maior múltiplo de `range` que cabe em 32 bits; valores acima dele são descartados.
      // Sem isso, algumas faces sairiam um tiquinho mais que outras (viés de módulo).
      const limit = RANGE_32 - (RANGE_32 % range);
      let x: number;
      do {
        source(buf);
        x = buf[0]!;
      } while (x >= limit);
      return min + (x % range);
    },
  };
}

interface WebCryptoLike {
  getRandomValues(array: Uint32Array): Uint32Array;
}

function webCrypto(): WebCryptoLike {
  const c = (globalThis as { crypto?: WebCryptoLike }).crypto;
  if (!c?.getRandomValues) {
    throw new Error('Web Crypto indisponível neste ambiente');
  }
  return c;
}

/** Gerador criptográfico: o único usado em produção. Funciona no navegador e no Node. */
export const cryptoRng: Rng = createRng((out) => {
  webCrypto().getRandomValues(out);
});

/** splitmix32: espalha uma semente de 32 bits em estados iniciais bem diferentes. */
function splitmix32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    return (z ^ (z >>> 16)) >>> 0;
  };
}

/**
 * sfc32: PRNG pequeno e rápido. **Só para testes e ambientes de teste** — é previsível
 * a partir da semente, e é exatamente isso que torna uma falha reproduzível.
 */
export function sfc32Source(seed: number): RandomSource {
  const next = splitmix32(seed);
  let a = next();
  let b = next();
  let c = next();
  let d = next();
  const step = (): number => {
    const t = (((a + b) >>> 0) + d) >>> 0;
    d = (d + 1) >>> 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) >>> 0;
    c = ((c << 21) | (c >>> 11)) >>> 0;
    c = (c + t) >>> 0;
    return t;
  };
  for (let i = 0; i < 15; i++) step();
  return (out) => {
    for (let i = 0; i < out.length; i++) out[i] = step();
  };
}

/** Só testes e ambientes de teste: sequência reproduzível a partir de uma semente. */
export function seededRng(seed: number): Rng {
  return createRng(sfc32Source(seed));
}
