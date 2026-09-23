import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  cspDirectives,
  HEADERS_FILE,
  parseHeaders,
  readHeaderRules,
  siteWideHeaders,
} from './headers';

describe('parseHeaders', () => {
  it('lê caminhos, cabeçalhos e ignora comentários', () => {
    const rules = parseHeaders('# c\n/*\n  A: 1\n  B: x: y\n\n/assets/*\n  C: 2\n');
    expect(rules).toEqual([
      { path: '/*', headers: { A: '1', B: 'x: y' } },
      { path: '/assets/*', headers: { C: '2' } },
    ]);
  });

  it('recusa cabeçalho sem caminho antes', () => {
    expect(() => parseHeaders('  A: 1')).toThrow();
  });
});

describe('public/_headers (Etapa 8)', () => {
  const text = readFileSync(HEADERS_FILE, 'utf8');
  const rules = readHeaderRules();
  const site = siteWideHeaders();
  const csp = cspDirectives(site['Content-Security-Policy'] ?? '');

  it('respeita os limites da Cloudflare (100 regras, 2.000 caracteres por linha)', () => {
    expect(rules.length).toBeLessThanOrEqual(100);
    for (const line of text.split(/\r?\n/)) expect(line.length).toBeLessThanOrEqual(2000);
  });

  it('scripts só do próprio site, sem eval nem inline', () => {
    expect(csp['script-src']).toEqual(["'self'"]);
    expect(site['Content-Security-Policy']).not.toContain('unsafe-eval');
    expect(csp['default-src']).toEqual(["'self'"]);
    expect(csp['object-src']).toEqual(["'none'"]);
    expect(csp['base-uri']).toEqual(["'self'"]);
  });

  it('não pode ser embutido em outro site', () => {
    expect(csp['frame-ancestors']).toEqual(["'none'"]);
    expect(site['X-Frame-Options']).toBe('DENY');
  });

  it('tem os cabeçalhos básicos de segurança', () => {
    expect(site['X-Content-Type-Options']).toBe('nosniff');
    expect(site['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(site['Strict-Transport-Security']).toMatch(/max-age=\d{7,}/);
  });

  it('arquivos com hash têm cache longo e imutável', () => {
    const assets = rules.find((rule) => rule.path === '/assets/*');
    expect(assets?.headers['Cache-Control']).toBe('public, max-age=31536000, immutable');
  });
});
