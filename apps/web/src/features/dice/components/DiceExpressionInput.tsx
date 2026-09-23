import { BookmarkPlus } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { D20Icon } from '@/components/ui/d20-icon';
import { t } from '@/lib/i18n';
import { useDiceStore } from '../store';

interface DiceExpressionInputProps {
  /** Abre o editor de atalho já com esta expressão. */
  onSaveAsShortcut?: (expression: string) => void;
}

/** Campo de expressão livre (RF-70). Mostra o erro e onde ele está. */
export function DiceExpressionInput({ onSaveAsShortcut }: DiceExpressionInputProps) {
  const roll = useDiceStore((s) => s.roll);
  const [text, setText] = useState('1d20');
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const outcome = roll({ label: t.dice.free, expression: text });
    if (outcome.ok) setError(null);
    else {
      const message = t.dice.errors[outcome.error.code];
      setError(t.dice.errorAt(message, outcome.error.position));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-1.5" noValidate>
      <Label htmlFor={inputId}>{t.dice.expression}</Label>
      <div className="flex gap-2">
        <Input
          id={inputId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="h-11 font-mono text-base"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          inputMode="text"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          data-testid="dice.input"
        />
        <Button type="submit" variant="primary" size="lg" data-testid="dice.submit">
          <D20Icon className="size-5" />
          {t.dice.roll}
        </Button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-danger" data-testid="dice.error">
          {error}
        </p>
      ) : null}
      {onSaveAsShortcut ? (
        <Button
          size="sm"
          variant="ghost"
          className="-ml-2"
          onClick={() => onSaveAsShortcut(text)}
          disabled={text.trim() === ''}
          data-testid="dice.save-shortcut"
        >
          <BookmarkPlus className="size-4" />
          {t.dice.saveAsShortcut}
        </Button>
      ) : null}
    </form>
  );
}
