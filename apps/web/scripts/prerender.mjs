// Pré-renderização (plano de início, Etapas 5 e 8): gera um HTML estático para cada rota.
// Roda depois de `vite build` (cliente) e `vite build --ssr` (servidor).
//
// - Páginas "full" (início, apoio, créditos, termos, privacidade): HTML completo, hidratado no
//   navegador. Boas para busca e abrem já com o texto.
// - Páginas "shell" (ficha, dados, 404): só a moldura do site; a página é desenhada no navegador.
//   Assim, abrir /dados direto não mostra por um instante o conteúdo da página inicial. O HTML
//   já pede (modulepreload) os arquivos da página, que baixam junto com o JS principal.
import { readFile, rm, writeFile } from 'node:fs/promises';

// Uso: node scripts/prerender.mjs [pasta-do-site] [pasta-ssr]  (padrão: dist dist-ssr)
const [distDir = 'dist', ssrDir = 'dist-ssr'] = process.argv.slice(2);
const dist = new URL(`../${distDir}/`, import.meta.url);
const ssr = new URL(`../${ssrDir}/`, import.meta.url);

const { render, STATIC_PAGES } = await import(new URL('entry-server.js', ssr).href);

// Manifesto do Vite (build.manifest): arquivos de cada módulo carregado sob demanda.
const manifestFile = new URL('.vite/manifest.json', dist);
const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));

/** Arquivos JS que `lazyModule` precisa e que o index.html ainda não carrega. */
function preloadsFor(lazyModule) {
  if (!manifest[lazyModule]) throw new Error(`${lazyModule} não está no manifesto do Vite.`);
  const files = [];
  const visit = (key) => {
    const chunk = manifest[key];
    if (!chunk || chunk.isEntry || files.includes(chunk.file)) return;
    files.push(chunk.file);
    for (const dep of chunk.imports ?? []) visit(dep);
  };
  visit(lazyModule);
  return files;
}
const template = await readFile(new URL('index.html', dist), 'utf8');
const MARKER = '<div id="root"><!--app-html--></div>';
if (!template.includes(MARKER))
  throw new Error(`Marcador ${MARKER} não encontrado em ${distDir}/index.html`);

for (const { path, file, prerender, lazyModule } of STATIC_PAGES) {
  const html = render(path);
  // `data-prerendered` diz ao main.tsx que pode hidratar; `data-shell`, que deve desenhar do zero.
  const mark = prerender === 'full' ? 'data-prerendered' : 'data-shell';
  const preloads = (lazyModule ? preloadsFor(lazyModule) : [])
    .map((js) => `<link rel="modulepreload" crossorigin href="/${js}">`)
    .join('\n    ');
  const page = template
    .replace('</head>', preloads ? `  ${preloads}\n  </head>` : '</head>')
    .replace(MARKER, `<div id="root" ${mark}="${path}">${html}</div>`);
  await writeFile(new URL(file, dist), page);
  console.log(`${prerender.padEnd(5)} ${path} → ${distDir}/${file} (${html.length} caracteres)`);
}

await rm(ssr, { recursive: true, force: true });
// O manifesto só serve ao build; não precisa ir para o ar.
await rm(new URL('.vite/', dist), { recursive: true, force: true });
