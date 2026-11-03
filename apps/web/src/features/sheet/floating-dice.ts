import type { ScreenArea } from '@/features/dice/tray-area';

/**
 * Contas do botão flutuante de rolar dados da ficha (FloatingDice.tsx). Tudo puro: recebe as
 * medidas da tela e devolve onde o botão e o painel ficam.
 *
 * Regras: o botão mora na borda esquerda ou direita (nunca gruda em cima nem embaixo); o
 * jogador escolhe a altura arrastando; e o botão, com o painel aberto, sobe para dar lugar ao
 * resultado da rolagem e ao teclado do celular, voltando quando eles somem.
 */

export type Side = 'left' | 'right';

/** Distância da borda da tela (sem a barra de rolagem) até o botão e o painel. */
export const EDGE = 16;
/** Espaço livre embaixo (o botão do histórico de rolagens mora ali). */
export const BOTTOM_RESERVE = 64;
/** Entre o botão e o painel. */
export const PANEL_GAP = 10;
/** Entre o botão (ou o painel) e o resultado da rolagem. */
export const TRAY_GAP = 12;
/** Largura máxima do painel. */
export const PANEL_WIDTH = 320;
/** Altura do desenho da bandeja de dados: o máximo, e o mínimo para valer a pena mostrar. */
export const TRAY_MAX_HEIGHT = 184;
export const TRAY_MIN_HEIGHT = 96;
/** Movimento mínimo (px) para um toque virar arrasto. */
export const DRAG_THRESHOLD = 6;

export interface FloatingInput {
  /** Largura da janela. */
  width: number;
  /** Faixa em que o botão pode morar (em px, do topo da janela), sem nada atrapalhando. */
  home: { top: number; bottom: number };
  /** Parte da janela visível agora (o teclado do celular encolhe). */
  visible: { top: number; bottom: number };
  side: Side;
  /** Altura escolhida pelo jogador: 0 = no alto da faixa, 1 = embaixo. */
  at: number;
  /** Tamanho do botão (quadrado). */
  size: number;
  /** Altura do painel aberto; `null` = fechado. */
  panelHeight: number | null;
  /** O resultado da rolagem na tela, se estiver. */
  tray: ScreenArea | null;
}

export interface FloatingLayout {
  button: { x: number; y: number };
  panel: { x: number; y: number; width: number; placement: 'above' | 'below' } | null;
  /** O botão subiu para dar lugar a algo (resultado, teclado, painel). */
  lifted: boolean;
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/** Largura do painel na tela atual. */
export function panelWidth(width: number): number {
  return Math.max(0, Math.min(PANEL_WIDTH, width - 2 * EDGE));
}

/** Faixa vertical do botão (topo do botão) quando nada atrapalha. */
export function homeRange(input: Pick<FloatingInput, 'home' | 'size'>) {
  const min = input.home.top;
  const max = Math.max(min, input.home.bottom - BOTTOM_RESERVE - input.size);
  return { min, max };
}

/** Altura (topo do botão) correspondente a `at`. */
export function yFromAt(input: Pick<FloatingInput, 'home' | 'size'>, at: number): number {
  const { min, max } = homeRange(input);
  return min + clamp(at, 0, 1) * (max - min);
}

/** O contrário de `yFromAt`: guarda a altura como fração, para valer em qualquer tamanho de tela. */
export function atFromY(input: Pick<FloatingInput, 'home' | 'size'>, y: number): number {
  const { min, max } = homeRange(input);
  return max > min ? clamp((y - min) / (max - min), 0, 1) : 1;
}

/** x do botão encostado na borda. */
export function edgeX(side: Side, width: number, size: number): number {
  return side === 'left' ? EDGE : width - EDGE - size;
}

/**
 * Até onde o botão (e o painel) podem descer: acima da reserva de baixo, do teclado e, se o
 * resultado da rolagem estiver na frente (mesma faixa horizontal), acima dele.
 */
export function floorLine(input: FloatingInput, groupWidth: number): number {
  let floor = Math.min(input.home.bottom - BOTTOM_RESERVE, input.visible.bottom - EDGE);
  const tray = input.tray;
  if (tray) {
    const x0 = input.side === 'left' ? EDGE : input.width - EDGE - groupWidth;
    const x1 = x0 + groupWidth;
    if (x0 < tray.right && x1 > tray.left) floor = Math.min(floor, tray.top - TRAY_GAP);
  }
  return floor;
}

/** Até onde o botão pode subir (abaixo do cabeçalho e da parte escondida pela rolagem do teclado). */
export function ceilingLine(input: FloatingInput): number {
  return Math.max(input.home.top, input.visible.top + EDGE);
}

/** Maior altura de painel que cabe acima (ou abaixo) do botão, agora. */
export function panelRoom(input: FloatingInput): number {
  const groupWidth = Math.max(input.size, panelWidth(input.width));
  const free = floorLine(input, groupWidth) - ceilingLine(input) - input.size - PANEL_GAP;
  return Math.max(0, free);
}

/**
 * Altura do desenho da bandeja: o que sobra do espaço do painel depois do resto dele (`rest`:
 * título, campo, dica). Sem espaço para um desenho que valha a pena (teclado do celular aberto,
 * tela baixa), ele some e fica só a linha do total.
 */
export function trayHeight(room: number, rest: number): number {
  const height = Math.min(TRAY_MAX_HEIGHT, Math.floor(room - rest));
  return height >= TRAY_MIN_HEIGHT ? height : 0;
}

/** Onde o botão e o painel ficam. */
export function layoutFloating(input: FloatingInput): FloatingLayout {
  const { size, panelHeight } = input;
  const wanted = yFromAt(input, input.at);
  const pw = panelWidth(input.width);
  const groupWidth = panelHeight === null ? size : Math.max(size, pw);
  const top = ceilingLine(input);
  const floor = floorLine(input, groupWidth);
  const x = edgeX(input.side, input.width, size);

  if (panelHeight === null) {
    const y = Math.max(top, Math.min(wanted, floor - size));
    return { button: { x, y }, panel: null, lifted: y < wanted - 0.5 };
  }

  const panelX = input.side === 'left' ? EDGE : input.width - EDGE - pw;
  // Faixas possíveis para o topo do botão com o painel em cima ou embaixo dele.
  const ranges = {
    above: { min: top + panelHeight + PANEL_GAP, max: floor - size },
    below: { min: top, max: floor - size - PANEL_GAP - panelHeight },
  };
  // Botão na metade de baixo da faixa livre: o painel abre para cima (e vice-versa).
  const prefer: 'above' | 'below' = wanted + size / 2 > (top + floor) / 2 ? 'above' : 'below';
  const order = prefer === 'above' ? (['above', 'below'] as const) : (['below', 'above'] as const);
  for (const placement of order) {
    const range = ranges[placement];
    if (range.min > range.max) continue;
    const y = clamp(wanted, range.min, range.max);
    const panelY = placement === 'above' ? y - PANEL_GAP - panelHeight : y + size + PANEL_GAP;
    return {
      button: { x, y },
      panel: { x: panelX, y: panelY, width: pw, placement },
      lifted: y < wanted - 0.5,
    };
  }
  // Tela baixa demais para os dois: o painel fica por cima do botão, no espaço que der.
  const y = Math.max(top, Math.min(wanted, floor - size));
  return {
    button: { x, y },
    panel: { x: panelX, y: Math.max(top, floor - panelHeight), width: pw, placement: 'above' },
    lifted: y < wanted - 0.5,
  };
}

/** Puxar além do limite anda cada vez menos (como uma tira de borracha). */
export function rubberBand(value: number, min: number, max: number): number {
  const pull = (over: number) => Math.sign(over) * 40 * (1 - 1 / (1 + Math.abs(over) / 120));
  if (value < min) return min + pull(value - min);
  if (value > max) return max + pull(value - max);
  return value;
}

/**
 * Lado em que o botão para ao soltar: o do meio do botão, levando em conta o embalo do gesto
 * (um peteleco rápido para um lado vence mesmo começando do outro).
 */
export function sideAfterDrop(centerX: number, velocityX: number, width: number): Side {
  const projected = centerX + velocityX * 180;
  return projected < width / 2 ? 'left' : 'right';
}

/** Velocidade (px/ms) a partir dos últimos pontos do gesto. */
export function velocity(samples: readonly { t: number; x: number; y: number }[]): {
  x: number;
  y: number;
} {
  if (samples.length < 2) return { x: 0, y: 0 };
  const first = samples[0]!;
  const last = samples[samples.length - 1]!;
  const dt = last.t - first.t;
  if (dt <= 0) return { x: 0, y: 0 };
  return { x: (last.x - first.x) / dt, y: (last.y - first.y) / dt };
}
