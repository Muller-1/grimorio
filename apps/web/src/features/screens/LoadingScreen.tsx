/**
 * Tela de carregamento animada, de tela inteira: o d20 lançado sobre o círculo arcano, com uma
 * frase e uma dica de jogo (docs/design.md).
 *
 * GUARDADA: hoje nenhuma página usa (as páginas sob demanda mostram o `PageLoader`, de
 * ./InlineLoader). Fica para uma parte mais pesada do site, que demore de verdade para abrir.
 * Por estar sem uso, ela não entra no site publicado, nem o CSS dela (./loading-screen.css).
 *
 * Para voltar a usar: importe `LoadingScreen` onde precisar e tire a linha
 * `@source not "../features/screens/LoadingScreen.tsx"` de styles/index.css (ela impede o
 * Tailwind de gerar as classes deste arquivo enquanto ele não é usado).
 */
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import { D20Facets, Diamond } from '@/components/ui/d20-icon';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Corridor, useTip } from './InlineLoader';
import './loading-screen.css';
import { ArtLayer, SCENE, SceneBackdrop } from './scene';

/** Uma frase e uma face do d20 a cada lançamento (o mesmo ritmo da animação). */
const CYCLE_MS = 2400;
const FACES = [20, 13, 7, 17, 4, 11];

/** Seis runas inventadas, repetidas em volta do círculo (24 posições, 15° entre elas). */
const RUNES = [
  'M0 0V14M0 4 6 0',
  'M0 0V14M0 0 6 5 0 9',
  'M3 0V14M0 4 6 10',
  'M0 0 6 7 0 14M6 0V14',
  'M0 7H6M3 0V14',
  'M0 0V14M6 0V14M0 7 6 4',
];
/** Tamanho do círculo (o `viewBox`): as peças animadas usam as mesmas coordenadas. */
const CIRCLE = [340, 340] as const;
/**
 * Cada runa é uma camada pequena, no topo do círculo (x 167, y 38, 6 × 14) e girada em volta
 * do centro (170, 170): o eixo fica 50% para o lado e 132/14 da altura para baixo. O atraso
 * negativo faz cada uma já começar no meio do cintilar, sem saltar.
 */
const RING = Array.from({ length: 24 }, (_, k) => ({
  d: RUNES[(k * 5) % RUNES.length]!,
  style: {
    rotate: `${k * 15}deg`,
    transformOrigin: `50% ${(132 / 14) * 100}%`,
    animationDelay: `${-((k * 7) % 24) * 0.1}s`,
  } satisfies CSSProperties,
}));
/** Os quatro nós do anel: desenho e retângulo de cada um. */
const NODES = [
  ['M170 21l6 6-6 6-6-6z', [164, 21, 12, 12]],
  ['M313 164l6 6-6 6-6-6z', [307, 164, 12, 12]],
  ['M170 307l6 6-6 6-6-6z', [164, 307, 12, 12]],
  ['M27 164l6 6-6 6-6-6z', [21, 164, 12, 12]],
] as const;

/**
 * A face do d20 e a frase trocam no meio de cada lançamento, com o dado girando: ele cai já
 * mostrando o novo número. Segue o próprio ciclo da animação (`animationiteration`), então não
 * sai do compasso. Com "reduzir movimento" não há lançamento: troca num relógio comum.
 */
function useThrowSteps(
  dieRef: RefObject<HTMLElement | null>,
  setStep: Dispatch<SetStateAction<number>>,
) {
  useEffect(() => {
    const next = () => setStep((s) => s + 1);
    const die = dieRef.current;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (!die || still) {
      const timer = setInterval(next, CYCLE_MS);
      return () => clearInterval(timer);
    }
    let midAir: ReturnType<typeof setTimeout> | undefined;
    const onIteration = (event: AnimationEvent) => {
      if (event.target !== die) return;
      clearTimeout(midAir);
      midAir = setTimeout(next, CYCLE_MS * 0.3);
    };
    die.addEventListener('animationiteration', onIteration);
    return () => {
      die.removeEventListener('animationiteration', onIteration);
      clearTimeout(midAir);
    };
  }, [dieRef, setStep]);
}

/** O círculo arcano girando em camadas, com o d20 sendo lançado no meio. */
function ArcaneCircle({
  face,
  dieRef,
}: {
  face: number;
  dieRef: RefObject<HTMLDivElement | null>;
}) {
  const glow = `gr-load-glow${useId().replace(/:/g, '')}`;
  return (
    <div
      aria-hidden="true"
      className="relative flex size-[340px] max-w-full items-center justify-center"
    >
      <div className="absolute inset-10 hidden rounded-full bg-[radial-gradient(closest-side,rgb(92_194_174/0.18),rgb(92_194_174/0))] dark:block" />

      {/* Brilho dos anéis no escuro: parado e desenhado uma vez; os anéis giram por cima. */}
      <svg
        className="gr-layer hidden will-change-transform dark:block"
        viewBox="0 0 340 340"
        fill="none"
      >
        <filter id={glow} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <g filter={`url(#${glow})`} className="stroke-accent">
          <circle cx="170" cy="170" r="143" strokeWidth="3" opacity="0.55" />
          <circle cx="170" cy="170" r="130" strokeWidth="14" opacity="0.18" />
          <circle cx="170" cy="170" r="114" strokeWidth="2" opacity="0.4" />
        </g>
      </svg>

      <svg className="gr-layer gr-spin-60" viewBox="0 0 340 340" fill="none">
        <circle
          cx="170"
          cy="170"
          r="164"
          strokeWidth="1"
          className="stroke-ornament dark:opacity-80"
        />
        <circle
          cx="170"
          cy="170"
          r="157"
          strokeWidth="5"
          strokeDasharray="1 7.226"
          className="stroke-border-strong opacity-60 dark:opacity-70"
        />
        <circle
          cx="170"
          cy="170"
          r="157"
          strokeWidth="11"
          strokeDasharray="2 80.2"
          className="stroke-gold dark:stroke-text"
        />
        <circle cx="170" cy="170" r="150" strokeWidth="1" className="stroke-border" />
      </svg>

      <svg className="gr-layer gr-spin-rev-16" viewBox="0 0 340 340">
        <circle
          cx="170"
          cy="170"
          r="143"
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="150 80 40 60 220 348.5"
          className="stroke-border-strong dark:stroke-accent"
        />
      </svg>
      {/* Os nós giram com o anel e cintilam cada um no seu tempo: camadas pequenas. */}
      <div className="gr-layer gr-spin-rev-16">
        {NODES.map(([d, box], i) => (
          <ArtLayer
            key={d}
            art={CIRCLE}
            box={box}
            className="gr-flicker [--lo:0.45] dark:[--lo:0.4]"
            style={{ animationDelay: `${-i * 0.6}s` }}
          >
            <path d={d} className="fill-ornament dark:fill-text" />
          </ArtLayer>
        ))}
      </div>

      {/* O traço que corre muda o desenho a cada quadro: camada própria, sem refazer o resto. */}
      <svg className="gr-layer will-change-transform" viewBox="0 0 340 340">
        <circle
          className="gr-trace stroke-ornament"
          cx="170"
          cy="170"
          r="135"
          fill="none"
          strokeWidth="1.6"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="0.32 0.68"
          transform="rotate(-90 170 170)"
        />
      </svg>

      <div className="gr-layer gr-spin-28">
        {RING.map((rune) => (
          <ArtLayer
            key={rune.style.rotate}
            art={CIRCLE}
            box={[167, 38, 6, 14]}
            className="gr-flicker dark:[--lo:0.25]"
            style={rune.style}
          >
            <path
              d={rune.d}
              transform="translate(167 38)"
              fill="none"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="stroke-gold dark:stroke-accent"
            />
          </ArtLayer>
        ))}
      </div>
      <svg className="gr-layer gr-spin-28" viewBox="0 0 340 340" fill="none">
        <circle
          cx="170"
          cy="170"
          r="114"
          strokeWidth="1"
          className="stroke-ornament dark:stroke-border-strong"
        />
        <circle
          cx="170"
          cy="170"
          r="110"
          strokeWidth="1"
          strokeDasharray="2 5"
          className="stroke-border dark:stroke-[#3a5256]"
        />
      </svg>

      <div className="gr-layer gr-sweep gr-sweep-ring" />

      <svg className="gr-layer gr-spin-rev-40" viewBox="0 0 340 340" fill="none">
        <g strokeWidth="1.2" className="stroke-ornament dark:opacity-80">
          <rect x="99.3" y="99.3" width="141.4" height="141.4" />
          <rect x="99.3" y="99.3" width="141.4" height="141.4" transform="rotate(45 170 170)" />
        </g>
        <circle
          cx="170"
          cy="170"
          r="74"
          strokeWidth="1"
          strokeDasharray="1 4"
          className="stroke-border-strong dark:stroke-accent dark:opacity-80"
        />
      </svg>

      <svg className="gr-layer gr-spin-orbit" viewBox="0 0 340 340">
        <circle cx="170" cy="56" r="4" className="fill-ornament dark:fill-text" />
        <circle
          cx="170"
          cy="56"
          r="8"
          fill="none"
          strokeWidth="1.2"
          className="stroke-ornament opacity-50 dark:stroke-accent dark:opacity-70"
        />
      </svg>

      <svg className="gr-layer gr-ripple" viewBox="0 0 340 340">
        <circle
          cx="170"
          cy="170"
          r="160"
          fill="none"
          strokeWidth="2"
          className="stroke-ornament dark:stroke-accent"
        />
      </svg>

      <div className="relative mt-[18px] flex flex-col items-center">
        {/* O brilho é um degradê redondo dentro da camada que gira: gira junto sem mudar de cara. */}
        <div ref={dieRef} className="gr-throw relative size-[132px]">
          <span className="absolute -inset-5 hidden rounded-full bg-[radial-gradient(closest-side,rgb(92_194_174/0.3),rgb(92_194_174/0))] dark:block" />
          <svg className="relative size-full" viewBox="0 0 200 200">
            <D20Facets value={face} />
          </svg>
        </div>
        <div className="gr-throw-shadow mt-1.5 h-3.5 w-[100px] rounded-[50%] bg-[radial-gradient(closest-side,rgb(74_40_24/0.5),rgb(74_40_24/0))] [--hi:0.55] [--lo:0.25] dark:bg-[radial-gradient(closest-side,rgb(92_194_174/0.45),rgb(92_194_174/0))] dark:[--hi:0.7] dark:[--lo:0.3]" />
      </div>
    </div>
  );
}

const LOADING_VIGNETTE =
  'bg-[radial-gradient(ellipse_75%_70%_at_50%_45%,rgb(251_248_242/0.85)_0%,rgb(251_248_242/0)_60%,rgb(122_46_30/0.1)_100%)]';

/**
 * Tela de carregamento de tela inteira (guardada, ver o começo do arquivo). Cobre a tela toda,
 * mas só aparece depois de ~0,35 s: o que carrega rápido não pisca.
 */
export function LoadingScreen() {
  const [step, setStep] = useState(0);
  const dieRef = useRef<HTMLDivElement>(null);
  const tip = useTip();
  const l = t.screens.loading;
  useThrowSteps(dieRef, setStep);

  return (
    <div
      className={cn(SCENE, 'gr-appear fixed inset-0 z-[60] items-center px-4 pt-8 pb-10')}
      data-testid="loading.screen"
    >
      <SceneBackdrop vignette={LOADING_VIGNETTE} />
      <p className="relative flex items-center gap-3.5" aria-hidden="true">
        <Diamond className="size-3 text-ornament" />
        <span className="font-display text-xl font-bold tracking-[0.18em] uppercase">
          {t.brand.name}
        </span>
        <Diamond className="size-3 text-ornament" />
      </p>

      <div
        aria-busy="true"
        className="relative flex w-full flex-1 flex-col items-center justify-center gap-6 py-6"
      >
        <h1 className="sr-only">{l.title}</h1>
        <ArcaneCircle face={FACES[step % FACES.length]!} dieRef={dieRef} />
        <div role="status" className="flex min-h-[34px] items-center justify-center px-4">
          <span className="sr-only">{l.status}</span>
          <p
            key={step}
            aria-hidden="true"
            className="gr-rise text-center font-display text-[1.375rem] font-semibold tracking-[0.02em]"
          >
            {l.phrases[step % l.phrases.length]}
          </p>
        </div>
        <Corridor className="w-60 max-w-[70%]" />
      </div>

      <footer className="relative flex max-w-[560px] flex-col items-center gap-1.5 text-center">
        <span className="label-caps text-xs tracking-[0.16em]">{t.screens.tipLabel}</span>
        <p className="text-base leading-normal text-pretty text-muted">{tip}</p>
      </footer>
    </div>
  );
}
