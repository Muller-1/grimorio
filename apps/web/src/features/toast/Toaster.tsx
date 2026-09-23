import { X } from 'lucide-react';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useToastStore } from './store';

/** Avisos curtos (ex.: "Três sucessos: estável"). Anunciados para leitores de tela. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-16 z-50 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cn(
            'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-card',
            toast.tone === 'danger' && 'border-danger/40 bg-danger-soft text-danger',
            toast.tone === 'success' && 'border-success/40 bg-success-soft text-success',
            toast.tone === 'info' && 'border-border bg-surface text-text',
          )}
        >
          <p className="flex-1">{toast.message}</p>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            className="-m-1 rounded p-1 opacity-70 hover:opacity-100"
            aria-label={t.common.close}
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
