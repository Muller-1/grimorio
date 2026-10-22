import type { Me } from '@grimorio/shared';
import { create } from 'zustand';
import { siteConfig } from '@/app/config';
import { api, isUnreachable } from '@/lib/api';
import { nowMs } from '@/ports/clock';
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

/** Depois disso sem resposta, avisamos que o servidor deve estar "acordando". */
export const SLOW_AFTER_MS = 2_500;
/**
 * Novas tentativas sozinhas quando a API não responde (o plano grátis do Render dorme sem uso
 * e leva até ~1 minuto para acordar). Depois da última, só pelo botão "Tentar agora".
 */
export const RETRY_DELAYS_MS = [5_000, 10_000, 20_000, 30_000, 60_000] as const;

interface AuthState {
  status: AuthStatus;
  user: Me | null;
  /** O botão "Entrar com Google" só funciona se a API tiver as credenciais. */
  googleEnabled: boolean;
  /** Uma consulta à API está em andamento. */
  checking: boolean;
  /** A consulta atual passou de SLOW_AFTER_MS: o servidor provavelmente está acordando. */
  slow: boolean;
  /** Quando acontece a próxima tentativa automática (nowMs()), ou `null`. */
  nextRetryAt: number | null;
  /** Pergunta à API quem está logado. Com a API fora do ar, tenta de novo sozinha. */
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

let inFlight: Promise<void> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let failures = 0;
let watching = false;

export const useAuthStore = create<AuthState>((set, get) => {
  /** Voltou a internet ou o jogador voltou para a aba: se a API estava fora, tenta já. */
  const watch = () => {
    if (watching || typeof window === 'undefined') return;
    watching = true;
    const retryIfDown = () => {
      if (get().status === 'unavailable' && document.visibilityState !== 'hidden') {
        void get().refresh();
      }
    };
    window.addEventListener('online', retryIfDown);
    document.addEventListener('visibilitychange', retryIfDown);
  };

  return {
    status: siteConfig.accountsEnabled ? 'loading' : 'disabled',
    user: null,
    googleEnabled: false,
    checking: false,
    slow: false,
    nextRetryAt: null,

    refresh() {
      if (!siteConfig.accountsEnabled) return Promise.resolve();
      if (inFlight) return inFlight;
      watch();
      clearTimeout(retryTimer);
      set({ checking: true, slow: false, nextRetryAt: null });
      const slowTimer = setTimeout(() => set({ slow: true }), SLOW_AFTER_MS);

      inFlight = (async () => {
        const [session, providers] = await Promise.all([
          api<{ user: Me | null }>('/api/v1/session'),
          api<{ google: boolean }>('/api/v1/auth/providers'),
        ]);
        clearTimeout(slowTimer);
        if (!session.ok || !providers.ok) {
          const delay = RETRY_DELAYS_MS[failures];
          failures += 1;
          set({
            status: 'unavailable',
            user: null,
            googleEnabled: false,
            checking: false,
            slow: false,
            nextRetryAt: delay === undefined ? null : nowMs() + delay,
          });
          if (delay !== undefined) retryTimer = setTimeout(() => void get().refresh(), delay);
          return;
        }
        failures = 0;
        const user = session.data.user;
        set({
          status: user ? 'signed-in' : 'signed-out',
          user,
          googleEnabled: providers.data.google,
          checking: false,
          slow: false,
          nextRetryAt: null,
        });
      })().finally(() => {
        inFlight = null;
      });
      return inFlight;
    },

    async signInWithGoogle(next) {
      const callbackURL = safeNext(next);
      const result = await api<{ url?: string }>('/api/auth/sign-in/social', {
        method: 'POST',
        body: { provider: 'google', callbackURL, errorCallbackURL: '/entrar' },
      });
      if (!result.ok || !result.data.url) {
        if (isUnreachable(result)) void get().refresh();
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
  };
});

/** Só para testes: volta ao começo (sem tentativas pendentes). */
export function resetAuthRetriesForTests() {
  clearTimeout(retryTimer);
  inFlight = null;
  failures = 0;
}
