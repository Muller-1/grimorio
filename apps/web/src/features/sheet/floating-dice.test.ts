import { describe, expect, it } from 'vitest';
import {
  atFromY,
  BOTTOM_RESERVE,
  EDGE,
  layoutFloating,
  PANEL_GAP,
  panelRoom,
  rubberBand,
  sideAfterDrop,
  TRAY_GAP,
  TRAY_MAX_HEIGHT,
  TRAY_MIN_HEIGHT,
  trayHeight,
  velocity,
  yFromAt,
  type FloatingInput,
} from './floating-dice';

/** Celular de 390 × 800, sem teclado, sem resultado na tela. */
const phone = (over: Partial<FloatingInput> = {}): FloatingInput => ({
  width: 390,
  home: { top: 126, bottom: 800 },
  visible: { top: 0, bottom: 800 },
  side: 'right',
  at: 1,
  size: 52,
  panelHeight: null,
  tray: null,
  ...over,
});

describe('botão flutuante: lugar na tela', () => {
  it('fica encostado na borda escolhida, nunca no meio', () => {
    expect(layoutFloating(phone({ side: 'right' })).button.x).toBe(390 - EDGE - 52);
    expect(layoutFloating(phone({ side: 'left' })).button.x).toBe(EDGE);
  });

  it('não gruda em cima nem embaixo: fica entre o cabeçalho e a reserva de baixo', () => {
    expect(layoutFloating(phone({ at: 0 })).button.y).toBe(126);
    expect(layoutFloating(phone({ at: 1 })).button.y).toBe(800 - BOTTOM_RESERVE - 52);
  });

  it('a altura vira fração e volta igual', () => {
    const input = phone();
    expect(yFromAt(input, atFromY(input, 400))).toBeCloseTo(400);
    expect(atFromY(input, 10)).toBe(0);
    expect(atFromY(input, 5000)).toBe(1);
  });
});

describe('botão flutuante: dá lugar ao resultado da rolagem', () => {
  const tray = { top: 680, left: 12, right: 378 };

  it('sobe quando o resultado aparece na frente e volta quando ele some', () => {
    const lifted = layoutFloating(phone({ tray }));
    expect(lifted.button.y + 52).toBe(680 - TRAY_GAP);
    expect(lifted.lifted).toBe(true);
    const back = layoutFloating(phone());
    expect(back.button.y).toBe(800 - BOTTOM_RESERVE - 52);
    expect(back.lifted).toBe(false);
  });

  it('lá no alto o resultado não atrapalha: não se mexe', () => {
    const result = layoutFloating(phone({ at: 0, tray }));
    expect(result.button.y).toBe(126);
    expect(result.lifted).toBe(false);
  });

  it('no computador, resultado na direita não empurra o botão da esquerda', () => {
    const desktop = phone({
      width: 1280,
      home: { top: 76, bottom: 800 },
      visible: { top: 0, bottom: 800 },
      side: 'left',
      tray: { top: 690, left: 1280 - 12 - 384, right: 1268 },
    });
    expect(layoutFloating(desktop).lifted).toBe(false);
    expect(layoutFloating({ ...desktop, side: 'right' }).lifted).toBe(true);
  });

  it('com o painel aberto, botão e painel sobem juntos acima do resultado', () => {
    const result = layoutFloating(phone({ panelHeight: 150, tray }));
    expect(result.panel?.placement).toBe('above');
    expect(result.button.y + 52).toBeLessThanOrEqual(680 - TRAY_GAP);
    expect(result.panel!.y + 150 + PANEL_GAP).toBe(result.button.y);
  });

  it('teclado do celular aberto: tudo fica na parte visível', () => {
    const result = layoutFloating(phone({ panelHeight: 150, visible: { top: 0, bottom: 450 } }));
    expect(result.button.y + 52).toBeLessThanOrEqual(450 - EDGE);
    expect(result.panel!.y).toBeGreaterThanOrEqual(126);
  });
});

describe('botão flutuante: painel', () => {
  it('abre para baixo quando o botão está no alto, e para cima quando está embaixo', () => {
    expect(layoutFloating(phone({ at: 0, panelHeight: 150 })).panel?.placement).toBe('below');
    expect(layoutFloating(phone({ at: 1, panelHeight: 150 })).panel?.placement).toBe('above');
  });

  it('cabe na tela do celular, encostado na mesma borda', () => {
    const right = layoutFloating(phone({ width: 340, panelHeight: 150 })).panel!;
    expect(right.width).toBe(340 - 2 * EDGE);
    expect(right.x).toBe(EDGE);
    const roomy = layoutFloating(phone({ panelHeight: 150 })).panel!;
    expect(roomy.x + roomy.width).toBe(390 - EDGE);
    const wide = layoutFloating(phone({ width: 1280, side: 'right', panelHeight: 150 })).panel!;
    expect(wide.x + wide.width).toBe(1280 - EDGE);
  });

  it('sem espaço para o painel embaixo, o botão desce só o necessário', () => {
    const result = layoutFloating(phone({ at: 0.45, panelHeight: 400 }));
    expect(result.panel!.y).toBeGreaterThanOrEqual(126);
    expect(result.button.y + 52).toBeLessThanOrEqual(800 - BOTTOM_RESERVE);
  });
});

describe('botão flutuante: arrasto', () => {
  it('solta no lado do meio do botão', () => {
    expect(sideAfterDrop(100, 0, 390)).toBe('left');
    expect(sideAfterDrop(300, 0, 390)).toBe('right');
  });

  it('um peteleco rápido vence o lado de onde começou', () => {
    expect(sideAfterDrop(150, 1.2, 390)).toBe('right');
    expect(sideAfterDrop(260, -1.2, 390)).toBe('left');
  });

  it('além do limite anda cada vez menos', () => {
    expect(rubberBand(50, 0, 100)).toBe(50);
    expect(rubberBand(120, 0, 100)).toBeGreaterThan(100);
    expect(rubberBand(120, 0, 100)).toBeLessThan(120);
    expect(rubberBand(10_000, 0, 100)).toBeLessThan(141);
    expect(rubberBand(-50, 0, 100)).toBeLessThan(0);
  });

  it('velocidade dos últimos pontos', () => {
    expect(
      velocity([
        { t: 0, x: 0, y: 0 },
        { t: 50, x: 50, y: -25 },
      ]),
    ).toEqual({ x: 1, y: -0.5 });
    expect(velocity([{ t: 0, x: 0, y: 0 }])).toEqual({ x: 0, y: 0 });
  });
});

describe('botão flutuante: bandeja de dados no painel', () => {
  it('o espaço do painel é o que sobra entre o teto, o chão e o botão', () => {
    // Celular de 800: chão em 800 - 64 (reserva de baixo), teto em 126.
    expect(panelRoom(phone())).toBe(800 - BOTTOM_RESERVE - 126 - 52 - PANEL_GAP);
    // Teclado aberto (só 420 px visíveis): sobra bem menos.
    expect(panelRoom(phone({ visible: { top: 0, bottom: 420 } }))).toBe(
      420 - EDGE - 126 - 52 - PANEL_GAP,
    );
    // Resultado da rolagem embaixo, na mesma faixa: o chão sobe até ele.
    const tray = { top: 600, left: 12, right: 378 };
    expect(panelRoom(phone({ tray }))).toBe(600 - TRAY_GAP - 126 - 52 - PANEL_GAP);
    expect(panelRoom(phone({ visible: { top: 0, bottom: 150 } }))).toBe(0);
  });

  it('o desenho fica com o que sobra, até o máximo, e some se ficar pequeno demais', () => {
    expect(trayHeight(1000, 200)).toBe(TRAY_MAX_HEIGHT);
    expect(trayHeight(330.6, 200)).toBe(130);
    expect(trayHeight(200 + TRAY_MIN_HEIGHT, 200)).toBe(TRAY_MIN_HEIGHT);
    expect(trayHeight(200 + TRAY_MIN_HEIGHT - 1, 200)).toBe(0);
    expect(trayHeight(0, 200)).toBe(0);
  });
});
