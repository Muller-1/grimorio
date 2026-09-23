import { parse } from '@grimorio/rules';
import { parseLocalSheet } from '@grimorio/shared';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { aSheet, arbDiceExpression } from './index';

describe('testkit', () => {
  it('arbDiceExpression só gera expressões válidas', () => {
    fc.assert(fc.property(arbDiceExpression(), (text) => parse(text).ok));
  });

  it('aSheet gera fichas válidas pelo schema', () => {
    const sheet = aSheet().named('Teste').level(5).hitDie(10).build();
    expect(parseLocalSheet(sheet)).toEqual(sheet);
  });
});
