import { BookmarkPlus } from 'lucide-react';
import { useId, useState, type FormEvent, type Ref } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { D20Icon } from '@/components/ui/d20-icon';
import { t } from '@/lib/i18n';
import { useDiceStore } from '../store';

interface DiceExpressionInputProps {
  /** Abre o editor de atalho já com esta expressão. */
  onSaveAsShortcut?: (expression: string) => void;
  /** Versão curta (tela inicial): rótulo só para o leitor de tela e botão sem ícone. */
  compact?: boolean;
  initial?: string;
  /** Para quem precisa focar o campo (ex.: o botão flutuante da ficha). */
  inputRef?: Ref<HTMLInputElement>;
  /** Chamado depois de cada rolagem que deu certo. */
  onRolled?: () => void;
  /** A cada letra digitada (ex.: a bandeja do botão flutuante mostra os dados da expressão). */
  onTextChange?: (text: string) => void;
  /** O jogador tocou no campo (para digitar de novo). */
  onEdit?: () => void;
  /** Prefixo dos `data-testid` (há mais de um campo destes na mesma tela). */
  testIdPrefix?: string;
}

/** Campo de expressão livre (RF-70). Mostra o erro e onde ele está. */
export function DiceExpressionInput({
  onSaveAsShortcut,
  compact = false,
  initial = '1d20',
  inputRef,
  onRolled,
  onTextChange,
  onEdit,
  testIdPrefix = 'dice',
}: DiceExpressionInputProps) {
  const roll = useDiceStore((s) => s.roll);
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const outcome = roll({ label: t.dice.free, expression: text });
    if (outcome.ok) {
      setError(null);
      onRolled?.();
    } else {
      const message = t.dice.errors[outcome.error.code];
      setError(t.dice.errorAt(message, outcome.error.position));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-1.5" noValidate>
      <Label htmlFor={inputId} className={compact ? 'sr-only' : undefined}>
        {t.dice.expression}
      </Label>
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          id={inputId}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onTextChange?.(e.target.value);
          }}
          onPointerDown={onEdit}
          className="h-11 min-w-0 font-mono text-base"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          inputMode="text"
          enterKeyHint="go"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          data-testid={`${testIdPrefix}.input`}
        />
        <Button
          type="submit"
          variant="primary"
          size={compact ? 'md' : 'lg'}
          className={compact ? 'h-11 px-[18px] text-base' : undefined}
          data-testid={`${testIdPrefix}.submit`}
        >
          {compact ? null : <D20Icon className="size-5" />}
          {t.dice.roll}
        </Button>
      </div>
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-sm text-danger"
          data-testid={`${testIdPrefix}.error`}
        >
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
