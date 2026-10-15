import { type ActivationView, type ResourceView, type SheetNotice } from '@grimorio/rules';
import { Minus, Plus, Power, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { useDiceStore } from '@/features/dice/store';
import { useToastStore } from '@/features/toast/store';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useSheet } from '../hooks';
import { useSheetStore } from '../store';
import { EffectsOnYou } from './EffectsOnYou';

const p = t.sheet.powers;

function useNotify() {
  const push = useToastStore((s) => s.push);
  return (notices: SheetNotice[]) => {
    for (const n of notices) push(t.sheet.notices[n], 'info');
  };
}

function ResourceRow({ r }: { r: ResourceView }) {
  const dispatch = useSheetStore((s) => s.dispatch);
  const notify = useNotify();
  return (
    <li className="flex items-center gap-2 py-1" data-testid={`resource.${r.id}`}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {r.name}
          {r.die ? <span className="ml-1 font-normal text-muted">{p.die(r.die)}</span> : null}
        </p>
        <p className="text-xs text-muted">{p.recharge[r.shortRest]}</p>
      </div>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={p.spend(r.name)}
        title={p.spend(r.name)}
        disabled={r.remaining <= 0}
        onClick={() => notify(dispatch({ type: 'spend-resource', id: r.id }))}
        data-testid={`resource.${r.id}.spend`}
      >
        <Minus className="size-4" />
      </Button>
      <span
        className="tabular min-w-12 text-center font-display text-lg font-bold"
        aria-label={p.usesLabel(r.name, r.remaining, r.max)}
        data-testid={`resource.${r.id}.remaining`}
        data-value={r.remaining}
      >
        {p.uses(r.remaining, r.max)}
      </span>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={p.restore(r.name)}
        title={p.restore(r.name)}
        disabled={r.spent <= 0}
        onClick={() => notify(dispatch({ type: 'restore-resource', id: r.id }))}
      >
        <Plus className="size-4" />
      </Button>
    </li>
  );
}

function ActivationRow({ a, names }: { a: ActivationView; names: Map<string, string> }) {
  const dispatch = useSheetStore((s) => s.dispatch);
  const roll = useDiceStore((s) => s.roll);
  const notify = useNotify();
  const details = [
    a.cost ? p.costs(a.cost.amount, a.cost.resourceName) : null,
    a.requires.length ? p.requires(a.requires.map((id) => names.get(id) ?? id).join(' + ')) : null,
    a.heal ? p.heals(a.heal) : null,
    a.tempHp ? p.tempHp(a.tempHp) : null,
    a.blockedBy === 'no-uses' ? p.noUses : null,
  ].filter(Boolean);

  const use = () => {
    let healRolled: number | undefined;
    let tempHpRolled: number | undefined;
    if (a.heal) {
      const out = roll({ label: p.healRoll(a.name), expression: a.heal });
      if (!out.ok) return;
      healRolled = out.entry.result.total;
    }
    if (a.tempHp) {
      const out = roll({ label: p.tempRoll(a.name), expression: a.tempHp });
      if (!out.ok) return;
      tempHpRolled = out.entry.result.total;
    }
    notify(
      dispatch({
        type: 'use-activation',
        id: a.id,
        ...(healRolled !== undefined ? { healRolled } : {}),
        ...(tempHpRolled !== undefined ? { tempHpRolled } : {}),
      }),
    );
  };

  return (
    <li
      className={cn(
        'flex items-center gap-2 rounded-lg border px-2 py-1.5',
        a.active ? 'border-accent bg-accent-soft' : 'border-border',
      )}
      data-testid={`activation.${a.id}`}
      data-active={a.active}
    >
      <Zap
        className={cn('size-4 shrink-0', a.active ? 'text-accent' : 'text-muted')}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{a.name}</p>
        {details.length ? <p className="text-xs text-muted">{details.join(' · ')}</p> : null}
      </div>
      {a.mode === 'toggle' ? (
        <Button
          size="sm"
          variant={a.active ? 'primary' : 'outline'}
          aria-pressed={a.active}
          aria-label={p.toggleLabel(a.name, a.active)}
          disabled={!a.available}
          onClick={() => notify(dispatch({ type: 'toggle-activation', id: a.id }))}
          data-testid={`activation.${a.id}.toggle`}
        >
          <Power className="size-3.5" />
          {a.active ? p.turnOff : p.turnOn}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={!a.available}
          onClick={use}
          data-testid={`activation.${a.id}.use`}
        >
          {p.use}
        </Button>
      )}
    </li>
  );
}

/**
 * Habilidades de classe (ADR-010): usos que sobram (Fúria, Canalizar Divindade…), o que dá
 * para ligar (Fúria, Ataque Imprudente) ou usar (Recuperar Fôlego), e as magias que estão
 * valendo no personagem. As contas (dano, CA, vantagens) mudam sozinhas na ficha.
 */
export function PowersPanel() {
  const { derived } = useSheet();
  const { resources, activations } = derived.engine;
  const names = new Map(activations.map((a) => [a.id, a.name]));
  const resist = [...new Set(derived.resistances.map((r) => t.damageTypes[r.type]))];
  const active = derived.notes.length > 0 || resist.length > 0;

  return (
    <Panel title={p.title} bodyClassName="space-y-3" className="max-md:scroll-mt-28">
      {resources.length === 0 && activations.length === 0 ? (
        <p className="text-sm text-muted">{p.empty}</p>
      ) : null}
      {resources.length ? (
        <ul className="divide-y divide-border" data-testid="powers.resources">
          {resources.map((r) => (
            <ResourceRow key={r.id} r={r} />
          ))}
        </ul>
      ) : null}
      {activations.length ? (
        <ul className="space-y-1.5" data-testid="powers.activations">
          {activations.map((a) => (
            <ActivationRow key={a.id} a={a} names={names} />
          ))}
        </ul>
      ) : null}
      {active ? (
        <div className="rounded-lg bg-surface-2 px-3 py-2 text-sm" data-testid="powers.active">
          <p className="font-semibold">{p.activeTitle}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {resist.length ? <li>{p.resistances(resist.join(', '))}</li> : null}
            {derived.notes.map((n, i) => (
              <li key={i}>{n.text}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <EffectsOnYou />
    </Panel>
  );
}
