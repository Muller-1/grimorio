import { Minus, Plus } from 'lucide-react';
import { useState, type ComponentProps } from 'react';
import { t } from '@/lib/i18n';
import { clampInt } from '@/lib/format';
import { cn } from '@/lib/utils';

type NumberFieldProps = Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'min' | 'max'> & {
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
  label: string;
};

/**
 * Campo numérico que aceita apagar e redigitar: só envia valores válidos e,
 * ao sair do campo, volta ao último valor válido.
 */
export function NumberField({
  value,
  min,
  max,
  onCommit,
  label,
  className,
  ...props
}: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(value);

  return (
    <input
      type="number"
      inputMode="numeric"
      aria-label={label}
      value={shown}
      min={min}
      max={max}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const text = e.target.value;
        setDraft(text);
        if (text.trim() === '') return;
        const n = Number(text);
        if (Number.isInteger(n) && n >= min && n <= max) onCommit(n);
      }}
      onBlur={() => {
        if (draft !== null) {
          const n = Number(draft);
          if (draft.trim() !== '' && Number.isFinite(n)) {
            const clamped = clampInt(n, min, max);
            if (clamped !== value) onCommit(clamped);
          }
        }
        setDraft(null);
      }}
      className={cn(
        'tabular w-full rounded-md border border-transparent bg-transparent text-center hover:border-border focus-visible:border-focus',
        className,
      )}
      {...props}
    />
  );
}

interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  className?: string;
  inputClassName?: string;
  testId?: string;
}

/** Número com botões − e + (bons para o toque). */
export function Stepper({
  value,
  min,
  max,
  onChange,
  label,
  className,
  inputClassName,
  testId,
}: StepperProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button
        type="button"
        className="grid size-7 shrink-0 place-items-center rounded-md border border-border text-muted hover:bg-surface-2 disabled:opacity-40"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={t.sheet.identity.decrease(label)}
      >
        <Minus className="size-3.5" />
      </button>
      <NumberField
        value={value}
        min={min}
        max={max}
        onCommit={onChange}
        label={label}
        className={inputClassName}
        {...(testId ? { 'data-testid': testId, 'data-value': value } : {})}
      />
      <button
        type="button"
        className="grid size-7 shrink-0 place-items-center rounded-md border border-border text-muted hover:bg-surface-2 disabled:opacity-40"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={t.sheet.identity.increase(label)}
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
