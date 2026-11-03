import { X } from 'lucide-react';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { flushSync } from 'react-dom';
import { Button } from '@/components/ui/button';
import { D20Icon } from '@/components/ui/d20-icon';
import { DiceExpressionInput } from '@/features/dice/components/DiceExpressionInput';
import { useDiceStore } from '@/features/dice/store';
import { resultTray, rollDuration } from '@/features/dice/tray';
import { useTrayArea } from '@/features/dice/tray-area';
import { ts } from '@/lib/i18n/sheet';
import { cn } from '@/lib/utils';
import { safeStorage } from '@/ports/storage';
import {
  atFromY,
  ceilingLine,
  DRAG_THRESHOLD,
  EDGE,
  floorLine,
  layoutFloating,
  panelRoom,
  rubberBand,
  sideAfterDrop,
  trayHeight,
  velocity,
  type FloatingInput,
  type Side,
} from '../floating-dice';
import { DiceTray } from './DiceTray';

/** Onde o jogador deixou o botão (lado e altura), neste navegador. */
const POSITION_KEY = 'grimorio.ficha.dados-flutuante';
/** Tamanho do botão (px). */
const SIZE = 56;
/** Cabeçalho do site (top-16) e, no celular, a barra de abas da ficha que gruda embaixo dele. */
const HEADER = 64;
const MOBILE_TABS = 50;
const WIDE_QUERY = '(min-width: 768px)';

interface Position {
  side: Side;
  at: number;
}

function loadPosition(): Position {
  try {
    const raw = safeStorage.get(POSITION_KEY);
    if (raw) {
      const value = JSON.parse(raw) as Partial<Position>;
      if (
        (value.side === 'left' || value.side === 'right') &&
        typeof value.at === 'number' &&
        value.at >= 0 &&
        value.at <= 1
      ) {
        return { side: value.side, at: value.at };
      }
    }
  } catch {
    // posição ilegível: volta ao padrão
  }
  return { side: 'right', at: 1 };
}

interface Screen {
  width: number;
  height: number;
  wide: boolean;
  visibleTop: number;
  visibleBottom: number;
}

function readScreen(): Screen {
  const vv = window.visualViewport;
  // Com zoom de pinça a parte visível muda o tempo todo: aí vale a janela inteira.
  const useVisual = vv && Math.abs(vv.scale - 1) < 0.01;
  return {
    // Sem a barra de rolagem: com ela, o botão encostado à direita ficava cortado por baixo dela.
    width: document.documentElement.clientWidth || window.innerWidth,
    height: window.innerHeight,
    wide: window.matchMedia?.(WIDE_QUERY).matches ?? true,
    visibleTop: useVisual ? vv.offsetTop : 0,
    visibleBottom: useVisual ? vv.offsetTop + vv.height : window.innerHeight,
  };
}

/** Tamanho da janela e a parte visível (o teclado do celular encolhe a parte visível). */
function useScreen(): Screen {
  const [screen, setScreen] = useState(readScreen);
  useEffect(() => {
    const update = () =>
      setScreen((now) => {
        const next = readScreen();
        return next.width === now.width &&
          next.height === now.height &&
          next.wide === now.wide &&
          next.visibleTop === now.visibleTop &&
          next.visibleBottom === now.visibleBottom
          ? now
          : next;
      });
    const vv = window.visualViewport;
    // A barra de rolagem aparece e some com o tamanho da página, sem a janela mudar de tamanho.
    const page = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => update());
    page?.observe(document.documentElement);
    window.addEventListener('resize', update);
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    return () => {
      page?.disconnect();
      window.removeEventListener('resize', update);
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
    };
  }, []);
  return screen;
}

/** Posição atual de um elemento posto com `translate3d` (no meio de uma animação, inclusive). */
function currentOffset(el: HTMLElement): { x: number; y: number } {
  const transform = getComputedStyle(el).transform;
  if (!transform || transform === 'none') return { x: 0, y: 0 };
  const matrix = new DOMMatrixReadOnly(transform);
  return { x: matrix.m41, y: matrix.m42 };
}

/** Move o elemento; `animate = false` pula a animação (primeira vez, painel abrindo, arrasto). */
function place(el: HTMLElement | null, x: number, y: number, animate: boolean) {
  if (!el) return;
  el.style.transitionProperty = animate ? '' : 'none';
  el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
}

interface Drag {
  pointerId: number;
  startX: number;
  startY: number;
  fromX: number;
  fromY: number;
  x: number;
  y: number;
  active: boolean;
  frame: number;
  samples: { t: number; x: number; y: number }[];
}

/** Id da última rolagem (ou `null` se não houve nenhuma). */
const lastRollId = () => useDiceStore.getState().history[0]?.id ?? null;

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Deslizar até a borda com um leve balanço (a mesma curva no botão e no painel). */
const glide = 'duration-[420ms] ease-[cubic-bezier(0.22,1.2,0.36,1)] motion-reduce:transition-none';

/**
 * Botão flutuante da ficha para rolar dados digitando. Mora na borda esquerda ou direita (o
 * jogador arrasta para trocar de lado e de altura; ao soltar, ele desliza até a borda mais
 * perto) e abre um painel com a bandeja de dados e o campo de expressão. Quando o resultado da
 * rolagem aparece embaixo (ou o teclado do celular abre), botão e painel sobem para não ficar na
 * frente, e voltam ao lugar quando ele some.
 *
 * A bandeja mostra os dados do que está digitado e, com o painel aberto, toda rolagem (do campo
 * ou da ficha) gira nela sem apagar o que foi digitado; tocar no campo ou digitar volta para os
 * dados do campo.
 */
export default function FloatingDice() {
  const f = ts.floatingDice;
  const [position, setPosition] = useState(loadPosition);
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  /** Altura do painel sem o desenho da bandeja (título, campo, dica). */
  const [rest, setRest] = useState<number | null>(null);
  const [expression, setExpression] = useState('1d20');
  /** Rolagem que a bandeja não mostra (a que já existia ao abrir, ou antes de voltar a digitar). */
  const [baseline, setBaseline] = useState<string | null>(null);
  const last = useDiceStore((s) => s.history[0]);
  const animate = useDiceStore((s) => s.animate);
  const screen = useScreen();
  const tray = useTrayArea((s) => s.area);
  const panelId = useId();

  const buttonWrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelWrap = useRef<HTMLDivElement>(null);
  const panelBox = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const buttonPlaced = useRef(false);
  const panelPlaced = useRef(false);

  const top = HEADER + (screen.wide ? 0 : MOBILE_TABS) + EDGE;
  const base: FloatingInput = {
    width: screen.width,
    home: { top, bottom: screen.height },
    visible: { top: screen.visibleTop, bottom: screen.visibleBottom },
    side: position.side,
    at: position.at,
    size: SIZE,
    panelHeight: null,
    tray,
  };
  // O desenho da bandeja fica com o espaço que sobrar (some com o teclado do celular aberto).
  const drawing = open && rest !== null ? trayHeight(panelRoom(base), rest) : 0;
  const panelHeight = open && !dragging && rest !== null ? rest + drawing : null;
  const layout = layoutFloating({ ...base, panelHeight });

  const entry = open && last && last.id !== baseline ? last : null;
  const motion = animate && !prefersReducedMotion();

  // A notificação do resultado espera os dados pararem de girar na bandeja. Antes de pintar a
  // tela: senão ela aparece por um quadro e some.
  const heldId = entry && motion ? entry.id : null;
  const holdFor = entry && motion ? rollDuration(resultTray(entry.result)) : 0;
  useLayoutEffect(() => {
    if (!heldId || holdFor === 0) return;
    const area = useTrayArea.getState();
    area.hold(heldId);
    const timer = setTimeout(() => area.release(heldId), holdFor);
    return () => {
      clearTimeout(timer);
      area.release(heldId);
    };
  }, [heldId, holdFor]);

  // O resto do painel muda com a mensagem de erro e a legenda: medido sempre que ele aparece ou muda.
  useLayoutEffect(() => {
    const box = panelBox.current;
    if (!open || !box) return;
    const measure = () => {
      const art = box.querySelector<HTMLElement>('[data-tray-drawing]')?.offsetHeight ?? 0;
      setRest(box.offsetHeight ? box.offsetHeight - art : null);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [open]);

  // Posição na tela: escrita direto no elemento (o arrasto também escreve, sem passar pelo React).
  useLayoutEffect(() => {
    if (drag.current?.active) return;
    place(buttonWrap.current, layout.button.x, layout.button.y, buttonPlaced.current);
    buttonPlaced.current = true;
    if (layout.panel) {
      place(panelWrap.current, layout.panel.x, layout.panel.y, panelPlaced.current);
      panelPlaced.current = true;
    } else {
      panelPlaced.current = false;
    }
  });

  // Toque fora fecha (o resultado da rolagem e o histórico não contam: são parte da rolagem).
  // Quem toca num dado da ficha (ataque, perícia…) quer ver a rolagem na bandeja: aí não fecha.
  useEffect(() => {
    if (!open) return;
    const outside = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return false;
      if (panelWrap.current?.contains(target) || buttonWrap.current?.contains(target)) return false;
      return !(
        target instanceof Element && target.closest('[data-floating-keep], [role="dialog"]')
      );
    };
    // Última rolagem quando o toque fora começou (`undefined` = o toque foi dentro).
    let before: string | null | undefined;
    const onDown = (e: globalThis.PointerEvent) => {
      before = outside(e.target) ? lastRollId() : undefined;
    };
    // O clique chega aqui depois do botão da ficha ter rolado.
    const onClick = (e: MouseEvent) => {
      if (before === undefined || !outside(e.target)) return;
      const rolled = lastRollId() !== before;
      before = undefined;
      if (!rolled) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('click', onClick);
    };
  }, [open]);

  const save = (next: Position) => {
    setPosition(next);
    safeStorage.set(POSITION_KEY, JSON.stringify(next));
  };

  const openPanel = () => {
    // Síncrono para o foco cair dentro do toque (senão o celular não abre o teclado). A bandeja
    // abre com os dados do campo, não com a última rolagem.
    flushSync(() => {
      setBaseline(lastRollId());
      setOpen(true);
    });
    input.current?.focus({ preventScroll: true });
    input.current?.select();
  };

  const closePanel = (focusButton: boolean) => {
    setOpen(false);
    if (focusButton) button.current?.focus({ preventScroll: true });
  };

  // Tocar no campo ou digitar volta a bandeja para os dados do campo.
  const backToPreview = () => setBaseline(lastRollId());

  // Celular: depois de rolar, o teclado fecha para o resultado aparecer (o painel continua aberto).
  const afterRoll = () => {
    if (window.matchMedia?.('(pointer: coarse)').matches) input.current?.blur();
  };

  /** Limites do arrasto: de borda a borda e entre o cabeçalho e o que estiver embaixo. */
  const dragLimits = () => {
    const free = { ...base, panelHeight: null };
    return {
      xMin: EDGE,
      xMax: screen.width - EDGE - SIZE,
      yMin: ceilingLine(free),
      yMax: Math.max(ceilingLine(free), floorLine(free, SIZE) - SIZE),
    };
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    suppressClick.current = false;
    if (e.button !== 0 || !e.isPrimary || !buttonWrap.current) return;
    const from = currentOffset(buttonWrap.current);
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      fromX: from.x,
      fromY: from.y,
      x: from.x,
      y: from.y,
      active: false,
      frame: 0,
      samples: [{ t: e.timeStamp, x: e.clientX, y: e.clientY }],
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    const el = buttonWrap.current;
    if (!d || !el || e.pointerId !== d.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.active) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      d.active = true;
      el.style.transitionProperty = 'none';
      setDragging(true);
    }
    d.samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
    while (d.samples.length > 2 && e.timeStamp - d.samples[0]!.t > 100) d.samples.shift();
    const limits = dragLimits();
    d.x = rubberBand(d.fromX + dx, limits.xMin, limits.xMax);
    d.y = rubberBand(d.fromY + dy, limits.yMin, limits.yMax);
    if (!d.frame) {
      d.frame = requestAnimationFrame(() => {
        d.frame = 0;
        el.style.transform = `translate3d(${d.x}px, ${d.y}px, 0)`;
      });
    }
  };

  const endDrag = (e: PointerEvent<HTMLButtonElement>, withMomentum: boolean) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    drag.current = null;
    if (!d.active) return;
    if (d.frame) cancelAnimationFrame(d.frame);
    suppressClick.current = true;
    const limits = dragLimits();
    // Embalo só dos últimos 100 ms (contando o soltar): quem parou antes de soltar não tem embalo.
    const recent = [...d.samples, { t: e.timeStamp, x: e.clientX, y: e.clientY }].filter(
      (p) => e.timeStamp - p.t <= 100,
    );
    const speed = withMomentum ? velocity(recent) : { x: 0, y: 0 };
    const side = sideAfterDrop(d.x + SIZE / 2, speed.x, screen.width);
    const vy = Math.max(-1.5, Math.min(1.5, speed.y));
    const y = Math.max(limits.yMin, Math.min(limits.yMax, d.y + vy * 60));
    save({ side, at: atFromY(base, y) });
    setDragging(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = 0.1;
    const moves: Record<string, () => Position> = {
      ArrowLeft: () => ({ ...position, side: 'left' }),
      ArrowRight: () => ({ ...position, side: 'right' }),
      ArrowUp: () => ({ ...position, at: Math.max(0, position.at - step) }),
      ArrowDown: () => ({ ...position, at: Math.min(1, position.at + step) }),
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    save(move());
  };

  const origin = layout.panel
    ? `${layout.panel.placement === 'above' ? 'bottom' : 'top'} ${position.side}`
    : undefined;

  return (
    <>
      <div
        ref={panelWrap}
        hidden={!open}
        className={cn('fixed top-0 left-0 z-30 transition-transform', glide)}
        style={layout.panel ? { width: layout.panel.width } : undefined}
        data-testid="floating-dice.panel"
        data-placement={layout.panel?.placement}
      >
        {/* Três camadas para usar só animações que a ficha já tem: lugar, aparecer e crescer. */}
        <div
          className={cn(
            'transition-opacity starting:opacity-0',
            glide,
            dragging && 'pointer-events-none opacity-0',
          )}
        >
          <div
            ref={panelBox}
            id={panelId}
            role="dialog"
            aria-label={f.title}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                closePanel(true);
              }
            }}
            style={origin ? { transformOrigin: origin } : undefined}
            className={cn(
              'rounded-xl border border-border-strong bg-surface p-3 shadow-card transition-transform starting:[scale:0.95]',
              glide,
              dragging && '[scale:0.95]',
            )}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-sm font-bold">
                <D20Icon className="size-4 text-accent" />
                {f.title}
              </p>
              <Button
                variant="ghost"
                size="icon-sm"
                className="-my-1 -mr-1"
                onClick={() => closePanel(true)}
                aria-label={f.close}
                title={f.close}
                data-testid="floating-dice.close"
              >
                <X className="size-4" />
              </Button>
            </div>
            {open ? (
              <DiceTray height={drawing} expression={expression} entry={entry} motion={motion} />
            ) : null}
            <DiceExpressionInput
              compact
              inputRef={input}
              initial={expression}
              onRolled={afterRoll}
              onTextChange={(text) => {
                setExpression(text);
                backToPreview();
              }}
              onEdit={backToPreview}
              testIdPrefix="floating-dice"
            />
            <p className="mt-2 text-xs text-muted">{f.hint}</p>
          </div>
        </div>
      </div>

      <div
        ref={buttonWrap}
        className={cn('fixed top-0 left-0 z-30 transition-transform', glide)}
        data-testid="floating-dice"
        data-side={position.side}
        data-lifted={layout.lifted ? 'true' : undefined}
      >
        <button
          ref={button}
          type="button"
          aria-label={open ? f.close : f.open}
          title={f.open}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            if (suppressClick.current) {
              suppressClick.current = false;
              return;
            }
            if (open) closePanel(false);
            else openPanel();
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => endDrag(e, true)}
          onPointerCancel={(e) => endDrag(e, false)}
          onKeyDown={onKeyDown}
          className={cn(
            'grid size-14 touch-none place-items-center rounded-full border border-accent-border bg-accent text-accent-contrast shadow-card inset-gleam transition-transform select-none hover:bg-accent-hover',
            glide,
            !dragging && 'active:[scale:0.95]',
            open && 'ring-2 ring-accent/40',
          )}
          style={{ cursor: dragging ? 'grabbing' : 'grab', scale: dragging ? 1.1 : undefined }}
          data-testid="floating-dice.button"
        >
          <D20Icon className="size-6" />
        </button>
      </div>
    </>
  );
}
