import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { critical, halve, parse, roll, stringify, type EvalResult, type RollResult } from './index';
import { seededRng, type Rng } from './rng';

/** Rng de teste que devolve os valores na ordem (e confere se estão na faixa pedida). */
function sequenceRng(values: number[]): Rng {
  let i = 0;
  return {
    int(min, max) {
      const v = values[i++];
      if (v === undefined) throw new Error('sequenceRng sem valores');
      if (v < min || v > max) throw new Error(`valor ${v} fora de [${min}, ${max}]`);
      return v;
    },
  };
}

/** Rng que sempre devolve o mínimo (ou o máximo). */
const lowRng: Rng = { int: (min) => min };
const highRng: Rng = { int: (_min, max) => max };

function ok(result: EvalResult): RollResult {
  if (!result.ok) throw new Error(`esperava sucesso, veio erro ${JSON.stringify(result.error)}`);
  return result.value;
}

function total(input: string, rng: Rng = lowRng): number {
  return ok(roll(input, { rng })).total;
}

function errorOf(input: string, opts?: { allowDice?: boolean }) {
  const parsed = parse(input, opts);
  if (parsed.ok) {
    const r = roll(input, { rng: lowRng });
    if (r.ok) throw new Error(`esperava erro para "${input}"`);
    return r.error;
  }
  return parsed.error;
}

describe('1. números, + e -', () => {
  it.each([
    ['3+4-1', 6],
    ['10', 10],
    [' 2 +  3 ', 5],
    ['0', 0],
    ['1-5', -4],
  ])('%s = %i', (input, expected) => {
    expect(total(input)).toBe(expected);
  });
});

describe('2. dados simples', () => {
  it('1d20 usa o gerador', () => {
    const r = ok(roll('1d20', { rng: sequenceRng([17]) }));
    expect(r.total).toBe(17);
    expect(r.terms).toHaveLength(1);
    expect(r.terms[0]).toMatchObject({ count: 1, sides: 20, total: 17 });
    expect(r.terms[0]!.dice).toEqual([{ value: 17, kept: true }]);
  });

  it('d20 sem quantidade = 1d20', () => {
    expect(ok(roll('d20', { rng: sequenceRng([5]) })).terms[0]).toMatchObject({
      count: 1,
      sides: 20,
    });
  });

  it('D20 maiúsculo também vale', () => {
    expect(total('D20', highRng)).toBe(20);
  });

  it('d% = d100', () => {
    const r = ok(roll('d%', { rng: highRng }));
    expect(r.total).toBe(100);
    expect(r.terms[0]).toMatchObject({ sides: 100, percent: true });
  });

  it('RF-70: 100d2 devolve 100 resultados entre 1 e 2 e o total', () => {
    const r = ok(roll('100d2', { rng: seededRng(7) }));
    const dice = r.terms[0]!.dice;
    expect(dice).toHaveLength(100);
    expect(dice.every((d) => d.value === 1 || d.value === 2)).toBe(true);
    expect(r.total).toBe(dice.reduce((s, d) => s + d.value, 0));
  });

  it('vários termos: 2d6+1d4+3', () => {
    const r = ok(roll('2d6+1d4+3', { rng: sequenceRng([6, 2, 4]) }));
    expect(r.total).toBe(15);
    expect(r.terms.map((t) => t.total)).toEqual([8, 4]);
  });

  it('0d6 é permitido e dá 0', () => {
    expect(total('0d6')).toBe(0);
  });
});

describe('3. seleção: kh, kl, dh, dl', () => {
  it('RF-70: 4d6kh3 mostra os 4 dados e marca o descartado', () => {
    const r = ok(roll('4d6kh3', { rng: sequenceRng([3, 6, 1, 4]) }));
    expect(r.total).toBe(13);
    expect(r.terms[0]!.dice).toEqual([
      { value: 3, kept: true },
      { value: 6, kept: true },
      { value: 1, kept: false },
      { value: 4, kept: true },
    ]);
  });

  it('vantagem: 2d20kh1+5', () => {
    expect(ok(roll('2d20kh1+5', { rng: sequenceRng([8, 15]) })).total).toBe(20);
  });

  it('desvantagem: 2d20kl1+5', () => {
    expect(ok(roll('2d20kl1+5', { rng: sequenceRng([8, 15]) })).total).toBe(13);
  });

  it('dh e dl', () => {
    expect(total('4d6dh1', sequenceRng([3, 6, 1, 4]))).toBe(8);
    expect(total('4d6dl1', sequenceRng([3, 6, 1, 4]))).toBe(13);
  });

  it('empates: descarta apenas a quantidade pedida', () => {
    const r = ok(roll('3d6kh2', { rng: sequenceRng([5, 5, 5]) }));
    expect(r.terms[0]!.dice.filter((d) => d.kept)).toHaveLength(2);
    expect(r.total).toBe(10);
  });

  it('manter mais dados do que existem mantém todos', () => {
    expect(total('2d6kh5', sequenceRng([2, 3]))).toBe(5);
  });
});

describe('4. * e / com precedência', () => {
  it.each([
    ['1+2*3', 7],
    ['2*3+1', 7],
    ['7/2', 3],
    ['-7/2', -4],
    ['3/2*2', 2],
    ['10-4/2', 8],
    ['2*3*4', 24],
    ['20/2/2', 5],
  ])('%s = %i', (input, expected) => {
    expect(total(input)).toBe(expected);
  });

  it('dados participam da precedência: 2*1d6+1', () => {
    expect(total('2*1d6+1', sequenceRng([4]))).toBe(9);
  });
});

describe('5. parênteses e menos unário', () => {
  it.each([
    ['(1+2)*3', 9],
    ['-3+10', 7],
    ['-(2+3)', -5],
    ['--4', 4],
    ['((((1))))', 1],
  ])('%s = %i', (input, expected) => {
    expect(total(input)).toBe(expected);
  });
});

describe('6. funções', () => {
  it.each([
    ['min(3, 1, 2)', 1],
    ['max(1, -2)', 1],
    ['abs(-4)', 4],
    ['floor(7/2)', 3],
    ['ceil(7/2)', 4],
    ['ceil(5/2)', 3],
    ['ceil(3/2*2)', 3],
    ['floor(-7/2)', -4],
    ['ceil(-7/2)', -3],
    ['ceil(7/10*10)', 7],
    ['max(1, 0)', 1],
  ])('%s = %i', (input, expected) => {
    expect(total(input)).toBe(expected);
  });

  it('número errado de argumentos', () => {
    expect(errorOf('abs(1, 2)')).toMatchObject({ code: 'wrong-arg-count', position: 0 });
    expect(errorOf('floor()')).toMatchObject({ code: 'unexpected-token' });
  });
});

describe('7. quantidade e lados vindos de expressão', () => {
  it('(1+2)d6 rola 3 dados', () => {
    const r = ok(roll('(1+2)d6', { rng: sequenceRng([1, 2, 3]) }));
    expect(r.terms[0]).toMatchObject({ count: 3, sides: 6, total: 6 });
  });

  it('(ceil(5/2))d6 rola 3 dados', () => {
    expect(ok(roll('(ceil(5/2))d6', { rng: lowRng })).terms[0]!.count).toBe(3);
  });

  it('lados vindos de expressão: 1d(2*3)', () => {
    expect(ok(roll('1d(2*3)', { rng: highRng })).terms[0]).toMatchObject({ sides: 6, total: 6 });
  });
});

describe('8. variáveis: reconhecidas, mas indisponíveis até o R2', () => {
  it.each(['1d8+@str', '(ceil(@level.rogue/2))d6', 'max(1, @wis)', '1d20+@des'])(
    '%s é aceito pelo parser',
    (input) => {
      expect(parse(input).ok).toBe(true);
    },
  );

  it('avaliar devolve variable-unavailable com a posição', () => {
    expect(errorOf('1d8+@str')).toMatchObject({ code: 'variable-unavailable', position: 4 });
  });

  it('@ sem nome é erro', () => {
    expect(errorOf('1+@5')).toMatchObject({ code: 'unexpected-char', position: 3 });
    expect(errorOf('1+@')).toMatchObject({ code: 'unexpected-end', position: 3 });
  });

  it('variável como quantidade precisa de espaço ou parênteses: @n d6', () => {
    expect(parse('@n d6').ok).toBe(true);
  });
});

describe('9. limites e erros', () => {
  it('RF-70: "1d" aponta que esperava os lados depois do d', () => {
    expect(errorOf('1d')).toEqual({ code: 'expected-sides', position: 2, expected: 'sides' });
  });

  it.each([
    ['', 'empty', 0],
    ['   ', 'empty', 0],
    ['1+', 'unexpected-end', 2],
    ['1 2', 'unexpected-token', 2],
    ['(1+2', 'expected-close-paren', 4],
    ['1+2)', 'unexpected-token', 3],
    ['1d20kh', 'expected-number', 6],
    ['2d6kh1kh1', 'unexpected-token', 6],
    ['1.5', 'unexpected-char', 1],
    ['1d20 & 3', 'unexpected-char', 5],
    ['foo(1)', 'unknown-word', 0],
    ['1d1', 'too-few-sides', 1],
    ['1d0', 'too-few-sides', 1],
    ['1001d6', 'too-many-dice', 4],
    ['1d10001', 'too-many-sides', 1],
    ['1/0', 'division-by-zero', 1],
    ['(0-2)d6', 'negative-count', 5],
    ['1d(3-2)', 'too-few-sides', 1],
    ['12345678', 'number-too-large', 0],
  ])('"%s" → %s na posição %i', (input, code, position) => {
    expect(errorOf(input)).toMatchObject({ code, position });
  });

  it('mais de 1.000 dados somando termos', () => {
    expect(errorOf('600d6+600d6')).toMatchObject({ code: 'too-many-dice', position: 9 });
  });

  it('mais de 1.000 dados vindos de expressão', () => {
    expect(errorOf('(500*3)d6')).toMatchObject({ code: 'too-many-dice' });
  });

  it('expressão com mais de 200 caracteres', () => {
    expect(errorOf('1+'.repeat(100) + '1')).toMatchObject({ code: 'too-long' });
  });

  it('mais de 30 termos', () => {
    expect(errorOf(Array.from({ length: 31 }, () => '1').join('+'))).toMatchObject({
      code: 'too-many-terms',
    });
    expect(total(Array.from({ length: 30 }, () => '1').join('+'))).toBe(30);
  });

  it('profundidade de parênteses acima de 8', () => {
    expect(errorOf('('.repeat(9) + '1' + ')'.repeat(9))).toMatchObject({ code: 'too-deep' });
    expect(total('('.repeat(8) + '1' + ')'.repeat(8))).toBe(1);
  });

  it('número grande demais no meio da conta', () => {
    expect(errorOf('999999*999999*999999')).toMatchObject({ code: 'number-too-large' });
  });
});

describe('10. transformações: crítico e metade', () => {
  it.each([
    ['1d8+3', '2d8+3'],
    ['d6', '2d6'],
    ['2d6+1d4+2', '4d6+2d4+2'],
    ['(1+1)d6', '((1+1)*2)d6'],
    ['@n d6', '(@n*2)d6'],
    ['5', '5'],
  ])('crítico de %s = %s', (input, expected) => {
    const parsed = parse(input);
    if (!parsed.ok) throw new Error('parse falhou');
    const crit = stringify(critical(parsed.ast));
    expect(crit).toBe(expected);
    expect(parse(crit).ok).toBe(true);
  });

  it.each([
    [9, 4],
    [10, 5],
    [1, 0],
    [0, 0],
  ])('metade de %i = %i', (value, expected) => {
    expect(halve(value)).toBe(expected);
  });
});

describe('11. modo fórmula', () => {
  it('recusa dados', () => {
    expect(errorOf('1d6+2', { allowDice: false })).toMatchObject({
      code: 'dice-not-allowed',
      position: 1,
    });
  });

  it('aceita contas e funções', () => {
    expect(parse('max(1, 3-5)', { allowDice: false }).ok).toBe(true);
  });
});

describe('stringify', () => {
  it.each([
    '1d20+5',
    '2d20kh1+5',
    '4d6kh3',
    'd%',
    '(1+2)*3',
    '-(2+3)',
    'max(1, 2)',
    '1d8+@str.score',
  ])('%s volta igual', (input) => {
    const parsed = parse(input);
    if (!parsed.ok) throw new Error('parse falhou');
    expect(stringify(parsed.ast)).toBe(input);
  });

  it('normaliza espaços e maiúsculas', () => {
    const parsed = parse(' 2D6 + 3 ');
    expect(parsed.ok && stringify(parsed.ast)).toBe('2d6+3');
  });
});

// ---------------------------------------------------------------------------
// Propriedades (plano v2, 12.5)
// ---------------------------------------------------------------------------

interface GeneratedExpr {
  text: string;
  min: number;
  max: number;
}

/** Termo: dado (com ou sem seleção) ou constante, com os limites teóricos calculados à parte. */
const arbTerm: fc.Arbitrary<GeneratedExpr> = fc.oneof(
  fc.integer({ min: 0, max: 100 }).map((n) => ({ text: String(n), min: n, max: n })),
  fc
    .record({
      count: fc.integer({ min: 1, max: 20 }),
      sides: fc.constantFrom(2, 4, 6, 8, 10, 12, 20, 100),
      sel: fc.option(
        fc.record({
          mode: fc.constantFrom('kh', 'kl', 'dh', 'dl'),
          n: fc.integer({ min: 0, max: 25 }),
        }),
        { nil: undefined },
      ),
    })
    .map(({ count, sides, sel }) => {
      let kept = count;
      if (sel) {
        const n = Math.min(sel.n, count);
        kept = sel.mode === 'kh' || sel.mode === 'kl' ? n : count - n;
      }
      return {
        text: `${count}d${sides}${sel ? `${sel.mode}${sel.n}` : ''}`,
        min: kept,
        max: kept * sides,
      };
    }),
);

const arbExpr: fc.Arbitrary<GeneratedExpr> = fc
  .array(fc.tuple(fc.constantFrom('+', '-'), arbTerm), { minLength: 0, maxLength: 5 })
  .chain((rest) =>
    arbTerm.map((first) =>
      rest.reduce<GeneratedExpr>(
        (acc, [op, t]) =>
          op === '+'
            ? { text: `${acc.text}+${t.text}`, min: acc.min + t.min, max: acc.max + t.max }
            : { text: `${acc.text}-${t.text}`, min: acc.min - t.max, max: acc.max - t.min },
        first,
      ),
    ),
  );

describe('propriedades', () => {
  it('total sempre entre o mínimo e o máximo teóricos', () => {
    fc.assert(
      fc.property(arbExpr, fc.integer(), (expr, seed) => {
        const r = roll(expr.text, { rng: seededRng(seed) });
        return r.ok && r.value.total >= expr.min && r.value.total <= expr.max;
      }),
    );
  });

  it('com o gerador no mínimo e no máximo, bate exatamente os limites', () => {
    fc.assert(
      fc.property(arbExpr, (expr) => {
        // Só vale sem subtrair dados (subtrair inverte o sentido)
        fc.pre(!/-\d+d/.test(expr.text));
        return total(expr.text, lowRng) === expr.min && total(expr.text, highRng) === expr.max;
      }),
    );
  });

  it('kh/kl mantêm a quantidade pedida', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 30 }),
        fc.integer({ min: 0, max: 40 }),
        fc.constantFrom('kh', 'kl'),
        fc.integer(),
        (count, n, mode, seed) => {
          const r = roll(`${count}d6${mode}${n}`, { rng: seededRng(seed) });
          if (!r.ok) return false;
          const dice = r.value.terms[0]!.dice;
          return dice.length === count && dice.filter((d) => d.kept).length === Math.min(n, count);
        },
      ),
    );
  });

  it('mesma semente → mesmo resultado', () => {
    fc.assert(
      fc.property(arbExpr, fc.integer(), (expr, seed) => {
        const a = roll(expr.text, { rng: seededRng(seed) });
        const b = roll(expr.text, { rng: seededRng(seed) });
        return JSON.stringify(a) === JSON.stringify(b);
      }),
    );
  });

  it('stringify(parse(x)) é estável', () => {
    fc.assert(
      fc.property(arbExpr, (expr) => {
        const p = parse(expr.text);
        return p.ok && stringify(p.ast) === expr.text;
      }),
    );
  });

  it('10.000 textos aleatórios nunca lançam exceção', () => {
    const alphabet = fc.constantFrom(...'0123456789dDkhlmaxinflorcebs%@.+-*/(), '.split(''));
    const garbage = fc.oneof(
      fc.string({ maxLength: 60 }),
      fc.array(alphabet, { maxLength: 60 }).map((cs) => cs.join('')),
    );
    fc.assert(
      fc.property(garbage, fc.integer(), (text, seed) => {
        const r = roll(text, { rng: seededRng(seed) });
        return typeof r.ok === 'boolean';
      }),
      { numRuns: 10_000 },
    );
  });
});
