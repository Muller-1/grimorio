import type { CreationStep } from '@grimorio/rules';
import type { SkillKey } from '@grimorio/shared';
import { Check, CircleHelp } from 'lucide-react';
import type { ReactNode } from 'react';
import { Popover } from '@/components/ui/popover';
import { t } from '@/lib/i18n';
import { tw } from '@/lib/i18n/wizard';
import { cn } from '@/lib/utils';

/**
 * Barra de etapas do assistente (modelo: "Atributos ── Origem ── Classe ── Toques Finais"),
 * na ordem do Livro do Jogador 2024: Classe → Origem → Atributos → Toques Finais.
 */
export function StepBar({
  steps,
  current,
  done,
  reachable,
  onSelect,
}: {
  steps: readonly CreationStep[];
  current: CreationStep;
  done: (step: CreationStep) => boolean;
  reachable: (step: CreationStep) => boolean;
  onSelect: (step: CreationStep) => void;
}) {
  return (
    <nav aria-label={tw.stepsLabel} className="mx-auto w-full max-w-3xl">
      <ol className="flex items-center gap-2 sm:gap-3">
        {steps.map((step, i) => {
          const active = step === current;
          const finished = done(step) && !active;
          return (
            <li key={step} className={cn('flex items-center gap-2 sm:gap-3', i > 0 && 'flex-1')}>
              {i > 0 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-px flex-1',
                    finished || active ? 'bg-accent' : 'bg-border-strong',
                  )}
                />
              ) : null}
              <button
                type="button"
                onClick={() => onSelect(step)}
                disabled={!reachable(step)}
                aria-current={active ? 'step' : undefined}
                data-testid={`wizard.step.${step}`}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-1 py-1 text-sm font-bold whitespace-nowrap transition-colors sm:text-base',
                  active ? 'text-accent' : 'text-text hover:text-accent',
                  'disabled:cursor-not-allowed disabled:text-muted disabled:hover:text-muted',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-6 place-items-center rounded-full border text-xs',
                    active
                      ? 'border-accent bg-accent text-accent-contrast'
                      : finished
                        ? 'border-accent text-accent'
                        : 'border-border-strong text-muted',
                  )}
                >
                  {finished ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span className={cn(!active && 'max-sm:sr-only')}>{tw.steps[step]}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Cartão selecionável (classe, antecedente, espécie, opção). */
export function ChoiceCard({
  selected,
  onSelect,
  title,
  subtitle,
  badges,
  icon,
  children,
  testId,
  className,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  subtitle?: string;
  badges?: ReactNode;
  /** Ícone antes do título (ex.: o símbolo de cada classe). */
  icon?: ReactNode;
  children?: ReactNode;
  testId?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      data-testid={testId}
      className={cn(
        'group relative flex h-full w-full flex-col rounded-xl border bg-surface p-3 text-left shadow-card transition-colors',
        selected
          ? 'border-accent ring-2 ring-accent/40'
          : 'border-border hover:border-border-strong hover:bg-surface-2/50',
        className,
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-2 font-display text-base font-bold">
          {icon}
          {title}
        </span>
        {selected ? (
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent text-accent-contrast">
            <Check className="size-3.5" aria-hidden="true" />
          </span>
        ) : null}
      </span>
      {subtitle ? <span className="mt-1 text-sm text-muted">{subtitle}</span> : null}
      {badges ? <span className="mt-2 flex flex-wrap gap-1">{badges}</span> : null}
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = 'muted',
}: {
  children: ReactNode;
  tone?: 'muted' | 'accent' | 'gold';
}) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[11px] font-semibold',
        tone === 'accent' && 'bg-accent-soft text-accent',
        tone === 'gold' && 'bg-gold-soft text-gold',
        tone === 'muted' && 'bg-surface-2 text-muted',
      )}
    >
      {children}
    </span>
  );
}

/** Título de bloco dentro de uma etapa. */
export function BlockTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <h3 className="font-display text-sm font-bold tracking-wide">{children}</h3>
      {aside ? <span className="text-xs text-muted">{aside}</span> : null}
    </div>
  );
}

/** Lista "rótulo: valor" compacta. */
export function Facts({ items }: { items: [ReactNode, ReactNode][] }) {
  return (
    <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[max-content_1fr]">
      {items.map(([label, value], i) => (
        <div key={i} className="contents">
          <dt className="font-semibold text-muted">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Escolha de perícias com limite. `locked` = já tem a perícia por outra fonte (não pode marcar
 * de novo); ao chegar no limite, as outras ficam desabilitadas.
 */
export function SkillPicker({
  options,
  selected,
  count,
  locked = [],
  onChange,
  name,
}: {
  options: readonly SkillKey[];
  selected: readonly SkillKey[];
  count: number;
  locked?: readonly SkillKey[];
  onChange: (next: SkillKey[]) => void;
  name: string;
}) {
  const full = selected.length >= count;
  return (
    <fieldset>
      <legend className="sr-only">{name}</legend>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {options.map((skill) => {
          const checked = selected.includes(skill);
          const isLocked = locked.includes(skill) && !checked;
          const disabled = isLocked || (!checked && full);
          return (
            <label
              key={skill}
              title={isLocked ? tw.origin.alreadyProficient : undefined}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-sm transition-colors',
                checked ? 'border-accent bg-accent-soft' : 'border-border bg-surface',
                disabled && 'cursor-not-allowed opacity-50',
              )}
            >
              <input
                type="checkbox"
                className="accent-[var(--accent)]"
                checked={checked}
                disabled={disabled}
                onChange={() =>
                  onChange(checked ? selected.filter((s) => s !== skill) : [...selected, skill])
                }
                data-testid={`wizard.skill.${skill}`}
              />
              <span className={cn(isLocked && 'line-through')}>{t.skills[skill]}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Grupo de opções exclusivas com aparência de botões (radio). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex flex-wrap gap-1 rounded-lg border border-border bg-bg p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-8 rounded-md px-3 text-sm font-semibold transition-colors',
            value === o.value ? 'bg-accent text-accent-contrast' : 'text-text hover:bg-surface-2',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export type GlossaryKey = keyof typeof t.glossary;

/**
 * Termo de regra com explicação ao tocar (feedback dos testadores: introdução para quem é
 * novo). Não usar dentro de botões ou cartões clicáveis (botão dentro de botão).
 */
export function Term({ id, children }: { id: GlossaryKey; children?: ReactNode }) {
  const entry = t.glossary[id];
  return (
    <Popover
      align="start"
      trigger={
        <button
          type="button"
          className="inline-flex items-center gap-0.5 underline decoration-muted decoration-dotted underline-offset-4 hover:decoration-accent"
          data-testid={`term.${id}`}
        >
          {children ?? entry.term}
          <CircleHelp className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
          <span className="sr-only"> {tw.whatIsThis}</span>
        </button>
      }
    >
      <p className="font-semibold">{entry.term}</p>
      <p className="mt-1 text-muted">{entry.text}</p>
    </Popover>
  );
}
