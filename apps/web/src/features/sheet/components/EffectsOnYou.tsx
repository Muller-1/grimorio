import {
  CONDITION_PREFIX,
  DEBUFF_PREFIX,
  onYouEntry,
  SPELL_ACTIVE_PREFIX,
  SPELL_EFFECTS,
} from '@grimorio/rules';
import { Plus, X } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useSheet } from '../hooks';
import { useSheetStore } from '../store';

const EffectsDialog = lazy(() => import('./EffectsDialog'));
const o = t.sheet.powers.onYou;

/**
 * "Efeitos em você" (ADR-011): magias de aliados e de inimigos e condições, escolhidas
 * num popup. A ficha mostra só os que estão valendo, com um X para tirar.
 */
export function EffectsOnYou() {
  const { sheet } = useSheet();
  const dispatch = useSheetStore((s) => s.dispatch);
  const [open, setOpen] = useState(false);

  const chips = sheet.state.active.flatMap((id) => {
    if (id.startsWith(SPELL_ACTIVE_PREFIX)) {
      const spell = SPELL_EFFECTS[id.slice(SPELL_ACTIVE_PREFIX.length)];
      return spell
        ? [
            {
              id,
              name: spell.name,
              good: true,
              remove: () =>
                dispatch({
                  type: 'toggle-spell-effect',
                  spellId: id.slice(SPELL_ACTIVE_PREFIX.length),
                }),
            },
          ]
        : [];
    }
    if (id.startsWith(CONDITION_PREFIX) || id.startsWith(DEBUFF_PREFIX)) {
      const entry = onYouEntry(id);
      if (!entry) return [];
      const exhaustion = entry.id === 'exhaustion';
      return [
        {
          id,
          name: entry.name,
          good: false,
          remove: () =>
            exhaustion
              ? dispatch({ type: 'set-exhaustion', level: 0 })
              : dispatch({ type: 'toggle-on-you', key: id }),
        },
      ];
    }
    return [];
  });

  return (
    <div className="space-y-2 border-t border-border-soft pt-3" data-testid="on-you">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="min-w-0" title={o.hint}>
          <p className="text-sm font-bold">{o.title}</p>
          {chips.length ? null : <p className="text-sm text-muted">{o.none}</p>}
        </div>
        <Button variant="outline" onClick={() => setOpen(true)} data-testid="on-you.open">
          <Plus className="size-4" />
          {o.add}
        </Button>
      </div>
      {chips.length ? (
        <ul className="flex flex-wrap gap-1.5" data-testid="on-you.chips">
          {chips.map((c) => (
            <li
              key={c.id}
              className={cn(
                'flex items-center gap-1 rounded-full border py-0.5 pr-1 pl-2.5 text-sm',
                c.good ? 'border-accent bg-accent-soft' : 'border-danger/60 bg-danger-soft',
              )}
            >
              {c.name}
              <button
                type="button"
                onClick={c.remove}
                aria-label={o.remove(c.name)}
                className="rounded-full p-0.5 hover:bg-surface-2"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {open ? (
        <Suspense fallback={null}>
          <EffectsDialog onClose={() => setOpen(false)} />
        </Suspense>
      ) : null}
    </div>
  );
}
