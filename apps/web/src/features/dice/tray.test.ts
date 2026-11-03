import { roll, seededRng, type DiceTermResult, type RollResult } from '@grimorio/rules';
import { describe, expect, it } from 'vitest';
import {
  dieCenters,
  feltHalfWidth,
  FELT_RADIUS,
  hexagon,
  landingAt,
  previewModes,
  previewTray,
  resultTray,
  rollDuration,
  SETTLE_MS,
  shapeOf,
  STAGGER_MS,
  trayFromTerms,
  trayLayout,
  TRAY_MAX_DICE,
  TUMBLE_MS,
  dieMetrics,
} from './tray';

/** Pega os dados de uma prévia; falha o teste se a bandeja não for de dados. */
function diceOf(expression: string) {
  const view = previewTray(expression);
  if (view.kind !== 'dice') throw new Error(`esperava dados em ${expression}, veio ${view.kind}`);
  return view.dice;
}

/** Termo montado à mão, só com o que a bandeja lê. */
function term(over: Partial<DiceTermResult>): DiceTermResult {
  return { position: 0, count: 0, sides: 20, percent: false, dice: [], total: 0, ...over };
}

const die = (value: number, kept: boolean) => ({ value, kept });

describe('bandeja: forma do dado', () => {
  it.each([
    [4, 'd4'],
    [6, 'd6'],
    [8, 'd8'],
    [10, 'd10'],
    [12, 'd12'],
    [20, 'd20'],
  ])('%i lados → %s', (sides, shape) => {
    expect(shapeOf(sides)).toBe(shape);
  });

  it('100 lados e d% usam o d10', () => {
    expect(shapeOf(100)).toBe('d10');
    expect(shapeOf(10, true)).toBe('d10');
  });

  it.each([2, 3, 7, 1000])('%i lados vira círculo', (sides) => {
    expect(shapeOf(sides)).toBe('round');
  });
});

describe('bandeja: prévia da expressão', () => {
  it('1d20+5 mostra um d20 sem contorno e sem valor', () => {
    const dice = diceOf('1d20+5');
    expect(dice).toHaveLength(1);
    expect(dice[0]).toEqual({ shape: 'd20', kind: 'd20', mark: null });
    expect(dice[0]).not.toHaveProperty('value');
  });

  it('manter o maior: contorno no primeiro', () => {
    expect(diceOf('2d20kh1').map((d) => d.mark)).toEqual(['high', null]);
  });

  it('manter o menor: contorno no primeiro, em vermelho', () => {
    expect(diceOf('2d20kl1').map((d) => d.mark)).toEqual(['low', null]);
  });

  it('tirar o menor: contorno só no último', () => {
    expect(diceOf('4d6dl1').map((d) => d.mark)).toEqual([null, null, null, 'low']);
  });

  it('tirar os dois maiores: contorno nos dois últimos', () => {
    expect(diceOf('4d6dh2').map((d) => d.mark)).toEqual([null, null, 'high', 'high']);
  });

  it('n maior que a quantidade marca todos', () => {
    expect(diceOf('4d6kh9').map((d) => d.mark)).toEqual(['high', 'high', 'high', 'high']);
  });

  it('termos diferentes ficam na ordem da expressão', () => {
    expect(diceOf('1d20+1d4').map((d) => d.kind)).toEqual(['d20', 'd4']);
  });

  it('d% é d% no texto e d10 no desenho', () => {
    const [d] = diceOf('d%');
    expect(d?.kind).toBe('d%');
    expect(d?.shape).toBe('d10');
  });

  it('dados demais viram só a contagem', () => {
    expect(previewTray('8d6')).toEqual({ kind: 'many', count: 8 });
  });

  it('no limite ainda desenha todos', () => {
    expect(TRAY_MAX_DICE).toBe(7);
    expect(diceOf('7d6')).toHaveLength(7);
  });

  it.each(['5+3', '2d', ''])('"%s" não mostra nada', (expression) => {
    expect(previewTray(expression)).toEqual({ kind: 'empty' });
  });
});

describe('bandeja: resultado da rolagem', () => {
  it('manter o maior: contorno no dado mantido, valor e kept copiados', () => {
    const view = trayFromTerms(
      [
        term({
          count: 2,
          selection: { mode: 'kh', n: 1 },
          dice: [die(4, false), die(15, true)],
        }),
      ],
      true,
    );
    expect(view).toEqual({
      kind: 'dice',
      dice: [
        { shape: 'd20', kind: 'd20', mark: null, value: 4, kept: false },
        { shape: 'd20', kind: 'd20', mark: 'high', value: 15, kept: true },
      ],
    });
  });

  it('manter o menor: contorno vermelho no dado mantido', () => {
    const view = trayFromTerms(
      [term({ selection: { mode: 'kl', n: 1 }, dice: [die(4, true), die(15, false)] })],
      true,
    );
    expect(view.kind === 'dice' && view.dice.map((d) => d.mark)).toEqual(['low', null]);
  });

  it('tirar o menor: contorno no dado descartado', () => {
    const view = trayFromTerms(
      [
        term({
          sides: 6,
          selection: { mode: 'dl', n: 1 },
          dice: [die(5, true), die(2, false), die(6, true), die(3, true)],
        }),
      ],
      true,
    );
    expect(view.kind === 'dice' && view.dice.map((d) => d.mark)).toEqual([null, 'low', null, null]);
  });

  it('sem função de manter/tirar não há contorno', () => {
    const view = trayFromTerms([term({ dice: [die(9, true)] })], true);
    expect(view.kind === 'dice' && view.dice[0]?.mark).toBeNull();
  });

  it('resultTray usa uma rolagem de verdade', () => {
    const rolled = roll('4d6dl1', { rng: seededRng(7) });
    if (!rolled.ok) throw new Error('rolagem inválida');
    const view = resultTray(rolled.value);
    if (view.kind !== 'dice') throw new Error('esperava dados');
    expect(view.dice).toHaveLength(4);
    expect(view.dice.filter((d) => d.mark === 'low')).toHaveLength(1);
    expect(view.dice.every((d) => d.value !== undefined && d.kept !== undefined)).toBe(true);
  });

  it('resultado com dados demais vira contagem', () => {
    const result: RollResult = {
      expression: '8d6',
      total: 8,
      terms: [term({ sides: 6, dice: Array.from({ length: 8 }, () => die(1, true)) })],
    };
    expect(resultTray(result)).toEqual({ kind: 'many', count: 8 });
  });
});

describe('bandeja: legenda dos contornos', () => {
  it('lista cada função uma vez só', () => {
    expect(previewModes('2d20kh1+4d6dl1')).toEqual(['kh', 'dl']);
    expect(previewModes('2d20kh1+3d6kh2')).toEqual(['kh']);
  });

  it('expressão inválida não tem funções', () => {
    expect(previewModes('2d20kh')).toEqual([]);
  });
});

describe('bandeja: posição dos dados', () => {
  const counts = [1, 2, 3, 4, 5, 6, 7];
  const sizeOf = (n: number) => dieMetrics(n).size;

  it.each(counts)('%i dado(s) → %i posições', (n) => {
    expect(dieCenters(n)).toHaveLength(n);
    expect(trayLayout(n)).toHaveLength(n);
  });

  it.each(counts)('com %i dado(s), nenhum sai do feltro', (n) => {
    const half = sizeOf(n) / 2;
    for (const { x, y } of dieCenters(n)) {
      expect(Math.abs(x) + half).toBeLessThanOrEqual(feltHalfWidth(Math.abs(y) + half));
      expect(Math.abs(y) + half).toBeLessThanOrEqual((FELT_RADIUS * Math.sqrt(3)) / 2);
    }
  });

  it.each(counts)('com %i dado(s), nenhum se sobrepõe', (n) => {
    const size = sizeOf(n);
    const centers = dieCenters(n);
    for (let i = 0; i < centers.length; i++) {
      for (let j = i + 1; j < centers.length; j++) {
        const a = centers[i]!;
        const b = centers[j]!;
        const apart = Math.abs(a.x - b.x) >= size || Math.abs(a.y - b.y) >= size;
        expect(apart).toBe(true);
      }
    }
  });

  it.each(counts)('com %i dado(s), o conjunto é simétrico', (n) => {
    const sum = dieCenters(n).reduce((acc, c) => acc + c.x, 0);
    expect(sum).toBeCloseTo(0);
  });

  it.each(counts)('com %i dado(s), o layout em % cabe na bandeja', (n) => {
    for (const spot of trayLayout(n)) {
      expect(spot.left).toBeGreaterThanOrEqual(0);
      expect(spot.top).toBeGreaterThanOrEqual(0);
      expect(spot.left + spot.width).toBeLessThanOrEqual(100);
    }
  });

  it('sem dados não há posições', () => {
    expect(dieCenters(0)).toEqual([]);
  });
});

describe('bandeja: hexágono', () => {
  it('tem 6 vértices e começa à direita do centro', () => {
    const points = hexagon(104);
    expect(points).toHaveLength(6);
    expect(points[0]).toEqual([120 + 104, 104]);
  });

  it('o lado de cima é reto', () => {
    const points = hexagon(120);
    expect(points[4]![1]).toBe(points[5]![1]);
  });
});

describe('bandeja: tempo da animação', () => {
  it('o primeiro dado para depois do giro e os outros vão em fila', () => {
    expect(landingAt(0)).toBe(TUMBLE_MS);
    expect(landingAt(3) - landingAt(2)).toBe(STAGGER_MS);
  });

  it('sem dados desenhados não há animação', () => {
    expect(rollDuration({ kind: 'empty' })).toBe(0);
    expect(rollDuration({ kind: 'many', count: 9 })).toBe(0);
  });

  it('a duração acaba quando o último dado assenta', () => {
    expect(rollDuration(previewTray('3d6'))).toBe(landingAt(2) + SETTLE_MS);
  });
});
