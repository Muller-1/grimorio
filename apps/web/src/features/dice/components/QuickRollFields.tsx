import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { D20Icon } from '@/components/ui/d20-icon';
import { Stepper } from '@/components/ui/number-field';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { buildQuickExpression, QUICK_DICE } from '../quick';
import { useDiceStore } from '../store';

/** Rolagem rápida por campos: quantidade + tipo de dado + somador (RF-71). */
export function QuickRollFields() {
  const roll = useDiceStore((s) => s.roll);
  const [count, setCount] = useState(1);
  const [sides, setSides] = useState<number>(20);
  const [modifier, setModifier] = useState(0);
  const groupId = useId();
  const q = t.dice.quick;
  const expression = buildQuickExpression({ count, sides, modifier });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    roll({ label: q.label, expression });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-semibold text-muted">{q.count}</p>
          <Stepper
            value={count}
            min={1}
            max={1000}
            onChange={setCount}
            label={q.count}
            inputClassName="h-9 text-lg font-bold"
            testId="dice.quick.count"
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold text-muted">{q.modifier}</p>
          <Stepper
            value={modifier}
            min={-999}
            max={999}
            onChange={setModifier}
            label={q.modifier}
            inputClassName="h-9 text-lg font-bold"
            testId="dice.quick.mod"
          />
        </div>
      </div>

      <fieldset>
        <legend id={groupId} className="mb-1 text-xs font-semibold text-muted">
          {q.die}
        </legend>
        <div
          className="grid grid-cols-4 gap-1.5 min-[420px]:grid-cols-7"
          data-testid="dice.quick.sides"
          data-value={sides}
        >
          {QUICK_DICE.map((d) => (
            <label
              key={d}
              className={cn(
                'relative grid h-10 cursor-pointer place-items-center rounded-md border text-sm font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus',
                sides === d
                  ? 'border-accent bg-accent text-accent-contrast'
                  : 'border-border bg-surface hover:bg-surface-2',
              )}
            >
              <input
                type="radio"
                name={groupId}
                value={d}
                checked={sides === d}
                onChange={() => setSides(d)}
                className="sr-only"
              />
              {q.dieOption(d)}
            </label>
          ))}
        </div>
      </fieldset>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        data-testid="dice.quick.submit"
      >
        <D20Icon className="size-5" />
        {q.roll(expression)}
      </Button>
    </form>
  );
}
