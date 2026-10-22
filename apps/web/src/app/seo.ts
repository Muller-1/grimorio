/**
 * Busca do Google e prévia de link (ADR-013). Funções puras, usadas só no build
 * (entry-server → scripts/prerender.mjs): nada disto vai para o pacote do navegador.
 */

/** Onde o site está no ar hoje. Com domínio próprio, troque pela variável VITE_SITE_URL. */
export const DEFAULT_SITE_URL = 'https://grimorio.gustavomullercavalheiro2.workers.dev';

export interface SeoConfig {
  /** Origem do site, sem barra no fim. */
  siteUrl: string;
  /** Código do Google Search Console, ou vazio. */
  googleVerification: string;
}

export interface SeoPage {
  path: string;
  meta: { title: string; description: string };
  index: boolean;
}

/** Lê as variáveis do build. Endereço ou código inválido para o build com uma mensagem clara. */
export function seoConfig(env: {
  VITE_SITE_URL?: string | undefined;
  VITE_GOOGLE_SITE_VERIFICATION?: string | undefined;
}): SeoConfig {
  const raw = env.VITE_SITE_URL?.trim() || DEFAULT_SITE_URL;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`VITE_SITE_URL inválido: "${raw}" (exemplo: https://grimorio.com.br)`);
  }
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
    throw new Error(`VITE_SITE_URL precisa começar com https:// ("${raw}")`);
  }
  const googleVerification = env.VITE_GOOGLE_SITE_VERIFICATION?.trim() ?? '';
  // O código do Google só tem letras, números, "-" e "_": qualquer outra coisa é erro de cópia.
  if (googleVerification && !/^[\w-]{10,100}$/.test(googleVerification)) {
    throw new Error(
      'VITE_GOOGLE_SITE_VERIFICATION deve ser só o código (o valor de content="…"), sem a tag <meta>.',
    );
  }
  return { siteUrl: url.origin, googleVerification };
}

/** Escapa texto para dentro de um atributo HTML. */
export function attr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export const pageUrl = (config: SeoConfig, path: string) => `${config.siteUrl}${path}`;

/** Imagem da prévia de link (public/og.jpg, 1200×630). */
const OG_IMAGE = {
  path: '/og.jpg',
  width: 1200,
  height: 630,
  alt: 'Grimório — fichas e dados para RPG',
};

/** Dados estruturados da página inicial (schema.org): o Google entende que é um app grátis. */
export function structuredData(config: SeoConfig, description: string): string {
  const home = pageUrl(config, '/');
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', name: 'Grimório', url: home, inLanguage: 'pt-BR', description },
      {
        '@type': 'WebApplication',
        name: 'Grimório',
        url: home,
        description,
        inLanguage: 'pt-BR',
        applicationCategory: 'GameApplication',
        operatingSystem: 'Web',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
      },
    ],
  };
  // "<" escapado: o texto nunca fecha o <script> antes da hora.
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/** Tags do <head> de uma página: título, descrição, canônico, prévia de link e robôs. */
export function headTags(page: SeoPage, config: SeoConfig): string[] {
  const { title, description } = page.meta;
  const tags = [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="pt_BR" />`,
    `<meta property="og:site_name" content="Grimório" />`,
    `<meta property="og:title" content="${attr(title)}" />`,
    `<meta property="og:description" content="${attr(description)}" />`,
    `<meta property="og:image" content="${pageUrl(config, OG_IMAGE.path)}" />`,
    `<meta property="og:image:width" content="${OG_IMAGE.width}" />`,
    `<meta property="og:image:height" content="${OG_IMAGE.height}" />`,
    `<meta property="og:image:alt" content="${attr(OG_IMAGE.alt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ];
  if (page.index) {
    tags.push(
      `<link rel="canonical" href="${pageUrl(config, page.path)}" />`,
      `<meta property="og:url" content="${pageUrl(config, page.path)}" />`,
    );
  } else {
    // Páginas pessoais (conta, login) e o 404 ficam fora da busca.
    tags.push(`<meta name="robots" content="noindex" />`);
  }
  if (page.path === '/') {
    if (config.googleVerification) {
      tags.push(`<meta name="google-site-verification" content="${config.googleVerification}" />`);
    }
    tags.push(`<script type="application/ld+json">${structuredData(config, description)}</script>`);
  }
  return tags;
}

/** sitemap.xml: as páginas públicas, para o Google achar todas. */
export function sitemapXml(pages: readonly SeoPage[], config: SeoConfig): string {
  const urls = pages
    .filter((p) => p.index)
    .map((p) => `  <url><loc>${attr(pageUrl(config, p.path))}</loc></url>`);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

/** robots.txt: tudo liberado, menos a API; e onde está o sitemap. */
export function robotsTxt(config: SeoConfig): string {
  return [
    'User-agent: *',
    'Disallow: /api/',
    '',
    `Sitemap: ${pageUrl(config, '/sitemap.xml')}`,
    '',
  ].join('\n');
}
