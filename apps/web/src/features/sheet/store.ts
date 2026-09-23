import {
  applySheetAction,
  normalizeSheet,
  type SheetAction,
  type SheetNotice,
} from '@grimorio/rules';
import { createBlankSheet, parseLocalSheet, type LocalSheet } from '@grimorio/shared';
import { create } from 'zustand';
import { nowIso } from '@/ports/clock';
import { newId } from '@/ports/ids';
import { safeStorage } from '@/ports/storage';

/** Chave com versão: se o formato mudar, a versão nova migra a antiga (plano v2, 9.7). */
export const SHEET_STORAGE_KEY = 'grimorio.ficha.v1';
export const SHEET_BACKUP_KEY = 'grimorio.ficha.backup';

interface LoadResult {
  sheet: LocalSheet;
  /** `true` quando havia algo salvo que não pôde ser lido (e foi guardado como cópia). */
  recoveredFromBadData: boolean;
}

export function loadSheet(): LoadResult {
  const raw = safeStorage.get(SHEET_STORAGE_KEY);
  if (raw === null) return { sheet: createBlankSheet(), recoveredFromBadData: false };
  try {
    const parsed = parseLocalSheet(JSON.parse(raw));
    if (parsed) return { sheet: parsed, recoveredFromBadData: false };
  } catch {
    // JSON quebrado: cai no backup abaixo
  }
  // Nada é descartado em silêncio: o conteúdo ilegível fica guardado numa cópia.
  safeStorage.set(SHEET_BACKUP_KEY, raw);
  return { sheet: createBlankSheet(), recoveredFromBadData: true };
}

interface SheetState {
  sheet: LocalSheet;
  recoveredFromBadData: boolean;
  /** Edita campos de "build"/identidade. Depois, normaliza (ex.: PV acima do novo máximo). */
  edit(recipe: (draft: LocalSheet) => void): void;
  /** Ações de jogo (dano, cura, dados de vida...). Devolve avisos para a interface. */
  dispatch(action: SheetAction): SheetNotice[];
  replace(sheet: LocalSheet): void;
}

const initial = loadSheet();

export const useSheetStore = create<SheetState>((set, get) => ({
  sheet: initial.sheet,
  recoveredFromBadData: initial.recoveredFromBadData,

  edit(recipe) {
    const draft = structuredClone(get().sheet);
    recipe(draft);
    // Não deixa um valor inválido entrar (ex.: campo numérico apagado).
    const valid = parseLocalSheet(draft);
    if (!valid) return;
    set({ sheet: normalizeSheet(valid).sheet });
  },

  dispatch(action) {
    const outcome = applySheetAction(get().sheet, action, { now: nowIso(), actionId: newId() });
    set({ sheet: outcome.sheet });
    return outcome.notices;
  },

  replace(sheet) {
    set({ sheet: normalizeSheet(sheet).sheet });
  },
}));

// Salva a cada mudança. Falhar ao salvar (aba anônima, cota cheia) não derruba a ficha.
useSheetStore.subscribe((state, previous) => {
  if (state.sheet !== previous.sheet) {
    safeStorage.set(SHEET_STORAGE_KEY, JSON.stringify(state.sheet));
  }
});
