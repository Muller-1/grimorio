import { CONDITION_PREFIX, CONDITIONS, EXHAUSTION_ID } from '@grimorio/rules';

export const CONDITION_LIST = CONDITIONS.filter((c) => c.id !== EXHAUSTION_ID);
export const EXHAUSTION_NAME =
  CONDITIONS.find((c) => c.id === EXHAUSTION_ID)?.name ?? EXHAUSTION_ID;

/** Nome de uma condição guardada na ficha ("cond:poisoned", "cond:exhaustion:2"). */
export function conditionName(key: string): string {
  const exhaustion = `${CONDITION_PREFIX}${EXHAUSTION_ID}:`;
  if (key.startsWith(exhaustion)) return `${EXHAUSTION_NAME} ${key.slice(exhaustion.length)}`;
  return CONDITIONS.find((c) => `${CONDITION_PREFIX}${c.id}` === key)?.name ?? key;
}
