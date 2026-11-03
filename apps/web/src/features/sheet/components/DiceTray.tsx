import type { CSSProperties, ReactNode } from 'react';
import { useMemo } from 'react';
import type { RollEntry } from '@/features/dice/store';
import {
  FELT_RADIUS,
  hexagon,
  landingAt,
  previewModes,
  previewTray,
  resultTray,
  rollDuration,
  SETTLE_MS,
  trayLayout,
  TRAY_HEIGHT,
  TRAY_WIDTH,
  type DieShape,
  type TrayDie,
} from '@/features/dice/tray';
import { ts } from '@/lib/i18n/sheet';
import { cn } from '@/lib/utils';
import './dice-tray.css';

/** Raio de fora da bandeja (as paredes vão daqui até o feltro). */
const RIM_RADIUS = TRAY_WIDTH / 2;

const points = (list: [number, number][]) => list.map(([x, y]) => `${x},${y}`).join(' ');

/**
 * A bandeja vista de cima: seis paredes com tons chapados (a luz vem do alto à esquerda, então
 * as paredes de baixo e da direita ficam mais claras), o feltro, a borda e os botões de pressão
 * nos cantos.
 */
function TrayArt() {
  const outer = hexagon(RIM_RADIUS - 1);
  const felt = hexagon(FELT_RADIUS);
  const snaps = hexagon(RIM_RADIUS - 8);
  return (
    <svg
      className="gr-tray-art"
      viewBox={`0 0 ${TRAY_WIDTH} ${TRAY_HEIGHT}`}
      aria-hidden="true"
      focusable="false"
    >
      {outer.map((corner, i) => {
        const next = (i + 1) % 6;
        return (
          <polygon
            key={i}
            className="gr-tray-wall"
            style={{ fill: `var(--tray-wall-${i})` }}
            points={points([corner, outer[next]!, felt[next]!, felt[i]!])}
          />
        );
      })}
      <polygon className="gr-tray-felt" points={points(felt)} />
      <polygon className="gr-tray-rim" points={points(outer)} />
      {snaps.map(([x, y], i) => (
        <g key={i} className="gr-tray-snap">
          <circle cx={x} cy={y} r={4.5} />
          <circle cx={x} cy={y} r={1.8} className="gr-tray-snap-dot" />
        </g>
      ))}
    </svg>
  );
}

/** Contorno de cada dado (caixa de 100 × 100), as linhas das faces e onde vai o número. */
const SHAPES: Record<
  DieShape,
  { outline: ReactNode; facets?: string; numberY: number; numberSize: number }
> = {
  d4: {
    outline: <polygon points="50,7 94,85 6,85" />,
    facets: 'M50,7 L50,59 M94,85 L50,59 M6,85 L50,59',
    numberY: 63,
    numberSize: 34,
  },
  d6: {
    outline: <rect x="8" y="8" width="84" height="84" rx="12" />,
    numberY: 51,
    numberSize: 50,
  },
  d8: {
    outline: <polygon points="50,4 95,50 50,96 5,50" />,
    facets: 'M5,50 L50,62 L95,50',
    numberY: 38,
    numberSize: 40,
  },
  d10: {
    outline: <polygon points="50,4 95,42 50,96 5,42" />,
    facets: 'M5,42 L50,58 L95,42 M50,58 L50,96',
    numberY: 36,
    numberSize: 36,
  },
  d12: {
    outline: <polygon points="50,6 94.7,38.5 77.6,91 22.4,91 5.3,38.5" />,
    facets:
      'M50,26 L75.7,44.7 L65.9,74.8 L34.1,74.8 L24.3,44.7 Z M50,6 L50,26 M94.7,38.5 L75.7,44.7 M77.6,91 L65.9,74.8 M22.4,91 L34.1,74.8 M5.3,38.5 L24.3,44.7',
    numberY: 52,
    numberSize: 34,
  },
  d20: {
    outline: <polygon points="50,3 92,27 92,73 50,97 8,73 8,27" />,
    facets:
      'M50,22 L79,72 L21,72 Z M50,22 L8,27 M50,22 L92,27 M21,72 L8,27 M21,72 L8,73 M21,72 L50,97 M79,72 L92,27 M79,72 L92,73 M79,72 L50,97',
    numberY: 55,
    numberSize: 30,
  },
  round: {
    outline: <circle cx="50" cy="50" r="45" />,
    numberY: 51,
    numberSize: 46,
  },
};

/** Números compridos (d100, d1000) diminuem para caber no dado. */
function fontSize(base: number, text: string) {
  return text.length <= 2 ? base : text.length === 3 ? base * 0.78 : base * 0.6;
}

function Die({ die, index, style }: { die: TrayDie; index: number; style: CSSProperties }) {
  const shape = SHAPES[die.shape];
  const rolled = die.value !== undefined;
  const text = rolled ? String(die.value) : die.kind;
  return (
    <div
      className="gr-die"
      data-shape={die.shape}
      data-mark={die.mark ?? undefined}
      data-out={rolled && die.kept === false ? '' : undefined}
      style={{ ...style, '--land': `${landingAt(index)}ms` } as CSSProperties}
    >
      <div className="gr-die-body">
        {/* O dado que não conta fica apagado; o contorno, por cima, continua forte. */}
        <div className="gr-die-fade">
          <svg viewBox="0 0 100 100" className="gr-die-layer" focusable="false">
            <g className="gr-die-face">{shape.outline}</g>
            {shape.facets ? <path className="gr-die-facet" d={shape.facets} /> : null}
          </svg>
          <svg viewBox="0 0 100 100" className="gr-die-layer gr-die-shade" focusable="false">
            {shape.outline}
          </svg>
          <svg
            viewBox="0 0 100 100"
            className={rolled ? 'gr-die-layer gr-die-num' : 'gr-die-layer gr-die-kind'}
            focusable="false"
          >
            <text
              x="50"
              y={shape.numberY}
              className={rolled ? 'font-display' : 'font-sans'}
              fontSize={rolled ? fontSize(shape.numberSize, text) : 26}
            >
              {text}
            </text>
          </svg>
        </div>
        {die.mark ? (
          <svg viewBox="0 0 100 100" className="gr-die-layer gr-die-mark" focusable="false">
            {shape.outline}
          </svg>
        ) : null}
      </div>
    </div>
  );
}

interface DiceTrayProps {
  /** Altura do desenho em px (a largura segue a proporção do hexágono); 0 = só a linha do total. */
  height: number;
  /** O que está digitado no campo: a bandeja mostra os dados que ele vai rolar. */
  expression: string;
  /** Rolagem para mostrar no lugar da prévia (a do campo ou uma da ficha). */
  entry: RollEntry | null;
  /** Os dados giram antes de parar (desligado com "reduzir movimento" ou na preferência). */
  motion: boolean;
}

/**
 * Bandeja de dados do botão flutuante: mostra os dados da expressão digitada e, quando alguém
 * rola, os dados giram (cada tipo do seu jeito) e param um de cada vez, como o rolador de dados
 * do Google. Com mais de 7 dados aparece só o total. Os contornos mostram o que a função de
 * manter/tirar escolhe: verde nos maiores (kh, dh), vermelho nos menores (kl, dl).
 *
 * É só desenho (`aria-hidden`): o resultado é anunciado pela notificação da rolagem.
 */
export function DiceTray({ height, expression, entry, motion }: DiceTrayProps) {
  const f = ts.floatingDice;
  const view = useMemo(
    () => (entry ? resultTray(entry.result) : previewTray(expression)),
    [entry, expression],
  );
  const modes = useMemo(() => (entry ? [] : previewModes(expression)), [entry, expression]);
  const rolling = entry !== null && motion;
  const spots = view.kind === 'dice' ? trayLayout(view.dice.length) : [];
  const done = { '--land': `${Math.max(0, rollDuration(view) - SETTLE_MS)}ms` } as CSSProperties;

  return (
    <div
      key={entry?.id ?? 'preview'}
      className={rolling ? 'gr-tray-box gr-rolling' : 'gr-tray-box'}
      aria-hidden="true"
      data-testid="floating-dice.tray"
      data-kind={view.kind}
      data-rolled={entry ? 'true' : undefined}
    >
      {height > 0 ? (
        <div className="gr-tray" style={{ height }} data-tray-drawing>
          <TrayArt />
          {view.kind === 'dice'
            ? view.dice.map((die, i) => (
                <Die
                  key={i}
                  die={die}
                  index={i}
                  style={{
                    left: `${spots[i]!.left}%`,
                    top: `${spots[i]!.top}%`,
                    width: `${spots[i]!.width}%`,
                  }}
                />
              ))
            : null}
          {view.kind !== 'dice' && entry ? (
            <p className={cn('gr-tray-center font-display', motion && 'animate-roll-pop')}>
              {entry.result.total}
            </p>
          ) : null}
          {view.kind === 'many' && !entry ? (
            <p className="gr-tray-center gr-tray-count font-display">{f.many(view.count)}</p>
          ) : null}
        </div>
      ) : null}

      <div className="gr-tray-status">
        {entry ? (
          <>
            <span className="gr-tray-label">{entry.label}</span>
            {view.kind === 'dice' ? (
              <span className="gr-tray-total" style={rolling ? done : undefined}>
                {f.total} <strong className="font-display">{entry.result.total}</strong>
              </span>
            ) : null}
          </>
        ) : view.kind === 'many' ? (
          <span>{f.manyHint}</span>
        ) : (
          modes.map((mode) => (
            <span
              key={mode}
              className="gr-tray-key"
              data-mark={mode === 'kh' || mode === 'dh' ? 'high' : 'low'}
            >
              {f.marks[mode]}
            </span>
          ))
        )}
      </div>
    </div>
  );
}
