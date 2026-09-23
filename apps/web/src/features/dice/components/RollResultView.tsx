import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { naturalD20, type RollEntry } from '../store';

interface RollResultViewProps {
  entry: RollEntry;
  /** `true` na rolagem em destaque (usa os seletores do bot: roll.last.*). */
  isLast?: boolean;
  compact?: boolean;
  /** Animação de entrada (RF-77). O CSS a desliga se o sistema pede menos movimento. */
  animate?: boolean;
}

/** Cada dado, descartados riscados, total e destaque para 20 e 1 naturais (RF-75). */
export function RollResultView({
  entry,
  isLast = false,
  compact = false,
  animate = false,
}: RollResultViewProps) {
  const { result } = entry;
  const natural = naturalD20(result);
  const isCrit = natural !== null && natural >= (entry.critRange ?? 20);
  const isFumble = natural === 1;

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-sm font-semibold">{entry.label}</p>
        <p className="shrink-0 font-mono text-xs text-muted">{result.expression}</p>
      </div>
      <div className="mt-1 flex items-start gap-3">
        <strong
          className={cn(
            'tabular font-display leading-none',
            animate && 'animate-roll-pop',
            compact ? 'text-3xl' : 'text-4xl',
            isCrit && 'text-gold',
            isFumble && 'text-danger',
          )}
          {...(isLast ? { 'data-testid': 'roll.last.total' } : {})}
          data-value={result.total}
        >
          {result.total}
        </strong>
        <div className="flex min-w-0 flex-1 flex-wrap gap-1 pt-1">
          {result.terms.flatMap((term, ti) =>
            term.dice.map((die, di) => {
              const order = ti * 10 + di;
              const nat20 = term.sides === 20 && die.kept && die.value === 20;
              const nat1 = term.sides === 20 && die.kept && die.value === 1;
              return (
                <span
                  key={`${ti}-${di}`}
                  className={cn(
                    'tabular inline-flex min-w-7 items-center justify-center rounded border px-1 text-xs',
                    die.kept
                      ? 'border-border-strong bg-surface-2'
                      : 'border-dashed border-border text-muted line-through',
                    nat20 && 'border-gold bg-gold-soft font-bold text-gold',
                    nat1 && 'border-danger bg-danger-soft font-bold text-danger',
                    animate && 'animate-roll-chip',
                  )}
                  style={animate ? { animationDelay: `${Math.min(order * 15, 300)}ms` } : undefined}
                  title={`d${term.sides}${die.kept ? '' : ` · ${t.dice.dropped}`}`}
                >
                  {die.value}
                </span>
              );
            }),
          )}
        </div>
      </div>
      {isCrit || isFumble ? (
        <p className={cn('mt-1 text-xs font-bold', isCrit ? 'text-gold' : 'text-danger')}>
          {isCrit
            ? entry.critRange !== undefined
              ? t.dice.critHit
              : t.dice.natural20
            : t.dice.natural1}
        </p>
      ) : null}
    </div>
  );
}
