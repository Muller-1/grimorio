import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { D20Facets, D20Icon } from '@/components/ui/d20-icon';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { getRng } from '@/ports/rng';
import { ArtLayer, ErrorScene, ErrorText, Eyebrow, SCREEN_BUTTON } from './scene';

/** Tamanho do desenho (o `viewBox`): as peças animadas usam as mesmas coordenadas. */
const ART = [440, 400] as const;

const COMPASS_POINTS = [
  ['N', 0, -39, 11],
  ['L', 39, 0, 11],
  ['S', 0, 39, 11],
  ['O', -39, 0, 11],
  ['NE', 28, -28, 7.5],
  ['SE', 28, 28, 7.5],
  ['SO', -28, 28, 7.5],
  ['NO', -28, -28, 7.5],
] as const;

/** O mapa rasgado: a trilha some na borda; ao lado, o d20 com o último resultado. */
function TornMap({ face, rolling }: { face: number; rolling: boolean }) {
  const n = t.screens.notFound;
  return (
    <div className="relative w-full max-w-[480px]">
      <svg role="img" aria-label={n.art} viewBox="0 0 440 400" className="block h-auto w-full">
        <defs>
          <linearGradient id="gr404-metal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--metal-1)' }} />
            <stop offset="0.45" style={{ stopColor: 'var(--metal-2)' }} />
            <stop offset="0.6" style={{ stopColor: 'var(--metal-3)' }} />
            <stop offset="1" style={{ stopColor: 'var(--metal-4)' }} />
          </linearGradient>
          <filter id="gr404-shadow" x="-15%" y="-15%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="10"
              stdDeviation="10"
              style={{ floodColor: 'var(--sc-shadow)', floodOpacity: 'var(--sc-shadow-op)' }}
            />
          </filter>
          <filter id="gr404-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#5cc2ae" floodOpacity="0.35" />
          </filter>
        </defs>
        <polygon
          points="34,44 330,30 344,66 326,100 350,138 330,176 352,214 328,252 346,292 324,330 336,356 34,350"
          filter="url(#gr404-shadow)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          className="fill-(--sc-paper) stroke-(--sc-paper-edge)"
        />
        <path d="M316 44H48V336H316" fill="none" strokeWidth="1.4" className="stroke-(--sc-line)" />
        <path
          d="M312 50H54V330H312"
          fill="none"
          strokeWidth="1"
          strokeDasharray="1 4"
          className="stroke-(--sc-line)"
        />
        <ellipse
          cx="220"
          cy="296"
          rx="64"
          ry="26"
          className="fill-accent opacity-5 dark:opacity-[0.04]"
        />
        <ellipse
          cx="136"
          cy="168"
          rx="44"
          ry="30"
          className="fill-accent opacity-[0.04] dark:hidden"
        />
        <g
          fill="none"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          className="stroke-muted"
        >
          <path d="M168 124l14-22 14 22M188 124l12-18 12 18M150 128l10-15 10 15M176 108l6-6" />
        </g>
        <g className="fill-muted">
          <circle cx="96" cy="212" r="6" />
          <circle cx="112" cy="220" r="5" />
          <circle cx="84" cy="226" r="5" />
        </g>
        <path d="M96 218v8M112 225v6M84 231v6" strokeWidth="1.5" className="stroke-muted" />
        <g
          fill="none"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="stroke-(--sc-wave) dark:opacity-80"
        >
          <path d="M200 300q8-6 16 0t16 0M216 312q8-6 16 0t16 0" />
        </g>
        <g transform="translate(98 100)">
          <circle r="30" fill="none" stroke="url(#gr404-metal)" strokeWidth="1.8" />
          <circle
            r="22"
            fill="none"
            strokeWidth="0.8"
            strokeDasharray="1 3"
            className="stroke-(--sc-line)"
          />
          <polygon
            points="0,-17 3,-3 17,0 3,3 0,17 -3,3 -17,0 -3,-3"
            transform="rotate(45)"
            strokeWidth="0.6"
            className="fill-(--sc-star) stroke-(--metal-4)"
          />
          <polygon
            points="0,-26 5,-5 26,0 5,5 0,26 -5,5 -26,0 -5,-5"
            fill="url(#gr404-metal)"
            strokeWidth="0.8"
            className="stroke-(--metal-4)"
          />
          <polygon points="0,-26 5,-5 0,0" className="fill-(--metal-4)" />
          <g
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-gold font-display opacity-50 dark:fill-ornament"
          >
            {COMPASS_POINTS.map(([label, x, y, size]) => (
              <text key={label} x={x} y={y} fontSize={size} fontWeight={size > 10 ? 700 : 600}>
                {label}
              </text>
            ))}
          </g>
        </g>
      </svg>

      {/* A trilha anda: camada própria, para não redesenhar o mapa (e a sombra dele) a cada quadro. */}
      <ArtLayer art={ART} box={[0, 0, 440, 400]} className="will-change-transform">
        <path
          d="M72 306C110 290 120 250 160 252S220 262 236 218S300 168 346 142"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="2 9"
          className="gr-march stroke-accent"
        />
        <circle cx="72" cy="306" r="6" className="fill-accent" />
        <circle cx="72" cy="306" r="11" fill="none" strokeWidth="1.5" className="stroke-ornament" />
      </ArtLayer>
      <ArtLayer art={ART} box={[366, 212, 52, 56]} className="gr-drift">
        <polygon
          points="372,226 404,218 412,252 380,262"
          strokeWidth="1.2"
          strokeLinejoin="round"
          className="fill-(--sc-paper) stroke-(--sc-paper-edge)"
        />
        <path
          d="M382 244l20-8"
          strokeWidth="2.5"
          strokeDasharray="2 7"
          strokeLinecap="round"
          className="stroke-accent"
        />
      </ArtLayer>
      <ArtLayer art={ART} box={[370, 108, 48, 64]} className="gr-bob">
        <text
          x="394"
          y="160"
          textAnchor="middle"
          fontSize="56"
          fontWeight="700"
          className="fill-border-strong font-display dark:fill-ornament"
        >
          ?
        </text>
      </ArtLayer>
      {/* O d20 gira inteiro (camada), com a sombra ou o brilho já desenhados dentro dele. */}
      <ArtLayer
        art={ART}
        box={[238, 240, 116, 116]}
        className={cn('-rotate-[14deg]', rolling && 'gr-tumble')}
      >
        <g className="[filter:url(#gr404-shadow)] dark:[filter:url(#gr404-glow)]">
          <svg x="238" y="240" width="116" height="116" viewBox="0 0 200 200">
            <D20Facets value={face} strokeWidth={5} fontSize={44} />
          </svg>
        </g>
      </ArtLayer>
    </div>
  );
}

/** Página que não existe (404): o mapa rasgado e um d20 para tentar a sorte de novo. */
export function NotFoundScreen() {
  const n = t.screens.notFound;
  const [face, setFace] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const timers = useRef<{
    tick?: ReturnType<typeof setInterval>;
    end?: ReturnType<typeof setTimeout>;
  }>({});

  useEffect(() => {
    const current = timers.current;
    return () => {
      clearInterval(current.tick);
      clearTimeout(current.end);
    };
  }, []);

  const roll = () => {
    if (rolling) return;
    const rng = getRng();
    setRolling(true);
    timers.current.tick = setInterval(() => setFace(rng.int(1, 20)), 90);
    timers.current.end = setTimeout(() => {
      clearInterval(timers.current.tick);
      const value = rng.int(1, 20);
      setFace(value);
      setResult(value);
      setRolling(false);
    }, 1000);
  };

  return (
    <ErrorScene art={<TornMap face={face} rolling={rolling} />}>
      <Eyebrow>{n.eyebrow}</Eyebrow>
      <ErrorText title={n.title} text={n.text} />
      <div aria-live="polite" className="min-h-7">
        {result !== null ? (
          <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-[1.0625rem] leading-normal">
            <strong className="font-display font-bold text-accent">{n.result(result)}</strong>
            <span>{n.outcome(result)}</span>
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="primary" className={SCREEN_BUTTON}>
          <a href="/">{t.screens.home}</a>
        </Button>
        <Button
          variant="outline"
          className={cn(SCREEN_BUTTON, 'bg-transparent disabled:opacity-100')}
          onClick={roll}
          disabled={rolling}
          aria-busy={rolling}
          data-testid="notfound.roll"
        >
          <D20Icon className="size-5 text-accent" />
          {rolling ? n.rolling : n.reroll}
        </Button>
      </div>
      <a
        href="/personagens"
        className="inline-flex min-h-11 items-center self-start font-medium text-accent underline underline-offset-4 hover:text-accent-hover"
      >
        {n.mySheets}
      </a>
    </ErrorScene>
  );
}
