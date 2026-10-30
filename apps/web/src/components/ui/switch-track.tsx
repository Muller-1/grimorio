import { cn } from '@/lib/utils';
import { StrokeIcon } from './stroke-icon';

/**
 * O desenho do interruptor (trilho e bolinha). Quem usa põe dentro de um <button role="switch">.
 * A bolinha anda com `transform`, que o navegador anima sem recalcular a página.
 */
export function SwitchTrack({ on, check = false }: { on: boolean; check?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative block h-[26px] w-11 shrink-0 rounded-full transition-colors',
        on ? 'bg-accent' : 'bg-border',
      )}
    >
      <span
        className={cn(
          'absolute top-[3px] left-[3px] grid size-5 place-items-center rounded-full bg-field shadow-[0_1px_2px_rgb(42_30_24/0.25)] transition-transform',
          on && 'translate-x-[18px]',
        )}
      >
        {check && on ? (
          <StrokeIcon name="check" strokeWidth={3.2} className="size-3 text-accent" />
        ) : null}
      </span>
    </span>
  );
}
