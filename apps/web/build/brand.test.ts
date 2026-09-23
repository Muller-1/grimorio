// Checklist de lançamento (Etapa 8) e RNF-14: nenhuma marca do jogo original no nome, no logo
// nem nos textos do site. O aviso de "sem vínculo" cita a editora, e isso é permitido.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const WEB = fileURLToPath(new URL('..', import.meta.url));
const SCANNED = ['src', 'public', 'index.html'];
const TEXT_FILES = new Set(['.ts', '.tsx', '.css', '.html', '.svg', '.json', '.txt', '.md', '']);

// Monta os termos sem escrevê-los por inteiro, para este arquivo não acusar a si mesmo.
const D = 'D';
const FORBIDDEN = [
  new RegExp(`\\b${D}\\s*(&|&amp;)\\s*${D}\\b`, 'i'),
  new RegExp(`\\b${D}\\s+and\\s+${D}\\b`, 'i'),
  new RegExp(`\\b${D}n${D}\\b`, 'i'),
  new RegExp(`dungeons\\s*(&|&amp;|and|e)\\s*dragons`, 'i'),
];

function files(path: string): string[] {
  if (statSync(path).isFile()) return [path];
  return readdirSync(path).flatMap((name) => files(join(path, name)));
}

export function brandViolations(text: string): string[] {
  return FORBIDDEN.flatMap((re) => text.match(re)?.[0] ?? []);
}

describe('marca (RNF-14)', () => {
  it('o detector reconhece as variações', () => {
    for (const sample of [
      'D&D',
      'd & d',
      'DnD',
      'D and D',
      'Dungeons & Dragons',
      'dungeons and dragons',
    ])
      expect(brandViolations(`x ${sample} y`)).not.toEqual([]);
    for (const sample of ['Grimório', 'dados d20', 'add', 'DD 15', 'drag-and-drop', 'rolagem de d'])
      expect(brandViolations(sample)).toEqual([]);
  });

  it('o site não usa a marca do jogo original', () => {
    const found = SCANNED.flatMap((entry) => files(join(WEB, entry)))
      .filter((file) => TEXT_FILES.has(extname(file)) && !file.endsWith('brand.test.ts'))
      .flatMap((file) =>
        brandViolations(readFileSync(file, 'utf8')).map((hit) => `${relative(WEB, file)}: ${hit}`),
      );
    expect(found).toEqual([]);
  });
});
