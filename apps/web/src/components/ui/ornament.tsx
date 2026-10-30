import { cn } from '@/lib/utils';

/**
 * Filete com três losangos, como nas divisões de capítulo de um grimório: separa as seções
 * no lugar de faixas coloridas e caixas (ADR-012). Ouro no Pergaminho, prata no Obsidiana.
 */
export function Ornament({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('flex items-center gap-3.5', className)}>
      <span className="h-px flex-1 bg-rule" />
      <svg width="62" height="12" viewBox="0 0 62 12" className="shrink-0">
        <path
          d="M6 1 11 6 6 11 1 6Z"
          fill="none"
          strokeWidth="1.2"
          className="stroke-border-strong"
        />
        <path d="M31 0 37 6 31 12 25 6Z" className="fill-ornament" />
        <path
          d="M56 1 61 6 56 11 51 6Z"
          fill="none"
          strokeWidth="1.2"
          className="stroke-border-strong"
        />
      </svg>
      <span className="h-px flex-1 bg-rule" />
    </div>
  );
}
