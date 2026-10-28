import { useEffect, type RefObject } from 'react';

/** Um "deslizar" é um gesto curto, rápido e mais horizontal que vertical. */
const MIN_DISTANCE = 60; // px
const MAX_DURATION = 800; // ms
const HORIZONTAL_BIAS = 1.5;

/** Nas bordas da tela o sistema usa o gesto de voltar (iPhone e Android): não competimos. */
const EDGE = 24; // px

/** O dedo começando aqui não troca de aba: campos, barras de valor e o que o site marcar. */
const IGNORE =
  'input, textarea, select, [role="slider"], [contenteditable="true"], [data-no-swipe]';

/** Largura a partir da qual a ficha mostra todas as colunas juntas (md do Tailwind). */
const WIDE_QUERY = '(min-width: 768px)';

/** Direção de um gesto: 1 = para a esquerda (próxima aba), -1 = para a direita, 0 = não é deslizar. */
export function swipeDirection(dx: number, dy: number, ms: number): 1 | -1 | 0 {
  if (ms > MAX_DURATION) return 0;
  if (Math.abs(dx) < MIN_DISTANCE) return 0;
  if (Math.abs(dx) < Math.abs(dy) * HORIZONTAL_BIAS) return 0;
  return dx < 0 ? 1 : -1;
}

/** Algum elemento entre o toque e a coluna rola para os lados (tabela larga, carrossel)? */
function scrollsSideways(from: Element, root: Element): boolean {
  for (let el: Element | null = from; el && el !== root; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth && /auto|scroll/.test(getComputedStyle(el).overflowX)) {
      return true;
    }
  }
  return false;
}

/**
 * Deslizar o dedo para os lados troca de aba da ficha no celular. Só vale em tela estreita
 * (onde as colunas viram abas) e nunca atrapalha a rolagem, campos de texto ou o gesto de voltar.
 * Os ouvintes são passivos: o navegador continua rolando a página normalmente.
 */
export function useSwipeTabs(ref: RefObject<HTMLElement | null>, onSwipe: (dir: 1 | -1) => void) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let from: { x: number; y: number; at: number } | null = null;

    const start = (e: TouchEvent) => {
      from = null;
      const touch = e.touches[0];
      if (!touch || e.touches.length !== 1) return;
      if (window.matchMedia(WIDE_QUERY).matches) return;
      if (touch.clientX < EDGE || touch.clientX > window.innerWidth - EDGE) return;
      const target = e.target;
      if (target instanceof Element && (target.closest(IGNORE) || scrollsSideways(target, root))) {
        return;
      }
      from = { x: touch.clientX, y: touch.clientY, at: e.timeStamp };
    };

    const end = (e: TouchEvent) => {
      const begin = from;
      from = null;
      const touch = e.changedTouches[0];
      if (!begin || !touch) return;
      // Quem arrastou para selecionar texto não quer trocar de aba.
      if (window.getSelection()?.toString()) return;
      const dir = swipeDirection(
        touch.clientX - begin.x,
        touch.clientY - begin.y,
        e.timeStamp - begin.at,
      );
      if (dir) onSwipe(dir);
    };

    const cancel = () => {
      from = null;
    };

    root.addEventListener('touchstart', start, { passive: true });
    root.addEventListener('touchend', end, { passive: true });
    root.addEventListener('touchcancel', cancel, { passive: true });
    return () => {
      root.removeEventListener('touchstart', start);
      root.removeEventListener('touchend', end);
      root.removeEventListener('touchcancel', cancel);
    };
  }, [ref, onSwipe]);
}
