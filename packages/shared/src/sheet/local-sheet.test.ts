import { describe, expect, it } from 'vitest';
import { createBlankSheet, parseLocalSheet } from './local-sheet';

describe('LocalSheet', () => {
  it('a ficha em branco é válida', () => {
    const blank = createBlankSheet();
    expect(parseLocalSheet(blank)).toEqual(blank);
  });

  it('dados desconhecidos ou corrompidos são recusados', () => {
    expect(parseLocalSheet(null)).toBeNull();
    expect(parseLocalSheet({ schemaVersion: 99 })).toBeNull();
    const broken = createBlankSheet() as unknown as { build: { level: number } };
    broken.build.level = 42;
    expect(parseLocalSheet(broken)).toBeNull();
  });
});
