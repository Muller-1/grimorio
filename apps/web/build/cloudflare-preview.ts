// Faz o `vite preview` servir o build como a Cloudflare Pages serve (docs/publicacao.md):
// `/dados` → `dados.html` (o Vite já faz), `/dados/` → `/dados`, arquivo inexistente → 404 e
// página desconhecida → `404.html` com status 404.
// Sem isto, o preview cairia no index.html (modo SPA) e o bot testaria um site diferente do real.
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { siteWideHeaders } from './headers';

/** Arquivos que a Cloudflare tentaria para um caminho sem extensão. */
export function htmlCandidates(pathname: string): string[] {
  const clean = pathname.replace(/^\/+|\/+$/g, '');
  if (!clean) return ['index.html'];
  return [`${clean}.html`, `${clean}/index.html`];
}

export function cloudflarePagesPreview(): Plugin {
  return {
    name: 'grimorio:cloudflare-pages-preview',
    configurePreviewServer(server) {
      const outDir = resolve(server.config.root, server.config.build.outDir);
      const headers = siteWideHeaders();
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        let url: URL;
        try {
          url = new URL(req.url ?? '/', 'http://x');
          url.pathname = decodeURIComponent(url.pathname);
        } catch {
          return next();
        }
        const { pathname } = url;
        const exists = (file: string) => existsSync(join(outDir, file));
        if (extname(pathname)) {
          // Arquivo: existe → o Vite serve; não existe → 404 (e não o index.html).
          if (exists(pathname)) return next();
        } else {
          const found = htmlCandidates(pathname).find(exists);
          if (
            found &&
            pathname.length > 1 &&
            pathname.endsWith('/') &&
            !found.endsWith('/index.html')
          ) {
            // /dados/ → /dados, como a Cloudflare faz.
            res.statusCode = 308;
            res.setHeader('Location', pathname.replace(/\/+$/, '') + url.search);
            return res.end();
          }
          if (found) return next();
        }
        const notFound = join(outDir, '404.html');
        if (!existsSync(notFound) || !(req.headers.accept ?? '').includes('text/html')) {
          res.statusCode = 404;
          return res.end();
        }
        res.statusCode = 404;
        for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(req.method === 'HEAD' ? undefined : readFileSync(notFound));
      });
    },
  };
}
