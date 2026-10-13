import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth/store';
import { useToastStore } from '@/features/toast/store';
import { isUnreachable } from '@/lib/api';
import { t } from '@/lib/i18n';
import { getCharacter } from './api';
import { startOffline, startSync, stopSync } from './sync';

// Carregada sob demanda, como na rota /ficha: a ficha continua sendo um pedaço separado do site.
const SheetPage = lazy(() => import('@/features/sheet/SheetPage'));

type Load = 'loading' | 'ready' | 'not-found' | 'need-sign-in' | 'unavailable';

/** Ficha da conta: /personagem?id=… (um HTML só, sem rota dinâmica na hospedagem estática). */
export default function AccountSheetPage() {
  const [params] = useSearchParams();
  const id = params.get('id') ?? '';
  const status = useAuthStore((s) => s.status);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const toast = useToastStore((s) => s.push);
  const [fetched, setFetched] = useState<{ id: string; load: Load } | null>(null);

  // Sem sessão não há o que buscar: o estado sai direto do login.
  const load: Load =
    status === 'loading'
      ? 'loading'
      : status !== 'signed-in' || !userId
        ? status === 'unavailable'
          ? 'unavailable'
          : 'need-sign-in'
        : fetched?.id === id
          ? fetched.load
          : 'loading';

  useEffect(() => {
    if (status !== 'signed-in' || !userId) return;
    let cancelled = false;
    void getCharacter(id).then((result) => {
      if (cancelled) return;
      let next: Load;
      if (result.ok) {
        startSync(result.data, userId);
        next = 'ready';
      } else if (isUnreachable(result) && startOffline(id, userId)) {
        toast(t.sync.openedOffline, 'info');
        next = 'ready';
      } else if (result.status === 401) {
        next = 'need-sign-in';
      } else {
        next = isUnreachable(result) ? 'unavailable' : 'not-found';
      }
      setFetched({ id, load: next });
    });
    return () => {
      cancelled = true;
    };
  }, [id, status, userId, toast]);

  // Saindo da página: o que estiver pendente é enviado (e fica guardado neste aparelho).
  useEffect(() => () => stopSync(), []);

  if (load === 'ready') {
    return (
      <Suspense
        fallback={<p className="min-h-dvh p-8 text-center text-muted">{t.common.loading}</p>}
      >
        <SheetPage mode="account" />
      </Suspense>
    );
  }

  const message =
    load === 'loading'
      ? t.sync.loadingSheet
      : load === 'need-sign-in'
        ? t.sync.needSignIn
        : load === 'unavailable'
          ? t.sync.unavailable
          : t.sync.notFound;

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="font-display text-xl font-bold">{message}</h1>
      {load !== 'loading' ? (
        <div className="mt-4 flex justify-center gap-2">
          {load === 'need-sign-in' ? (
            <Button asChild variant="primary">
              <Link to={`/entrar?voltar=${encodeURIComponent(`/personagem?id=${id}`)}`}>
                {t.auth.signIn}
              </Link>
            </Button>
          ) : null}
          <Button asChild>
            <Link to="/personagens">{t.sync.backToList}</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
