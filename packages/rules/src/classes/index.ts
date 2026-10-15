import type { ClassId } from '../creation/content';
import { BARBARIAN } from './barbarian';
import { BARD } from './bard';
import { CLERIC } from './cleric';
import { DRUID } from './druid';
import { FIGHTER } from './fighter';
import { MONK } from './monk';
import { PALADIN } from './paladin';
import { RANGER } from './ranger';
import { ROGUE } from './rogue';
import { SORCERER } from './sorcerer';
import type { ClassProgression } from './types';
import { WARLOCK } from './warlock';
import { WIZARD } from './wizard';

export * from './common';
export * from './feats';
export * from './types';
export { METAMAGIC } from './sorcerer';
export { INVOCATIONS, type InvocationDef } from './warlock';

/** Progressão das 12 classes do SRD 5.2, do nível 1 ao 20. */
export const CLASS_PROGRESSIONS: Record<ClassId, ClassProgression> = {
  barbarian: BARBARIAN,
  bard: BARD,
  cleric: CLERIC,
  druid: DRUID,
  fighter: FIGHTER,
  monk: MONK,
  paladin: PALADIN,
  ranger: RANGER,
  rogue: ROGUE,
  sorcerer: SORCERER,
  warlock: WARLOCK,
  wizard: WIZARD,
};

/** Valor de uma coluna da tabela da classe num nível (1–20). */
export function columnAt(
  progression: ClassProgression,
  column: string,
  level: number,
): number | string | undefined {
  const values = progression.columns[column];
  return values?.[Math.min(20, Math.max(1, level)) - 1];
}
