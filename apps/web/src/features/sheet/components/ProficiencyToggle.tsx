import type { ProficiencyLevel } from '@grimorio/shared';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Livro do Jogador 2024 (glossário, "Especialização"): proficiência dobrada numa perícia em que
 * você já é proficiente. "Metade da proficiência" não é um estado da perícia: é o Pau pra Toda
 * Obra do Bardo, que a ficha soma sozinha nas perícias sem proficiência. Fichas antigas com ½
 * continuam abrindo e o clique leva para ✓.
 */
const NEXT: Record<ProficiencyLevel, ProficiencyLevel> = { 0: 1, 1: 2, 2: 0, 0.5: 1 };

interface ProficiencyToggleProps {
  value: ProficiencyLevel;
  onChange: (value: ProficiencyLevel) => void;
  name: string;
  /** Salvaguardas só têm "sim" ou "não". */
  binary?: boolean;
  testId?: string;
}

/** Caixinha de proficiência: vazia → ✓ → ✓✓ (Especialização) → vazia. */
export function ProficiencyToggle({
  value,
  onChange,
  name,
  binary = false,
  testId,
}: ProficiencyToggleProps) {
  const state = t.sheet.proficiency[value] ?? '';
  return (
    <button
      type="button"
      role={binary ? 'checkbox' : undefined}
      aria-checked={binary ? value > 0 : undefined}
      aria-label={t.sheet.proficiencyToggle(name, state)}
      title={state}
      data-testid={testId}
      data-value={value}
      onClick={() => onChange(binary ? (value > 0 ? 0 : 1) : NEXT[value])}
      className={cn(
        'grid size-5 shrink-0 place-items-center rounded border text-[10px] leading-none font-bold transition-colors',
        value === 0 && 'border-border-strong bg-surface hover:border-accent',
        value === 1 && 'border-accent bg-accent text-accent-contrast',
        value === 2 && 'border-gold bg-gold text-surface',
        value === 0.5 && 'border-accent bg-accent-soft text-accent',
      )}
    >
      {value === 1 ? '✓' : value === 2 ? '✓✓' : value === 0.5 ? '½' : ''}
    </button>
  );
}
