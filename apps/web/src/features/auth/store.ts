import type { Me } from '@grimorio/shared';
import { create } from 'zustand';
import { siteConfig } from '@/app/config';
import { api, isUnreachable } from '@/lib/api';
import { safeStorage } from '@/ports/storage';

/** Tudo que é da conta e fica neste aparelho começa assim (apagado ao sair). */
export const ACCOUNT_STORAGE_PREFIX = 'grimorio.conta.';

/**
 * Estado do login (ADR-008).
 * - `disabled`: build sem contas (VITE_ACCOUNTS); o site funciona só no navegador, como antes.
 * - `loading`: perguntando à API quem está logado.
 * - `signed-out` / `signed-in`: a API respondeu.
 * - `unavailable`: a API não respondeu (fora do ar, "acordando"…). Ficha e dados do navegador
 *   continuam funcionando (RF-47).
 */
export type AuthStatus = 'disabled' | 'loading' | 'signed-out' | 'signed-in' | 'unavailable';

interface AuthState {
  status: AuthStatus;
  user: Me | null;
  /** O botão "Entrar com Google" só funciona se a API tiver as credenciais. */
  googleEnabled: boolean;
  refresh(): Promise<void>;
  /** Vai para o Google; volta em `next` (caminho do site). Devolve `false` se não deu. */
  signInWithGoogle(next: string): Promise<boolean>;
  signOut(): Promise<boolean>;
}

type SignOutListener = () => void | Promise<void>;
const beforeSignOut = new Set<SignOutListener>();
const afterSignOut = new Set<SignOutListener>();

/** Ex.: enviar a ficha pendente antes de sair (`before`) e limpar caches da conta (`after`). */
export function onSignOut(when: 'before' | 'after', listener: SignOutListener): () => void {
  const set = when === 'before' ? beforeSignOut : afterSignOut;
  set.add(listener);
  return () => set.delete(listener);
}

/** Só caminhos do próprio site (nada de `//outro-site`): evita redirecionamento aberto. */
export function safeNext(next: string | null | undefined, fallback = '/personagens'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return fallback;
  }
  return next;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: siteConfig.accountsEnabled ? 'loading' : 'disabled',
  user: null,
  googleEnabled: false,

  async refresh() {
    if (!siteConfig.accountsEnabled) return;
    const [session, providers] = await Promise.all([
      api<{ user: Me | null }>('/api/v1/session'),
      api<{ google: boolean }>('/api/v1/auth/providers'),
    ]);
    if (!session.ok || !providers.ok) {
      set({ status: 'unavailable', user: null, googleEnabled: false });
      return;
    }
    const user = session.data.user;
    set({
      status: user ? 'signed-in' : 'signed-out',
      user,
      googleEnabled: providers.data.google,
    });
  },

  async signInWithGoogle(next) {
    const callbackURL = safeNext(next);
    const result = await api<{ url?: string }>('/api/auth/sign-in/social', {
      method: 'POST',
      body: { provider: 'google', callbackURL, errorCallbackURL: '/entrar' },
    });
    if (!result.ok || !result.data.url) {
      if (isUnreachable(result)) set({ status: 'unavailable' });
      return false;
    }
    window.location.assign(result.data.url);
    return true;
  },

  async signOut() {
    for (const listener of beforeSignOut) await listener();
    const result = await api('/api/auth/sign-out', { method: 'POST', body: {} });
    if (!result.ok && result.status !== 401) return false;
    set({ status: get().status === 'disabled' ? 'disabled' : 'signed-out', user: null });
    for (const key of safeStorage.keys(ACCOUNT_STORAGE_PREFIX)) safeStorage.remove(key);
    for (const listener of afterSignOut) await listener();
    return true;
  },
}));
