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

  it('confere data, tamanhos e limite; tira espaços do nome e campos a mais', () => {
    const file = (shortcuts: unknown[]) => ({ schemaVersion: 1, shortcuts });
    expect(parseRollShortcuts(file([{ ...magic, label: '  Magia da mesa ', extra: 1 }]))).toEqual([
      magic,
    ]);
    expect(parseRollShortcuts(file([{ ...magic, createdAt: 'ontem' }]))).toBeNull();
    expect(parseRollShortcuts(file([{ ...magic, createdAt: '2026-13-45T99:99:00Z' }]))).toBeNull();
    expect(parseRollShortcuts(file([{ ...magic, expression: 'x'.repeat(201) }]))).toBeNull();
    expect(parseRollShortcuts(file([{ ...magic, id: '' }]))).toBeNull();
    expect(parseRollShortcuts(file(Array.from({ length: 101 }, () => magic)))).toBeNull();
    expect(parseRollShortcuts(file(Array.from({ length: 100 }, () => magic)))).toHaveLength(100);
  });
});
