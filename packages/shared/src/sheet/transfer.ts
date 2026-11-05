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
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'ficha'}.grimorio.json`;
}
