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
  build: {
    manifest: true,
    rolldownOptions: {
      output: {
        // As regras em dois pedaços: o rolador de dados (que /dados usa sozinho) e o resto (classes,
        // motor das habilidades, subida de nível), que só a ficha e o assistente baixam. A lista
        // de magias (spells/data) fica fora: vai junto com a aba Magias.
        codeSplitting: {
          includeDependenciesRecursively: false,
          groups: [
            { name: 'rules-dice', test: /packages[\\/]rules[\\/]src[\\/]dice[\\/]/ },
            {
              name: 'rules',
              // Fora: o index.ts da raiz (só reexporta; ficando aqui, puxaria o pedaço para
              // /dados), a criação e a subida de nível (vão com o assistente e com o diálogo).
              test: /packages[\\/]rules[\\/]src[\\/](?!dice[\\/]|spells[\\/]data[\\/]|creation[\\/]|levelup[\\/]|index\.ts$)/,
            },
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    // A API fica "por baixo" do site (ADR-008): o navegador fala só com :5173 e o Vite repassa
    // /api para a API em :3000. Assim o cookie de sessão é do próprio site.
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: false } },
  },
  // O `vite preview` responde com os cabeçalhos de produção (public/_headers), inclusive a CSP:
  // assim o bot e o Lighthouse pegam qualquer coisa que a política bloquearia no ar.
  preview: { headers: siteWideHeaders() },
});
