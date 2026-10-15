import {
  abilityModifier,
  draftBackground,
  draftClass,
  finalScores,
  MANUAL_MAX,
  MANUAL_MIN,
  POINT_BUY_BUDGET,
  POINT_BUY_MAX,
  POINT_BUY_MIN,
  pointBuyCost,
  pointBuySpent,
  rollAbilityScores,
  STANDARD_ARRAY,
  suggestBackgroundBonus,
  type BaseScores,
} from '@grimorio/rules';
import {
  ABILITY_KEYS,
  ABILITY_METHODS,
  type AbilityKey,
  type AbilityMethod,
} from '@grimorio/shared';
import { ArrowDown, Dices, Minus, Plus, Sparkles, Wand2 } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { NumberField } from '@/components/ui/number-field';
import { Panel } from '@/components/ui/panel';
import { formatModifier } from '@/lib/format';
import { t } from '@/lib/i18n';
import { tw } from '@/lib/i18n/wizard';
import { cn } from '@/lib/utils';
import { getRng } from '@/ports/rng';
import { Badge, Segmented, Term } from '../components/parts';
import { goToIssue } from '../guide';
import { useBuilderStore } from '../store';

const a = tw.abilities;

/** Posição de cada atributo no círculo (em %), começando no topo e girando no sentido horário. */
const POSITIONS: Record<AbilityKey, { x: number; y: number }> = {
  str: { x: 50, y: 13 },
  dex: { x: 84, y: 32 },
  con: { x: 84, y: 70 },
  int: { x: 50, y: 88 },
  wis: { x: 16, y: 70 },
  cha: { x: 16, y: 32 },
};

/** Valores de uma lista ainda não usados (conta repetidos: 12 e 12 são dois valores). */
function remaining(pool: readonly number[], scores: BaseScores, except?: AbilityKey): number[] {
  const left = [...pool];
  for (const k of ABILITY_KEYS) {
    if (k === except) continue;
    const v = scores[k];
    if (v === null) continue;
    const i = left.indexOf(v);
    if (i >= 0) left.splice(i, 1);
  }
  return left.sort((x, y) => y - x);
}

function PoolSelect({ ability, pool }: { ability: AbilityKey; pool: readonly number[] }) {
  const scores = useBuilderStore((s) => s.draft.baseScores);
  const update = useBuilderStore((s) => s.update);
  const options = [...new Set(remaining(pool, scores, ability))];
  const value = scores[ability];
  return (
    <select
      aria-label={a.valueFor(t.abilities[ability])}
      value={value ?? ''}
      onChange={(e) =>
        update(
          (d) =>
            void (d.baseScores[ability] = e.target.value === '' ? null : Number(e.target.value)),
        )
      }
      className="h-8 w-24 rounded-md border border-border bg-surface px-1 text-center text-sm font-semibold"
      data-testid={`wizard.ability.${ability}`}
    >
      <option value="">{a.choose}</option>
      {options.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  );
}

function PointBuyControl({ ability }: { ability: AbilityKey }) {
  const scores = useBuilderStore((s) => s.draft.baseScores);
  const update = useBuilderStore((s) => s.update);
  const value = scores[ability] ?? POINT_BUY_MIN;
  const spent = pointBuySpent(scores);
  const next = pointBuyCost(value + 1);
  const canUp =
    value < POINT_BUY_MAX &&
    next !== null &&
    spent - (pointBuyCost(value) ?? 0) + next <= POINT_BUY_BUDGET;
  const set = (n: number) => update((d) => void (d.baseScores[ability] = n));
  return (
    <div
      className="flex items-center gap-1"
      data-testid={`wizard.ability.${ability}`}
      data-value={value}
    >
      <button
        type="button"
        aria-label={a.decrease(t.abilities[ability])}
        disabled={value <= POINT_BUY_MIN}
        onClick={() => set(value - 1)}
        className="grid size-7 place-items-center rounded-md border border-border bg-surface disabled:opacity-40"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="tabular w-7 text-center text-sm font-semibold">{value}</span>
      <button
        type="button"
        aria-label={a.increase(t.abilities[ability])}
        disabled={!canUp}
        onClick={() => set(value + 1)}
        className="grid size-7 place-items-center rounded-md border border-border bg-surface disabled:opacity-40"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

function ManualControl({ ability }: { ability: AbilityKey }) {
  const value = useBuilderStore((s) => s.draft.baseScores[ability]);
  const update = useBuilderStore((s) => s.update);
  return (
    <NumberField
      label={a.valueFor(t.abilities[ability])}
      value={value ?? 10}
      min={MANUAL_MIN}
      max={MANUAL_MAX}
      onCommit={(n) => update((d) => void (d.baseScores[ability] = n))}
      className="h-8 w-16 border-border bg-surface text-sm font-semibold"
      data-testid={`wizard.ability.${ability}`}
    />
  );
}

function AbilityNode({ ability, method }: { ability: AbilityKey; method: AbilityMethod }) {
  const draft = useBuilderStore((s) => s.draft);
  const base = draft.baseScores[ability];
  const bonus = draft.backgroundBonus[ability] ?? 0;
  const final = base === null ? null : Math.min(20, base + bonus);
  const primary = draftClass(draft)?.primary.includes(ability) ?? false;
  const pos = POSITIONS[ability];

  return (
    <div
      className="flex flex-col items-center gap-1.5 sm:absolute sm:top-[var(--y)] sm:left-[var(--x)] sm:-translate-x-1/2 sm:-translate-y-[3.75rem]"
      style={{ '--x': `${pos.x}%`, '--y': `${pos.y}%` } as CSSProperties}
    >
      <div
        className={cn(
          'relative grid size-[7.5rem] place-items-center rounded-full border-4 bg-surface text-center shadow-card',
          primary ? 'border-accent' : 'border-border-strong',
        )}
        data-testid={`wizard.ability.${ability}.final`}
        data-value={final ?? ''}
      >
        <div className="leading-none">
          <p className="tabular font-display text-3xl font-bold">{final ?? '—'}</p>
          <p className="mx-auto mt-1 w-16 border-t border-border pt-1 text-[10px] font-bold tracking-wider text-muted uppercase">
            {t.abilities[ability]}
          </p>
          <p className="font-display text-lg font-bold">{t.abilitiesShort[ability]}</p>
        </div>
        {final !== null ? (
          <span className="tabular absolute -right-1 top-1 rounded-full bg-gold-soft px-1.5 py-0.5 text-xs font-bold text-gold">
            {formatModifier(abilityModifier(final))}
          </span>
        ) : null}
        {bonus ? (
          <span className="tabular absolute -left-1 top-1 rounded-full bg-accent-soft px-1.5 py-0.5 text-xs font-bold text-accent">
            {`+${bonus}`}
          </span>
        ) : null}
      </div>
      {method === 'standard-array' ? <PoolSelect ability={ability} pool={STANDARD_ARRAY} /> : null}
      {method === 'rolled' ? <RolledSelect ability={ability} /> : null}
      {method === 'point-buy' ? <PointBuyControl ability={ability} /> : null}
      {method === 'manual' ? <ManualControl ability={ability} /> : null}
      {primary ? <Badge tone="accent">{a.primaryBadge}</Badge> : null}
    </div>
  );
}

function RolledSelect({ ability }: { ability: AbilityKey }) {
  const rolled = useBuilderStore((s) => s.draft.rolled);
  if (!rolled) return <span className="h-8 text-xs text-muted">{'—'}</span>;
  return <PoolSelect ability={ability} pool={rolled} />;
}

function CenterInfo({ method }: { method: AbilityMethod }) {
  const draft = useBuilderStore((s) => s.draft);
  let status = '';
  if (method === 'point-buy') {
    const left = POINT_BUY_BUDGET - pointBuySpent(draft.baseScores);
    status = left >= 0 ? a.pointsLeft(left) : a.pointsOver(-left);
  } else if (method === 'standard-array' || (method === 'rolled' && draft.rolled)) {
    const pool = method === 'rolled' ? draft.rolled! : STANDARD_ARRAY;
    const left = remaining(pool, draft.baseScores);
    status = left.length ? `${a.remaining} ${left.join(' · ')}` : '';
  }
  return (
    <div className="pointer-events-none grid size-40 place-items-center rounded-full border-4 border-border-strong bg-bg text-center max-sm:hidden">
      <div>
        <p className="font-display text-xl font-bold tracking-wider uppercase">{a.wheelCenter}</p>
        {status ? (
          <p className="tabular mt-1 px-3 text-xs text-muted" data-testid="wizard.ability.status">
            {status}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function AbilityWheel({ method }: { method: AbilityMethod }) {
  return (
    <div className="relative mx-auto grid w-full max-w-[34rem] grid-cols-2 gap-4 sm:mb-16 sm:block sm:aspect-square">
      {/* Anel e ligações (só no círculo, a partir de telas médias) */}
      <svg
        viewBox="0 0 100 100"
        className="pointer-events-none absolute inset-0 size-full text-border-strong max-sm:hidden"
        aria-hidden="true"
      >
        <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" strokeWidth="0.6" />
        <circle
          cx="50"
          cy="50"
          r="33"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.3"
          strokeDasharray="1 1.5"
        />
        {ABILITY_KEYS.map((k) => (
          <line
            key={k}
            x1="50"
            y1="50"
            x2={POSITIONS[k].x}
            y2={POSITIONS[k].y}
            stroke="currentColor"
            strokeWidth="0.4"
          />
        ))}
      </svg>
      <div className="absolute inset-0 grid place-items-center max-sm:hidden">
        <CenterInfo method={method} />
      </div>
      {ABILITY_KEYS.map((k) => (
        <AbilityNode key={k} ability={k} method={method} />
      ))}
    </div>
  );
}

function BackgroundBonus() {
  const draft = useBuilderStore((s) => s.draft);
  const update = useBuilderStore((s) => s.update);
  const bg = draftBackground(draft);
  const cls = draftClass(draft);
  if (!bg) {
    return (
      <Panel id="wizard-background-bonus" title={a.bonusTitle('—')}>
        <p className="text-sm text-muted">{a.bonusNeedsBackground}</p>
      </Panel>
    );
  }
  return (
    <Panel
      id="wizard-background-bonus"
      title={a.bonusTitle(bg.name)}
      actions={
        cls ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              update(
                (d) => void (d.backgroundBonus = suggestBackgroundBonus(bg.abilities, cls.primary)),
              )
            }
          >
            <Wand2 className="size-4" aria-hidden="true" />
            {a.bonusSuggest}
          </Button>
        ) : null
      }
    >
      <p className="mb-3 text-sm text-muted">{a.bonusHint}</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {bg.abilities.map((k) => (
          <div key={k} className="rounded-lg border border-border p-2">
            <p className="mb-1 text-sm font-semibold">{t.abilities[k]}</p>
            <Segmented
              label={t.abilities[k]}
              value={String(draft.backgroundBonus[k] ?? 0)}
              options={[
                { value: '0', label: '0' },
                { value: '1', label: '+1' },
                { value: '2', label: '+2' },
              ]}
              onChange={(v) =>
                update((d) => {
                  const n = Number(v);
                  if (n === 0) delete d.backgroundBonus[k];
                  else d.backgroundBonus[k] = n;
                  // Só um atributo pode ter +2.
                  if (n === 2) {
                    for (const other of bg.abilities) {
                      if (other !== k && d.backgroundBonus[other] === 2)
                        d.backgroundBonus[other] = 1;
                    }
                  }
                })
              }
            />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function RollPanel() {
  const rolls = useBuilderStore((s) => s.rolls);
  const update = useBuilderStore((s) => s.update);
  const setRolls = useBuilderStore((s) => s.setRolls);
  const [confirm, setConfirm] = useState(false);
  const roll = () => {
    const result = rollAbilityScores(getRng());
    setRolls(result);
    update((d) => {
      d.rolled = result.map((r) => r.total);
      d.baseScores = { str: null, dex: null, con: null, int: null, wis: null, cha: null };
    });
  };
  return (
    <div className="space-y-2">
      {rolls ? (
        <div>
          <p className="mb-1 text-xs font-semibold text-muted">{a.rolledTitle}</p>
          <ul className="flex flex-wrap gap-2" data-testid="wizard.rolls">
            {rolls.map((r, i) => (
              <li
                key={i}
                className="flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1"
              >
                {r.dice.map((d, j) => (
                  <span
                    key={j}
                    className={cn(
                      'tabular grid size-6 place-items-center rounded border text-xs',
                      j === r.dropped
                        ? 'border-dashed text-muted line-through'
                        : 'border-border-strong',
                    )}
                  >
                    {d}
                  </span>
                ))}
                <strong className="tabular ml-1 font-display text-lg">{r.total}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Button
        variant={rolls ? 'outline' : 'primary'}
        size="sm"
        onClick={() => (rolls ? setConfirm(true) : roll())}
        data-testid="wizard.roll"
      >
        <Dices className="size-4" aria-hidden="true" />
        {rolls ? a.reroll : a.roll}
      </Button>
      <Dialog
        open={confirm}
        onOpenChange={setConfirm}
        title={a.rerollTitle}
        description={a.rerollText}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              {tw.cancel}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setConfirm(false);
                roll();
              }}
            >
              {a.reroll}
            </Button>
          </>
        }
      />
    </div>
  );
}

export function AbilitiesStep() {
  const draft = useBuilderStore((s) => s.draft);
  const update = useBuilderStore((s) => s.update);
  const method = draft.abilityMethod;
  const cls = draftClass(draft);

  const changeMethod = (next: AbilityMethod) =>
    update((d) => {
      if (d.abilityMethod === next) return;
      d.abilityMethod = next;
      const fill = (v: number | null) =>
        Object.fromEntries(ABILITY_KEYS.map((k) => [k, v])) as BaseScores;
      if (next === 'point-buy') d.baseScores = fill(POINT_BUY_MIN);
      else if (next === 'manual') {
        d.baseScores = Object.fromEntries(
          ABILITY_KEYS.map((k) => [k, d.baseScores[k] ?? 10]),
        ) as BaseScores;
      } else d.baseScores = fill(null);
    });

  const final = finalScores(draft.baseScores, draft.backgroundBonus);

  return (
    <div className="space-y-6">
      <div
        id="wizard-abilities"
        className="grid scroll-mt-24 gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center"
      >
        <div className="space-y-4 text-[15px] leading-relaxed">
          <h1 className="font-display text-2xl font-bold">{a.title}</h1>
          {a.intro.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <Term id="attribute" />
            <Term id="modifier" />
          </p>
          <Segmented
            label={a.title}
            value={method}
            options={ABILITY_METHODS.map((m) => ({ value: m, label: a.methods[m] ?? m }))}
            onChange={changeMethod}
          />
          <p className="text-sm text-muted">{a.methodHints[method]}</p>
          {method === 'standard-array' && cls ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => update((d) => void (d.baseScores = { ...cls.standardArray }))}
              data-testid="wizard.ability.suggest"
            >
              <Sparkles className="size-4" aria-hidden="true" />
              {a.useSuggestion(cls.name)}
            </Button>
          ) : null}
          {method === 'rolled' ? <RollPanel /> : null}
          <button
            type="button"
            onClick={() => goToIssue('bonus-wrong-shape')}
            className="flex items-center gap-1.5 text-sm font-semibold text-accent underline-offset-4 hover:underline"
          >
            <ArrowDown className="size-4" aria-hidden="true" />
            {a.bonusJump}
          </button>
        </div>
        <AbilityWheel method={method} />
      </div>

      <BackgroundBonus />

      <p className="sr-only" aria-live="polite">
        {ABILITY_KEYS.map((k) => `${t.abilitiesShort[k]} ${final[k]}`).join(', ')}
      </p>
    </div>
  );
}
