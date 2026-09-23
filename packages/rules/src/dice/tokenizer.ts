import type { BinaryOp, FunctionName, SelectionMode } from './ast';
import { fail } from './errors';
import { DICE_LIMITS } from './limits';

/** Texto → lista de tokens. Cada token guarda a posição, para mensagens de erro. */

export type Token =
  | { kind: 'number'; value: number; pos: number }
  | { kind: 'd'; pos: number }
  | { kind: 'percent'; pos: number }
  | { kind: 'select'; mode: SelectionMode; pos: number }
  | { kind: 'func'; name: FunctionName; pos: number }
  | { kind: 'variable'; path: string[]; pos: number }
  | { kind: 'op'; op: BinaryOp; pos: number }
  | { kind: 'lparen'; pos: number }
  | { kind: 'rparen'; pos: number }
  | { kind: 'comma'; pos: number }
  | { kind: 'eof'; pos: number };

const FUNCTIONS: readonly string[] = ['min', 'max', 'floor', 'ceil', 'abs'];
const SELECTIONS: readonly string[] = ['kh', 'kl', 'dh', 'dl'];

/** Sinais "tipográficos" aceitos como os comuns (teclados de celular). */
const OPERATORS: Record<string, BinaryOp> = {
  '+': '+',
  '-': '-',
  '−': '-',
  '–': '-',
  '*': '*',
  '×': '*',
  '/': '/',
  '÷': '/',
};

const isDigit = (c: string) => c >= '0' && c <= '9';
const isLetter = (c: string) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
const isNameStart = (c: string) => isLetter(c) || c === '_';
const isNameChar = (c: string) => isNameStart(c) || isDigit(c);
const isSpace = (c: string) => c === ' ' || c === '\t' || c === '\n' || c === '\r';

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  const readName = (): string => {
    const start = i;
    while (i < input.length && isNameChar(input[i]!)) i++;
    return input.slice(start, i).toLowerCase();
  };

  while (i < input.length) {
    const c = input[i]!;
    const pos = i;

    if (isSpace(c)) {
      i++;
      continue;
    }

    if (isDigit(c)) {
      while (i < input.length && isDigit(input[i]!)) i++;
      const digits = input.slice(pos, i);
      const value = Number(digits);
      if (digits.length > 7 || value > DICE_LIMITS.maxLiteral) fail('number-too-large', pos);
      tokens.push({ kind: 'number', value, pos });
      continue;
    }

    if (isLetter(c)) {
      // Sequência de letras: "d", "kh"/"kl"/"dh"/"dl" ou nome de função.
      while (i < input.length && isLetter(input[i]!)) i++;
      const word = input.slice(pos, i).toLowerCase();
      if (word === 'd') tokens.push({ kind: 'd', pos });
      else if (SELECTIONS.includes(word)) {
        tokens.push({ kind: 'select', mode: word as SelectionMode, pos });
      } else if (FUNCTIONS.includes(word)) {
        tokens.push({ kind: 'func', name: word as FunctionName, pos });
      } else fail('unknown-word', pos);
      continue;
    }

    if (c === '@') {
      i++;
      const path: string[] = [];
      for (;;) {
        if (i >= input.length) fail('unexpected-end', i, 'name');
        if (!isNameStart(input[i]!)) fail('unexpected-char', i, 'name');
        path.push(readName());
        if (input[i] === '.') {
          i++;
          continue;
        }
        break;
      }
      tokens.push({ kind: 'variable', path, pos });
      continue;
    }

    const op = OPERATORS[c];
    if (op) {
      tokens.push({ kind: 'op', op, pos });
      i++;
      continue;
    }

    if (c === '(') tokens.push({ kind: 'lparen', pos });
    else if (c === ')') tokens.push({ kind: 'rparen', pos });
    else if (c === ',') tokens.push({ kind: 'comma', pos });
    else if (c === '%') tokens.push({ kind: 'percent', pos });
    else fail('unexpected-char', pos);
    i++;
  }

  tokens.push({ kind: 'eof', pos: input.length });
  return tokens;
}
