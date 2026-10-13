import { AlertTriangle, Cloud, CloudOff, LoaderCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { resolveConflict, useSyncStore, type SyncStatus } from './sync';

const ICONS: Record<SyncStatus, typeof Cloud> = {
  saved: Cloud,
  pending: RefreshCw,
  saving: LoaderCircle,
  offline: CloudOff,
  error: AlertTriangle,
  conflict: AlertTriangle,
};

/** "Salvo na conta / Salvando… / Sem internet…" (RF-44) + o diálogo de conflito. */
export function SyncIndicator() {
  const status = useSyncStore((s) => s.status);
  const problem = useSyncStore((s) => s.problem);
  const conflicts = useSyncStore((s) => s.conflicts);
  const Icon = ICONS[status];
  const text = problem ? t.sync.problems[problem] : t.sync[status];
  const bad = status === 'error' || status === 'conflict';

  return (
    <>
      <p
        className={cn('flex items-center gap-1 text-xs', bad ? 'text-danger' : 'text-muted')}
        aria-live="polite"
        data-testid="sync.status"
        data-value={status}
      >
        <Icon
          className={cn('size-3.5', status === 'saving' && 'animate-spin')}
          aria-hidden="true"
        />
        {text}
      </p>
      <Dialog
        open={status === 'conflict'}
        // Fechar sem escolher não resolve: o diálogo volta (nada é descartado sem escolha).
        onOpenChange={() => {}}
        title={t.sync.conflictTitle}
        description={t.sync.conflictText}
        footer={
          <>
            <Button variant="outline" onClick={() => resolveConflict('theirs')}>
              {t.sync.useTheirs}
            </Button>
            <Button variant="primary" onClick={() => resolveConflict('mine')}>
              {t.sync.keepMine}
            </Button>
          </>
        }
      >
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {conflicts.map((c) => (
            <li key={c.section}>{t.sync.sections[c.section] ?? c.section}</li>
          ))}
        </ul>
      </Dialog>
    </>
  );
}
