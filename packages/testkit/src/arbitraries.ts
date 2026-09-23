import fc from 'fast-check';

/** Expressão de dados válida gerada ao acaso (somas de dados e constantes). */
export const arbDiceExpression = (): fc.Arbitrary<string> => {
  const term = fc.oneof(
    fc.integer({ min: 0, max: 100 }).map(String),
    fc
      .tuple(fc.integer({ min: 1, max: 20 }), fc.constantFrom(4, 6, 8, 10, 12, 20, 100))
      .map(([c, s]) => `${c}d${s}`),
  );
  return fc
    .array(fc.tuple(fc.constantFrom('+', '-'), term), { maxLength: 5 })
    .chain((rest) => term.map((first) => first + rest.map(([op, t]) => op + t).join('')));
};

/** Lixo para parser e API: qualquer texto. */
export const arbGarbage = (): fc.Arbitrary<string> => fc.string({ maxLength: 80 });
