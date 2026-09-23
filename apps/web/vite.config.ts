import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { cloudflarePagesPreview } from './build/cloudflare-preview';
import { siteWideHeaders } from './build/headers';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

/** Commit atual (para "Relatar problema" e para o rodapé). Sem git, fica "local". */
function gitCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'local';
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflarePagesPreview()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_COMMIT__: JSON.stringify(
      (process.env.GITHUB_SHA ?? process.env.CF_PAGES_COMMIT_SHA)?.slice(0, 7) ?? gitCommit(),
    ),
  },
  // O manifesto diz quais arquivos cada página carregada sob demanda precisa; o
  // scripts/prerender.mjs usa isso para já pedir esses arquivos no HTML de /ficha e /dados.
  build: { manifest: true },
  server: { port: 5173 },
  // O `vite preview` responde com os cabeçalhos de produção (public/_headers), inclusive a CSP:
  // assim o bot e o Lighthouse pegam qualquer coisa que a política bloquearia no ar.
  preview: { headers: siteWideHeaders() },
});
