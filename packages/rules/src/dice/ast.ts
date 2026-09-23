/** Árvore de uma expressão de dados (gramática v2, plano 12.1). */

export type SelectionMode = 'kh' | 'kl' | 'dh' | 'dl';
export type FunctionName = 'min' | 'max' | 'floor' | 'ceil' | 'abs';
export type BinaryOp = '+' | '-' | '*' | '/';

export interface Selection {
  mode: SelectionMode;
  n: number;
}

export type Expr =
  | { type: 'number'; value: number; pos: number }
  | {
      type: 'dice';
      /** `null` = sem quantidade escrita (`d20` = `1d20`). */
      count: Expr | null;
      sides: Expr | 'percent';
      selection?: Selection;
      /** Posição do `d`. */
      pos: number;
    }
  | { type: 'variable'; path: string[]; pos: number }
  | { type: 'binary'; op: BinaryOp; left: Expr; right: Expr; pos: number }
  | { type: 'negate'; operand: Expr; pos: number }
  | { type: 'call'; fn: FunctionName; args: Expr[]; pos: number }
  | { type: 'group'; expr: Expr; pos: number };

export type DiceExpr = Extract<Expr, { type: 'dice' }>;

/** Converte a árvore de volta para texto canônico (sem espaços, minúsculas). */
export function stringify(e: Expr): string {
  switch (e.type) {
    case 'number':
      return String(e.value);
    case 'variable':
      return `@${e.path.join('.')}`;
    case 'dice': {
      let count = '';
      if (e.count) {
        // Variável colada no "d" mudaria o nome dela (@nd6); por isso vai entre parênteses.
        count = e.count.type === 'variable' ? `(${stringify(e.count)})` : stringify(e.count);
      }
      const sides = e.sides === 'percent' ? '%' : stringify(e.sides);
      const sel = e.selection ? `${e.selection.mode}${e.selection.n}` : '';
      return `${count}d${sides}${sel}`;
    }
    case 'binary':
      return `${stringify(e.left)}${e.op}${stringify(e.right)}`;
    case 'negate':
      return `-${stringify(e.operand)}`;
    case 'call':
      return `${e.fn}(${e.args.map(stringify).join(', ')})`;
    case 'group':
      return `(${stringify(e.expr)})`;
  }
}
