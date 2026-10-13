import {
  CREATION_STEPS,
  emptyDraft,
  sanitizeDraft,
  type AbilityRoll,
  type CreationDraft,
  type CreationStep,
} from '@grimorio/rules';
import { create } from 'zustand';
import { safeStorage } from '@/ports/storage';

/** Rascunho do assistente: sobrevive a recarregar a página (até o personagem ser criado). */
export const BUILDER_STORAGE_KEY = 'grimorio.criacao.v1';

interface BuilderState {
  step: CreationStep;
  draft: CreationDraft;
  /** Dados de cada rolagem de 4d6 (para mostrar o dado descartado). */
  rolls: AbilityRoll[] | null;
  setStep(step: CreationStep): void;
  /** Altera o rascunho: a receita devolve um novo rascunho ou edita a cópia recebida. */
  update(recipe: (draft: CreationDraft) => CreationDraft | void): void;
  setRolls(rolls: AbilityRoll[] | null): void;
  reset(): void;
}

function isRoll(value: unknown): value is AbilityRoll {
  const r = value as AbilityRoll;
  return (
    !!r &&
    Array.isArray(r.dice) &&
    r.dice.length === 4 &&
    r.dice.every((d) => Number.isInteger(d) && d >= 1 && d <= 6) &&
    Number.isInteger(r.dropped) &&
    Number.isInteger(r.total)
  );
}

function load(): Pick<BuilderState, 'step' | 'draft' | 'rolls'> {
  const fallback = { step: 'class' as CreationStep, draft: emptyDraft(), rolls: null };
  const raw = safeStorage.get(BUILDER_STORAGE_KEY);
  if (!raw) return fallback;
  try {
    const saved = JSON.parse(raw) as {
      v?: number;
      step?: unknown;
      draft?: unknown;
      rolls?: unknown;
    };
    if (saved.v !== 1) return fallback;
    const rolls =
      Array.isArray(saved.rolls) && saved.rolls.length === 6 && saved.rolls.every(isRoll)
        ? (saved.rolls as AbilityRoll[])
        : null;
    return {
      step: CREATION_STEPS.includes(saved.step as CreationStep)
        ? (saved.step as CreationStep)
        : 'class',
      draft: sanitizeDraft(saved.draft),
      rolls,
    };
  } catch {
    return fallback;
  }
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  ...load(),
  setStep(step) {
    set({ step });
  },
  update(recipe) {
    const copy = structuredClone(get().draft);
    const result = recipe(copy);
    set({ draft: result ?? copy });
  },
  setRolls(rolls) {
    set({ rolls });
  },
  reset() {
    safeStorage.remove(BUILDER_STORAGE_KEY);
    set({ step: 'class', draft: emptyDraft(), rolls: null });
  },
}));

useBuilderStore.subscribe((state, previous) => {
  if (
    state.draft === previous.draft &&
    state.step === previous.step &&
    state.rolls === previous.rolls
  ) {
    return;
  }
  safeStorage.set(
    BUILDER_STORAGE_KEY,
    JSON.stringify({ v: 1, step: state.step, draft: state.draft, rolls: state.rolls }),
  );
});
