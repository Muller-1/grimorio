import { create } from 'zustand';
import { newId } from '@/ports/ids';

export type ToastTone = 'info' | 'success' | 'danger';

/** Botão dentro do aviso (ex.: "Desfazer" depois de subir de nível). */
export interface ToastAction {
  label: string;
  run: () => void;
}

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
  action?: ToastAction;
}

interface ToastState {
  toasts: Toast[];
  push(message: string, tone?: ToastTone, action?: ToastAction): void;
  dismiss(id: string): void;
}

const LIFETIME_MS = 5000;
/** Com botão, o aviso fica mais tempo (dá tempo de desfazer). */
const ACTION_LIFETIME_MS = 12000;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push(message, tone = 'info', action) {
    const id = newId();
    set((s) => ({
      toasts: [...s.toasts, { id, message, tone, ...(action ? { action } : {}) }].slice(-3),
    }));
    setTimeout(() => get().dismiss(id), action ? ACTION_LIFETIME_MS : LIFETIME_MS);
  },
  dismiss(id) {
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
  },
}));
