import {
  CharacterDocumentSchema,
  SheetInputSchema,
  SectionRevsSchema,
  type CharacterDocument,
  type LocalSheet,
  type SectionConflict,
} from '@grimorio/shared';
import { create } from 'zustand';
import { ACCOUNT_STORAGE_PREFIX, onSignOut } from '@/features/auth/store';
import { onAccountSheetEdit, useSheetStore } from '@/features/sheet/store';
import { api } from '@/lib/api';
import { safeStorage } from '@/ports/storage';
import {
  afterSave,
  dirtySections,
  openWithCache,
  planPatch,
  resolveConflicts,
  type SyncSnapshot,
} from './merge';

/**
 * Salvamento automático da ficha da conta (plano v2, 10.3 e RF-44/RF-47).
 *
 * - Cada mudança na tela é guardada NA HORA neste aparelho (cache) e enviada ao servidor
 *   depois de um instante sem mudanças, só com as seções alteradas.
 * - Sem internet ou com a API fora do ar, as mudanças esperam e são reenviadas depois.
 * - Se a mesma seção mudou em outro aparelho, o servidor recusa e o jogador escolhe qual fica.
 */
export type SyncStatus = 'saved' | 'pending' | 'saving' | 'offline' | 'error' | 'conflict';
export type SyncProblem = 'signed-out' | 'gone' | 'invalid' | null;

interface SyncState {
  id: string | null;
  status: SyncStatus;
  problem: SyncProblem;
  conflicts: SectionConflict[];
}

export const useSyncStore = create<SyncState>(() => ({
  id: null,
  status: 'saved',
  problem: null,
  conflicts: [],
}));

const CACHE_PREFIX = `${ACCOUNT_STORAGE_PREFIX}ficha.`;
const DEBOUNCE_MS = 800;
const RETRY_MS = [3_000, 10_000, 30_000, 60_000];

let snapshot: SyncSnapshot | null = null;
let ownerId: string | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let inFlight = false;
let again = false;
let attempt = 0;

// ---------- cache neste aparelho ----------

interface CacheEntry {
  v: 1;
  userId: string;
  local: unknown;
  base: unknown;
  revs: unknown;
  version?: number;
}

function cacheKey(id: string): string {
  return `${CACHE_PREFIX}${id}`;
}

function writeCache(id: string): void {
  if (!snapshot || !ownerId) return;
  const entry: CacheEntry = { v: 1, userId: ownerId, ...snapshot };
  safeStorage.set(cacheKey(id), JSON.stringify(entry));
}

export function readCache(id: string, userId: string): SyncSnapshot | null {
  const raw = safeStorage.get(cacheKey(id));
  if (!raw) return null;
  try {
    const entry = JSON.parse(raw) as Partial<CacheEntry>;
    if (entry.v !== 1 || entry.userId !== userId) return null;
    const local = SheetInputSchema.safeParse(entry.local);
    const base = SheetInputSchema.safeParse(entry.base);
    const revs = SectionRevsSchema.safeParse(entry.revs);
    if (!local.success || !base.success || !revs.success) return null;
    return {
      local: local.data,
      base: base.data,
      revs: revs.data,
      ...(typeof entry.version === 'number' ? { version: entry.version } : {}),
    };
  } catch {
    return null;
  }
}

/** Tem alteração deste aparelho que ainda não chegou ao servidor? */
export function hasUnsyncedChanges(id: string, userId: string): boolean {
  const cache = readCache(id, userId);
  return cache !== null && dirtySections(cache).length > 0;
}

export function forgetCachedCharacter(id: string): void {
  safeStorage.remove(cacheKey(id));
}

/** Ao sair da conta, nada da conta fica neste aparelho (computador compartilhado). */
export function clearAccountCache(): void {
  for (const key of safeStorage.keys(CACHE_PREFIX)) safeStorage.remove(key);
}

// ---------- envio ----------

function setStatus(status: SyncStatus, problem: SyncProblem = null) {
  useSyncStore.setState({ status, problem });
}

function schedule(ms: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, ms);
}

function currentId(): string | null {
  return useSyncStore.getState().id;
}

/** A tela passa a mostrar `local` (sem contar como edição do jogador). */
function showLocal(local: LocalSheet) {
  const state = useSheetStore.getState();
  if (state.source.kind === 'account' && state.source.id === currentId()) {
    useSheetStore.setState({ sheet: local });
  }
}

export async function flush(): Promise<void> {
  const id = currentId();
  if (!id || !snapshot) return;
  if (useSyncStore.getState().status === 'conflict') return;
  if (inFlight) {
    again = true;
    return;
  }
  const plan = planPatch(snapshot);
  if (plan.dirty.length === 0) {
    setStatus('saved');
    return;
  }

  inFlight = true;
  setStatus('saving');
  const atSend = snapshot;
  const result = await api<CharacterDocument>(`/api/v1/characters/${id}`, {
    method: 'PATCH',
    body: { sections: plan.sections, baseRevs: plan.baseRevs },
  });
  inFlight = false;
  if (currentId() !== id || !snapshot) return; // outra ficha foi aberta no meio do caminho

  if (result.ok) {
    const parsed = CharacterDocumentSchema.safeParse(result.data);
    if (!parsed.success) {
      setStatus('error', 'invalid');
      return;
    }
    attempt = 0;
    snapshot = afterSave(atSend, plan.sections, snapshot.local, parsed.data);
    writeCache(id);
    showLocal(snapshot.local);
    if (again || dirtySections(snapshot).length > 0) {
      again = false;
      schedule(DEBOUNCE_MS);
      setStatus('pending');
    } else {
      setStatus('saved');
    }
    return;
  }

  again = false;
  if (result.status === 409 && result.error?.code === 'CONFLICT_SECTION') {
    // Na mesa, quase sempre é a mestre que mudou o estado de jogo: a campanha junta sozinha as
    // ações dela com o que está na tela e tenta de novo, antes de perguntar ao jogador.
    if (conflictRecovery && !recovering) {
      recovering = true;
      const recovered = await conflictRecovery().catch(() => false);
      recovering = false;
      if (recovered && currentId() === id) {
        void flush();
        return;
      }
    }
    const details = result.error.details as { conflicts?: SectionConflict[] } | undefined;
    useSyncStore.setState({
      status: 'conflict',
      problem: null,
      conflicts: details?.conflicts ?? [],
    });
    return;
  }
  if (result.status === 401) return setStatus('error', 'signed-out');
  if (result.status === 404) return setStatus('error', 'gone');
  if (result.status === 400) return setStatus('error', 'invalid');

  // Rede ou servidor: tenta de novo, cada vez esperando mais.
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  setStatus(offline ? 'offline' : 'error');
  schedule(RETRY_MS[Math.min(attempt, RETRY_MS.length - 1)]!);
  attempt += 1;
}

// ---------- campanha (features/campaigns/table-sync) ----------

let conflictRecovery: (() => Promise<boolean>) | null = null;
let recovering = false;

/** A campanha registra como juntar as ações dos outros quando o servidor acusa conflito. */
export function setConflictRecovery(fn: (() => Promise<boolean>) | null): void {
  conflictRecovery = fn;
}

/** A ficha da conta aberta agora (ou `null`). */
export function currentSync(): { id: string; snapshot: SyncSnapshot; busy: boolean } | null {
  const id = currentId();
  if (!id || !snapshot) return null;
  return { id, snapshot, busy: inFlight };
}

/**
 * Troca o que está guardado pela junção com o servidor (feita pela campanha). Recusa se um
 * salvamento estiver no caminho: quem chamou tenta de novo depois.
 */
export function adoptRemote(id: string, next: SyncSnapshot): boolean {
  if (id !== currentId() || inFlight) return false;
  snapshot = next;
  writeCache(id);
  showLocal(next.local);
  const { status } = useSyncStore.getState();
  if (dirtySections(next).length > 0) {
    if (status !== 'conflict') setStatus('pending');
    schedule(DEBOUNCE_MS);
  } else if (status !== 'conflict') {
    setStatus('saved');
  }
  return true;
}

/** Começa a sincronizar uma ficha da conta e a mostra na tela. */
export function startSync(doc: CharacterDocument, userId: string): void {
  if (timer) clearTimeout(timer);
  timer = null;
  again = false;
  attempt = 0;
  ownerId = userId;
  snapshot = openWithCache(doc, readCache(doc.id, userId));
  useSyncStore.setState({ id: doc.id, status: 'saved', problem: null, conflicts: [] });
  useSheetStore.getState().openAccount(doc.id, snapshot.local);
  writeCache(doc.id);
  if (dirtySections(snapshot).length > 0) {
    setStatus('pending');
    void flush();
  }
}

/** Abre a cópia deste aparelho quando o servidor não responde (RF-47). */
export function startOffline(id: string, userId: string): boolean {
  const cache = readCache(id, userId);
  if (!cache) return false;
  if (timer) clearTimeout(timer);
  ownerId = userId;
  snapshot = cache;
  useSyncStore.setState({ id, status: 'offline', problem: null, conflicts: [] });
  useSheetStore.getState().openAccount(id, cache.local);
  schedule(RETRY_MS[0]!);
  return true;
}

/** Para de acompanhar a ficha (ex.: abriu a ficha deste navegador). O cache fica. */
export function stopSync(): void {
  const pending = snapshot && dirtySections(snapshot).length > 0;
  if (pending) void flush();
  else {
    if (timer) clearTimeout(timer);
    timer = null;
  }
}

export function resolveConflict(choice: 'mine' | 'theirs'): void {
  const id = currentId();
  const { conflicts } = useSyncStore.getState();
  if (!id || !snapshot || conflicts.length === 0) return;
  snapshot = resolveConflicts(snapshot, conflicts, choice);
  writeCache(id);
  useSyncStore.setState({ status: 'pending', conflicts: [] });
  showLocal(snapshot.local);
  void flush();
}

// Edição do jogador numa ficha da conta.
onAccountSheetEdit((id, sheet) => {
  if (id !== currentId() || !snapshot) return;
  snapshot = { ...snapshot, local: sheet };
  writeCache(id);
  if (useSyncStore.getState().status === 'conflict') return;
  if (dirtySections(snapshot).length === 0) {
    if (!inFlight) setStatus('saved');
    return;
  }
  if (!inFlight) setStatus('pending');
  schedule(DEBOUNCE_MS);
});

// Saindo da conta: envia o que der antes, depois apaga tudo da conta deste aparelho.
onSignOut('before', async () => {
  if (snapshot && dirtySections(snapshot).length > 0) await flush();
});
onSignOut('after', () => {
  if (timer) clearTimeout(timer);
  timer = null;
  snapshot = null;
  ownerId = null;
  useSyncStore.setState({ id: null, status: 'saved', problem: null, conflicts: [] });
  clearAccountCache();
  useSheetStore.getState().openLocal();
});

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (snapshot && dirtySections(snapshot).length > 0) void flush();
  });
}

/** Só para testes. */
export function __syncSnapshotForTests(): SyncSnapshot | null {
  return snapshot;
}
