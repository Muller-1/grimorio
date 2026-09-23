import {
  evaluate,
  parse,
  roll as rollExpression,
  stringify,
  type DiceError,
  type RollResult,
  type Rng,
} from '@grimorio/rules';
import {
  parseRollShortcuts,
  ROLL_SHORTCUTS_LIMIT,
  serializeRollShortcuts,
  type RollShortcut,
} from '@grimorio/shared';
import { create } from 'zustand';
import { t } from '@/lib/i18n';
import { nowIso } from '@/ports/clock';
import { emit } from '@/ports/events';
import { newId } from '@/ports/ids';
import { getRng } from '@/ports/rng';
import { safeStorage } from '@/ports/storage';

export interface RollEntry {
  id: string;
  /** Rótulo já traduzido (ex.: "Furtividade", "Ataque: Adaga"). */
  label: string;
  at: string;
  result: RollResult;
  /** Para ataques: menor natural que conta como crítico (20, 19…). */
  critRange?: number;
}

export interface RollRequest {
  label: string;
  expression: string;
  critRange?: number;
}

export type RollOutcome = { ok: true; entry: RollEntry } | { ok: false; error: DiceError };

export interface ShortcutInput {
  label: string;
  expression: string;
}

export type ShortcutError =
  { kind: 'label' } | { kind: 'limit' } | { kind: 'expression'; error: DiceError };

export type ShortcutOutcome =
  { ok: true; shortcut: RollShortcut } | { ok: false; error: ShortcutError };

// ---------------------------------------------------------------------------
// Persistência (só no navegador; no R2 os atalhos vão para a conta)
// ---------------------------------------------------------------------------

export const SHORTCUTS_STORAGE_KEY = 'grimorio.atalhos.v1';
export const SHORTCUTS_BACKUP_KEY = 'grimorio.atalhos.backup';
export const ANIMATION_STORAGE_KEY = 'grimorio.dados.animacao';

/** Exemplos da primeira visita (o jogador pode editar ou apagar). */
function exampleShortcuts(): RollShortcut[] {
  const createdAt = nowIso();
  return t.dice.shortcuts.examples.map(([label, expression]) => ({
    id: newId(),
    label,
    expression,
    createdAt,
  }));
}

export function loadShortcuts(): { shortcuts: RollShortcut[]; recovered: boolean } {
  const raw = safeStorage.get(SHORTCUTS_STORAGE_KEY);
  if (raw === null) return { shortcuts: exampleShortcuts(), recovered: false };
  try {
    const parsed = parseRollShortcuts(JSON.parse(raw));
    if (parsed) return { shortcuts: parsed, recovered: false };
  } catch {
    // JSON quebrado: cai no backup abaixo
  }
  // Nada é apagado em silêncio: o conteúdo ilegível fica guardado numa cópia.
  safeStorage.set(SHORTCUTS_BACKUP_KEY, raw);
  return { shortcuts: [], recovered: true };
}

/** Rng que sempre dá o mínimo: serve para testar uma expressão sem gastar aleatoriedade. */
const probeRng: Rng = { int: (min) => min };

/**
 * Confere nome e expressão. A expressão precisa ser avaliável agora (sem variáveis,
 * sem divisão por zero) e é guardada na forma canônica ("2D6 + 3" → "2d6+3").
 */
export function validateShortcut(
  input: ShortcutInput,
): { ok: true; clean: ShortcutInput } | { ok: false; error: ShortcutError } {
  const label = input.label.trim();
  if (label === '' || label.length > 40) return { ok: false, error: { kind: 'label' } };
  const parsed = parse(input.expression);
  if (!parsed.ok) return { ok: false, error: { kind: 'expression', error: parsed.error } };
  const probe = evaluate(parsed.ast, { rng: probeRng });
  if (!probe.ok) return { ok: false, error: { kind: 'expression', error: probe.error } };
  return { ok: true, clean: { label, expression: stringify(parsed.ast) } };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface DiceState {
  /** Mais recente primeiro. Só desta sessão (não é salvo). */
  history: RollEntry[];
  shortcuts: RollShortcut[];
  shortcutsRecovered: boolean;
  /** Animação ao rolar (preferência deste navegador). "Reduzir movimento" do sistema sempre vence. */
  animate: boolean;
  roll(request: RollRequest): RollOutcome;
  clear(): void;
  addShortcut(input: ShortcutInput): ShortcutOutcome;
  updateShortcut(id: string, input: ShortcutInput): ShortcutOutcome;
  removeShortcut(id: string): void;
  setAnimate(animate: boolean): void;
}

const HISTORY_LIMIT = 100;
const initial = loadShortcuts();

/** Único caminho para rolar dados no site (plano v2, 8, princípio 3). */
export const useDiceStore = create<DiceState>((set, get) => ({
  history: [],
  shortcuts: initial.shortcuts,
  shortcutsRecovered: initial.recovered,
  animate: safeStorage.get(ANIMATION_STORAGE_KEY) !== '0',

  roll(request) {
    const result = rollExpression(request.expression, { rng: getRng() });
    if (!result.ok) return result;
    const entry: RollEntry = {
      id: newId(),
      label: request.label,
      at: nowIso(),
      result: result.value,
      ...(request.critRange !== undefined ? { critRange: request.critRange } : {}),
    };
    set((s) => ({ history: [entry, ...s.history].slice(0, HISTORY_LIMIT) }));
    emit({
      type: 'roll',
      label: entry.label,
      expression: entry.result.expression,
      total: entry.result.total,
    });
    return { ok: true, entry };
  },

  clear() {
    set({ history: [] });
  },

  addShortcut(input) {
    if (get().shortcuts.length >= ROLL_SHORTCUTS_LIMIT)
      return { ok: false, error: { kind: 'limit' } };
    const v = validateShortcut(input);
    if (!v.ok) return v;
    const shortcut: RollShortcut = { id: newId(), createdAt: nowIso(), ...v.clean };
    set((s) => ({ shortcuts: [...s.shortcuts, shortcut] }));
    return { ok: true, shortcut };
  },

  updateShortcut(id, input) {
    const v = validateShortcut(input);
    if (!v.ok) return v;
    const current = get().shortcuts.find((s) => s.id === id);
    if (!current) return get().addShortcut(input);
    const shortcut: RollShortcut = { ...current, ...v.clean };
    set((s) => ({ shortcuts: s.shortcuts.map((x) => (x.id === id ? shortcut : x)) }));
    return { ok: true, shortcut };
  },

  removeShortcut(id) {
    set((s) => ({ shortcuts: s.shortcuts.filter((x) => x.id !== id) }));
  },

  setAnimate(animate) {
    set({ animate });
    safeStorage.set(ANIMATION_STORAGE_KEY, animate ? '1' : '0');
  },
}));

// Salva os atalhos a cada mudança (falhar ao salvar não quebra a tela).
useDiceStore.subscribe((state, previous) => {
  if (state.shortcuts !== previous.shortcuts) {
    safeStorage.set(SHORTCUTS_STORAGE_KEY, JSON.stringify(serializeRollShortcuts(state.shortcuts)));
  }
});

/** Valor natural do d20 quando a rolagem tem exatamente um d20 mantido; senão `null`. */
export function naturalD20(result: RollResult): number | null {
  const kept = result.terms
    .filter((term) => term.sides === 20)
    .flatMap((term) => term.dice.filter((d) => d.kept));
  return kept.length === 1 ? kept[0]!.value : null;
}
