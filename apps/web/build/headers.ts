// Leitura do `public/_headers` (formato da Cloudflare Pages). Usado pelo `vite preview` — para o
// bot e o Lighthouse testarem o site com os mesmos cabeçalhos da produção — e pelos testes.
import { readFileSync } from 'node:fs';

export interface HeaderRule {
  path: string;
  headers: Record<string, string>;
}

export const HEADERS_FILE = new URL('../public/_headers', import.meta.url);

/** Converte o texto do `_headers` em regras. Linhas com `#` são comentários. */
export function parseHeaders(text: string): HeaderRule[] {
  const rules: HeaderRule[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      rules.push({ path: line.trim(), headers: {} });
      continue;
    }
    const rule = rules.at(-1);
    const colon = line.indexOf(':');
    if (!rule || colon < 0) throw new Error(`Linha inválida no _headers: "${line.trim()}"`);
    rule.headers[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  return rules;
}

export function readHeaderRules(): HeaderRule[] {
  return parseHeaders(readFileSync(HEADERS_FILE, 'utf8'));
}

/** Cabeçalhos que valem para todas as páginas (bloco `/*`). */
export function siteWideHeaders(): Record<string, string> {
  return readHeaderRules().find((rule) => rule.path === '/*')?.headers ?? {};
}

/** Diretivas de uma Content-Security-Policy: `script-src 'self'` → { 'script-src': ["'self'"] }. */
export function cspDirectives(csp: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const part of csp.split(';')) {
    const [name, ...values] = part.trim().split(/\s+/);
    if (name) result[name] = values;
  }
  return result;
}
