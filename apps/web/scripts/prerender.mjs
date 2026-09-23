// Pré-renderização (plano de início, Etapa 5): gera o HTML estático da página inicial.
// Roda depois de `vite build` (cliente) e `vite build --ssr` (servidor).
import { readFile, rm, writeFile } from 'node:fs/promises';

// Uso: node scripts/prerender.mjs [pasta-do-site] [pasta-ssr]  (padrão: dist dist-ssr)
const [distDir = 'dist', ssrDir = 'dist-ssr'] = process.argv.slice(2);
const dist = new URL(`../${distDir}/`, import.meta.url);
const ssr = new URL(`../${ssrDir}/`, import.meta.url);
const ssrEntry = new URL('entry-server.js', ssr);

/** Rotas pré-renderizadas. O compêndio (R4) entra aqui depois. */
const ROUTES = ['/'];

const { render } = await import(ssrEntry.href);
const template = await readFile(new URL('index.html', dist), 'utf8');
const MARKER = '<div id="root"><!--app-html--></div>';
if (!template.includes(MARKER))
  throw new Error(`Marcador ${MARKER} não encontrado em dist/index.html`);

for (const route of ROUTES) {
  const html = render(route);
  const page = template.replace(MARKER, `<div id="root" data-prerendered="${route}">${html}</div>`);
  const file = route === '/' ? 'index.html' : `${route.slice(1)}/index.html`;
  await writeFile(new URL(file, dist), page);
  console.log(`pré-renderizado: ${route} → ${distDir}/${file} (${html.length} caracteres)`);
}

await rm(ssr, { recursive: true, force: true });
