import type { RollShortcut } from '@grimorio/shared';
import { Pencil, Plus } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { Button } from '@/components/ui/button';
import { D20Icon } from '@/components/ui/d20-icon';
import { Panel } from '@/components/ui/panel';
import { t } from '@/lib/i18n';
import { useToastStore } from '@/features/toast/store';
import { useDiceStore } from '../store';

// O editor (um diálogo) só baixa quando alguém abre: o rolador abre mais rápido.
export const ShortcutEditor = lazy(() => import('./ShortcutEditor'));

const s = t.dice.shortcuts;

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
        <ul className="-mx-1 divide-y divide-border">
          {shortcuts.map((sc) => (
            <li key={sc.id} className="flex items-stretch gap-1 py-1">
              <button
                type="button"
                onClick={() => rollShortcut(sc)}
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent-soft"
                data-testid={`shortcut.${sc.id}`}
              >
                <D20Icon className="size-5 shrink-0 text-accent" />
                <span className="min-w-0 flex-1">
                  {/* O nome acessível vem do texto visível (WCAG 2.5.3); "Rolar" é só para leitor de tela. */}
                  <span className="sr-only">{s.rollPrefix} </span>
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
      {editing ? (
        <Suspense fallback={null}>
          <ShortcutEditor initial={editing} onClose={() => setEditing(null)} />
        </Suspense>
      ) : null}
    </Panel>
  );
}
