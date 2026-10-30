import { CONDITION_PREFIX, EXHAUSTION_ID, SPELL_ACTIVE_PREFIX } from '@grimorio/rules';
import { Plus, X } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToastStore } from '@/features/toast/store';
import { ts } from '@/lib/i18n/sheet';
import { cn } from '@/lib/utils';
import { useSheet } from '../hooks';
import { useSheetStore } from '../store';

const EffectsDialog = lazy(() => import('./EffectsDialog'));
const o = ts.powers.onYou;
const c = ts.powers.combat;

/**
 * "Efeitos em você" (ADR-011): magias de aliados e de inimigos e condições, escolhidas
 * num popup. A ficha mostra só os que estão valendo, com um X para tirar.
 */
export function EffectsOnYou() {
  const { derived } = useSheet();
  const dispatch = useSheetStore((s) => s.dispatch);
  const toast = useToastStore((s) => s.push);
  const [open, setOpen] = useState(false);
  const [rounds, setRounds] = useState(0);

  const chips = derived.activeEffects.flatMap((e) => {
    if (e.kind === 'ability') return [];
    const good = e.key.startsWith(SPELL_ACTIVE_PREFIX);
    const remove = good
      ? () =>
          dispatch({
            type: 'toggle-spell-effect',
            spellId: e.key.slice(SPELL_ACTIVE_PREFIX.length),
          })
      : e.key.startsWith(`${CONDITION_PREFIX}${EXHAUSTION_ID}`)
        ? () => dispatch({ type: 'set-exhaustion', level: 0 })
        : () => dispatch({ type: 'toggle-on-you', key: e.key });
    return [{ id: e.key, name: e.name, label: o.chip(e.name, ts.powers.timing(e)), good, remove }];
  });

  /** Ação do combate, com o aviso quando algo acabou. */
  const combat = (type: 'start-combat' | 'next-round' | 'end-combat') => {
    for (const n of dispatch({ type })) toast(ts.notices[n], 'info');
  };

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
              data-testid={`on-you.chip.${c.id}`}
            >
              {c.label}
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
      {/* Rodadas: a ficha conta e tira o que acabou (Bênção, Escudo Arcano, condições). */}
      <div className="flex flex-wrap items-center gap-2" data-testid="combat">
        {derived.round === null ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => combat('start-combat')}
              data-testid="combat.start"
            >
              {c.start}
            </Button>
            <span className="text-xs text-muted">{c.hint}</span>
          </>
        ) : (
          <>
            <span
              className="font-display text-sm font-bold"
              data-testid="combat.round"
              data-value={derived.round}
            >
              {c.round(derived.round)}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => combat('next-round')}
              data-testid="combat.next"
            >
              {c.next}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => combat('end-combat')}
              data-testid="combat.end"
            >
              {c.end}
            </Button>
          </>
        )}
      </div>
      {open ? (
        <Suspense fallback={null}>
          <EffectsDialog onClose={() => setOpen(false)} rounds={rounds} onRounds={setRounds} />
        </Suspense>
      ) : null}
    </div>
  );
}
