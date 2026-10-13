import { describe, expect, it, vi } from 'vitest';

vi.stubGlobal('__APP_VERSION__', '0.1.0');
vi.stubGlobal('__APP_COMMIT__', 'teste');

const { safeNext } = await import('./store');

describe('safeNext (para onde voltar depois do login)', () => {
  it('só aceita caminhos do próprio site', () => {
    expect(safeNext('/personagem?id=abc')).toBe('/personagem?id=abc');
    expect(safeNext('//site-malicioso.example')).toBe('/personagens');
    expect(safeNext('/\\site-malicioso.example')).toBe('/personagens');
    expect(safeNext('https://site-malicioso.example')).toBe('/personagens');
    expect(safeNext(null)).toBe('/personagens');
  });
});
