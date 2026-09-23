import { describe, expect, it } from 'vitest';
import { parseRollShortcuts, serializeRollShortcuts, type RollShortcut } from './shortcuts';

const magic: RollShortcut = {
  id: 'a1',
  label: 'Magia da mesa',
  expression: '100d2',
  createdAt: '2026-09-22T12:00:00.000Z',
};

describe('atalhos de rolagem', () => {
  it('ida e volta pelo formato versionado', () => {
    expect(parseRollShortcuts(serializeRollShortcuts([magic]))).toEqual([magic]);
  });

  it('recusa versão desconhecida, nome vazio e formato quebrado', () => {
    expect(parseRollShortcuts({ schemaVersion: 2, shortcuts: [] })).toBeNull();
    expect(parseRollShortcuts(serializeRollShortcuts([{ ...magic, label: '   ' }]))).toBeNull();
    expect(parseRollShortcuts('lixo')).toBeNull();
  });
});
