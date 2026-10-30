import { checkSheetInvariants, deriveSheet, needsArmorUpgrade } from '@grimorio/rules';
import { parseLocalSheet } from '@grimorio/shared';
import { describe, expect, it } from 'vitest';
import { exampleSheet } from './example';

describe('ficha de exemplo', () => {
  it('é válida e não precisa ser organizada ao abrir', () => {
    const s = exampleSheet();
    expect(parseLocalSheet(s)).toEqual(s);
    expect(checkSheetInvariants(s)).toEqual([]);
    expect(needsArmorUpgrade(s)).toBe(false);
  });

  it('CA 15 vem da armadura vestida, sem ajuste manual', () => {
    const d = deriveSheet(exampleSheet());
    expect(d.armorClass.value).toBe(15);
    expect(d.armorClass.parts[0]).toEqual({
      source: { kind: 'armor', name: 'Armadura de Couro Batido' },
      value: 12,
    });
  });
});
