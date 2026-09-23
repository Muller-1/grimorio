import type { Expr } from './ast';

/**
 * Transformações aplicadas DEPOIS de montar a expressão (não fazem parte da gramática).
 */

/** Crítico: dobra a quantidade de todos os termos de dado (`1d8+3` → `2d8+3`). */
export function critical(e: Expr): Expr {
  switch (e.type) {
    case 'number':
    case 'variable':
      return e;
    case 'dice': {
      let count: Expr;
      if (e.count === null) count = { type: 'number', value: 2, pos: e.pos };
      else if (e.count.type === 'number') count = { ...e.count, value: e.count.value * 2 };
      else {
        // Quantidade vinda de expressão: (quantidade*2)
        count = {
          type: 'group',
          pos: e.count.pos,
          expr: {
            type: 'binary',
            op: '*',
            left: e.count,
            right: { type: 'number', value: 2, pos: e.pos },
            pos: e.pos,
          },
        };
      }
      return { ...e, count };
    }
    case 'binary':
      return { ...e, left: critical(e.left), right: critical(e.right) };
    case 'negate':
      return { ...e, operand: critical(e.operand) };
    case 'call':
      return { ...e, args: e.args.map(critical) };
    case 'group':
      return { ...e, expr: critical(e.expr) };
  }
}

/** Metade (resistência, salvaguarda bem-sucedida): arredonda para baixo, nunca negativo. */
export function halve(total: number): number {
  return Math.max(0, Math.floor(total / 2));
}
