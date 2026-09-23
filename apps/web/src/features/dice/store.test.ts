import { seededRng, type RollResult } from '@grimorio/rules';
import { beforeEach, describe, expect, it } from 'vitest';
import { setRng } from '@/ports/rng';
import { naturalD20, useDiceStore } from './store';

const fixed = (values: number[]) => {
  let i = 0;
  return { int: () => values[i++] ?? 1 };
};

describe('diceStore', () => {
  beforeEach(() => {
    useDiceStore.getState().clear();
    setRng(null);
  });

  it('rola pela porta e guarda no histórico (mais recente primeiro)', () => {
    setRng(seededRng(123));
    const a = useDiceStore.getState().roll({ label: 'A', expression: '1d20' });
    const b = useDiceStore.getState().roll({ label: 'B', expression: '2d6+1' });
    expect(a.ok && b.ok).toBe(true);
    expect(useDiceStore.getState().history.map((e) => e.label)).toEqual(['B', 'A']);
  });

  it('mesma semente, mesmos resultados (base do cenário B11)', () => {
    setRng(seededRng(99));
    const first = useDiceStore.getState().roll({ label: 'x', expression: '4d6kh3' });
    setRng(seededRng(99));
    const second = useDiceStore.getState().roll({ label: 'x', expression: '4d6kh3' });
    expect(first.ok && second.ok && first.entry.result.total === second.entry.result.total).toBe(
      true,
    );
  });

  it('expressão inválida não entra no histórico', () => {
    const r = useDiceStore.getState().roll({ label: 'x', expression: '1d' });
    expect(r.ok).toBe(false);
    expect(useDiceStore.getState().history).toHaveLength(0);
  });

  it('naturalD20 só vale com exatamente um d20 mantido', () => {
    setRng(fixed([7, 18]));
    const adv = useDiceStore.getState().roll({ label: 'x', expression: '2d20kh1+3' });
    expect(adv.ok && naturalD20(adv.entry.result)).toBe(18);
    const noD20: RollResult = { expression: '1d6', total: 3, terms: [] };
    expect(naturalD20(noD20)).toBeNull();
  });
});
