import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/** Campo (docs/design.md): fundo de papel claro, borda dourada (prateada) e sombra por dentro. */
export const fieldClass =
  'w-full rounded-md border border-border-strong bg-field px-3 py-1.5 text-base text-text shadow-[inset_0_1px_2px_rgb(42_30_24/0.08)] focus-visible:border-focus disabled:opacity-50 dark:shadow-[inset_0_1px_2px_rgb(0_0_0/0.4)]';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(fieldClass, 'h-10', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(fieldClass, 'min-h-20 resize-y', className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(fieldClass, 'h-10', className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<'label'>) {
  return <label className={cn('text-xs font-bold text-muted', className)} {...props} />;
}
