import { CloudOff, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { nowMs } from '@/ports/clock';
import { useAuthStore } from './store';

/** Segundos que faltam até `at` (atualiza a cada segundo enquanto houver um horário). */
function useSecondsUntil(at: number | null): number | null {
  const [now, setNow] = useState(() => nowMs());
  useEffect(() => {
    if (at === null) return;
    const timer = setInterval(() => setNow(nowMs()), 1_000);
    return () => clearInterval(timer);
  }, [at]);
  return at === null ? null : Math.max(0, Math.ceil((at - now) / 1_000));
}

/**
 * Situação do servidor de contas, para as páginas que dependem dele (entrar, personagens,
 * ficha da conta). Some quando está tudo bem. O plano grátis da API dorme sem uso: em vez de
 * "fora do ar", o jogador vê que está acordando, e o site tenta de novo sozinho.
 */
export function ServerStatus({ className }: { className?: string }) {
  const status = useAuthStore((s) => s.status);
  const checking = useAuthStore((s) => s.checking);
  const slow = useAuthStore((s) => s.slow);
  const nextRetryAt = useAuthStore((s) => s.nextRetryAt);
  const refresh = useAuthStore((s) => s.refresh);
  const seconds = useSecondsUntil(nextRetryAt);
  const s = t.auth.server;

  if (checking && slow) {
    return (
      <p
        role="status"
        className={cn('flex items-start gap-2 text-sm text-muted', className)}
        data-testid="server.waking"
      >
        <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin" aria-hidden="true" />
        {s.waking}
      </p>
    );
  }
  if (status !== 'unavailable') return null;

  return (
    <div className={cn('space-y-3', className)} data-testid="server.down">
      <p role="status" className="flex items-start gap-2 text-sm text-muted">
        <CloudOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          {s.down} {s.localOk}{' '}
          {checking ? s.wakingShort : seconds === null ? s.gaveUp : s.retryIn(seconds)}
        </span>
      </p>
      <Button
        size="sm"
        disabled={checking}
        onClick={() => void refresh()}
        data-testid="server.retry"
      >
        {s.retryNow}
      </Button>
    </div>
  );
}
