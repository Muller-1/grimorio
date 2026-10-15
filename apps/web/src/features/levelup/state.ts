import {
  LEVEL_FEATS,
  type LevelChoiceSlot,
  type LevelStep,
  type LevelUpInput,
} from '@grimorio/rules';
import type { LevelChoice, LocalSheet } from '@grimorio/shared';

/** Rascunho de um nível: PV rolado e as escolhas de cada caixinha (pela `key` da escolha). */
export interface LevelDraft {
  hpRolled?: number;
  picks: Record<string, LevelChoice[]>;
  /** Estado de tela das escolhas (ex.: modo do Aumento de Atributo). */
  meta: Record<string, string>;
}

export const emptyDraft = (): LevelDraft => ({ picks: {}, meta: {} });

/** Escolhas extras que nascem de outra (Guerreiro Abençoado → 2 truques de Clérigo). */
export const SUB_KEY = (key: string) => `${key}:sub`;

/** A escolha obrigatória está completa? (As opcionais sempre passam.) */
export function isComplete(slot: LevelChoiceSlot, draft: LevelDraft): boolean {
  if (!slot.required) return true;
  const picks = draft.picks[slot.key] ?? [];
  switch (slot.def.kind) {
    case 'subclass': {
      const c = picks[0];
      return Boolean(c?.id && (c.id !== 'custom' || c.text?.trim()));
    }
    case 'asi': {
      const mode = draft.meta[slot.key] ?? 'two';
      if (mode === 'two') return picks.length === 1 && Boolean(picks[0]?.ability);
      if (mode === 'split') {
        return picks.length === 2 && picks[0]?.ability !== picks[1]?.ability;
      }
      return featComplete(picks[0]);
    }
    case 'epic-boon':
      return featComplete(picks[0]);
    case 'option':
    case 'fighting-style':
      return Boolean(picks[0]?.id);
    default:
      return true;
  }
}

function featComplete(c: LevelChoice | undefined): boolean {
  if (!c || c.kind !== 'feat' || !c.id) return false;
  if (c.id === 'custom') return Boolean(c.text?.trim());
  const feat = LEVEL_FEATS.find((f) => f.id === c.id);
  return !feat?.abilityIncrease || Boolean(c.ability);
}

export function pendingCount(step: LevelStep, draft: LevelDraft): number {
  return step.choices.filter((c) => !isComplete(c, draft)).length;
}

/** Rascunhos → o que `applyLevelUp` recebe. */
export function toInputs(steps: LevelStep[], drafts: Record<number, LevelDraft>): LevelUpInput[] {
  return steps.map((step) => {
    const d = drafts[step.level] ?? emptyDraft();
    const keys = new Set(step.choices.flatMap((c) => [c.key, SUB_KEY(c.key)]));
    const choices = Object.entries(d.picks)
      .filter(([k]) => keys.has(k))
      .flatMap(([, v]) => v)
      .slice(0, 30);
    return {
      level: step.level,
      ...(d.hpRolled !== undefined ? { hpRolled: d.hpRolled } : {}),
      choices,
    };
  });
}

/** Ids de magia já na ficha + os escolhidos nesta subida (para não repetir). */
export function knownSpellIds(
  sheet: LocalSheet,
  drafts: Record<number, LevelDraft>,
  kinds: string[],
): Set<string> {
  const out = new Set<string>([
    ...sheet.spells.cantrips,
    ...sheet.spells.prepared,
    ...sheet.spells.spellbook,
    ...sheet.spells.granted.map((g) => g.id),
  ]);
  for (const d of Object.values(drafts)) {
    for (const list of Object.values(d.picks)) {
      for (const c of list) if (c.id && kinds.includes(c.kind)) out.add(c.id);
    }
  }
  return out;
}

/** Magias do grimório depois desta subida (Mago prepara a partir dele). */
export function spellbookIds(sheet: LocalSheet, drafts: Record<number, LevelDraft>): string[] {
  const out = [...sheet.spells.spellbook];
  for (const d of Object.values(drafts)) {
    for (const list of Object.values(d.picks)) {
      for (const c of list)
        if (c.kind === 'spellbook' && c.id && !out.includes(c.id)) out.push(c.id);
    }
  }
  return out;
}
