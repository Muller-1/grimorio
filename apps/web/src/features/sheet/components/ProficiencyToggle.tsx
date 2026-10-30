import type { ProficiencyLevel } from '@grimorio/shared';
import { ts } from '@/lib/i18n/sheet';
import { cn } from '@/lib/utils';

/**
 * Livro do Jogador 2024 (glossário, "Especialização"): proficiência dobrada numa perícia em que
 * você já é proficiente. "Metade da proficiência" não é um estado da perícia: é o Pau pra Toda
 * Obra do Bardo, que a ficha soma sozinha nas perícias sem proficiência. Fichas antigas com ½
 * continuam abrindo e o clique leva para ●.
 */
const NEXT: Record<ProficiencyLevel, ProficiencyLevel> = { 0: 1, 1: 2, 2: 0, 0.5: 1 };

/**
 * O marcador redondo (docs/design.md): vazio, cheio (proficiente) ou cheio com um anel dourado
 * (Especialização). Também serve de legenda.
 */
export function ProficiencyDot({ value }: { value: ProficiencyLevel }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'block size-3 shrink-0 rounded-full',
        value === 0 && 'border-[1.5px] border-border-strong',
        value === 1 && 'bg-accent',
        value === 2 && 'bg-accent shadow-[0_0_0_2px_var(--field),0_0_0_3.5px_var(--ornament)]',
        value === 0.5 && 'border-[1.5px] border-accent bg-accent-soft',
      )}
    />
  );
}

interface ProficiencyToggleProps {
  value: ProficiencyLevel;
  onChange: (value: ProficiencyLevel) => void;
  name: string;
  /** Salvaguardas só têm "sim" ou "não". */
  binary?: boolean | undefined;
  testId?: string;
}

/** Marcador de proficiência: vazio → proficiente → Especialização → vazio. */
export function ProficiencyToggle({
  value,
  onChange,
  name,
  binary = false,
  testId,
}: ProficiencyToggleProps) {
  const state = ts.proficiency[value] ?? '';
  return (
    <button
      type="button"
      role={binary ? 'checkbox' : undefined}
      aria-checked={binary ? value > 0 : undefined}
      aria-label={ts.proficiencyToggle(name, state)}
      title={state}
      data-testid={testId}
      data-value={value}
      onClick={() => onChange(binary ? (value > 0 ? 0 : 1) : NEXT[value])}
      className="grid size-7 shrink-0 place-items-center rounded-md hover:bg-surface-2"
    >
      <ProficiencyDot value={value} />
    </button>
  );
}
