import {
  evaluate,
  parse,
  type DiceTermResult,
  type RollResult,
  type Selection,
} from '@grimorio/rules';
import { probeRng } from './store';

/**
 * Contas da bandeja de dados do botão flutuante (components/DiceTray.tsx). Tudo puro: recebe a
 * expressão digitada ou o resultado da rolagem e devolve quais dados desenhar, com qual forma,
 * contorno e posição.
 */

/** Quantos dados a bandeja desenha; acima disso ela mostra só o total. */
export const TRAY_MAX_DICE = 7;

/** Forma do dado visto de cima. Lados fora dos dados comuns viram um círculo. */
export type DieShape = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'round';

/**
 * Contorno dos dados que a função escolhe: `kh`/`dh` escolhem os maiores (verde), `kl`/`dl` os
 * menores (vermelho). No `k` o contorno vai nos que ficam; no `d`, nos que saem.
 */
export type DieMark = 'high' | 'low';

export interface TrayDie {
  shape: DieShape;
  /** Texto do tipo, para a prévia ("d20", "d%"). */
  kind: string;
  mark: DieMark | null;
  /** Só depois da rolagem: valor e se o dado conta no total. */
  value?: number;
  kept?: boolean;
}

export type TrayView =
  | { kind: 'empty' }
  | { kind: 'dice'; dice: TrayDie[] }
  /** Dados demais para desenhar: a bandeja mostra só o total. */
  | { kind: 'many'; count: number };

const EMPTY: TrayView = { kind: 'empty' };

const SHAPES: Partial<Record<number, DieShape>> = {
  4: 'd4',
  6: 'd6',
  8: 'd8',
  10: 'd10',
  12: 'd12',
  20: 'd20',
  100: 'd10',
};

export function shapeOf(sides: number, percent = false): DieShape {
  return percent ? 'd10' : (SHAPES[sides] ?? 'round');
}

function markColor(selection: Selection): DieMark {
  return selection.mode === 'kh' || selection.mode === 'dh' ? 'high' : 'low';
}

/**
 * Antes de rolar ainda não se sabe quais dados serão escolhidos: o contorno vai na quantidade
 * certa, nos primeiros (manter) ou nos últimos (tirar).
 */
function previewMark(selection: Selection | undefined, index: number, count: number) {
  if (!selection) return null;
  const n = Math.min(selection.n, count);
  const keep = selection.mode === 'kh' || selection.mode === 'kl';
  const picked = keep ? index < n : index >= count - n;
  return picked ? markColor(selection) : null;
}

/** Depois de rolar: o contorno vai nos dados que a função de fato escolheu. */
function resultMark(selection: Selection | undefined, kept: boolean) {
  if (!selection) return null;
  const keep = selection.mode === 'kh' || selection.mode === 'kl';
  return keep === kept ? markColor(selection) : null;
}

/** Dados de uma rolagem (ou da prévia dela) na ordem em que aparecem na expressão. */
export function trayFromTerms(terms: readonly DiceTermResult[], rolled: boolean): TrayView {
  const count = terms.reduce((sum, term) => sum + term.dice.length, 0);
  if (count === 0) return EMPTY;
  if (count > TRAY_MAX_DICE) return { kind: 'many', count };
  const dice = terms.flatMap((term) =>
    term.dice.map((die, index): TrayDie => {
      const base = {
        shape: shapeOf(term.sides, term.percent),
        kind: term.percent ? 'd%' : `d${term.sides}`,
      };
      return rolled
        ? {
            ...base,
            mark: resultMark(term.selection, die.kept),
            value: die.value,
            kept: die.kept,
          }
        : { ...base, mark: previewMark(term.selection, index, term.dice.length) };
    }),
  );
  return { kind: 'dice', dice };
}

/** O que a expressão digitada vai rolar. Expressão inválida (ou sem dados) não mostra nada. */
export function previewTray(expression: string): TrayView {
  const parsed = parse(expression);
  if (!parsed.ok) return EMPTY;
  const probe = evaluate(parsed.ast, { rng: probeRng });
  return probe.ok ? trayFromTerms(probe.value.terms, false) : EMPTY;
}

export function resultTray(result: RollResult): TrayView {
  return trayFromTerms(result.terms, true);
}

/** Funções de manter/tirar que aparecem na expressão (para a legenda dos contornos). */
export function selectionModes(terms: readonly DiceTermResult[]): Selection['mode'][] {
  const modes = terms.flatMap((term) => (term.selection ? [term.selection.mode] : []));
  return [...new Set(modes)];
}

/** Funções de manter/tirar da expressão digitada (vazio se ela for inválida). */
export function previewModes(expression: string): Selection['mode'][] {
  const parsed = parse(expression);
  if (!parsed.ok) return [];
  const probe = evaluate(parsed.ast, { rng: probeRng });
  return probe.ok ? selectionModes(probe.value.terms) : [];
}

// ---------------------------------------------------------------------------
// Desenho: hexágono com um lado reto em cima, visto de cima
// ---------------------------------------------------------------------------

/** Medidas do desenho da bandeja (unidades do SVG). Altura = largura × √3 / 2. */
export const TRAY_WIDTH = 240;
export const TRAY_HEIGHT = 208;
/** Raio do feltro (dentro das paredes); o hexágono de fora tem raio 120. */
export const FELT_RADIUS = 104;

/** Linhas de dados para cada quantidade (de cima para baixo). */
const ROWS: Record<number, number[]> = {
  1: [1],
  2: [2],
  3: [3],
  4: [2, 2],
  5: [3, 2],
  6: [3, 3],
  7: [2, 3, 2],
};

/** Tamanho do dado e espaço entre eles: poucos dados ficam maiores. */
export function dieMetrics(count: number): { size: number; gap: number } {
  if (count <= 2) return { size: 56, gap: 10 };
  if (count <= 4) return { size: 50, gap: 10 };
  return { size: 44, gap: 8 };
}

/** Lugar de um dado, em % da bandeja (canto de cima à esquerda e largura). */
export interface DieSpot {
  left: number;
  top: number;
  /** Largura em % da largura da bandeja (o dado é quadrado). */
  width: number;
}

/** Centros dos dados, em unidades do desenho, com o meio da bandeja em (0, 0). */
export function dieCenters(count: number): { x: number; y: number }[] {
  const rows = ROWS[Math.min(Math.max(count, 0), TRAY_MAX_DICE)] ?? [];
  const { size, gap } = dieMetrics(count);
  const step = size + gap;
  return rows.flatMap((inRow, r) =>
    Array.from({ length: inRow }, (_, i) => ({
      x: (i - (inRow - 1) / 2) * step,
      y: (r - (rows.length - 1) / 2) * step,
    })),
  );
}

export function trayLayout(count: number): DieSpot[] {
  const { size } = dieMetrics(count);
  const pct = (v: number, total: number) => Math.round((v / total) * 10000) / 100;
  return dieCenters(count).map(({ x, y }) => ({
    left: pct(TRAY_WIDTH / 2 + x - size / 2, TRAY_WIDTH),
    top: pct(TRAY_HEIGHT / 2 + y - size / 2, TRAY_HEIGHT),
    width: pct(size, TRAY_WIDTH),
  }));
}

/** Meia largura do feltro na altura `y` (do meio): o hexágono afina para cima e para baixo. */
export function feltHalfWidth(y: number): number {
  return FELT_RADIUS - Math.abs(y) / Math.sqrt(3);
}

/** Vértices de um hexágono com lado reto em cima, centrado na bandeja. */
export function hexagon(radius: number): [number, number][] {
  const cx = TRAY_WIDTH / 2;
  const cy = TRAY_HEIGHT / 2;
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i;
    return [
      Math.round((cx + radius * Math.cos(angle)) * 10) / 10,
      Math.round((cy + radius * Math.sin(angle)) * 10) / 10,
    ];
  });
}

// ---------------------------------------------------------------------------
// Tempo da animação
// ---------------------------------------------------------------------------

/** Quanto o primeiro dado gira antes de parar. */
export const TUMBLE_MS = 650;
/** Os outros param um de cada vez, com este intervalo. */
export const STAGGER_MS = 110;
/** O número aparece e o dado assenta. */
export const SETTLE_MS = 220;

/** Quando o dado `index` para (ms desde o começo da rolagem). */
export function landingAt(index: number): number {
  return TUMBLE_MS + index * STAGGER_MS;
}

/** Duração da rolagem inteira na bandeja (até o total aparecer). */
export function rollDuration(view: TrayView): number {
  return view.kind === 'dice' ? landingAt(view.dice.length - 1) + SETTLE_MS : 0;
}
