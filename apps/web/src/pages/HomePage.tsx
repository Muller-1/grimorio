import { lazy, Suspense, useSyncExternalStore, type ReactNode } from 'react';
import { Link } from 'react-router';
import { siteConfig } from '@/app/config';
import { Button } from '@/components/ui/button';
import { D20Facets, D20Icon, Diamond } from '@/components/ui/d20-icon';
import { Ornament } from '@/components/ui/ornament';
import { StrokeIcon, type IconName } from '@/components/ui/stroke-icon';
import { ServerStatus } from '@/features/auth/ServerStatus';
import { SIGNED_IN_HINT_KEY, useAuthStore } from '@/features/auth/store';
import { InlineLoader } from '@/features/screens/LoadingScreen';
import { ArtLayer } from '@/features/screens/scene';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { safeStorage } from '@/ports/storage';

// A tela de quem tem conta só carrega para quem entrou: o visitante não baixa nada dela.
const Dashboard = lazy(() => import('@/features/home/Dashboard'));

/** Ícone de cada passo (classe, origem, atributos, toques finais). */
const STEP_ICONS: IconName[] = ['swords', 'map', 'd6', 'feather'];
/** Ícones de cada item, na ordem dos grupos de `t.home.features.groups` (+ a conta no fim). */
const GROUP_ICONS: IconName[][] = [
  ['wand', 'trend', 'sparkles'],
  ['d20', 'heartPulse', 'zap'],
  ['calculator', 'backpack', 'cloud'],
];

/** Runas do círculo da ilustração (as mesmas da tela de carregamento). */
const RUNES = [
  'M0 0V14M0 4 6 0',
  'M0 0V14M0 0 6 5 0 9',
  'M3 0V14M0 4 6 10',
  'M0 0 6 7 0 14M6 0V14',
  'M0 7H6M3 0V14',
  'M0 0V14M6 0V14M0 7 6 4',
];
const RING = Array.from({ length: 24 }, (_, k) => ({
  d: RUNES[(k * 5) % RUNES.length]!,
  transform: `rotate(${k * 15} 270 200) translate(267 25)`,
}));
/** Tamanho da ilustração (o `viewBox`): as peças animadas usam as mesmas coordenadas. */
const HERO = [540, 500] as const;
/** Brilhos: o desenho, o retângulo dele, o atraso (negativo: já começa piscando) e a cor. */
const GLINTS = [
  ['M150 120l3 9 9 3-9 3-3 9-3-9-9-3 9-3z', [138, 120, 24, 24], '0s', 'fill-ornament'],
  [
    'M396 96l2.4 7 7 2.4-7 2.4-2.4 7-2.4-7-7-2.4 7-2.4z',
    [386.6, 96, 18.8, 18.8],
    '-1.1s',
    'fill-ornament',
  ],
  [
    'M404 262l2.4 7 7 2.4-7 2.4-2.4 7-2.4-7-7-2.4 7-2.4z',
    [394.6, 262, 18.8, 18.8],
    '-2.1s',
    'fill-border-strong',
  ],
  ['M128 270l2 6 6 2-6 2-2 6-2-6-6-2 6-2z', [120, 270, 16, 16], '-0.6s', 'fill-border-strong'],
] as const;
const TEXT_LINES =
  'M96 352Q170 340 246 356M96 366Q170 354 246 370M96 380Q160 369 220 381M96 398Q170 386 246 402M96 412Q170 400 246 416M96 426Q150 416 200 424M296 412Q370 400 444 412M296 426Q360 416 420 424';

/**
 * A ilustração do topo: o círculo arcano girando devagar, o d20 flutuando e o grimório aberto.
 * Só desenho (o leitor de tela pula).
 */
function HeroArt() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto aspect-[540/500] w-full max-w-[340px] md:max-w-[540px]"
    >
      <svg className="gr-hero-layer" viewBox="0 0 540 500">
        <circle cx="270" cy="200" r="150" className="fill-surface" />
      </svg>
      <svg className="gr-hero-layer gr-spin-90" viewBox="0 0 540 500" fill="none">
        <circle cx="270" cy="200" r="196" strokeWidth="1.2" className="stroke-ornament" />
        <circle
          cx="270"
          cy="200"
          r="188"
          strokeWidth="5"
          strokeDasharray="1 8.84"
          className="stroke-border-strong opacity-55"
        />
        <circle
          cx="270"
          cy="200"
          r="188"
          strokeWidth="12"
          strokeDasharray="2 96.4"
          className="stroke-gold"
        />
        <circle cx="270" cy="200" r="180" strokeWidth="1" className="stroke-border" />
        <g
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-border-strong"
        >
          {RING.map((rune) => (
            <path key={rune.transform} d={rune.d} transform={rune.transform} />
          ))}
        </g>
        <circle cx="270" cy="200" r="148" strokeWidth="1" className="stroke-ornament" />
      </svg>
      <svg className="gr-hero-layer gr-spin-rev-60" viewBox="0 0 540 500" fill="none">
        <g strokeWidth="1.2" className="stroke-ornament">
          <rect x="180.5" y="110.5" width="179" height="179" />
          <rect x="180.5" y="110.5" width="179" height="179" transform="rotate(45 270 200)" />
        </g>
        <circle
          cx="270"
          cy="200"
          r="100"
          strokeWidth="1"
          strokeDasharray="1 5"
          className="stroke-border-strong"
        />
        <path
          d="M270 6l7 7-7 7-7-7zM464 193l7 7-7 7-7-7zM76 193l7 7-7 7-7-7z"
          className="fill-ornament"
        />
      </svg>
      {/* Sombra e brilhos são camadas próprias: piscar e encolher só mexem na camada. */}
      <ArtLayer
        art={HERO}
        box={[218, 326, 104, 16]}
        className="gr-float-shadow [--hi:0.16] [--lo:0.1] dark:[--hi:0.45] dark:[--lo:0.28]"
      >
        <ellipse cx="270" cy="334" rx="52" ry="8" className="fill-text dark:fill-black" />
      </ArtLayer>
      {GLINTS.map(([d, box, delay, tone]) => (
        <ArtLayer
          key={d}
          art={HERO}
          box={box}
          className="gr-glint"
          style={{ animationDelay: delay }}
        >
          <path d={d} className={tone} />
        </ArtLayer>
      ))}
      <ArtLayer
        art={HERO}
        box={[229, 289, 80, 28]}
        className="gr-glint"
        style={{ animationDelay: '-1.6s' }}
      >
        <g className="fill-ornament">
          <circle cx="232" cy="300" r="2.5" />
          <circle cx="306" cy="292" r="2" />
          <circle cx="282" cy="314" r="1.8" />
        </g>
      </ArtLayer>
      <div className="gr-hero-layer gr-float">
        <svg className="size-full" viewBox="0 0 540 500">
          <g transform="translate(196 118) scale(0.74)">
            <D20Facets value={20} edgeClassName="stroke-seal-line dark:stroke-ornament" />
          </g>
        </svg>
      </div>
      <svg className="gr-hero-layer" viewBox="0 0 540 500">
        <ellipse
          cx="270"
          cy="478"
          rx="214"
          ry="10"
          className="fill-text opacity-[0.08] dark:fill-black dark:opacity-40"
        />
        <path
          d="M270 352C226 334 130 330 52 344V456C130 444 226 448 270 466C314 448 410 444 488 456V344C410 330 314 334 270 352Z"
          strokeWidth="1.5"
          strokeLinejoin="round"
          className="fill-accent stroke-accent-hover dark:fill-[#163436] dark:stroke-[#3a5a5c]"
        />
        <g
          strokeWidth="1"
          className="fill-sunken stroke-border-strong dark:fill-[#16242a] dark:stroke-[#4a5a5e]"
        >
          <path d="M270 346C228 330 140 326 64 338V448C140 438 228 442 270 458Z" />
          <path d="M270 346C312 330 400 326 476 338V448C400 438 312 442 270 458Z" />
        </g>
        <g
          strokeWidth="1.2"
          strokeLinejoin="round"
          className="fill-field stroke-border-strong dark:fill-[#1c2c31]"
        >
          <path d="M270 340C230 322 146 318 72 330V442C146 430 230 434 270 452Z" />
          <path d="M270 340C310 322 394 318 468 330V442C394 430 310 434 270 452Z" />
        </g>
        <path d="M270 340V452" strokeWidth="1.5" className="stroke-ornament" />
        <path
          d={TEXT_LINES}
          fill="none"
          strokeWidth="2.4"
          strokeLinecap="round"
          className="stroke-border dark:stroke-[#3a4f54]"
        />
        <g
          fill="none"
          strokeWidth="1.3"
          strokeLinejoin="round"
          className="stroke-ornament dark:stroke-accent"
        >
          <circle cx="370" cy="372" r="26" />
          <polygon points="370,348 391,384 349,384" />
          <polygon points="370,396 349,360 391,360" />
        </g>
        <path
          d="M300 452V488L307 481 314 488V447"
          strokeWidth="1"
          strokeLinejoin="round"
          className="fill-ornament stroke-gold dark:stroke-border-strong"
        />
      </svg>
    </div>
  );
}

/** Cartão ilustrativo, com uma folha por baixo (como as páginas de um livro). */
function PreviewCard({
  label,
  aside,
  children,
}: {
  label: string;
  aside?: string;
  children: ReactNode;
}) {
  return (
    <div aria-hidden="true" className="relative pr-3 pb-3">
      <div className="absolute inset-[12px_0_0_12px] rounded-[14px] border border-border bg-surface-2" />
      <div className="relative overflow-hidden rounded-[14px] border border-rule bg-surface shadow-card">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-2 px-[18px] py-3">
          <span className="label-caps flex items-center gap-2 text-xs">
            <Diamond className="size-[9px] text-ornament" />
            {label}
          </span>
          {aside ? <span className="text-sm text-muted">{aside}</span> : null}
        </div>
        {children}
      </div>
    </div>
  );
}

/** Prévia do assistente: o primeiro passo, com o Ladino marcado. */
function WizardPreview() {
  const w = t.home.preview.wizard;
  return (
    <PreviewCard label={w.label} aside={w.step}>
      <div className="grid grid-cols-4 gap-1.5 px-[18px] pt-3.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn('h-[5px] rounded-[3px]', i === 0 ? 'bg-accent' : 'bg-border-soft')}
          />
        ))}
      </div>
      <div className="px-[18px] pt-4 pb-[18px]">
        <p className="font-display text-[1.375rem] font-bold">{w.title}</p>
        <p className="mt-1 text-sm leading-snug text-muted">{w.hint}</p>
        <div className="mt-3.5 flex flex-col gap-2">
          {w.classes.map((c) => {
            const on = c.name === w.selected;
            return (
              <div
                key={c.name}
                className={cn(
                  'flex items-center gap-3 rounded-[10px] px-3 py-2.5',
                  on
                    ? 'border-[1.5px] border-accent bg-accent-soft'
                    : 'border border-border-soft bg-field',
                )}
              >
                <span
                  className={cn(
                    'grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px]',
                    on ? 'border-accent' : 'border-border-strong',
                  )}
                >
                  {on ? <span className="size-2 rounded-full bg-accent" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{c.name}</span>
                  <span className="block text-sm text-muted">{c.text}</span>
                </span>
                {c.simple ? (
                  <span className="shrink-0 rounded-full border border-ornament bg-gold-soft px-2 py-0.5 text-xs font-bold text-gold">
                    <span className="max-md:hidden">{w.simple}</span>
                    <span className="md:hidden">{w.simpleShort}</span>
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex justify-between gap-2.5">
          <span className="inline-flex h-10 items-center rounded-lg border border-border px-3.5 text-sm font-bold text-muted">
            {w.back}
          </span>
          <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-accent-border bg-accent px-4 text-sm font-bold text-accent-contrast">
            {w.next}
            <StrokeIcon name="arrowRight" strokeWidth={2} className="size-4" />
          </span>
        </div>
      </div>
    </PreviewCard>
  );
}

function LevelBox({ value, next }: { value: number; next?: boolean }) {
  return (
    <span
      className={cn(
        'flex size-[54px] flex-col items-center justify-center rounded-xl',
        next
          ? 'border border-accent-border bg-accent text-accent-contrast'
          : 'border-[1.5px] border-ornament bg-bg',
      )}
    >
      <span
        className={cn(
          'text-[0.6875rem] font-bold tracking-[0.1em] uppercase',
          next ? 'text-seal-line dark:text-accent-contrast' : 'text-gold',
        )}
      >
        {t.home.preview.levelUp.level}
      </span>
      <span className="font-display text-[1.375rem] leading-none font-bold">{value}</span>
    </span>
  );
}

/** Prévia da subida de nível: o que se ganha e o que falta escolher. */
function LevelUpPreview() {
  const l = t.home.preview.levelUp;
  const gain = 'flex items-center justify-between gap-2.5 rounded-[10px] px-3 py-2.5';
  return (
    <PreviewCard label={l.label} aside={l.who}>
      <div className="p-[18px]">
        <div className="flex items-center gap-3.5">
          <LevelBox value={3} />
          <svg
            width="28"
            height="16"
            viewBox="0 0 28 16"
            fill="none"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 stroke-border-strong"
          >
            <path d="M2 8h22M18 2l6 6-6 6" />
          </svg>
          <LevelBox value={4} next />
          <span className="min-w-0 flex-1 text-sm leading-snug text-muted">{l.text}</span>
        </div>
        <ul className="mt-4 flex flex-col gap-2">
          <li className={cn(gain, 'border border-border-soft bg-field')}>
            <span className="flex items-center gap-2.5 font-bold">
              <StrokeIcon name="check" strokeWidth={2.2} className="size-[18px] text-success" />
              {l.hp}
            </span>
            <span className="font-display text-[1.0625rem] font-bold">{l.hpValue}</span>
          </li>
          <li className={cn(gain, 'border border-border-soft bg-field')}>
            <span className="flex items-center gap-2.5 font-bold">
              <StrokeIcon name="check" strokeWidth={2.2} className="size-[18px] text-success" />
              {l.hitDice}
            </span>
            <span className="text-[1.0625rem] font-bold">{l.hitDiceValue}</span>
          </li>
          <li className={cn(gain, 'border-[1.5px] border-ornament bg-gold-soft')}>
            <span className="flex items-center gap-2.5 font-bold">
              <svg viewBox="0 0 14 14" className="size-[18px] shrink-0">
                <path
                  d="M7 1 13 7 7 13 1 7Z"
                  fill="none"
                  strokeWidth="1.6"
                  className="stroke-border-strong"
                />
              </svg>
              {l.feat}
            </span>
            <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-contrast">
              {l.choose}
            </span>
          </li>
        </ul>
      </div>
    </PreviewCard>
  );
}

/** Prévia do rolador: vantagem, os dois d20 e o histórico. */
function DicePreview() {
  const d = t.home.preview.dice;
  return (
    <PreviewCard label={d.label} aside={d.history}>
      <div className="flex flex-col gap-3.5 p-[18px]">
        <div className="flex gap-2">
          <span className="flex h-11 flex-1 items-center rounded-lg border border-border-strong bg-field px-3 font-mono">
            {d.expression}
          </span>
          <span className="inline-flex h-11 items-center rounded-lg border border-accent-border bg-accent px-[18px] font-bold text-accent-contrast">
            {d.roll}
          </span>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-border-soft bg-field px-4 py-3.5">
          <svg viewBox="0 0 200 200" className="size-11 shrink-0">
            <g strokeWidth="6" strokeLinejoin="round" className="stroke-seal-line">
              <polygon points="100,8 180,54 180,146 100,192 20,146 20,54" className="fill-seal" />
              <polygon points="100,50 154,138 46,138" style={{ fill: 'var(--die-10)' }} />
            </g>
          </svg>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">{d.advantage}</p>
            <div className="mt-1.5 flex items-center gap-1.5 text-sm font-bold">
              <span className="inline-flex h-7 min-w-[30px] items-center justify-center rounded-md border-[1.5px] border-ornament bg-gold-soft">
                18
              </span>
              <span className="inline-flex h-7 min-w-[30px] items-center justify-center rounded-md border border-dashed border-border text-muted line-through">
                7
              </span>
              <span className="text-muted">+ 5</span>
            </div>
          </div>
          <span className="font-display text-[2.75rem] leading-none font-bold">23</span>
        </div>
        <ul className="flex flex-col text-sm">
          {d.rows.map(([expr, total], i) => (
            <li
              key={expr}
              className={cn(
                'flex justify-between gap-2.5 px-1 py-2',
                i < d.rows.length - 1 && 'border-b border-border-soft',
              )}
            >
              <span className="font-mono text-muted">{expr}</span>
              <strong>{total}</strong>
            </li>
          ))}
        </ul>
      </div>
    </PreviewCard>
  );
}

/** Prévia do "de onde vem este número" da ficha. */
function ExplainPreview() {
  const e = t.home.preview.explain;
  return (
    <PreviewCard label={e.label}>
      <div className="flex flex-col gap-3.5 p-[18px]">
        <div className="flex items-center gap-3.5">
          <span className="flex-1 font-display text-2xl font-bold">{e.skill}</span>
          <span className="inline-flex h-[46px] min-w-[58px] items-center justify-center rounded-[10px] border-[1.5px] border-ornament bg-bg font-display text-2xl font-bold">
            +5
          </span>
        </div>
        <dl className="flex flex-col">
          {e.rows.map(([label, value]) => (
            <div key={label} className="flex justify-between border-b border-border-soft px-1 py-2">
              <dt className="text-muted">{label}</dt>
              <dd className="font-bold">{value}</dd>
            </div>
          ))}
          <div className="flex justify-between px-1 py-2">
            <dt className="font-bold">{e.total}</dt>
            <dd className="font-bold">+5</dd>
          </div>
        </dl>
        <div className="flex items-center gap-2.5 rounded-[10px] bg-surface-2 px-3 py-2.5 text-sm">
          <StrokeIcon name="zap" className="size-5 shrink-0 text-border-strong" />
          <span className="flex-1">
            {e.tipBefore} <strong>+6</strong> {e.tipAfter}
          </span>
        </div>
      </div>
    </PreviewCard>
  );
}

const PREVIEWS = [LevelUpPreview, DicePreview, ExplainPreview];

const WRAP = 'mx-auto w-full max-w-[1200px] px-4 md:px-8';
const TWO = 'grid items-center gap-7 md:grid-cols-2 md:gap-16';

const noSubscribe = () => () => {};

/**
 * Página inicial: a tela de quem tem conta (painel) ou a do visitante. Quem entrou da última
 * vez neste aparelho já vê o painel carregando enquanto o servidor responde, em vez da página
 * de visitante piscar na tela.
 */
export default function HomePage() {
  const status = useAuthStore((s) => s.status);
  const remembered = useSyncExternalStore(
    noSubscribe,
    () => safeStorage.get(SIGNED_IN_HINT_KEY) === '1',
    () => false,
  );
  const opening = (
    <div className="min-h-[70dvh] px-4">
      <InlineLoader label={t.dashboard.opening} />
      <ServerStatus className="mx-auto max-w-md" />
    </div>
  );
  if (status === 'signed-in')
    return (
      <Suspense fallback={opening}>
        <Dashboard />
      </Suspense>
    );
  if (remembered && status === 'loading') return opening;
  return <Landing />;
}

/**
 * Página inicial do visitante (docs/design.md): o convite com a ilustração, os 4 passos com a
 * prévia do assistente, o que já dá para fazer (com cartões ilustrativos) e o apoio. As seções
 * são separadas pelo filete com losangos; nada de faixas coloridas nem caixas iguais repetidas.
 */
function Landing() {
  const h = t.home;
  // Com contas, a lista "Na ficha" ganha um item sobre onde a ficha fica salva.
  const groups = h.features.groups.map((g, gi) =>
    siteConfig.accountsEnabled && gi === h.features.groups.length - 1
      ? { ...g, items: [...g.items, h.features.accounts] }
      : g,
  );
  return (
    <div className="pb-2">
      <section aria-labelledby="home-title" className={WRAP}>
        <div className="grid items-center gap-7 pt-7 pb-2 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:gap-10 md:pt-12 md:pb-8">
          <div>
            <h1
              id="home-title"
              className="font-display text-[2.125rem] leading-[1.15] font-bold tracking-[-0.005em] text-balance md:text-[3.125rem] md:leading-[1.12]"
            >
              {h.title}
            </h1>
            <p className="mt-4 max-w-[560px] text-lg leading-[1.55] text-pretty text-muted md:mt-5 md:text-xl">
              {h.lead}
            </p>
            <div className="mt-6 flex flex-col gap-3 md:mt-8 md:flex-row md:flex-wrap">
              <Button asChild variant="primary" className="h-[52px] rounded-[10px] px-6 text-lg">
                <Link to="/criar" data-testid="home.create">
                  {h.ctaCreate}
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-[52px] rounded-[10px] px-6 text-lg">
                <Link to="/dados">
                  <D20Icon strokeWidth={13} className="size-5 text-accent" />
                  {h.ctaDice}
                </Link>
              </Button>
            </div>
            <ul className="mt-[22px] flex flex-col gap-2.5">
              <li>
                <Link
                  to="/comecar"
                  className="inline-flex min-h-7 items-center gap-2 font-bold text-accent hover:text-accent-hover"
                  data-testid="home.start"
                >
                  <StrokeIcon name="book" className="size-[18px]" />
                  {h.startLink}
                </Link>
              </li>
              <li>
                <Link
                  to="/ficha"
                  className="inline-flex min-h-7 items-center text-muted underline underline-offset-4 hover:text-text"
                  data-testid="home.blank"
                >
                  {h.blankLink}
                </Link>
              </li>
            </ul>
            <div className="mt-[26px] max-w-[560px] border-t border-border pt-[18px]">
              <p className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-sm font-bold">
                {h.badges.map((b) => (
                  <span key={b} className="inline-flex items-center gap-1.5">
                    <Diamond className="size-[9px] text-ornament" />
                    {b}
                  </span>
                ))}
              </p>
              <p className="mt-2 text-sm leading-normal text-muted">
                {siteConfig.accountsEnabled ? h.accountsNote : h.localNote}
              </p>
            </div>
          </div>
          <HeroArt />
        </div>
      </section>

      <div className={WRAP}>
        <Ornament />
      </div>

      <section aria-labelledby="home-how" className={cn(WRAP, 'py-10 md:py-16')}>
        <div className={TWO}>
          <div>
            <h2
              id="home-how"
              className="font-display text-[1.625rem] leading-[1.2] font-bold text-balance md:text-[2rem]"
            >
              {h.how.title}
            </h2>
            <p className="mt-3.5 text-[1.0625rem] leading-relaxed text-pretty text-muted">
              {h.how.lead}
            </p>
            {/* Os 4 passos são uma sequência de verdade: uma trilha com selos numerados. */}
            <ol className="mt-7 flex flex-col">
              {h.how.steps.map((step, i) => (
                <li key={step.title} className="grid grid-cols-[52px_minmax(0,1fr)] gap-4">
                  <div className="flex flex-col items-center">
                    <span className="relative grid size-[52px] shrink-0 place-items-center rounded-full border-[1.5px] border-ornament bg-field">
                      <StrokeIcon name={STEP_ICONS[i]!} className="size-6 text-accent" />
                      <span className="absolute -top-1.5 -right-1.5 grid h-[22px] min-w-[22px] place-items-center rounded-full bg-accent px-1 font-display text-xs font-bold text-accent-contrast">
                        {i + 1}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'my-1 min-h-3.5 w-0 flex-1 border-l-[1.5px] border-dashed',
                        i < h.how.steps.length - 1
                          ? 'border-[#c9b48a] dark:border-[#4a5a5e]'
                          : 'border-transparent',
                      )}
                    />
                  </div>
                  <div className="pt-1 pb-[22px]">
                    <h3 className="font-display text-[1.1875rem] font-bold">{step.title}</h3>
                    <p className="mt-1 leading-normal text-muted">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Button
                asChild
                variant="primary"
                className="h-12 rounded-[10px] px-[22px] text-[1.0625rem]"
              >
                <Link to="/criar">{h.how.cta}</Link>
              </Button>
              <Link
                to="/comecar"
                className="inline-flex min-h-11 items-center font-bold text-accent underline underline-offset-4 hover:text-accent-hover"
              >
                {h.how.basics}
              </Link>
            </div>
          </div>
          <WizardPreview />
        </div>
      </section>

      <div className={WRAP}>
        <Ornament />
      </div>

      <section
        aria-labelledby="home-features"
        className={cn(WRAP, 'flex flex-col gap-[72px] py-10 md:py-16')}
      >
        <h2
          id="home-features"
          className="-mb-8 font-display text-[1.625rem] leading-[1.2] font-bold md:text-[2rem]"
        >
          {h.features.title}
        </h2>
        {groups.map((group, gi) => {
          const Preview = PREVIEWS[gi]!;
          return (
            <div key={group.title} className={TWO}>
              <section
                aria-labelledby={`home-group-${gi}`}
                className={cn(gi === 1 && 'md:order-2')}
              >
                <h3
                  id={`home-group-${gi}`}
                  className="flex items-center gap-2.5 font-display text-[1.375rem] font-bold text-accent md:text-[1.5625rem]"
                >
                  <Diamond className="size-[11px] text-ornament" />
                  {group.title}
                </h3>
                <ul className="mt-5 flex flex-col gap-[18px]">
                  {group.items.map((item, ii) => (
                    <li
                      key={item.title}
                      className="grid grid-cols-[44px_minmax(0,1fr)] items-start gap-3.5"
                    >
                      <span className="grid size-11 place-items-center rounded-[10px] border border-border-soft bg-surface-2">
                        <StrokeIcon
                          name={GROUP_ICONS[gi]?.[ii] ?? 'calculator'}
                          className="size-[22px] text-border-strong"
                        />
                      </span>
                      <div>
                        <h4 className="text-lg font-bold">{item.title}</h4>
                        <p className="mt-0.5 leading-normal text-muted">{item.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
              <Preview />
            </div>
          );
        })}
      </section>

      <div className={WRAP}>
        <Ornament />
      </div>

      <div className={cn(WRAP, 'pt-10 pb-10 md:pt-14 md:pb-[72px]')}>
        <div className="grid items-stretch gap-7 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-10">
          <section aria-labelledby="home-next" className="flex flex-col">
            <h2 id="home-next" className="font-display text-[1.625rem] font-bold md:text-[1.75rem]">
              {h.next.title}
            </h2>
            <ul className="mt-[18px] flex flex-col border-t border-border">
              {h.next.items.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 border-b border-border px-1 py-3 text-[1.0625rem]"
                >
                  <D20Icon className="size-[18px] shrink-0 text-ornament" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
          <aside
            aria-labelledby="home-support"
            className="flex flex-col overflow-hidden rounded-[14px] border border-rule bg-surface shadow-[inset_0_3px_0_var(--ornament)]"
          >
            <div className="flex flex-1 flex-col gap-3 p-[26px] pb-6">
              <span className="grid size-12 place-items-center rounded-full border-[1.5px] border-ornament bg-gold-soft">
                <StrokeIcon name="heart" className="size-6 text-accent" />
              </span>
              <h2 id="home-support" className="font-display text-2xl font-bold">
                {h.supportTitle}
              </h2>
              <p className="text-[1.0625rem] leading-[1.55]">{h.supportText}</p>
              <Button
                asChild
                variant="primary"
                className="mt-auto h-[46px] self-start rounded-[10px] px-[22px] text-[1.0625rem]"
              >
                <Link to="/apoie">{h.supportCta}</Link>
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
