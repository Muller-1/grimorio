import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { AppRoutes } from './routes';

import { seoConfig } from './seo';

export { STATIC_PAGES } from './routes';
export { headTags, robotsTxt, sitemapXml } from './seo';

/** Endereço do site e código do Google, lidos das variáveis do build (ver seo.ts). */
export const SEO = seoConfig(import.meta.env);

/** Usado só no build, para gerar o HTML estático das páginas (scripts/prerender.mjs). */
export function render(url: string): string {
  return renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <AppRoutes />
      </StaticRouter>
    </StrictMode>,
  );
}
