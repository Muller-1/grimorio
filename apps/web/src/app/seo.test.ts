import { describe, expect, it } from 'vitest';
import { DEFAULT_SITE_URL, headTags, robotsTxt, seoConfig, sitemapXml, type SeoPage } from './seo';

const config = seoConfig({ VITE_SITE_URL: 'https://grimorio.example/' });
const page = (path: string, index = true): SeoPage => ({
  path,
  index,
  meta: { title: `Título de ${path}`, description: 'Descrição com "aspas" & <sinais>' },
});

describe('seoConfig (variáveis do build)', () => {
  it('usa o endereço de hoje quando a variável não existe e tira a barra do fim', () => {
    expect(seoConfig({}).siteUrl).toBe(DEFAULT_SITE_URL);
    expect(config.siteUrl).toBe('https://grimorio.example');
  });

  it('recusa endereço sem https e código do Google colado com a tag inteira', () => {
    expect(() => seoConfig({ VITE_SITE_URL: 'http://grimorio.example' })).toThrow(/https/);
    expect(() => seoConfig({ VITE_SITE_URL: 'grimorio' })).toThrow(/inválido/);
    expect(() =>
      seoConfig({
        VITE_GOOGLE_SITE_VERIFICATION: '<meta name="google-site-verification" content="abc" />',
      }),
    ).toThrow(/só o código/);
    expect(
      seoConfig({ VITE_GOOGLE_SITE_VERIFICATION: ' Ab-12_cdEFghijkl ' }).googleVerification,
    ).toBe('Ab-12_cdEFghijkl');
  });
});

describe('headTags', () => {
  it('página pública: endereço canônico, prévia de link e texto escapado', () => {
    const tags = headTags(page('/dados'), config).join('\n');
    expect(tags).toContain('<link rel="canonical" href="https://grimorio.example/dados" />');
    expect(tags).toContain('content="https://grimorio.example/og.jpg"');
    expect(tags).toContain('Descrição com &quot;aspas&quot; &amp; &lt;sinais&gt;');
    expect(tags).not.toContain('noindex');
    expect(tags).not.toContain('ld+json');
  });

  it('página pessoal: noindex e sem endereço canônico', () => {
    const tags = headTags(page('/personagens', false), config).join('\n');
    expect(tags).toContain('<meta name="robots" content="noindex" />');
    expect(tags).not.toContain('canonical');
  });

  it('inicial: dados estruturados válidos e a verificação do Google quando configurada', () => {
    const withCode = seoConfig({ VITE_GOOGLE_SITE_VERIFICATION: 'codigo-do-google_123' });
    const tags = headTags(page('/'), withCode);
    expect(tags).toContain(
      '<meta name="google-site-verification" content="codigo-do-google_123" />',
    );
    const script = tags.find((tag) => tag.includes('ld+json'))!;
    const json = script.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
    expect(json).not.toContain('<');
    const data = JSON.parse(json) as { '@graph': { '@type': string; url: string }[] };
    expect(data['@graph'].map((item) => item['@type'])).toEqual(['WebSite', 'WebApplication']);
    expect(data['@graph'][0]!.url).toBe(`${DEFAULT_SITE_URL}/`);
    expect(headTags(page('/'), config).join('')).not.toContain('google-site-verification');
  });
});

describe('sitemap.xml e robots.txt', () => {
  it('o sitemap lista só as páginas públicas', () => {
    const xml = sitemapXml([page('/'), page('/dados'), page('/entrar', false)], config);
    expect(xml).toContain('<loc>https://grimorio.example/</loc>');
    expect(xml).toContain('<loc>https://grimorio.example/dados</loc>');
    expect(xml).not.toContain('/entrar');
  });

  it('o robots.txt fecha só a API e aponta o sitemap', () => {
    const txt = robotsTxt(config);
    expect(txt).toContain('Disallow: /api/');
    expect(txt).toContain('Sitemap: https://grimorio.example/sitemap.xml');
    expect(txt).not.toMatch(/Disallow: \/\s*$/m);
  });
});
