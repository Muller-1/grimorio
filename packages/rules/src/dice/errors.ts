/**
 * Erros do motor de dados. O motor devolve um CÓDIGO (nunca uma frase):
 * a interface traduz (plano v2, princípio C-08).
 */
export type DiceErrorCode =
  | 'empty'
  | 'too-long'
  | 'unexpected-char'
  | 'unexpected-token'
  | 'unexpected-end'
  | 'expected-number'
  | 'expected-sides'
  | 'expected-close-paren'
  | 'unknown-word'
  | 'wrong-arg-count'
  | 'too-many-terms'
  | 'too-deep'
  | 'number-too-large'
  | 'too-many-dice'
  | 'too-many-sides'
  | 'too-few-sides'
  | 'negative-count'
  | 'division-by-zero'
  | 'dice-not-allowed'
  | 'variable-unavailable';

export interface DiceError {
  code: DiceErrorCode;
  /** Índice (0 = primeiro caractere) onde o problema foi encontrado. */
  position: number;
  /** O que o parser esperava encontrar, quando se aplica. */
  expected?: 'expression' | 'number' | 'sides' | ')' | 'name' | 'operator';
}

/** Falha interna: lançada dentro do parser/avaliador e convertida em resultado na borda pública. */
export class DiceFailure extends Error {
  readonly error: DiceError;
  constructor(error: DiceError) {
    super(error.code);
    this.error = error;
  }
}

export function fail(
  code: DiceErrorCode,
  position: number,
  expected?: DiceError['expected'],
): never {
  throw new DiceFailure(expected === undefined ? { code, position } : { code, position, expected });
}
