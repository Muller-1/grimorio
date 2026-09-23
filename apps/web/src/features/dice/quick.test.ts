import { parse } from '@grimorio/rules';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { buildQuickExpression, QUICK_DICE } from './quick';

describe('rolagem rápida', () => {
  it.each([
    [{ count: 1, sides: 20, modifier: 5 }, '1d20+5'],
    [{ count: 3, sides: 6, modifier: -1 }, '3d6-1'],
    [{ count: 100, sides: 2, modifier: 0 }, '100d2'],
  ])('%o → %s', (input, expected) => {
    expect(buildQuickExpression(input)).toBe(expected);
  });

  it('qualquer combinação dos campos gera expressão válida', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.constantFrom(...QUICK_DICE),
        fc.integer({ min: -999, max: 999 }),
        (count, sides, modifier) => parse(buildQuickExpression({ count, sides, modifier })).ok,
      ),
    );
  });
});
