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

/** Grava a ficha deste navegador (ex.: a que o assistente de criação acabou de montar). */
export function saveLocalSheet(sheet: LocalSheet): boolean {
  return safeStorage.set(SHEET_STORAGE_KEY, JSON.stringify(sheet));
}

/** A ficha deste navegador tem alguma coisa (nome, classe ou alteração)? */
export function hasLocalSheet(): boolean {
  const raw = safeStorage.get(SHEET_STORAGE_KEY);
  if (!raw) return false;
  try {
    return JSON.stringify(JSON.parse(raw)) !== JSON.stringify(createBlankSheet());
  } catch {
    return true;
  }
}

/**
 * De onde a ficha aberta vem e para onde vai cada mudança:
 * - `local`: este navegador (localStorage), como sempre foi;
 * - `account`: uma ficha da conta; as mudanças vão para o servidor (features/characters/sync).
 */
export type SheetSource = { kind: 'local' } | { kind: 'account'; id: string };

interface SheetState {
  sheet: LocalSheet;
  source: SheetSource;
  recoveredFromBadData: boolean;
  /** Edita campos de "build"/identidade. Depois, normaliza (ex.: PV acima do novo máximo). */
  edit(recipe: (draft: LocalSheet) => void): void;
  /** Ações de jogo (dano, cura, dados de vida...). Devolve avisos para a interface. */
  dispatch(action: SheetAction): SheetNotice[];
  replace(sheet: LocalSheet): void;
  /** Volta para a ficha deste navegador. */
  openLocal(): void;
  /** Abre uma ficha da conta (não conta como edição). */
  openAccount(id: string, sheet: LocalSheet): void;
  /** Troca a ficha deste navegador por outra (ex.: criada no assistente) e a abre. */
  loadLocal(sheet: LocalSheet): void;
}

const initial = loadSheet();
const LOCAL: SheetSource = { kind: 'local' };

export const useSheetStore = create<SheetState>((set, get) => ({
  sheet: initial.sheet,
  source: LOCAL,
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

  openLocal() {
    if (get().source.kind === 'local') return;
    const loaded = loadSheet();
    set({ sheet: loaded.sheet, source: LOCAL, recoveredFromBadData: loaded.recoveredFromBadData });
  },

  openAccount(id, sheet) {
    set({ sheet, source: { kind: 'account', id }, recoveredFromBadData: false });
  },

  loadLocal(sheet) {
    const normalized = normalizeSheet(sheet).sheet;
    saveLocalSheet(normalized);
    set({ sheet: normalized, source: { kind: 'local' }, recoveredFromBadData: false });
  },
}));

type AccountListener = (id: string, sheet: LocalSheet) => void;
const accountListeners = new Set<AccountListener>();

/** O salvamento da conta se inscreve aqui (evita import circular com o sync). */
export function onAccountSheetEdit(listener: AccountListener): () => void {
  accountListeners.add(listener);
  return () => accountListeners.delete(listener);
}

// Salva a cada mudança. Falhar ao salvar (aba anônima, cota cheia) não derruba a ficha.
useSheetStore.subscribe((state, previous) => {
  if (state.sheet === previous.sheet) return;
  // Trocou de ficha (abriu outra): não é uma edição.
  if (state.source !== previous.source) return;
  if (state.source.kind === 'local') {
    safeStorage.set(SHEET_STORAGE_KEY, JSON.stringify(state.sheet));
  } else {
    for (const listener of accountListeners) listener(state.source.id, state.sheet);
  }
});
