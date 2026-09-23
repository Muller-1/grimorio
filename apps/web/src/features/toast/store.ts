import { create } from 'zustand';
import { newId } from '@/ports/ids';

export type ToastTone = 'info' | 'success' | 'danger';

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: Toast[];
  push(message: string, tone?: ToastTone): void;
  dismiss(id: string): void;
}

const LIFETIME_MS = 5000;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push(message, tone = 'info') {
    const id = newId();
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }].slice(-3) }));
    setTimeout(() => get().dismiss(id), LIFETIME_MS);
  },
  dismiss(id) {
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
  },
}));
