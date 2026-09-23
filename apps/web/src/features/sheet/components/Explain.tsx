import type { Explained, PartSource } from '@grimorio/rules';
import type { ReactNode } from 'react';
import { Popover } from '@/components/ui/popover';
import { formatModifier } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** Traduz a origem de cada parte de um número (o motor só devolve códigos). */
export function partLabel(source: PartSource): string {
  switch (source.kind) {
    case 'base':
      return t.sheet.explain.base;
    case 'ability':
      return t.abilities[source.ability];
    case 'proficiency':
      return t.sheet.explain.proficiency(source.level);
    case 'level':
      return t.sheet.explain.level;
    case 'hit-die':
      return t.sheet.explain.hitDie(source.die, source.levels);
    case 'magic':
      return t.sheet.explain.magic;
    case 'override':
      return t.sheet.explain.override;
  }
}

/** Lista "Destreza +3 / Proficiência +2 / Total +5". */
export function ExplainList({
  explained,
  signed = true,
}: {
  explained: Explained;
  signed?: boolean;
}) {
  const fmt = (n: number, i: number) => (signed || i > 0 ? formatModifier(n) : String(n));
  return (
    <dl className="space-y-1 text-sm">
      {explained.parts.map((part, i) => (
        <div key={i} className="flex justify-between gap-4">
          <dt className="text-muted">{partLabel(part.source)}</dt>
          <dd className="tabular font-medium">{fmt(part.value, i)}</dd>
        </div>
      ))}
      <div className="flex justify-between gap-4 border-t border-border pt-1 font-bold">
        <dt>{t.sheet.explain.total}</dt>
        <dd className="tabular">{signed ? formatModifier(explained.value) : explained.value}</dd>
      </div>
    </dl>
  );
}

interface ExplainButtonProps {
  explained: Explained;
  /** Título do balão (ex.: "Furtividade"). */
  title: string;
  /** `true` = mostra com sinal (+3); `false` = número simples (18). */
  signed?: boolean;
  testId: string;
  className?: string;
  /** Conteúdo extra no balão (ex.: campo de ajuste manual). */
  extra?: ReactNode;
  children?: ReactNode;
}

/**
 * Um número derivado. Tocar mostra de onde ele vem (RF-34).
 * `data-testid` + `data-value` (valor bruto) para o bot de testes (plano v2, 8).
 */
export function ExplainButton({
  explained,
  title,
  signed = true,
  testId,
  className,
  extra,
  children,
}: ExplainButtonProps) {
  return (
    <Popover
      trigger={
        <button
          type="button"
          data-testid={testId}
          data-value={explained.value}
          className={cn(
            'tabular rounded-md px-1 font-semibold decoration-dotted underline-offset-4 hover:bg-surface-2 hover:underline',
            className,
          )}
          aria-label={`${title}: ${signed ? formatModifier(explained.value) : explained.value}. ${t.sheet.explain.title}`}
        >
          {children ?? (signed ? formatModifier(explained.value) : explained.value)}
        </button>
      }
    >
      <p className="mb-2 font-display text-sm font-bold">{title}</p>
      <ExplainList explained={explained} signed={signed} />
      {extra ? <div className="mt-3 border-t border-border pt-3">{extra}</div> : null}
    </Popover>
  );
}
