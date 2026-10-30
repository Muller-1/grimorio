import { RotateCw } from 'lucide-react';
import { Component, useState, type ErrorInfo, type ReactNode } from 'react';
import { reportLink } from '@/app/config';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { ArtLayer, ErrorScene, ErrorText, Eyebrow, SCREEN_BUTTON } from './scene';

/** A rachadura que parte o círculo (as duas metades se separam ao longo dela). */
const CRACK = '308,24 278,94 298,144 248,194 268,244 208,304 223,354 178,404';
/** Faíscas: o desenho, o retângulo dele, quando começa e o tom (a = claro, b = cor do tema). */
const SPARKS = [
  ['M320 70l3 7 7 3-7 3-3 7-3-7-7-3 7-3z', [310, 70, 20, 20], '.2s', 'a'],
  ['M230 168l2 5 5 2-5 2-2 5-2-5-5-2 5-2z', [223, 168, 14, 14], '.9s', 'b'],
  ['M286 262l3 7 7 3-7 3-3 7-3-7-7-3 7-3z', [276, 262, 20, 20], '1.4s', 'a'],
  ['M188 352l2 5 5 2-5 2-2 5-2-5-5-2 5-2z', [181, 352, 14, 14], '.5s', 'b'],
] as const;

/** Uma metade do círculo mágico (a outra é a mesma, deslocada e tremendo). */
function CircleHalf({ withGem }: { withGem?: boolean }) {
  return (
    <>
      <circle cx="220" cy="200" r="150" className="fill-(--sc-disc) opacity-60 dark:opacity-70" />
      <circle cx="220" cy="200" r="150" fill="none" stroke="url(#gr500-metal)" strokeWidth="2.5" />
      <circle
        cx="220"
        cy="200"
        r="141"
        fill="none"
        strokeWidth="9"
        strokeDasharray="2 7 7 4 1 9 4 5"
        className="gr-runes stroke-(--sc-line-2)"
      />
      <circle cx="220" cy="200" r="132" fill="none" strokeWidth="1.2" className="stroke-ornament" />
      <g fill="none" strokeWidth="1.6" strokeLinejoin="round" className="stroke-accent">
        <rect x="146" y="126" width="148" height="148" />
        <rect x="146" y="126" width="148" height="148" transform="rotate(45 220 200)" />
      </g>
      <circle
        cx="220"
        cy="200"
        r="56"
        fill="none"
        strokeWidth="1"
        strokeDasharray="1 4"
        className="stroke-(--sc-line)"
      />
      {withGem ? <Gem /> : null}
    </>
  );
}

function Gem() {
  return (
    <polygon
      points="220,162 246,200 220,238 194,200"
      fill="url(#gr500-metal)"
      strokeWidth="1.2"
      className="stroke-(--metal-4)"
    />
  );
}

/** A fumaça que sobe da rachadura: o caminho e o retângulo dele no desenho. */
const SMOKE = [
  ['M290 96c-10-12 8-20-2-34s8-20-2-32', [276, 26, 26, 74], '0s'],
  ['M262 196c-8-10 6-16-2-28s6-16-2-26', [250, 138, 22, 62], '1.2s'],
  ['M214 306c-8-10 6-16-2-28', [202, 274, 22, 36], '2.1s'],
] as const;

/** Tamanho do desenho (o `viewBox`): as peças animadas usam as mesmas coordenadas. */
const ART = [440, 400] as const;

function BrokenCircle() {
  return (
    <div className="relative w-full max-w-[460px]">
      <svg
        role="img"
        aria-label={t.screens.server.art}
        viewBox="0 0 440 400"
        className="block h-auto w-full"
      >
        <defs>
          <linearGradient id="gr500-metal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--metal-1)' }} />
            <stop offset="0.45" style={{ stopColor: 'var(--metal-2)' }} />
            <stop offset="0.6" style={{ stopColor: 'var(--metal-3)' }} />
            <stop offset="1" style={{ stopColor: 'var(--metal-4)' }} />
          </linearGradient>
          <clipPath id="gr500-a">
            <polygon points="0,0 300,0 300,20 270,90 290,140 240,190 260,240 200,300 215,350 170,400 0,400" />
          </clipPath>
          <clipPath id="gr500-b">
            <polygon points="300,0 440,0 440,400 170,400 215,350 200,300 260,240 240,190 290,140 270,90 300,20" />
          </clipPath>
          <mask id="gr500-gap" maskUnits="userSpaceOnUse" x="0" y="0" width="440" height="420">
            <rect x="0" y="0" width="440" height="420" fill="#fff" />
            <polyline
              points={CRACK}
              fill="none"
              stroke="#000"
              strokeWidth="24"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </mask>
          <filter id="gr500-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
        </defs>

        <ellipse
          cx="220"
          cy="372"
          rx="150"
          ry="14"
          className="fill-(--sc-ground)"
          style={{ opacity: 'var(--sc-ground-op)' }}
        />
        <g mask="url(#gr500-gap)">
          <g clipPath="url(#gr500-a)">
            <CircleHalf />
          </g>
        </g>
      </svg>

      {/* A metade que treme é uma camada: tremer só move a camada pronta. */}
      <ArtLayer art={ART} box={[0, 0, 440, 400]} className="gr-quake">
        <g mask="url(#gr500-gap)">
          <g transform="translate(16 8) rotate(4 300 200)" clipPath="url(#gr500-b)">
            <CircleHalf withGem />
          </g>
        </g>
      </ArtLayer>
      {/* O brilho da rachadura (desfocado uma vez só) pulsa pela opacidade da camada. */}
      <ArtLayer art={ART} box={[0, 0, 440, 400]} className="gr-crack-glow">
        <polyline
          points={CRACK}
          fill="none"
          strokeWidth="6"
          strokeLinejoin="round"
          filter="url(#gr500-blur)"
          className="stroke-(--sc-glow) dark:[stroke-width:7]"
        />
      </ArtLayer>
      <ArtLayer art={ART} box={[0, 0, 440, 400]}>
        <polyline
          points={CRACK}
          fill="none"
          strokeWidth="1.4"
          strokeLinejoin="round"
          className="stroke-(--sc-crack) opacity-70 dark:opacity-80"
        />
        <Gem />
      </ArtLayer>

      {SMOKE.map(([d, box, delay]) => (
        <ArtLayer
          key={d}
          art={ART}
          box={box}
          className="gr-smoke motion-safe:opacity-0"
          style={{ animationDelay: delay }}
        >
          <path d={d} fill="none" strokeWidth="2" strokeLinecap="round" className="stroke-muted" />
        </ArtLayer>
      ))}
      {SPARKS.map(([d, box, delay, tone]) => (
        <ArtLayer
          key={d}
          art={ART}
          box={box}
          className="gr-spark motion-safe:opacity-0"
          style={{ animationDelay: delay }}
        >
          <path d={d} className={tone === 'a' ? 'fill-(--sc-spark-a)' : 'fill-(--sc-spark-b)'} />
        </ArtLayer>
      ))}
    </div>
  );
}

/** Código curto e estável para o mesmo erro (ajuda a juntar os avisos de quem joga). */
export function errorCode(error: unknown): string {
  const text = error instanceof Error ? `${error.name}:${error.message}` : String(error);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `GR-${hash.toString(36).toUpperCase().padStart(7, '0').slice(0, 7)}`;
}

/** Algo quebrou ao montar a página (500): o círculo partido e "Tentar de novo". */
export function ServerErrorScreen({ code }: { code: string }) {
  const s = t.screens.server;
  const [retrying, setRetrying] = useState(false);
  const report = typeof window === 'undefined' ? '' : reportLink(window.location.pathname);

  return (
    <ErrorScene art={<BrokenCircle />}>
      <Eyebrow>{s.eyebrow}</Eyebrow>
      <ErrorText title={s.title} text={s.text} />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          className={cn(
            SCREEN_BUTTON,
            'disabled:border-accent-border disabled:bg-accent disabled:text-accent-contrast',
          )}
          disabled={retrying}
          aria-busy={retrying}
          onClick={() => {
            setRetrying(true);
            // Recarrega o site: se o erro veio de um arquivo novo publicado agora, ele chega.
            setTimeout(() => window.location.reload(), 600);
          }}
        >
          {retrying ? (
            <svg className="gr-spinner size-[18px]" viewBox="0 0 18 18" aria-hidden="true">
              <circle
                cx="9"
                cy="9"
                r="7"
                fill="none"
                strokeWidth="2"
                className="stroke-accent-contrast/30"
              />
              <path
                d="M9 2a7 7 0 0 1 7 7"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                className="stroke-seal-line dark:stroke-accent-contrast"
              />
            </svg>
          ) : (
            <RotateCw
              className="size-[18px] text-seal-line dark:text-accent-contrast"
              aria-hidden="true"
            />
          )}
          {retrying ? s.retrying : s.retry}
        </Button>
        <Button asChild variant="outline" className={cn(SCREEN_BUTTON, 'bg-transparent')}>
          <a href="/">{t.screens.home}</a>
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border pt-4">
        <p className="text-sm text-muted">
          {s.code}{' '}
          <code className="rounded bg-sunken px-1.5 py-0.5 font-mono text-sm text-text">
            {code}
          </code>
        </p>
        {report ? (
          <a
            href={report}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center text-sm font-medium text-accent underline underline-offset-4"
          >
            {s.report}
          </a>
        ) : null}
      </div>
    </ErrorScene>
  );
}

/**
 * Barreira do site inteiro: se uma página quebra (ou o arquivo dela não carrega depois de uma
 * publicação nova), mostra o 500 em vez de uma tela branca. Os painéis da ficha têm a sua
 * própria barreira (components/ui/panel.tsx): um problema num painel não derruba a página.
 */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { code: string | null }> {
  override state = { code: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    return { code: errorCode(error) };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[App]', error, info.componentStack);
  }

  override render() {
    return this.state.code ? <ServerErrorScreen code={this.state.code} /> : this.props.children;
  }
}
