import type { DiceExpr, Expr, FunctionName } from './ast';
import { fail } from './errors';
import { DICE_LIMITS } from './limits';
import { tokenize, type Token } from './tokenizer';

/**
 * Parser descendente recursivo da gramática v2 (plano 12.1):
 *
 *   expressão := soma
 *   soma      := produto (('+' | '-') produto)*
 *   produto   := unário (('*' | '/') unário)*
 *   unário    := '-' unário | átomo
 *   átomo     := dado | número | variável | função | '(' soma ')'
 *   dado      := [contagem] 'd' (lados | '%') seleção?
 *   contagem  := número | variável | '(' soma ')'
 *   lados     := número | variável | '(' soma ')'
 *   seleção   := ('kh' | 'kl' | 'dh' | 'dl') número
 *   variável  := '@' nome ('.' nome)*
 *   função    := ('min' | 'max' | 'floor' | 'ceil' | 'abs') '(' soma (',' soma)* ')'
 *
 * Um número, variável ou parêntese vira CONTAGEM de dados quando vem seguido de `d`.
 */

export interface ParseOptions {
  /** `false` = modo fórmula (conteúdo): dados são recusados. Padrão: `true`. */
  allowDice?: boolean;
}

const ARITY: Record<FunctionName, { min: number; max: number }> = {
  min: { min: 1, max: Infinity },
  max: { min: 1, max: Infinity },
  floor: { min: 1, max: 1 },
  ceil: { min: 1, max: 1 },
  abs: { min: 1, max: 1 },
};

export function parseExpression(input: string, opts: ParseOptions = {}): Expr {
  const allowDice = opts.allowDice ?? true;

  if (input.length > DICE_LIMITS.maxLength) fail('too-long', DICE_LIMITS.maxLength);
  if (input.trim() === '') fail('empty', 0);

  const tokens = tokenize(input);
  let index = 0;
  let depth = 0;
  let terms = 0;

  const peek = (): Token => tokens[index]!;
  const next = (): Token => tokens[index++]!;

  const countTerm = (pos: number) => {
    terms++;
    if (terms > DICE_LIMITS.maxTerms) fail('too-many-terms', pos);
  };

  const enter = (pos: number) => {
    depth++;
    if (depth > DICE_LIMITS.maxDepth) fail('too-deep', pos);
  };

  const unexpected = (t: Token, expected: 'expression' | 'operator'): never =>
    t.kind === 'eof'
      ? fail('unexpected-end', t.pos, expected)
      : fail('unexpected-token', t.pos, expected);

  const expectClose = () => {
    const t = peek();
    if (t.kind !== 'rparen') fail('expected-close-paren', t.pos, ')');
    next();
  };

  function parseSum(): Expr {
    let left = parseProduct();
    for (;;) {
      const t = peek();
      if (t.kind === 'op' && (t.op === '+' || t.op === '-')) {
        next();
        const right = parseProduct();
        left = { type: 'binary', op: t.op, left, right, pos: t.pos };
      } else return left;
    }
  }

  function parseProduct(): Expr {
    let left = parseUnary();
    for (;;) {
      const t = peek();
      if (t.kind === 'op' && (t.op === '*' || t.op === '/')) {
        next();
        const right = parseUnary();
        left = { type: 'binary', op: t.op, left, right, pos: t.pos };
      } else return left;
    }
  }

  function parseUnary(): Expr {
    const t = peek();
    if (t.kind === 'op' && t.op === '-') {
      next();
      return { type: 'negate', operand: parseUnary(), pos: t.pos };
    }
    return parseAtom();
  }

  function parseGroup(): Expr {
    const open = next(); // '('
    enter(open.pos);
    const inner = parseSum();
    expectClose();
    depth--;
    return { type: 'group', expr: inner, pos: open.pos };
  }

  /** Se o próximo token for `d`, o valor já lido vira a quantidade de dados. */
  function maybeDice(count: Expr): Expr {
    return peek().kind === 'd' ? parseDice(count) : count;
  }

  function parseAtom(): Expr {
    const t = peek();
    switch (t.kind) {
      case 'number':
        next();
        countTerm(t.pos);
        return maybeDice({ type: 'number', value: t.value, pos: t.pos });
      case 'variable':
        next();
        countTerm(t.pos);
        return maybeDice({ type: 'variable', path: t.path, pos: t.pos });
      case 'lparen':
        return maybeDice(parseGroup());
      case 'd':
        return parseDice(null);
      case 'func':
        return parseCall();
      default:
        return unexpected(t, 'expression');
    }
  }

  function parseCall(): Expr {
    const name = next() as Extract<Token, { kind: 'func' }>;
    const open = peek();
    if (open.kind !== 'lparen') return unexpected(open, 'expression');
    next();
    enter(open.pos);
    const args: Expr[] = [parseSum()];
    while (peek().kind === 'comma') {
      next();
      args.push(parseSum());
    }
    expectClose();
    depth--;
    const arity = ARITY[name.name];
    if (args.length < arity.min || args.length > arity.max) fail('wrong-arg-count', name.pos);
    return { type: 'call', fn: name.name, args, pos: name.pos };
  }

  function parseDice(count: Expr | null): DiceExpr {
    const d = next(); // 'd'
    if (!allowDice) fail('dice-not-allowed', d.pos);
    if (count === null) countTerm(d.pos);

    let sides: Expr | 'percent';
    const s = peek();
    switch (s.kind) {
      case 'number':
        next();
        sides = { type: 'number', value: s.value, pos: s.pos };
        break;
      case 'percent':
        next();
        sides = 'percent';
        break;
      case 'variable':
        next();
        sides = { type: 'variable', path: s.path, pos: s.pos };
        break;
      case 'lparen':
        sides = parseGroup();
        break;
      default:
        return fail('expected-sides', s.pos, 'sides');
    }

    // Limites que já dá para conferir no texto (os variáveis são conferidos na avaliação).
    if (count?.type === 'number' && count.value > DICE_LIMITS.maxDice) fail('too-many-dice', d.pos);
    if (sides !== 'percent' && sides.type === 'number') {
      if (sides.value < 2) fail('too-few-sides', d.pos);
      if (sides.value > DICE_LIMITS.maxSides) fail('too-many-sides', d.pos);
    }

    const dice: DiceExpr = { type: 'dice', count, sides, pos: d.pos };
    const sel = peek();
    if (sel.kind === 'select') {
      next();
      const n = peek();
      if (n.kind !== 'number') return fail('expected-number', n.pos, 'number');
      next();
      dice.selection = { mode: sel.mode, n: n.value };
    }
    return dice;
  }

  const ast = parseSum();
  const end = peek();
  if (end.kind !== 'eof') unexpected(end, 'operator');
  return ast;
}
