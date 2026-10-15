import { X } from 'lucide-react';
import { Dialog as D } from 'radix-ui';
import type { ReactNode } from 'react';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** Diálogo acessível (Radix): foco preso, Esc fecha, título anunciado. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <D.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-50 flex max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-surface shadow-card',
            className,
          )}
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
            <D.Title className="font-display text-lg font-bold">{title}</D.Title>
            <D.Close
              className="-mt-1 -mr-1 rounded-md p-1.5 text-muted hover:bg-surface-2"
              aria-label={t.common.close}
            >
              <X className="size-4" />
            </D.Close>
          </div>
          {/* Só o meio rola: título e botões ficam sempre à vista (no celular, principalmente). */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
            {description ? (
              <D.Description className="mb-4 text-sm text-muted">{description}</D.Description>
            ) : null}
            {children}
          </div>
          {footer ? (
            <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3">
              {footer}
            </div>
          ) : null}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
