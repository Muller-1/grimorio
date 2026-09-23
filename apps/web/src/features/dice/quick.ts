import { withModifier } from '@grimorio/rules';

/** Dados da rolagem rápida (RF-71). O d100 cobre o percentual. */
export const QUICK_DICE = [4, 6, 8, 10, 12, 20, 100] as const;

export interface QuickRoll {
  count: number;
  sides: number;
  modifier: number;
}

/** Quantidade + tipo de dado + somador → expressão (ex.: 3, 6, −1 → "3d6-1"). */
export function buildQuickExpression({ count, sides, modifier }: QuickRoll): string {
  return withModifier(`${count}d${sides}`, modifier);
}
