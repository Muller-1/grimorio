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

/** Um pedaço carregado sob demanda + tudo que ele importa e ainda não foi carregado. */
function lazyChunk(prefix) {
  const file = readdirSync(new URL('assets/', DIST)).find(
    (name) => name.startsWith(`${prefix}-`) && name.endsWith('.js'),
  );
  if (!file) throw new Error(`Pedaço ${prefix}-*.js não encontrado em dist/assets.`);
  const seen = new Set(initialJs);
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
    name: 'Página /ficha (sob demanda)',
    path: inDist(lazyChunk('SheetPage')),
    gzip: true,
    limit: '100 kB',
  },
];
