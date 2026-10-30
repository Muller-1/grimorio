import { Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label } from '@/components/ui/input';
import { t } from '@/lib/i18n';
import { useDiceStore, validateShortcut, type ShortcutError } from '../store';

const s = t.dice.shortcuts;

function errorText(error: ShortcutError): string {
  switch (error.kind) {
    case 'label':
      return s.labelError;
    case 'limit':
      return s.limitError;
    case 'expression':
      return t.dice.errorAt(t.dice.errors[error.error.code], error.error.position);
  }
}

/**
 * Editor de atalho (novo ou existente). Mostra o erro ou como a expressão será salva. Fica num
 * arquivo à parte, carregado só quando abre: o diálogo não pesa na abertura do rolador.
 */
export default function ShortcutEditor({
  initial,
  onClose,
}: {
  /** `id` ausente = atalho novo (pode vir com a expressão preenchida). */
  initial: { id?: string; label: string; expression: string };
  onClose: () => void;
}) {
  const add = useDiceStore((st) => st.addShortcut);
  const update = useDiceStore((st) => st.updateShortcut);
  const remove = useDiceStore((st) => st.removeShortcut);
  const [label, setLabel] = useState(initial.label);
  const [expression, setExpression] = useState(initial.expression);
  const [touched, setTouched] = useState(false);
  const nameId = useId();
  const exprId = useId();
  const feedbackId = useId();

  const check = validateShortcut({ label: label || '·', expression });
  const labelOk = label.trim() !== '' && label.trim().length <= 40;
  const feedback =
    expression.trim() === ''
      ? null
      : check.ok
        ? { ok: true, text: s.preview(check.clean.expression) }
        : { ok: false, text: errorText(check.error) };

  const save = () => {
    setTouched(true);
    const input = { label, expression };
    const outcome = initial.id ? update(initial.id, input) : add(input);
    if (outcome.ok) onClose();
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={initial.id ? s.editorTitleEdit : s.editorTitleNew}
      footer={
        <>
          {initial.id ? (
            <Button
              variant="ghost"
              className="mr-auto text-danger"
              onClick={() => {
                remove(initial.id!);
                onClose();
              }}
            >
              <Trash2 className="size-4" />
              {s.confirmRemove}
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>
            {s.cancel}
          </Button>
          <Button
            variant="primary"
            onClick={save}
            disabled={!check.ok || !labelOk}
            data-testid="shortcut.save"
          >
            {s.save}
          </Button>
        </>
      }
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div>
          <Label htmlFor={nameId}>{s.name}</Label>
          <Input
            id={nameId}
            value={label}
            maxLength={40}
            placeholder={s.namePlaceholder}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={touched && !labelOk ? true : undefined}
            data-testid="shortcut.name"
          />
          {touched && !labelOk ? <p className="mt-1 text-sm text-danger">{s.labelError}</p> : null}
        </div>
        <div>
          <Label htmlFor={exprId}>{s.expression}</Label>
          <Input
            id={exprId}
            value={expression}
            maxLength={200}
            placeholder={s.expressionPlaceholder}
            onChange={(e) => setExpression(e.target.value)}
            className="font-mono"
            autoCapitalize="off"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={feedback && !feedback.ok ? true : undefined}
            aria-describedby={feedback ? feedbackId : undefined}
            data-testid="shortcut.expression"
          />
          {feedback ? (
            <p
              id={feedbackId}
              aria-live="polite"
              className={feedback.ok ? 'mt-1 text-sm text-muted' : 'mt-1 text-sm text-danger'}
            >
              {feedback.text}
            </p>
          ) : null}
        </div>
        {/* Enter no formulário salva */}
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
