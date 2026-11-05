import { describe, expect, it } from 'vitest';
import v1Barbarian from './fixtures/v1-barbarian.json';
import { createBlankSheet, LOCAL_SHEET_SCHEMA_VERSION } from './local-sheet';
import { parseSheetFile, sheetFileName } from './transfer';

describe('exportar e importar ficha', () => {
  it('a ficha exportada volta igual', () => {
    const sheet = createBlankSheet();
    sheet.identity.name = 'Zé Langanho';
    expect(parseSheetFile(JSON.stringify(sheet, null, 2))).toEqual(sheet);
  });

  it('ficha de versão antiga é migrada ao importar', () => {
    const sheet = parseSheetFile(JSON.stringify(v1Barbarian));
    expect(sheet?.schemaVersion).toBe(LOCAL_SHEET_SCHEMA_VERSION);
  });

  it('aceita o arquivo das Configurações (ficha dentro de "dados")', () => {
    const sheet = createBlankSheet();
    sheet.identity.name = 'Nathan';
    const file = { site: 'grimorio', formato: 1, dados: { 'grimorio.ficha.v1': sheet } };
    expect(parseSheetFile(JSON.stringify(file))?.identity.name).toBe('Nathan');
  });

  it('arquivo que não é ficha volta vazio, sem quebrar', () => {
    expect(parseSheetFile('não é json')).toBeNull();
    expect(parseSheetFile('{"schemaVersion": 99}')).toBeNull();
    expect(parseSheetFile('null')).toBeNull();
    expect(parseSheetFile('{"dados": {}}')).toBeNull();
  });

  it('nome do arquivo sem acento nem espaço', () => {
    const s = createBlankSheet();
    s.identity.name = 'Thalindra Folhaprateada!';
    expect(sheetFileName(s)).toBe('thalindra-folhaprateada.grimorio.json');
    s.identity.name = 'Ærwyn Østergaard';
    expect(sheetFileName(s)).toBe('aerwyn-ostergaard.grimorio.json');
    s.identity.name = `${'a'.repeat(59)} b`;
    expect(sheetFileName(s)).toBe(`${'a'.repeat(59)}.grimorio.json`);
    s.identity.name = '';
    expect(sheetFileName(s)).toBe('ficha.grimorio.json');
  });
});
