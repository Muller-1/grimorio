import { useId, type CSSProperties, type ReactNode } from 'react';
import { BrandMark, Diamond } from '@/components/ui/d20-icon';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Cenas de tela inteira (carregamento e erros, docs/design.md): papel com fibras no
 * Pergaminho; petróleo com estrelas e grão prateado no Obsidiana. As cores das ilustrações
 * vêm das variáveis `--sc-*` da classe `gr-scene` (styles/motion.css).
 */
export const SCENE =
  'gr-scene relative isolate flex min-h-dvh flex-col overflow-hidden bg-bg bg-(image:--sc-backdrop) text-text';

/**
 * Uma peça animada da ilustração numa camada só dela, por cima do desenho e nas mesmas
 * coordenadas (`box` é o retângulo da peça no `viewBox` da ilustração, de tamanho `art`). A
 * animação vai na camada: o navegador só move a camada pronta, sem redesenhar o resto (nem os
 * filtros de sombra e brilho, que são caros). A camada é um <div> com o <svg> dentro: o Chrome
 * recalcula a página a cada quadro quando o que se desloca é o próprio <svg>.
 */
export function ArtLayer({
  art,
  box,
  className,
  style,
  children,
}: {
  art: readonly [width: number, height: number];
  box: readonly [x: number, y: number, width: number, height: number];
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const [x, y, w, h] = box;
  const [aw, ah] = art;
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute', className)}
      style={{
        left: `${(x / aw) * 100}%`,
        top: `${(y / ah) * 100}%`,
        width: `${(w / aw) * 100}%`,
        height: `${(h / ah) * 100}%`,
        ...style,
      }}
    >
      <svg viewBox={`${x} ${y} ${w} ${h}`} className="block size-full overflow-visible">
        {children}
      </svg>
    </div>
  );
}

/**
 * O fundo da cena. As fibras do papel e o grão prateado são filtros de ruído, caros de
 * desenhar: cada um fica na própria camada (`will-change-transform`), desenhado uma vez só, e as
 * animações por cima não obrigam o navegador a refazê-los.
 */
export function SceneBackdrop({ vignette }: { vignette: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full will-change-transform dark:hidden"
      >
        <filter id={`paper${id}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves={3}
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.42  0 0 0 0 0.30  0 0 0 0 0.22  0.2 0 0 0 -0.05"
          />
        </filter>
        <rect width="100%" height="100%" filter={`url(#paper${id})`} />
      </svg>
      <div
        aria-hidden="true"
        className={cn('pointer-events-none absolute inset-0 dark:hidden', vignette)}
      />
      <svg
        aria-hidden="true"
        className="gr-twinkle pointer-events-none absolute inset-0 hidden size-full dark:block"
      >
        <defs>
          <pattern id={`stars${id}`} width="180" height="180" patternUnits="userSpaceOnUse">
            <g className="fill-ornament">
              <circle cx="18" cy="26" r="1" />
              <circle cx="96" cy="14" r="0.7" />
              <circle cx="60" cy="110" r="0.8" />
              <circle cx="128" cy="150" r="1" />
            </g>
            <g className="fill-text">
              <circle cx="150" cy="70" r="1.2" />
              <circle cx="30" cy="164" r="0.6" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#stars${id})`} opacity="0.5" />
      </svg>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden size-full will-change-transform dark:block"
      >
        <filter id={`grain${id}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves={2}
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.78  0 0 0 0 0.80  0 0 0 0 0.83  0.12 0 0 0 -0.03"
          />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain${id})`} />
      </svg>
    </>
  );
}

/** Rótulo acima do título ("Erro 404 · falha crítica"), com o losango. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="label-caps flex items-center gap-2.5 text-xs tracking-[0.16em]">
      <Diamond className="size-2.5 text-ornament" />
      {children}
    </p>
  );
}

const navLink =
  'inline-flex min-h-11 items-center rounded-md px-3.5 font-medium text-text hover:bg-surface-2';

/**
 * Cabeçalho simples das telas de erro: a marca e três atalhos. Links comuns (<a>), que
 * recarregam o site inteiro: depois de um erro, é o jeito mais seguro de voltar.
 */
function ScreenHeader({ current }: { current?: 'campaigns' | undefined }) {
  const n = t.screens.nav;
  const links = [
    { key: 'sheets', href: '/personagens', label: n.sheets },
    { key: 'campaigns', href: '/campanhas', label: n.campaigns },
    { key: 'dice', href: '/dados', label: n.dice },
  ] as const;
  return (
    <>
      <header className="relative flex flex-wrap items-center justify-between gap-4 px-[clamp(16px,4vw,48px)] py-4">
        <a
          href="/"
          aria-label={t.nav.homeLabel}
          className="inline-flex min-h-11 items-center gap-2.5 text-text"
        >
          <BrandMark className="size-[30px]" />
          <span className="font-display text-xl font-bold tracking-[0.12em] uppercase">
            {t.brand.name}
          </span>
        </a>
        <nav aria-label={t.nav.mainLabel} className="flex flex-wrap gap-1">
          {links.map((l) =>
            current === l.key ? (
              <a
                key={l.key}
                href={l.href}
                aria-current="page"
                className={cn(
                  navLink,
                  'font-bold text-accent shadow-[inset_0_-2px_0_var(--ornament)]',
                )}
              >
                {l.label}
              </a>
            ) : (
              <a key={l.key} href={l.href} className={navLink}>
                {l.label}
              </a>
            ),
          )}
        </nav>
      </header>
      <div
        aria-hidden="true"
        className="relative mx-[clamp(16px,4vw,48px)] h-px bg-[linear-gradient(90deg,transparent,var(--sc-rule)_15%,var(--sc-rule)_85%,transparent)]"
      />
    </>
  );
}

const ERROR_VIGNETTE =
  'bg-[radial-gradient(ellipse_80%_75%_at_50%_50%,rgb(251_248_242/0.7)_0%,rgb(251_248_242/0)_60%,rgb(122_46_30/0.1)_100%)]';

/** Moldura das telas de erro: cena, cabeçalho, ilustração à esquerda e texto à direita. */
export function ErrorScene({
  art,
  current,
  overlay = false,
  children,
}: {
  art: ReactNode;
  current?: 'campaigns';
  /** Dentro de uma página do site: cobre a barra superior (a tela tem o seu cabeçalho). */
  overlay?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn(SCENE, overlay && 'fixed inset-0 z-40 overflow-auto')}>
      <SceneBackdrop vignette={ERROR_VIGNETTE} />
      <ScreenHeader current={current} />
      <main
        id="conteudo"
        className="relative flex flex-1 items-center justify-center px-[clamp(16px,4vw,48px)] pt-10 pb-14"
      >
        <div className="flex w-full max-w-[1100px] flex-wrap items-center gap-x-16 gap-y-12">
          <figure className="m-0 flex min-w-0 flex-[1_1_360px] justify-center">{art}</figure>
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5">{children}</div>
        </div>
      </main>
    </div>
  );
}

/** Título e texto das telas de erro. */
export function ErrorText({ title, text }: { title: string; text: string }) {
  return (
    <>
      <h1 className="font-display text-[clamp(2.1rem,4.2vw,3.3rem)] leading-[1.1] font-bold text-balance">
        {title}
      </h1>
      <p className="max-w-[34em] text-[1.1875rem] leading-relaxed text-pretty text-muted">{text}</p>
    </>
  );
}

/** Botões das telas de erro (um pouco mais altos, cantos de 6 px como no guia). */
export const SCREEN_BUTTON = 'min-h-12 rounded-md px-6 text-[1.0625rem]';
