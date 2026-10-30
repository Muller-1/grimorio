import { useEffect, type FocusEvent, type RefObject } from 'react';

/**
 * Balões simples da barra (tema, menu do celular), sem Radix para não pesar na página inicial:
 * fecham com Esc (o foco volta ao botão) e com clique fora. `onBlur` vai no elemento que
 * envolve botão e balão: Tab para fora também fecha.
 */
export function useDismiss(
  open: boolean,
  close: () => void,
  rootRef: RefObject<HTMLElement | null>,
  triggerRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      close();
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close, rootRef, triggerRef]);

  // Sem `relatedTarget` (clique num texto do balão) não fecha: o clique fora já é tratado acima.
  return (event: FocusEvent) => {
    const next = event.relatedTarget as Node | null;
    if (open && next && !rootRef.current?.contains(next)) close();
  };
}
