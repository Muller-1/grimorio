import { cn } from '@/lib/utils';

/**
 * Filete dourado com um losango no meio, como nas divisões de capítulo de um grimório.
 * É o único ornamento do site (ADR-012): separa seções no lugar de faixas coloridas e caixas,
 * sem perder o tema mágico.
 */
export function Ornament({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('flex items-center gap-3 text-gold', className)}>
      <span className="h-px flex-1 bg-current opacity-50" />
      <span className="size-2 rotate-45 border border-current" />
      <span className="size-1.5 rotate-45 bg-current" />
      <span className="size-2 rotate-45 border border-current" />
      <span className="h-px flex-1 bg-current opacity-50" />
    </div>
  );
}
