import { z } from '../zod';
import {
  emptySpells,
  freshAbilityState,
  LOCAL_SHEET_SCHEMA_VERSION,
  LocalSheetSchema,
  type LocalSheet,
} from './local-sheet';

/**
 * Migrações da ficha (ADR-010, item 6 do plano). Cada passo leva a versão N para N+1 e só
 * ACRESCENTA: nada que o jogador escreveu é apagado. Rodam ao abrir a ficha no navegador, no
 * cache da conta e na API, então fichas salvas em qualquer versão antiga continuam abrindo.
 *
 * Ao mudar o formato: suba `LOCAL_SHEET_SCHEMA_VERSION`, escreva o passo aqui e guarde uma
 * ficha de exemplo da versão anterior em `fixtures/` (o teste confere que ela continua abrindo).
 */

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const STEPS: Record<number, (sheet: Json) => Json> = {
  /** v1 → v2: progressão de classe, magias e estado das habilidades. */
  1: (sheet) => {
    const state = isObject(sheet.state) ? sheet.state : {};
    const creation = isObject(sheet.creation) ? sheet.creation : undefined;
    const classId = typeof creation?.classId === 'string' ? creation.classId : undefined;
    return {
      ...sheet,
      schemaVersion: 2,
      state: { ...state, ...freshAbilityState() },
      spells: emptySpells(),
      // Fichas do assistente já sabem a classe; as feitas à mão escolhem ao subir de nível.
      ...(classId && /^[a-z0-9-]+$/.test(classId) ? { progression: { classId, levels: [] } } : {}),
    };
  },
};

/** Leva dados salvos de qualquer versão conhecida para a atual. O resto passa como veio. */
export function migrateSheet(raw: unknown): unknown {
  if (!isObject(raw)) return raw;
  let sheet = raw;
  let version = sheet.schemaVersion;
  while (typeof version === 'number' && version < LOCAL_SHEET_SCHEMA_VERSION) {
    const step = STEPS[version];
    if (!step) break;
    sheet = step(sheet);
    version = sheet.schemaVersion;
  }
  return sheet;
}

/** Ficha vinda de fora (armazenamento, servidor, pedido): migra e valida. */
export const SheetInputSchema = z.preprocess(migrateSheet, LocalSheetSchema);

/** Lê dados salvos de forma segura: devolve `null` se o formato não for reconhecido. */
export function parseLocalSheet(raw: unknown): LocalSheet | null {
  const result = SheetInputSchema.safeParse(raw);
  return result.success ? result.data : null;
}
