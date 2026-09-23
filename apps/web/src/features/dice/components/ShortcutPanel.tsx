import type { RollShortcut } from '@grimorio/shared';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { D20Icon } from '@/components/ui/d20-icon';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label } from '@/components/ui/input';
import { Panel } from '@/components/ui/panel';
import { t } from '@/lib/i18n';
import { useToastStore } from '@/features/toast/store';
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

/** Editor de atalho (novo ou existente). Mostra o erro ou como a expressão será salva. */
export function ShortcutEditor({
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

/** Lista de atalhos com nome (RF-72). Tocar rola; o lápis edita. */
export function ShortcutPanel({ onNew }: { onNew: () => void }) {
  const shortcuts = useDiceStore((st) => st.shortcuts);
  const roll = useDiceStore((st) => st.roll);
  const toast = useToastStore((st) => st.push);
  const [editing, setEditing] = useState<RollShortcut | null>(null);

  const rollShortcut = (sc: RollShortcut) => {
    const outcome = roll({ label: sc.label, expression: sc.expression });
    if (!outcome.ok) toast(t.dice.errors[outcome.error.code], 'danger');
  };

  return (
    <Panel
      title={s.title}
      actions={
        <Button size="sm" variant="outline" onClick={onNew} data-testid="shortcut.new">
          <Plus className="size-4" />
          {s.new}
        </Button>
      }
    >
      <p className="mb-3 text-xs text-muted">{s.lead}</p>
      {shortcuts.length === 0 ? (
        <p className="py-3 text-center text-sm text-muted">{s.empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {shortcuts.map((sc) => (
            <li key={sc.id} className="flex items-stretch gap-1">
              <button
                type="button"
                onClick={() => rollShortcut(sc)}
                aria-label={s.roll(sc.label, sc.expression)}
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-border bg-surface px-2.5 py-2 text-left transition-colors hover:border-accent hover:bg-accent-soft"
                data-testid={`shortcut.${sc.id}`}
              >
                <D20Icon className="size-5 shrink-0 text-accent" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{sc.label}</span>
                  <span className="block truncate font-mono text-xs text-muted">
                    {sc.expression}
                  </span>
                </span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-auto"
                onClick={() => setEditing(sc)}
                aria-label={s.editLabel(sc.label)}
                title={s.editLabel(sc.label)}
              >
                <Pencil className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {editing ? <ShortcutEditor initial={editing} onClose={() => setEditing(null)} /> : null}
    </Panel>
  );
}
