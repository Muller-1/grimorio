/**
 * Campanha (docs/plano-escala-e-campanha.md, seção 2). Ponto de entrada próprio
 * (`@grimorio/rules/campaign`): o servidor e as telas da campanha usam; a ficha sozinha não.
 */
import type { GameAction, PartySummary } from '@grimorio/shared/campaign';
import type { LocalSheet } from '@grimorio/shared';
import { CONDITION_PREFIX, CONDITIONS, EXHAUSTION_ID } from '../engine/on-you';
import {
  applySheetAction,
  type ActionContext,
  type ActionOutcome,
  type SheetAction,
} from '../sheet/actions';
import { deriveSheet } from '../sheet/derive';

const KNOWN_CONDITIONS = new Set(
  CONDITIONS.filter((c) => c.id !== EXHAUSTION_ID).map((c) => `${CONDITION_PREFIX}${c.id}`),
);

/** Condição do glossário (a Exaustão tem nível: vai por `set-exhaustion`). */
export function isConditionKey(key: string): boolean {
  return KNOWN_CONDITIONS.has(key);
}

/**
 * A ação da campanha nas ações da ficha. `set-condition` só alterna quando o estado é outro,
 * então marcar Envenenado duas vezes (duas pessoas ao mesmo tempo) deixa Envenenado.
 */
export function toSheetActions(sheet: LocalSheet, action: GameAction): SheetAction[] {
  switch (action.type) {
    case 'damage':
      return [
        { type: 'damage', amount: action.amount, ...(action.critical ? { critical: true } : {}) },
      ];
    case 'heal':
      return [{ type: 'heal', amount: action.amount }];
    case 'set-temp-hp':
      return [{ type: 'set-temp-hp', amount: action.amount }];
    case 'set-condition': {
      if (!isConditionKey(action.key)) return [];
      const on = sheet.state.active.includes(action.key);
      return on === action.on ? [] : [{ type: 'toggle-on-you', key: action.key }];
    }
    case 'set-exhaustion':
      return [{ type: 'set-exhaustion', level: action.level }];
  }
}

/** Aplica uma ação da campanha. Pura: o servidor e o aparelho chegam na mesma ficha. */
export function applyGameAction(
  sheet: LocalSheet,
  action: GameAction,
  ctx: ActionContext,
): ActionOutcome {
  let outcome: ActionOutcome = { sheet, notices: [] };
  for (const step of toSheetActions(sheet, action)) {
    const next = applySheetAction(outcome.sheet, step, ctx);
    outcome = { sheet: next.sheet, notices: [...outcome.notices, ...next.notices] };
  }
  return outcome;
}

/** O que os outros jogadores da mesa veem da ficha: só estes seis campos. */
export function partySummary(sheet: LocalSheet): PartySummary {
  const derived = deriveSheet(sheet);
  const { hp } = sheet.state;
  return {
    name: sheet.identity.name,
    className: sheet.identity.className,
    level: sheet.build.level,
    ac: derived.armorClass.value,
    hp: { current: hp.current, max: derived.hpMax.value, temp: hp.temp },
    conditions: sheet.state.active.filter((key) => key.startsWith(CONDITION_PREFIX)),
  };
}
