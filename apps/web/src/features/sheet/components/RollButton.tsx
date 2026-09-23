import type { ComponentProps } from 'react';
import { D20Icon } from '@/components/ui/d20-icon';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useDiceStore } from '@/features/dice/store';
import { useToastStore } from '@/features/toast/store';

type RollButtonProps = Omit<ComponentProps<'button'>, 'onClick'> & {
  /** Rótulo que aparece no resultado (já traduzido). */
  rollLabel: string;
  expression: string;
  critRange?: number;
  /** Texto para leitores de tela (ex.: "Rolar Furtividade"). */
  ariaLabel: string;
  testId?: string;
  onRolled?: (total: number) => void;
};

/** Todo ícone de dado da ficha passa por aqui (plano v2, 8: um único caminho para rolar). */
export function RollButton({
  rollLabel,
  expression,
  critRange,
  ariaLabel,
  testId,
  onRolled,
  className,
  children,
  ...props
}: RollButtonProps) {
  const roll = useDiceStore((s) => s.roll);
  const toast = useToastStore((s) => s.push);
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      data-testid={testId}
      onClick={() => {
        const outcome = roll({
          label: rollLabel,
          expression,
          ...(critRange !== undefined ? { critRange } : {}),
        });
        if (outcome.ok) onRolled?.(outcome.entry.result.total);
        else toast(t.dice.errors[outcome.error.code], 'danger');
      }}
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-accent-soft hover:text-accent',
        className,
      )}
      {...props}
    >
      {children ?? <D20Icon className="size-5" />}
    </button>
  );
}
