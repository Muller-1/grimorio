/**
 * Temas (Pergaminho e Obsidiana, docs/design.md): cada tema do public/theme.js tem um bloco
 * completo no styles/index.css e passa no contraste AA (WCAG 2.1) nos pares de cor que o site usa.
 * A lista do theme.js é conferida contra src/lib/theme.ts em src/lib/theme.test.ts.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/styles/index.css', import.meta.url), 'utf8');
const themeJs = readFileSync(new URL('../public/theme.js', import.meta.url), 'utf8');
const THEMES = /\^\(([a-z|]+)\)\$/.exec(themeJs)?.[1]?.split('|') ?? [];

// ---------- contraste (WCAG 2.1) ----------

const COLOR_VARS = [
  'bg',
  'surface',
  'surface-2',
  'sunken',
  'field',
  'border',
  'border-soft',
  'border-strong',
  'rule',
  'text',
  'muted',
  'accent',
  'accent-hover',
  'accent-border',
  'accent-soft',
  'accent-contrast',
  'gold',
  'gold-soft',
  'ornament',
  'seal',
  'seal-line',
  'die-face',
  ...Array.from({ length: 10 }, (_, i) => `die-${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `metal-${i + 1}`),
  'success',
  'success-soft',
  'danger',
  'danger-soft',
  'focus',
] as const;

/** Variáveis de um bloco `seletor { … }` do index.css. */
function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`bloco ${selector} não encontrado`);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  return Object.fromEntries(
    [...body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]!.trim()]),
  );
}

/** O claro também é o padrão (`:root`); os outros só valem com `data-theme`. */
const selectorOf = (id: string) =>
  id === 'light' ? ":root,\n[data-theme='light']" : `[data-theme='${id}']`;

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/** Pares de texto/fundo que o site usa de verdade (texto: 4,5; foco: 3). */
const PAIRS: [fg: string, bg: string, min: number][] = [
  ...['bg', 'surface', 'surface-2', 'field', 'sunken', 'accent-soft', 'gold-soft'].flatMap(
    (bg) =>
      [
        ['text', bg, 4.5],
        ['muted', bg, 4.5],
      ] as [string, string, number][],
  ),
  ['accent', 'bg', 4.5],
  ['accent', 'surface', 4.5],
  ['accent', 'accent-soft', 4.5],
  ['accent', 'field', 4.5],
  ['accent-contrast', 'accent', 4.5],
  ['accent-contrast', 'accent-hover', 4.5],
  ['gold', 'gold-soft', 4.5],
  ['gold', 'surface', 4.5],
  ['gold', 'surface-2', 4.5],
  ['gold', 'field', 4.5],
  ['success', 'success-soft', 4.5],
  ['success', 'surface', 4.5],
  ['success', 'field', 4.5],
  ['danger', 'danger-soft', 4.5],
  ['danger', 'surface', 4.5],
  ['danger', 'field', 4.5],
  ['surface', 'gold', 4.5],
  ['surface', 'success', 4.5],
  ['surface', 'danger', 4.5],
  ['focus', 'bg', 3],
  ['focus', 'surface', 3],
  // Borda de campos e botões de contorno (componente de interface: 3:1).
  ['border-strong', 'field', 3],
  ['border-strong', 'surface', 3],
  ['die-face', 'die-3', 4.5],
];

describe('temas: cores', () => {
  it('o theme.js lista os temas', () => {
    expect(THEMES).toContain('light');
    expect(THEMES).toContain('dark');
  });

  for (const id of THEMES) {
    const vars = block(selectorOf(id));

    it(`${id}: define todas as cores`, () => {
      for (const name of COLOR_VARS) expect(vars[name], name).toMatch(/^#[0-9a-f]{6}$/);
      expect(vars.shadow).toBeDefined();
      expect(vars['accent-inset']).toBeDefined();
    });

    it(`${id}: texto com contraste AA`, () => {
      const fails = PAIRS.filter(([fg, bg, min]) => contrast(vars[fg]!, vars[bg]!) < min).map(
        ([fg, bg]) => `${fg} sobre ${bg}: ${contrast(vars[fg]!, vars[bg]!).toFixed(2)}`,
      );
      expect(fails).toEqual([]);
    });
  }

  it('só dois temas: Pergaminho e Obsidiana', () => {
    expect(THEMES).toEqual(['light', 'dark']);
  });

  it('o escuro automático (sistema) usa o mesmo bloco do Obsidiana escolhido', () => {
    expect(css).toContain(":root[data-system-dark]:not([data-theme]),\n[data-theme='dark'] {");
    // Uma fonte só para as cores escuras: nada de repetir o bloco numa @media.
    expect(css).not.toContain('prefers-color-scheme');
  });
});
