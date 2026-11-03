import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface RadioCardProps {
  /** Mesmo `name` em todas as opções do grupo: as setas do teclado trocam entre elas. */
  name: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
  title: ReactNode;
  text?: ReactNode;
  /** Desenho à esquerda (a amostra do tema, o "Aa" da fonte). */
  visual?: ReactNode;
  testId?: string;
}

/**
 * Uma opção de um grupo de rádio do próprio navegador, desenhada como cartão (tema de cores,
 * movimento, fonte). O rádio fica escondido; o foco aparece no cartão inteiro.
 */
export function RadioCard({
  name,
  value,
  checked,
  onSelect,
  title,
  text,
  visual,
  testId,
}: RadioCardProps) {
  return (
    <label
      data-testid={testId}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-lg border px-2.5 py-2',
        'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-focus',
        checked ? 'border-accent bg-accent-soft' : 'border-transparent hover:bg-surface-2',
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      {visual}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{title}</span>
        {text ? <span className="block text-xs text-muted">{text}</span> : null}
      </span>
      {checked && <Check className="size-4 shrink-0 text-accent" aria-hidden="true" />}
    </label>
  );
}
