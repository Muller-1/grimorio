import type { AbilityKey } from '@grimorio/shared';
import type { DiceScaling, Scaling } from '../classes/types';

/** O que um valor que cresce com o nível precisa saber do personagem. */
export interface ScalingContext {
  /** Coluna da tabela da classe no nível atual. */
  column: (name: string) => number | undefined;
  mods: Record<AbilityKey, number>;
  classLevel: number;
  proficiency: number;
}

/** Valor de um `Scaling` para o personagem (coluna inexistente = 0). */
export function evalScaling(value: Scaling, ctx: ScalingContext): number {
  if (typeof value === 'number') return value;
  if ('column' in value) return ctx.column(value.column) ?? 0;
  if ('ability' in value) return Math.max(value.min ?? -Infinity, ctx.mods[value.ability]);
  if ('classLevel' in value) return ctx.classLevel * (value.times ?? 1);
  return ctx.proficiency;
}

/** Expressão de dados pronta para o rolador ("3d6"), ou `null` quando não há dados (0 dados). */
export function evalDice(value: DiceScaling, ctx: ScalingContext): string | null {
  if (typeof value === 'string') return value;
  const count = evalScaling(value.count, ctx);
  const die = typeof value.die === 'number' ? value.die : (ctx.column(value.die.column) ?? 0);
  if (count <= 0 || die <= 0) return null;
  return `${count}d${die}`;
}
