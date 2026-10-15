import { describe, expect, it } from 'vitest';
import v1Barbarian from './fixtures/v1-barbarian.json';
import v1Blank from './fixtures/v1-blank.json';
import v2Barbarian from './fixtures/v2-barbarian.json';
import { createBlankSheet, emptyInventory, LOCAL_SHEET_SCHEMA_VERSION } from './local-sheet';
import { migrateSheet, parseLocalSheet } from './migrations';

describe('LocalSheet', () => {
  it('a ficha em branco é válida', () => {
    const blank = createBlankSheet();
    expect(parseLocalSheet(blank)).toEqual(blank);
  });

  it('dados desconhecidos ou corrompidos são recusados', () => {
    expect(parseLocalSheet(null)).toBeNull();
    expect(parseLocalSheet({ schemaVersion: 99 })).toBeNull();
    const broken = createBlankSheet() as unknown as { build: { level: number } };
    broken.build.level = 42;
    expect(parseLocalSheet(broken)).toBeNull();
  });
});

// Fichas salvas por versões antigas do site (ADR-010): precisam continuar abrindo.
describe('migrações da ficha', () => {
  it('v1 em branco vira a ficha em branco atual', () => {
    expect(parseLocalSheet(v1Blank)).toEqual(createBlankSheet());
  });

  it('v1 do assistente: guarda tudo e ganha a progressão da classe', () => {
    const sheet = parseLocalSheet(v1Barbarian);
    expect(sheet).not.toBeNull();
    expect(sheet!.schemaVersion).toBe(LOCAL_SHEET_SCHEMA_VERSION);
    expect(sheet!.progression).toEqual({ classId: 'barbarian', levels: [] });
    expect(sheet!.spells.cantrips).toEqual([]);
    expect(sheet!.state.slotsSpent).toHaveLength(9);
    // Nada do que existia muda.
    const { schemaVersion: _a, ...before } = v1Barbarian as Record<string, unknown>;
    const { schemaVersion: _b, progression: _p, spells: _s, inventory: _i, ...after } = sheet!;
    expect({ ...after, state: { ...after.state } }).toMatchObject(before);
  });

  it('v2 ganha o inventário vazio e guarda tudo o que tinha', () => {
    const sheet = parseLocalSheet(v2Barbarian);
    expect(sheet).not.toBeNull();
    expect(sheet!.inventory).toEqual(emptyInventory());
    const { schemaVersion: _a, ...before } = v2Barbarian as Record<string, unknown>;
    const { schemaVersion: _b, inventory: _i, ...after } = sheet!;
    expect(after).toEqual(before);
  });

  it('migrar de novo não muda nada (idempotente)', () => {
    const once = migrateSheet(v1Barbarian);
    expect(migrateSheet(once)).toEqual(once);
  });

  it('não mexe no que não reconhece', () => {
    expect(migrateSheet('texto')).toBe('texto');
    expect(migrateSheet({ schemaVersion: 99, x: 1 })).toEqual({ schemaVersion: 99, x: 1 });
  });
});
