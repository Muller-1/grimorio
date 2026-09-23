import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createRng, cryptoRng, seededRng, type RandomSource } from './rng';

const TWO_32 = 2 ** 32;

/** Fonte falsa: devolve os valores na ordem e conta as chamadas. */
function fakeSource(values: number[]): RandomSource & { calls: number } {
  let i = 0;
  const source = ((out: Uint32Array) => {
    source.calls++;
    const v = values[i++];
    if (v === undefined) throw new Error('fonte falsa sem valores');
    out[0] = v;
  }) as RandomSource & { calls: number };
  source.calls = 0;
  return source;
}

describe('createRng — mapeamento determinístico (plano v2, 12.5)', () => {
  it('descarta o valor igual ao limite e usa o próximo', () => {
    const range = 20;
    const limit = TWO_32 - (TWO_32 % range);
    const source = fakeSource([limit, 0]);
    expect(createRng(source).int(1, 20)).toBe(1);
    expect(source.calls).toBe(2);
  });

  it('faixa que divide 2^32 nunca descarta', () => {
    const source = fakeSource([TWO_32 - 1]);
    expect(createRng(source).int(1, 4)).toBe(4);
    expect(source.calls).toBe(1);
  });

  it.each([4, 6, 8, 10, 12, 20, 100])(
    'd%i: limites da fonte ficam dentro de [1, lados]',
    (sides) => {
      const limit = TWO_32 - (TWO_32 % sides);
      // menor valor, maior valor aceito e um valor descartado seguido do maior aceito
      for (const values of [[0], [limit - 1], [TWO_32 - 1, limit - 1]]) {
        const rng = createRng(fakeSource(values));
        const r = rng.int(1, sides);
        expect(r).toBeGreaterThanOrEqual(1);
        expect(r).toBeLessThanOrEqual(sides);
      }
      expect(createRng(fakeSource([0])).int(1, sides)).toBe(1);
      expect(createRng(fakeSource([limit - 1])).int(1, sides)).toBe(sides);
    },
  );

  it('min igual a max devolve sempre o mesmo número', () => {
    expect(createRng(fakeSource([123456])).int(7, 7)).toBe(7);
  });

  it('recusa faixas inválidas (erro de programação)', () => {
    const rng = createRng(fakeSource([0]));
    expect(() => rng.int(5, 1)).toThrow(RangeError);
    expect(() => rng.int(1.5, 3)).toThrow(RangeError);
    expect(() => rng.int(0, TWO_32)).toThrow(RangeError);
  });
});

describe('seededRng', () => {
  it('mesma semente → mesma sequência', () => {
    const a = seededRng(42);
    const b = seededRng(42);
    const seqA = Array.from({ length: 50 }, () => a.int(1, 20));
    const seqB = Array.from({ length: 50 }, () => b.int(1, 20));
    expect(seqA).toEqual(seqB);
  });

  it('sementes diferentes → sequências diferentes', () => {
    const a = seededRng(1);
    const b = seededRng(2);
    const seqA = Array.from({ length: 20 }, () => a.int(1, 1000));
    const seqB = Array.from({ length: 20 }, () => b.int(1, 1000));
    expect(seqA).not.toEqual(seqB);
  });
});

describe('propriedades', () => {
  it('qualquer min ≤ max (faixa ≤ 10.000) dá resultado dentro da faixa', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10_000, max: 10_000 }),
        fc.integer({ min: 0, max: 9_999 }),
        fc.integer(),
        (min, width, seed) => {
          const max = min + width;
          const r = seededRng(seed).int(min, max);
          return Number.isInteger(r) && r >= min && r <= max;
        },
      ),
    );
  });

  it('com qualquer fonte, o resultado fica dentro da faixa', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: TWO_32 - 1 }), { minLength: 64, maxLength: 64 }),
        fc.integer({ min: 2, max: 10_000 }),
        (values, sides) => {
          // Fonte cíclica: nunca acaba (valores descartados só puxam o próximo)
          let i = 0;
          const rng = createRng((out) => {
            out[0] = values[i++ % values.length] ?? 0;
          });
          const limit = TWO_32 - (TWO_32 % sides);
          fc.pre(values.some((v) => v < limit));
          const r = rng.int(1, sides);
          return r >= 1 && r <= sides;
        },
      ),
    );
  });
});

describe('cryptoRng', () => {
  it('funciona no Node (Web Crypto global)', () => {
    for (let i = 0; i < 1000; i++) {
      const r = cryptoRng.int(1, 20);
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(20);
    }
  });
});
