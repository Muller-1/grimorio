import type { Expr } from './ast';
import { DiceFailure, type DiceError } from './errors';
import { evaluateExpression, type EvalContext, type RollResult } from './evaluate';
import { parseExpression, type ParseOptions } from './parser';

export type { BinaryOp, DiceExpr, Expr, FunctionName, Selection, SelectionMode } from './ast';
export { stringify } from './ast';
export type { DiceError, DiceErrorCode } from './errors';
export type { DiceTermResult, DieResult, EvalContext, RollResult } from './evaluate';
export { DICE_LIMITS } from './limits';
export type { ParseOptions } from './parser';
export { createRng, cryptoRng, seededRng, sfc32Source, type RandomSource, type Rng } from './rng';
export { critical, halve } from './transforms';

export type ParseResult = { ok: true; ast: Expr } | { ok: false; error: DiceError };
export type EvalResult = { ok: true; value: RollResult } | { ok: false; error: DiceError };

/**
 * A borda pública nunca lança exceção por causa do texto digitado:
 * sempre devolve resultado ou erro com código e posição.
 */
function guard<T>(fn: () => T): { ok: true; value: T } | { ok: false; error: DiceError } {
  try {
    return { ok: true, value: fn() };
  } catch (err) {
    if (err instanceof DiceFailure) return { ok: false, error: err.error };
    throw err; // bug de programação: não esconder
  }
}

/** Texto → árvore. `allowDice: false` = modo fórmula. */
export function parse(input: string, opts: ParseOptions = {}): ParseResult {
  const r = guard(() => parseExpression(input, opts));
  return r.ok ? { ok: true, ast: r.value } : r;
}

/** Árvore + gerador → resultado detalhado. Variáveis ainda devolvem `variable-unavailable`. */
export function evaluate(ast: Expr, ctx: EvalContext): EvalResult {
  return guard(() => evaluateExpression(ast, ctx));
}

/** Atalho: texto → resultado. */
export function roll(input: string, ctx: EvalContext): EvalResult {
  const parsed = parse(input);
  return parsed.ok ? evaluate(parsed.ast, ctx) : parsed;
}
