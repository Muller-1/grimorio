import { describe, expect, it } from 'vitest';
import { swipeDirection } from './swipe';

describe('swipeDirection', () => {
  it('deslizar para a esquerda vai para a próxima aba; para a direita, volta', () => {
    expect(swipeDirection(-120, 10, 200)).toBe(1);
    expect(swipeDirection(120, -10, 200)).toBe(-1);
  });

  it('gesto curto demais não conta', () => {
    expect(swipeDirection(-40, 0, 150)).toBe(0);
    expect(swipeDirection(59, 0, 150)).toBe(0);
  });

  it('rolar a página (mais vertical que horizontal) não troca de aba', () => {
    expect(swipeDirection(-80, 200, 300)).toBe(0);
    expect(swipeDirection(-100, 90, 300)).toBe(0);
  });

  it('arrastar devagar (selecionar, segurar) não troca de aba', () => {
    expect(swipeDirection(-200, 0, 1500)).toBe(0);
  });

  it('um pouco torto ainda vale quando é claramente horizontal', () => {
    expect(swipeDirection(-150, 60, 300)).toBe(1);
  });
});
