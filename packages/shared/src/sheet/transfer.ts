import type { LocalSheet } from './local-sheet';
import { parseLocalSheet } from './migrations';

/**
 * Arquivo de uma ficha exportada (`<nome>.grimorio.json`): a própria ficha, no formato de
 * sempre. Importar aceita também o arquivo de Configurações → Exportar, que guarda a ficha deste
 * navegador dentro de `dados`. Fichas de versões antigas passam pela migração, como ao abrir.
 */
export function parseSheetFile(text: string): LocalSheet | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const direct = parseLocalSheet(raw);
  if (direct) return direct;
  // Exportação das Configurações: { site: 'grimorio', formato: 1, dados: { 'grimorio.ficha.v1': … } }.
  const data = (raw as { dados?: Record<string, unknown> } | null)?.dados;
  const stored = data?.['grimorio.ficha.v1'];
  if (typeof stored !== 'string') return stored ? parseLocalSheet(stored) : null;
  try {
    return parseLocalSheet(JSON.parse(stored));
  } catch {
    return null;
  }
}

/** "Thalindra Folhaprateada" → "thalindra-folhaprateada.grimorio.json" */
export function sheetFileName(sheet: Pick<LocalSheet, 'identity'>): string {
  const slug = sheet.identity.name
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe')
    .replace(/ø/g, 'o')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 60)
    .replace(/^-+|-+$/g, '');
  return `${slug || 'ficha'}.grimorio.json`;
}
