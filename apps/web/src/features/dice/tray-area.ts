import { useEffect, type RefObject } from 'react';
import { create } from 'zustand';

/** Retângulo ocupado na tela (coordenadas da janela, em px). */
export interface ScreenArea {
  top: number;
  left: number;
  right: number;
}

interface TrayAreaState {
  /** Onde está o resultado da última rolagem agora; `null` quando ele não está na tela. */
  area: ScreenArea | null;
  set(area: ScreenArea | null): void;
  /**
   * Rolagem cujo resultado espera os dados pararem na bandeja do botão flutuante (para a
   * notificação não contar o total antes da animação).
   */
  heldId: string | null;
  hold(id: string): void;
  release(id: string): void;
}

/**
 * A bandeja de resultado diz onde está, para quem flutua na tela (o botão de rolar da ficha)
 * sair da frente enquanto ela aparece. O botão, por sua vez, segura a notificação enquanto os
 * dados giram no painel dele.
 */
export const useTrayArea = create<TrayAreaState>((set, get) => ({
  area: null,
  set(area) {
    const now = get().area;
    const same =
      now === area ||
      (now !== null &&
        area !== null &&
        now.top === area.top &&
        now.left === area.left &&
        now.right === area.right);
    if (!same) set({ area });
  },
  heldId: null,
  hold(id) {
    set({ heldId: id });
  },
  release(id) {
    if (get().heldId === id) set({ heldId: null });
  },
}));

/** Mede o elemento sempre que ele muda de tamanho (ou a janela muda) e publica a área. */
export function usePublishTrayArea(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const publish = () => {
      const r = el.getBoundingClientRect();
      useTrayArea
        .getState()
        .set(r.height > 0 ? { top: Math.round(r.top), left: r.left, right: r.right } : null);
    };
    publish();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(publish);
    observer?.observe(el);
    window.addEventListener('resize', publish);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', publish);
      useTrayArea.getState().set(null);
    };
  }, [ref]);
}
