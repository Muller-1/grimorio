import { stringify, type DiceExpr, type Expr, type Selection } from './ast';
import { fail } from './errors';
import { DICE_LIMITS } from './limits';
import type { Rng } from './rng';

/** Um dado rolado. `kept: false` = descartado por kh/kl/dh/dl (a tela mostra riscado). */
export interface DieResult {
  value: number;
  kept: boolean;
}

/** Resultado de um termo de dado, ex.: `4d6kh3`. */
export interface DiceTermResult {
  /** Posição do `d` no texto. */
  position: number;
  count: number;
  sides: number;
  /** `true` quando escrito como `d%`. */
  percent: boolean;
  selection?: Selection;
  dice: DieResult[];
  /** Soma dos dados mantidos. */
  total: number;
}

export interface RollResult {
  /** Expressão em forma canônica (ex.: "1d20+5"). */
  expression: string;
  total: number;
  /** Termos de dado na ordem em que aparecem. */
  terms: DiceTermResult[];
}

export interface EvalContext {
  rng: Rng;
}

// ---------------------------------------------------------------------------
// Aritmética exata com frações. O "/" arredonda para baixo (regra geral da 5ª edição),
// mas dentro de floor(...) e ceil(...) a divisão é exata — assim ceil(7/2) = 4.
// ---------------------------------------------------------------------------

interface Rational {
  n: number;
  d: number; // sempre > 0
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) [a, b] = [b, a % b];
  return a || 1;
}

function rational(n: number, d: number, pos: number): Rational {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d)) fail('number-too-large', pos);
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

const int = (v: number): Rational => ({ n: v, d: 1 });

function floorDiv(n: number, d: number): number {
  let q = Math.floor(n / d);
  // Corrige possíveis erros de ponto flutuante em números grandes.
  while (q * d > n) q--;
  while ((q + 1) * d <= n) q++;
  return q;
}

const floorR = (r: Rational): number => floorDiv(r.n, r.d);
const ceilR = (r: Rational): number => -floorDiv(-r.n, r.d);
const compare = (a: Rational, b: Rational): number => a.n * b.d - b.n * a.d;

// ---------------------------------------------------------------------------

class Evaluator {
  private diceRolled = 0;
  readonly terms: DiceTermResult[] = [];

  constructor(private readonly rng: Rng) {}

  run(e: Expr, exact: boolean): Rational {
    switch (e.type) {
      case 'number':
        return int(e.value);
      case 'variable':
        // Resolução de variáveis entra no R2 (ajuste A-2 do plano de início).
        return fail('variable-unavailable', e.pos);
      case 'group':
        return this.run(e.expr, exact);
      case 'negate': {
        const v = this.run(e.operand, exact);
        return { n: 0 - v.n, d: v.d }; // "0 - x" evita o -0
      }
      case 'binary':
        return this.binary(e, exact);
      case 'call':
        return this.call(e);
      case 'dice':
        return int(this.dice(e, exact));
    }
  }

  private binary(e: Extract<Expr, { type: 'binary' }>, exact: boolean): Rational {
    const a = this.run(e.left, exact);
    const b = this.run(e.right, exact);
    switch (e.op) {
      case '+':
        return rational(a.n * b.d + b.n * a.d, a.d * b.d, e.pos);
      case '-':
        return rational(a.n * b.d - b.n * a.d, a.d * b.d, e.pos);
      case '*':
        return rational(a.n * b.n, a.d * b.d, e.pos);
      case '/': {
        if (b.n === 0) fail('division-by-zero', e.pos);
        const q = rational(a.n * b.d, a.d * b.n, e.pos);
        return exact ? q : int(floorR(q));
      }
    }
  }

  private call(e: Extract<Expr, { type: 'call' }>): Rational {
    // Argumentos são avaliados de forma exata; o resultado é arredondado no fim.
    const args = e.args.map((a) => this.run(a, true));
    const first = args[0]!;
    switch (e.fn) {
      case 'floor':
        return int(floorR(first));
      case 'ceil':
        return int(ceilR(first));
      case 'abs':
        return { n: Math.abs(first.n), d: first.d };
      case 'min':
        return args.reduce((m, v) => (compare(v, m) < 0 ? v : m));
      case 'max':
        return args.reduce((m, v) => (compare(v, m) > 0 ? v : m));
    }
  }

  private dice(e: DiceExpr, exact: boolean): number {
    const count = e.count ? floorR(this.run(e.count, exact)) : 1;
    const sides = e.sides === 'percent' ? 100 : floorR(this.run(e.sides, exact));

    if (count < 0) fail('negative-count', e.pos);
    if (sides < 2) fail('too-few-sides', e.pos);
    if (sides > DICE_LIMITS.maxSides) fail('too-many-sides', e.pos);
    this.diceRolled += count;
    if (this.diceRolled > DICE_LIMITS.maxDice) fail('too-many-dice', e.pos);

    const values = Array.from({ length: count }, () => this.rng.int(1, sides));
    const kept = selectKept(values, e.selection);
    const dice = values.map((value, i) => ({ value, kept: kept[i]! }));
    const total = dice.reduce((sum, d) => (d.kept ? sum + d.value : sum), 0);

    const term: DiceTermResult = {
      position: e.pos,
      count,
      sides,
      percent: e.sides === 'percent',
      dice,
      total,
    };
    if (e.selection) term.selection = e.selection;
    this.terms.push(term);
    return total;
  }
}

/** Marca quais dados ficam. Empates: o dado que apareceu primeiro tem prioridade. */
function selectKept(values: number[], selection: Selection | undefined): boolean[] {
  const kept = values.map(() => true);
  if (!selection) return kept;

  const n = Math.min(selection.n, values.length);
  const highestFirst = selection.mode === 'kh' || selection.mode === 'dh';
  const order = values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => (highestFirst ? b.value - a.value : a.value - b.value) || a.index - b.index)
    .map((x) => x.index);

  if (selection.mode === 'kh' || selection.mode === 'kl') {
    kept.fill(false);
    for (const i of order.slice(0, n)) kept[i] = true;
  } else {
    for (const i of order.slice(0, n)) kept[i] = false;
  }
  return kept;
}

/** Avalia a árvore. Pode lançar `DiceFailure` — a borda pública (index.ts) converte em resultado. */
export function evaluateExpression(ast: Expr, ctx: EvalContext): RollResult {
  const evaluator = new Evaluator(ctx.rng);
  const value = evaluator.run(ast, false);
  return { expression: stringify(ast), total: floorR(value), terms: evaluator.terms };
}
