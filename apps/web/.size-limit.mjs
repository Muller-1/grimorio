// Orçamentos de tamanho (plano v2, RNF-01; plano de início, Etapa 8). Rode depois de `pnpm build`:
//   pnpm --filter @grimorio/web size
// O "JS inicial" é tudo que o index.html carrega antes de qualquer interação. As páginas pesadas
// são carregadas sob demanda e têm orçamento próprio.
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const DIST = new URL('./dist/', import.meta.url);
const html = new URL('index.html', DIST);
if (!existsSync(html)) throw new Error('apps/web/dist não existe. Rode `pnpm build` antes.');

const page = readFileSync(html, 'utf8');
const attr = (tag, name) => tag.match(new RegExp(`${name}="/?([^"]+)"`))?.[1];
const tags = (pattern) => [...page.matchAll(pattern)].map((m) => m[0]);

const initialJs = [
  ...tags(/<script[^>]*type="module"[^>]*>/g).map((tag) => attr(tag, 'src')),
  ...tags(/<link[^>]*rel="modulepreload"[^>]*>/g).map((tag) => attr(tag, 'href')),
].filter(Boolean);
const initialCss = tags(/<link[^>]*rel="stylesheet"[^>]*>/g).map((tag) => attr(tag, 'href'));

/**
 * Um pedaço carregado sob demanda + tudo que ele importa e ainda não foi carregado.
 * `after`: arquivos que já estão na tela quando ele carrega (ex.: a aba Magias abre na ficha).
 */
function lazyChunk(prefix, after = []) {
  const file = readdirSync(new URL('assets/', DIST)).find(
    (name) => name.startsWith(`${prefix}-`) && name.endsWith('.js'),
  );
  if (!file) throw new Error(`Pedaço ${prefix}-*.js não encontrado em dist/assets.`);
  const seen = new Set([...initialJs, ...after]);
  const queue = [`assets/${file}`];
  const result = [];
  while (queue.length) {
    const current = queue.shift();
    if (seen.has(current)) continue;
    seen.add(current);
    result.push(current);
    const code = readFileSync(new URL(current, DIST), 'utf8');
    for (const [, dep] of code.matchAll(/(?:from|import)\s*["']\.\/([^"']+\.js)["']/g))
      queue.push(`assets/${dep}`);
  }
  return result;
}

const inDist = (files) => files.map((file) => `dist/${file}`);
const sheet = lazyChunk('SheetPage');

export default [
  { name: 'JS inicial (qualquer página)', path: inDist(initialJs), gzip: true, limit: '200 kB' },
  { name: 'CSS inicial', path: inDist(initialCss), gzip: true, limit: '15 kB' },
  {
    name: 'Página /dados (sob demanda)',
    path: inDist(lazyChunk('DicePage')),
    gzip: true,
    limit: '70 kB',
  },
  {
    // ADR-010: a ficha agora traz o motor das habilidades e a progressão das 12 classes
    // (≈ 29 kB). A lista de magias e a subida de nível ficam fora (orçamentos abaixo).
    // 115 → 120 kB: entraram os talentos, estilos de luta e antecedentes do livro (~2 kB).
    name: 'Página /ficha (sob demanda)',
    path: inDist(sheet),
    gzip: true,
    limit: '120 kB',
  },
  {
    name: 'Aba Magias (sob demanda, com a lista de magias)',
    path: inDist(lazyChunk('SpellsTab', sheet)),
    gzip: true,
    limit: '90 kB',
  },
  {
    name: 'Subir de nível (sob demanda, com a lista de magias)',
    path: inDist(lazyChunk('LevelUpDialog', sheet)),
    gzip: true,
    // 100 → 108 kB: entraram as 52 magias (~8 kB) e os talentos do livro (~3 kB).
    limit: '108 kB',
  },
];
