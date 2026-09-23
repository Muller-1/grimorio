import { describe, expect, it } from 'vitest';
import { clampInt, feetToMeters, formatModifier, metersToFeet } from './format';

describe('format', () => {
  it('modificador com sinal', () => {
    expect(formatModifier(3)).toBe('+3');
    expect(formatModifier(0)).toBe('+0');
    expect(formatModifier(-1)).toBe('−1');
  });

  it('pés ↔ metros como nos livros (30 pés = 9 m)', () => {
    expect(feetToMeters(30)).toBe('9');
    expect(feetToMeters(25)).toBe('7,5');
    expect(metersToFeet(9)).toBe(30);
    expect(metersToFeet(7.5)).toBe(25);
  });

  it('clampInt', () => {
    expect(clampInt(25, 1, 20)).toBe(20);
    expect(clampInt(Number.NaN, 1, 20)).toBe(1);
    expect(clampInt(3.7, 1, 20)).toBe(3);
  });
});
