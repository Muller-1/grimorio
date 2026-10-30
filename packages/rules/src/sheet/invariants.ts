import type { LocalSheet } from '@grimorio/shared';
import { deriveSheet, type SheetDerived, type SheetWarning } from './derive';

/**
 * Invariantes da ficha local (plano v2, 9.5): verdades que valem para qualquer ficha.
 * Usadas nos testes e, no front, depois de mudanças que alteram máximos.
 */

export type Violation =
  | 'hp-out-of-range'
  | 'temp-negative'
  | 'death-saves-out-of-range'
  | 'death-saves-while-conscious'
  | 'hit-dice-out-of-range'
  | 'hp-log-too-long'
  | 'duplicate-active';

export function checkSheetInvariants(sheet: LocalSheet): Violation[] {
  const d = deriveSheet(sheet);
  const { hp, deathSaves, hitDiceSpent, hpLog } = sheet.state;
  const v: Violation[] = [];
  if (hp.current < 0 || hp.current > d.hpMax.value) v.push('hp-out-of-range');
  if (hp.temp < 0) v.push('temp-negative');
  const inRange = (n: number) => n >= 0 && n <= 3;
  if (!inRange(deathSaves.successes) || !inRange(deathSaves.failures)) {
    v.push('death-saves-out-of-range');
  }
  if (hp.current > 0 && (deathSaves.successes > 0 || deathSaves.failures > 0)) {
    v.push('death-saves-while-conscious');
  }
  if (hitDiceSpent < 0 || hitDiceSpent > d.level) v.push('hit-dice-out-of-range');
  if (hpLog.length > 50) v.push('hp-log-too-long');
  if (new Set(sheet.state.active).size !== sheet.state.active.length) v.push('duplicate-active');
  return v;
}

/**
 * Quando um máximo diminui (ex.: desceu de nível), ajusta o valor gasto E avisa.
 * Nada é ajustado em silêncio.
 */
export function normalizeSheet(
  sheet: LocalSheet,
  /** O `deriveSheet(sheet)` já calculado, se houver. */
  d: SheetDerived = deriveSheet(sheet),
): { sheet: LocalSheet; warnings: SheetWarning[] } {
  const warnings: SheetWarning[] = [];
  const state = { ...sheet.state, hp: { ...sheet.state.hp } };

  const clampField = (field: string, from: number, to: number): number => {
    if (from !== to) warnings.push({ code: 'value-clamped', field, from, to });
    return to;
  };

  state.hp.current = clampField(
    'hp.current',
    state.hp.current,
    Math.min(Math.max(0, state.hp.current), d.hpMax.value),
  );
  state.hitDiceSpent = clampField(
    'hitDiceSpent',
    state.hitDiceSpent,
    Math.min(Math.max(0, state.hitDiceSpent), d.level),
  );
  if (state.hp.current > 0 && (state.deathSaves.successes > 0 || state.deathSaves.failures > 0)) {
    state.deathSaves = { successes: 0, failures: 0 };
  }
  // O mesmo efeito ligado duas vezes contaria dobrado em quem percorre a lista.
  if (new Set(state.active).size !== state.active.length) state.active = [...new Set(state.active)];

  return {
    sheet:
      warnings.length > 0 ||
      state.deathSaves !== sheet.state.deathSaves ||
      state.active !== sheet.state.active
        ? { ...sheet, state }
        : sheet,
    warnings,
  };
}
