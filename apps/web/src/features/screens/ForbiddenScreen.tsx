import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { ArtLayer, ErrorScene, ErrorText, Eyebrow, SCREEN_BUTTON } from './scene';

/** Tamanho do desenho (o `viewBox`): as peças animadas usam as mesmas coordenadas. */
const ART = [440, 400] as const;

/** Brilhos que piscam em volta do pergaminho: o desenho, o retângulo dele e quando começa. */
const WINKS = [
  ['M370 60l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z', [361.5, 60, 17, 17], '0s'],
  ['M66 312l2 5 5 2-5 2-2 5-2-5-5-2 5-2z', [59, 312, 14, 14], '1.3s'],
] as const;

const RIVETS = [
  [70, 74],
  [370, 74],
  [70, 322],
  [370, 322],
] as const;

/** O pergaminho selado: fita, selo de cera e um cadeado com brilho que passa. */
function SealedScroll() {
  return (
    <div className="relative w-full max-w-[460px]">
      <svg
        role="img"
        aria-label={t.screens.forbidden.art}
        viewBox="0 0 440 400"
        className="block h-auto w-full"
      >
        <defs>
          <linearGradient id="gr403-metal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--metal-1)' }} />
            <stop offset="0.45" style={{ stopColor: 'var(--metal-2)' }} />
            <stop offset="0.6" style={{ stopColor: 'var(--metal-3)' }} />
            <stop offset="1" style={{ stopColor: 'var(--metal-4)' }} />
          </linearGradient>
          <linearGradient id="gr403-roll" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--sc-roll-1)' }} />
            <stop offset="0.5" style={{ stopColor: 'var(--sc-roll-2)' }} />
            <stop offset="1" style={{ stopColor: 'var(--sc-roll-3)' }} />
          </linearGradient>
          <linearGradient id="gr403-sheen" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" style={{ stopColor: 'var(--sc-sheen)' }} stopOpacity="0.5" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id="gr403-seal">
            <circle cx="220" cy="196" r="44" />
          </clipPath>
          <filter id="gr403-shadow" x="-15%" y="-15%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="9"
              stdDeviation="9"
              style={{ floodColor: 'var(--sc-shadow)', floodOpacity: 'var(--sc-shadow-op)' }}
            />
          </filter>
          <filter id="gr403-aura" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="0" stdDeviation="9" floodColor="#5cc2ae" floodOpacity="0.45" />
          </filter>
        </defs>

        <ellipse
          cx="220"
          cy="362"
          rx="150"
          ry="14"
          className="fill-(--sc-ground)"
          style={{ opacity: 'var(--sc-ground-op)' }}
        />
      </svg>

      {/* O pergaminho balança inteiro (camada), com a sombra e a aura já desenhadas dentro. */}
      <ArtLayer art={ART} box={[0, 0, 440, 400]} className="gr-sway">
        <g filter="url(#gr403-shadow)">
          <rect
            x="98"
            y="78"
            width="244"
            height="240"
            strokeWidth="1.2"
            className="fill-(--sc-scroll) stroke-(--sc-paper-edge)"
          />
          <path
            d="M124 112H316M124 132H290M124 152H306M124 248H300M124 268H316M124 288H270"
            strokeWidth="2"
            strokeLinecap="round"
            className="stroke-(--sc-scroll-lines)"
          />
          {[58, 306].map((y) => (
            <rect
              key={y}
              x="80"
              y={y}
              width="280"
              height="32"
              rx="16"
              fill="url(#gr403-roll)"
              strokeWidth="1.2"
              className="stroke-(--sc-roll-edge)"
            />
          ))}
          {RIVETS.map(([cx, cy]) => (
            <circle
              key={`${cx}-${cy}`}
              cx={cx}
              cy={cy}
              r="11"
              fill="url(#gr403-metal)"
              strokeWidth="1"
              className="stroke-(--metal-4)"
            />
          ))}

          <rect x="98" y="184" width="244" height="22" fill="url(#gr403-metal)" />
          <path d="M98 184H342M98 206H342" strokeWidth="1" className="stroke-(--metal-4)" />
          <path
            d="M206 230 188 300 202 292 210 306ZM234 230 252 300 238 292 230 306Z"
            fill="url(#gr403-metal)"
            strokeWidth="1"
            strokeLinejoin="round"
            className="stroke-(--metal-4)"
          />

          <g className="dark:[filter:url(#gr403-aura)]">
            <polygon
              points="220,148 233,152 245,150 251,162 262,170 262,183 268,196 262,209 262,222 251,230 245,242 233,240 220,244 207,240 195,242 189,230 178,222 178,209 172,196 178,183 178,170 189,162 195,150 207,152"
              strokeWidth="6"
              strokeLinejoin="round"
              className="fill-(--sc-wax) stroke-(--sc-wax)"
            />
          </g>
          <circle
            cx="220"
            cy="196"
            r="31"
            strokeWidth="1.5"
            className="fill-(--sc-wax-2) stroke-(--sc-wax-edge)"
          />
          <circle
            cx="220"
            cy="196"
            r="25"
            fill="none"
            strokeWidth="1"
            strokeDasharray="1 3"
            className="stroke-ornament"
          />
          <path
            d="M211 195v-7a9 9 0 0 1 18 0v7"
            fill="none"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="stroke-(--sc-lock)"
          />
          <rect x="206" y="194" width="28" height="21" rx="3" className="fill-(--sc-lock)" />
          <circle cx="220" cy="202" r="3.2" className="fill-(--sc-wax-edge)" />
          <path
            d="M220 204v6"
            strokeWidth="2.6"
            strokeLinecap="round"
            className="stroke-(--sc-wax-edge)"
          />
        </g>
      </ArtLayer>
      {/* O brilho que passa no selo: camada leve, balançando junto com o pergaminho. */}
      <ArtLayer art={ART} box={[0, 0, 440, 400]} className="gr-sway">
        <g clipPath="url(#gr403-seal)">
          <g transform="rotate(20 220 196)">
            <rect
              className="gr-sheen"
              x="196"
              y="140"
              width="48"
              height="112"
              fill="url(#gr403-sheen)"
            />
          </g>
        </g>
      </ArtLayer>
      {WINKS.map(([d, box, delay]) => (
        <ArtLayer
          key={d}
          art={ART}
          box={box}
          className="gr-wink motion-safe:opacity-0"
          style={{ animationDelay: delay }}
        >
          <path d={d} className="fill-(--sc-glow)" />
        </ArtLayer>
      ))}
    </div>
  );
}

/**
 * Ficha de outra pessoa da campanha (403): o jogador vê só o resumo; a ficha completa é de
 * quem a criou e do Mestre.
 */
export function ForbiddenScreen({ summaryHref = '/campanhas' }: { summaryHref?: string }) {
  const f = t.screens.forbidden;
  return (
    <ErrorScene art={<SealedScroll />} current="campaigns" overlay>
      <Eyebrow>{f.eyebrow}</Eyebrow>
      <ErrorText title={f.title} text={f.text} />
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="primary" className={SCREEN_BUTTON}>
          <a href={summaryHref}>{f.summary}</a>
        </Button>
        <Button asChild variant="outline" className={cn(SCREEN_BUTTON, 'bg-transparent')}>
          <a href="/campanhas">{f.back}</a>
        </Button>
      </div>
      <p className="border-t border-border pt-4 text-sm leading-normal text-muted">{f.note}</p>
    </ErrorScene>
  );
}
