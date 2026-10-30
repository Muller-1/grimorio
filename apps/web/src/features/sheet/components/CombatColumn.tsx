import { withModifier, type SheetNotice } from '@grimorio/rules';
import { HIT_DIE_SIDES, type HitDieSides } from '@grimorio/shared';
import { Undo2 } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { D20Icon } from '@/components/ui/d20-icon';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label } from '@/components/ui/input';
import { NumberField } from '@/components/ui/number-field';
import { Panel } from '@/components/ui/panel';
import { Popover } from '@/components/ui/popover';
import { StrokeIcon, type IconName } from '@/components/ui/stroke-icon';
import { SwitchTrack } from '@/components/ui/switch-track';
import { useDiceStore } from '@/features/dice/store';
import { useToastStore } from '@/features/toast/store';
import { feetToMeters, metersToFeet } from '@/lib/format';
import { ts } from '@/lib/i18n/sheet';
import { cn } from '@/lib/utils';
import { useSheet } from '../hooks';
import { useSheetStore } from '../store';
import { AdvantageBadge, d20 } from './AdvantageBadge';
import { ExplainButton } from './Explain';

/** Mostra os avisos do motor (códigos) como mensagens. */
function useNotify() {
  const push = useToastStore((s) => s.push);
  return (notices: SheetNotice[]) => {
    for (const n of notices) {
      const tone =
        n === 'dead' || n === 'instant-death'
          ? 'danger'
          : n === 'revived' || n === 'stable'
            ? 'success'
            : 'info';
      push(ts.notices[n], tone);
    }
  };
}

/** Cartão da grade de combate: ícone, número grande e o rótulo embaixo. */
function StatTile({
  icon,
  label,
  children,
  aside,
}: {
  icon: IconName;
  label: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-[60px] items-center gap-3 rounded-[10px] border border-border-soft bg-field px-2.5 py-2">
      <StrokeIcon name={icon} className="size-[26px] shrink-0 text-border-strong" />
      <div className="flex min-w-0 flex-col items-start">
        <div className="flex items-center gap-1">{children}</div>
        <span className="text-xs text-muted">{label}</span>
      </div>
      {aside}
    </div>
  );
}

const BIG = 'font-display text-[1.625rem] leading-[1.05] font-bold';

function CombatStats() {
  const { sheet, derived } = useSheet();
  const edit = useSheetStore((s) => s.edit);
  const acId = useId();
  const speedId = useId();
  const override = sheet.combat.armorClassOverride;
  const c = ts.combat;
  const inspired = sheet.state.inspiration > 0;

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <StatTile icon="shield" label={c.acLong}>
        <ExplainButton
          explained={derived.armorClass}
          title={c.acLong}
          signed={false}
          testId="stat.ac"
          className={cn(BIG, '-mx-1')}
          extra={
            <div className="space-y-1.5">
              <Label htmlFor={acId}>{c.acManual}</Label>
              <NumberField
                id={acId}
                value={override ?? derived.armorClass.value}
                min={0}
                max={50}
                onCommit={(v) => edit((d) => void (d.combat.armorClassOverride = v))}
                label={c.acManual}
                className="h-9 border-border text-left"
              />
              <p className="text-xs text-muted">{c.acManualHint}</p>
              {override !== undefined ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => edit((d) => void delete d.combat.armorClassOverride)}
                >
                  {c.acAuto}
                </Button>
              ) : null}
            </div>
          }
        />
      </StatTile>

      <StatTile
        icon="zap"
        label={c.initiative}
        aside={
          <RollInitiative
            advantage={derived.initiativeAdvantage}
            disadvantage={derived.initiativeDisadvantage}
            bonus={derived.initiative.value}
          />
        }
      >
        <ExplainButton
          explained={derived.initiative}
          title={c.initiative}
          testId="stat.initiative"
          className={cn(BIG, '-mx-1')}
        />
        <AdvantageBadge
          advantage={derived.initiativeAdvantage}
          disadvantage={derived.initiativeDisadvantage}
        />
      </StatTile>

      <StatTile icon="footprints" label={c.speed}>
        <Popover
          trigger={
            <button
              type="button"
              className={cn('tabular -mx-1 rounded-md px-1 hover:bg-surface-2', BIG)}
              data-testid="stat.speed"
              data-value={derived.speedFt}
              aria-label={`${c.speed}: ${c.speedValue(feetToMeters(derived.speedFt))}`}
            >
              {c.speedValue(feetToMeters(derived.speedFt))}
            </button>
          }
        >
          <Label htmlFor={speedId}>{c.speedEdit}</Label>
          <Input
            id={speedId}
            type="number"
            inputMode="decimal"
            step={1.5}
            min={0}
            max={90}
            defaultValue={Number(feetToMeters(sheet.combat.speedFt).replace(',', '.'))}
            onChange={(e) => {
              const m = Number(e.target.value);
              if (Number.isFinite(m) && m >= 0 && m <= 90)
                edit((d) => void (d.combat.speedFt = metersToFeet(m)));
            }}
            className="mt-1"
          />
          {/* O campo é o deslocamento base; magias, condições e carga mudam o valor de agora. */}
          {derived.speedFt !== sheet.combat.speedFt ? (
            <p className="mt-1.5 max-w-56 text-xs text-muted" data-testid="stat.speed.why">
              {derived.load.over
                ? c.speedLoaded(feetToMeters(derived.speedFt))
                : c.speedNow(feetToMeters(derived.speedFt))}
            </p>
          ) : null}
        </Popover>
      </StatTile>

      {/* Inspiração Heroica (2024): ou você tem, ou não tem. */}
      <button
        type="button"
        role="switch"
        aria-checked={inspired}
        aria-label={inspired ? ts.identity.inspirationOn : ts.identity.inspirationOff}
        onClick={() => edit((d) => void (d.state.inspiration = inspired ? 0 : 1))}
        className={cn(
          'flex min-h-[60px] items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left',
          inspired
            ? 'border-[1.5px] border-ornament bg-gold-soft'
            : 'border border-border-soft bg-field hover:bg-surface-2',
        )}
        data-testid="stat.inspiration"
        data-value={sheet.state.inspiration}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 shrink-0">
          <path
            d="M12 2 14.2 9.8 22 12 14.2 14.2 12 22 9.8 14.2 2 12 9.8 9.8Z"
            strokeWidth="1"
            strokeLinejoin="round"
            className={inspired ? 'fill-ornament stroke-gold' : 'fill-none stroke-border-strong'}
          />
        </svg>
        <span className="min-w-0 flex-1 text-sm leading-tight font-bold">
          {ts.identity.inspiration}
        </span>
        <SwitchTrack on={inspired} check />
      </button>
    </div>
  );
}

function RollInitiative({
  advantage,
  disadvantage,
  bonus,
}: {
  advantage: boolean;
  disadvantage: boolean;
  bonus: number;
}) {
  const roll = useDiceStore((s) => s.roll);
  return (
    <button
      type="button"
      aria-label={ts.combat.rollInitiative}
      title={ts.combat.rollInitiative}
      onClick={() =>
        roll({
          label: ts.combat.initiative,
          expression: withModifier(d20(advantage, disadvantage), bonus),
        })
      }
      className="ml-auto grid size-9 shrink-0 place-items-center self-start rounded-md text-accent hover:bg-accent-soft"
    >
      <D20Icon className="size-[18px]" />
    </button>
  );
}

function HpHistoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { sheet, derived } = useSheet();
  const log = sheet.state.hpLog;
  const h = ts.hp.historyItem;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={ts.hp.history}
      description={ts.hp.totals(derived.hpTotals.healed, derived.hpTotals.received)}
    >
      {log.length === 0 ? (
        <p className="text-sm text-muted">{ts.hp.historyEmpty}</p>
      ) : (
        <ol className="divide-y divide-border text-sm">
          {[...log].reverse().map((e) => (
            <li
              key={e.actionId}
              className={cn(
                'flex justify-between gap-3 py-2',
                e.undone && 'text-muted line-through',
              )}
            >
              <span>
                {e.source === 'hit-die'
                  ? h.hitDie(e.amount)
                  : e.kind === 'damage'
                    ? h.damage(e.amount)
                    : e.kind === 'heal'
                      ? h.heal(e.amount)
                      : h.temp(e.amount)}
                {e.undone ? ` (${h.undone})` : ''}
              </span>
              <time className="tabular text-muted" dateTime={e.at}>
                {new Date(e.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </time>
            </li>
          ))}
        </ol>
      )}
    </Dialog>
  );
}

const iconButton =
  'grid size-9 place-items-center rounded-lg border border-border-soft text-gold hover:bg-surface-2 disabled:opacity-40';

/** Pontos de Vida: o número grande, a barra, dano/cura/temporários, Dados de Vida e descansos. */
function HitPoints() {
  const { sheet, derived } = useSheet();
  const dispatch = useSheetStore((s) => s.dispatch);
  const edit = useSheetStore((s) => s.edit);
  const roll = useDiceStore((s) => s.roll);
  const notify = useNotify();
  const [amount, setAmount] = useState('');
  const [critical, setCritical] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const titleId = useId();
  const amountId = useId();
  const maxId = useId();
  const dieId = useId();
  const hp = ts.hp;
  const hd = ts.hitDice;

  const { current, temp } = sheet.state.hp;
  const max = derived.hpMax.value;
  const pct = max > 0 ? Math.round((current / max) * 100) : 0;
  const lastUndoable = [...sheet.state.hpLog].reverse().find((e) => !e.undone);
  const n = Number(amount);
  const validAmount = amount.trim() !== '' && Number.isInteger(n) && n > 0 && n <= 9999;
  const { die, total, remaining } = derived.hitDice;

  const apply = (type: 'damage' | 'heal' | 'set-temp-hp') => {
    if (!validAmount) return;
    notify(dispatch(type === 'damage' ? { type, amount: n, critical } : { type, amount: n }));
    setAmount('');
    setCritical(false);
  };

  const spendHitDie = () => {
    if (remaining <= 0) return notify(['no-hit-dice']);
    if (current < 1) return notify(['needs-1-hp']);
    const outcome = roll({ label: hd.rollName, expression: `1d${die}` });
    if (outcome.ok) notify(dispatch({ type: 'spend-hit-die', rolled: outcome.entry.result.total }));
  };

  const hpButton = 'h-10 min-w-0 flex-1 px-2.5';

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-3 rounded-[10px] border border-border-soft bg-field p-3.5"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id={titleId} className="font-bold">
          {hp.title}
        </h3>
        <div className="flex gap-1.5">
          <button
            type="button"
            className={iconButton}
            disabled={!lastUndoable}
            onClick={() =>
              lastUndoable &&
              notify(dispatch({ type: 'undo-hp', targetActionId: lastUndoable.actionId }))
            }
            aria-label={lastUndoable ? hp.undo : hp.undoNothing}
            title={lastUndoable ? hp.undo : hp.undoNothing}
            data-testid="hp.undo"
          >
            <Undo2 className="size-[18px]" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            className={iconButton}
            onClick={() => setHistoryOpen(true)}
            aria-label={hp.history}
            title={hp.history}
          >
            <StrokeIcon name="scroll" className="size-[18px]" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-baseline gap-2">
        <span
          className="tabular font-display text-[2.75rem] leading-none font-bold"
          data-testid="hp.current"
          data-value={current}
        >
          {current}
        </span>
        <ExplainButton
          explained={derived.hpMax}
          title={hp.max}
          signed={false}
          testId="hp.max"
          className="font-display text-[1.375rem] font-semibold text-muted"
          extra={
            <div className="space-y-1.5">
              <Label htmlFor={maxId}>{hp.maxManual}</Label>
              <NumberField
                id={maxId}
                value={sheet.combat.hpMaxOverride ?? max}
                min={1}
                max={999}
                onCommit={(v) => edit((d) => void (d.combat.hpMaxOverride = v))}
                label={hp.maxManual}
                className="h-9 border-border text-left"
              />
              <p className="text-xs text-muted">{hp.maxHint}</p>
              {sheet.combat.hpMaxOverride !== undefined ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => edit((d) => void delete d.combat.hpMaxOverride)}
                >
                  {hp.maxAuto}
                </Button>
              ) : null}
            </div>
          }
        >
          {hp.ofMax(max)}
        </ExplainButton>
        <span className="flex-1" />
        <span className="text-sm text-muted">
          {hp.temp}{' '}
          <strong className="tabular text-text" data-testid="hp.temp" data-value={temp}>
            {temp}
          </strong>
        </span>
      </div>
      <div
        role="img"
        aria-label={hp.bar(pct)}
        className="h-2.5 overflow-hidden rounded-[5px] bg-sunken"
      >
        <div
          className={cn(
            'h-full transition-[width]',
            pct > 50 ? 'bg-success' : pct > 20 ? 'bg-ornament' : 'bg-danger',
          )}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          apply('damage');
        }}
      >
        <label htmlFor={amountId} className="sr-only">
          {hp.amount}
        </label>
        <Input
          id={amountId}
          type="number"
          inputMode="numeric"
          min={1}
          max={9999}
          value={amount}
          placeholder={hp.amountShort}
          onChange={(e) => setAmount(e.target.value)}
          className="tabular h-10 w-16 shrink-0 px-2 text-center"
          data-testid="hp.amount"
        />
        <Button
          variant="danger"
          className={hpButton}
          disabled={!validAmount}
          onClick={() => apply('damage')}
          data-testid="hp.damage"
        >
          {hp.damage}
        </Button>
        <div className="flex min-w-0 flex-[2_1_0px]">
          <Button
            variant="success"
            className={cn(hpButton, 'rounded-r-none')}
            disabled={!validAmount}
            onClick={() => apply('heal')}
            data-testid="hp.heal"
          >
            {hp.heal}
          </Button>
          <Button
            variant="outline"
            className={cn(hpButton, 'rounded-l-none border-l-0 text-gold')}
            disabled={!validAmount}
            onClick={() => apply('set-temp-hp')}
            title={hp.tempLong}
            data-testid="hp.temp.add"
          >
            {hp.addTemp}
          </Button>
        </div>
        {current === 0 ? (
          <label className="flex w-full items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={critical}
              onChange={(e) => setCritical(e.target.checked)}
              className="size-4 accent-[var(--accent)]"
            />
            {hp.critical}
          </label>
        ) : null}
      </form>

      <div aria-hidden="true" className="h-px bg-border-soft" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <span className="text-sm font-bold">{hd.title}</span>
          <span
            className="tabular font-display text-xl font-bold"
            data-testid="hitdice.remaining"
            data-value={remaining}
          >
            {hd.remaining(remaining, total)}
          </span>
          <label htmlFor={dieId} className="sr-only">
            {hd.die}
          </label>
          <select
            id={dieId}
            value={die}
            onChange={(e) =>
              edit((d) => void (d.combat.hitDie = Number(e.target.value) as HitDieSides))
            }
            className="rounded-md bg-transparent px-0.5 text-sm text-muted hover:bg-surface-2"
          >
            {HIT_DIE_SIDES.map((s) => (
              <option key={s} value={s}>
                {`d${s}`}
              </option>
            ))}
          </select>
        </div>
        <Button
          variant="outline"
          className="group gap-1.5 px-3.5"
          onClick={spendHitDie}
          title={hd.rollLabel}
        >
          <D20Icon className="size-4 text-accent" />
          {hd.spend(die)}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          onClick={() => notify(dispatch({ type: 'short-rest' }))}
          title={hp.shortRestHint}
          data-testid="rest.short"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px] text-border-strong">
            <circle cx="12" cy="14" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 6a8 8 0 0 1 0 16Z" fill="currentColor" />
            <path
              d="M10 2h4M12 2v4M18.5 7.5 20 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          {hp.shortRest}
        </Button>
        <Button
          variant="outline"
          onClick={() => notify(dispatch({ type: 'long-rest' }))}
          title={hp.longRestHint}
          data-testid="rest.long"
        >
          <StrokeIcon name="moon" className="size-[18px] text-border-strong" />
          {hp.longRest}
        </Button>
      </div>
      <HpHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />
    </section>
  );
}

/** Combate: CA, iniciativa, deslocamento, Inspiração Heroica e os Pontos de Vida. */
export function CombatPanel() {
  return (
    <Panel title={ts.combat.title} bodyClassName="flex flex-col gap-3.5">
      <CombatStats />
      <HitPoints />
    </Panel>
  );
}

export function DeathSavesPanel({ className }: { className?: string }) {
  const { sheet } = useSheet();
  const dispatch = useSheetStore((s) => s.dispatch);
  const roll = useDiceStore((s) => s.roll);
  const notify = useNotify();
  const dying = sheet.state.hp.current === 0;
  const { successes, failures } = sheet.state.deathSaves;
  const ds = ts.deathSaves;

  const setCount = (kind: 'successes' | 'failures', n: number) => {
    const currentCount = sheet.state.deathSaves[kind];
    const next = currentCount === n ? n - 1 : n;
    notify(dispatch({ type: 'set-death-saves', successes, failures, [kind]: next }));
  };

  const rollSave = () => {
    if (!dying) return notify(['not-dying']);
    const outcome = roll({ label: ds.rollName, expression: '1d20' });
    if (outcome.ok) notify(dispatch({ type: 'death-save', d20: outcome.entry.result.total }));
  };

  const row = (kind: 'successes' | 'failures', label: string, value: number) => (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span>{label}</span>
      <div
        className="flex gap-2"
        data-testid={`deathsaves.${kind}`}
        data-value={value}
        aria-label={ds.count(value)}
      >
        {[1, 2, 3].map((i) => (
          <button
            key={i}
            type="button"
            role="checkbox"
            aria-checked={value >= i}
            aria-label={ds.pip(label, i)}
            disabled={!dying}
            title={dying ? undefined : ds.onlyAtZero}
            onClick={() => setCount(kind, i)}
            className={cn(
              'size-[18px] rounded-full border-[1.5px] transition-colors disabled:cursor-not-allowed',
              kind === 'successes' ? 'border-success' : 'border-danger',
              value >= i && (kind === 'successes' ? 'bg-success' : 'bg-danger'),
            )}
          />
        ))}
      </div>
    </div>
  );

  return (
    <Panel
      title={ds.title}
      actions={
        <Button
          size="sm"
          variant="outline"
          className={cn('group gap-1.5 px-3 text-sm', !dying && 'opacity-60')}
          onClick={rollSave}
          aria-label={ds.roll}
          title={dying ? ds.roll : ds.onlyAtZero}
        >
          <D20Icon className="size-[15px] text-accent" />
          {ds.rollShort}
        </Button>
      }
      className={cn('flex flex-col', className)}
      bodyClassName="flex flex-1 flex-col justify-center gap-2.5 px-4 py-3"
    >
      {row('successes', ds.success, successes)}
      {row('failures', ds.failure, failures)}
    </Panel>
  );
}
