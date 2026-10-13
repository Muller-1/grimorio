import { describe, expect, it } from 'vitest';
import { createBlankSheet } from './local-sheet';
import { changedSections, sameSection, stableStringify, withSections } from './sections';

describe('seções da ficha', () => {
  it('a ordem das chaves não conta como mudança (o JSONB do Postgres reordena)', () => {
    expect(sameSection({ a: 1, b: { c: 2, d: [1, 2] } }, { b: { d: [1, 2], c: 2 }, a: 1 })).toBe(
      true,
    );
    expect(sameSection({ a: [1, 2] }, { a: [2, 1] })).toBe(false);
    expect(stableStringify(undefined)).toBe('null');
  });

  it('changedSections aponta só o que mudou', () => {
    const base = createBlankSheet();
    const next = JSON.parse(JSON.stringify(base)) as typeof base;
    next.identity.name = 'Thalia';
    next.state.inspiration = 1;
    expect(changedSections(base, next)).toEqual(['identity', 'state']);
  });

  it('withSections troca só as seções pedidas e remove `creation` com null', () => {
    const base = createBlankSheet();
    const merged = withSections(base, {
      identity: { ...base.identity, name: 'Bia' },
      creation: null,
    });
    expect(merged).toMatchObject({ identity: { name: 'Bia' }, build: base.build });
    expect(merged).not.toHaveProperty('creation');
    expect(base.identity.name).toBe('');
  });
});
