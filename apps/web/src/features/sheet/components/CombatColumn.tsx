import { withModifier, type SheetNotice } from '@grimorio/rules';
import { HIT_DIE_SIDES, SKILL_KEYS, type HitDieSides, type SkillKey } from '@grimorio/shared';
import { HeartMinus, HeartPlus, Moon, ScrollText, Shield, ShieldPlus, Undo2 } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { D20Icon } from '@/components/ui/d20-icon';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label, Select } from '@/components/ui/input';
import { Panel } from '@/components/ui/panel';
import { Popover } from '@/components/ui/popover';
import { useDiceStore } from '@/features/dice/store';
import { useToastStore } from '@/features/toast/store';
import { feetToMeters, metersToFeet } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useSheet } from '../hooks';
import { useSheetStore } from '../store';
import { ExplainButton } from './Explain';
import { NumberField } from '@/components/ui/number-field';
import { ProficiencyToggle } from './ProficiencyToggle';
import { RollButton } from './RollButton';

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
      push(t.sheet.notices[n], tone);
    }
  };
}

function StatTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border-strong bg-surface-2/60 px-2 py-2 text-center">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <div className="mt-0.5 flex min-h-10 items-center gap-1">{children}</div>
    </div>
  );
}

function CombatStats() {
  const { sheet, derived } = useSheet();
  const edit = useSheetStore((s) => s.edit);
  const acId = useId();
  const speedId = useId();
  const override = sheet.combat.armorClassOverride;

  return (
    <div className="grid grid-cols-3 gap-2">
      <StatTile label={t.sheet.combat.ac}>
        <Shield className="size-5 text-muted" aria-hidden="true" />
        <ExplainButton
          explained={derived.armorClass}
          title={t.sheet.combat.acLong}
          signed={false}
          testId="stat.ac"
          className="font-display text-2xl font-bold"
          extra={
            <div className="space-y-1.5">
              <Label htmlFor={acId}>{t.sheet.combat.acManual}</Label>
              <NumberField
                id={acId}
                value={override ?? derived.armorClass.value}
                min={0}
                max={50}
                onCommit={(v) => edit((d) => void (d.combat.armorClassOverride = v))}
                label={t.sheet.combat.acManual}
                className="h-9 border-border text-left"
              />
              <p className="text-xs text-muted">{t.sheet.combat.acManualHint}</p>
              {override !== undefined ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => edit((d) => void delete d.combat.armorClassOverride)}
                >
                  {t.sheet.combat.acAuto}
                </Button>
              ) : null}
            </div>
          }
        />
      </StatTile>

      <StatTile label={t.sheet.combat.initiative}>
        <ExplainButton
          explained={derived.initiative}
          title={t.sheet.combat.initiative}
          testId="stat.initiative"
          className="font-display text-2xl font-bold"
        />
        <RollButton
          rollLabel={t.sheet.combat.initiative}
          expression={withModifier('1d20', derived.initiative.value)}
          ariaLabel={t.sheet.combat.rollInitiative}
          className="size-7"
        />
      </StatTile>

      <StatTile label={t.sheet.combat.speed}>
        <Popover
          trigger={
            <button
              type="button"
              className="tabular rounded-md px-1 font-display text-2xl font-bold hover:bg-surface-2"
              data-testid="stat.speed"
              data-value={derived.speedFt}
              aria-label={`${t.sheet.combat.speed}: ${t.sheet.combat.speedValue(feetToMeters(derived.speedFt))}`}
            >
              {feetToMeters(derived.speedFt)}
              <span className="ml-0.5 font-sans text-base">{t.sheet.combat.speedUnit}</span>
            </button>
          }
        >
          <Label htmlFor={speedId}>{t.sheet.combat.speedEdit}</Label>
          <Input
            id={speedId}
            type="number"
            inputMode="decimal"
            step={1.5}
            min={0}
            max={90}
            defaultValue={Number(feetToMeters(derived.speedFt).replace(',', '.'))}
            onChange={(e) => {
              const m = Number(e.target.value);
              if (Number.isFinite(m) && m >= 0 && m <= 90)
                edit((d) => void (d.combat.speedFt = metersToFeet(m)));
            }}
            className="mt-1"
          />
        </Popover>
      </StatTile>
    </div>
  );
}

function HpHistoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const log = useSheetStore((s) => s.sheet.state.hpLog);
  const h = t.sheet.hp.historyItem;
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t.sheet.hp.history}>
      {log.length === 0 ? (
        <p className="text-sm text-muted">{t.sheet.hp.historyEmpty}</p>
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

function HpPanel() {
  const { sheet, derived } = useSheet();
  const dispatch = useSheetStore((s) => s.dispatch);
  const edit = useSheetStore((s) => s.edit);
  const notify = useNotify();
  const [amount, setAmount] = useState('');
  const [critical, setCritical] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const amountId = useId();
  const maxId = useId();

  const { current, temp } = sheet.state.hp;
  const max = derived.hpMax.value;
  const pct = max > 0 ? Math.round((current / max) * 100) : 0;
  const lastUndoable = [...sheet.state.hpLog].reverse().find((e) => !e.undone);
  const n = Number(amount);
  const validAmount = amount.trim() !== '' && Number.isInteger(n) && n > 0 && n <= 9999;

  const apply = (type: 'damage' | 'heal' | 'set-temp-hp') => {
    if (!validAmount) return;
    notify(dispatch(type === 'damage' ? { type, amount: n, critical } : { type, amount: n }));
    setAmount('');
    setCritical(false);
  };

  return (
    <Panel
      title={t.sheet.hp.title}
      actions={
        <Button
          size="sm"
          variant="ghost"
          onClick={() => notify(dispatch({ type: 'long-rest' }))}
          title={t.sheet.hp.longRestHint}
        >
          <Moon className="size-4" />
          {t.sheet.hp.longRest}
        </Button>
      }
      bodyClassName="space-y-3"
    >
      <div className="flex items-center gap-2">
        <Button
          size="icon-sm"
          variant="ghost"
          disabled={!lastUndoable}
          onClick={() =>
            lastUndoable &&
            notify(dispatch({ type: 'undo-hp', targetActionId: lastUndoable.actionId }))
          }
          aria-label={lastUndoable ? t.sheet.hp.undo : t.sheet.hp.undoNothing}
          title={lastUndoable ? t.sheet.hp.undo : t.sheet.hp.undoNothing}
          data-testid="hp.undo"
        >
          <Undo2 className="size-4" />
        </Button>
        <div className="flex-1 text-center">
          <p className="tabular font-display text-lg font-bold">
            <span data-testid="hp.current" data-value={current}>
              {t.sheet.hp.summary(current, max, pct)}
            </span>
          </p>
          <div
            className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2"
            role="img"
            aria-label={t.sheet.hp.bar(pct)}
          >
            <div
              className={cn(
                'h-full rounded-full transition-[width]',
                pct > 50 ? 'bg-success' : pct > 20 ? 'bg-gold' : 'bg-danger',
              )}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        </div>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setHistoryOpen(true)}
          aria-label={t.sheet.hp.history}
          title={t.sheet.hp.history}
        >
          <ScrollText className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-1.5 text-center">
        {(
          [
            [t.sheet.hp.temp, temp, 'hp.temp'],
            [t.sheet.hp.healed, derived.hpTotals.healed, 'hp.healed'],
            [t.sheet.hp.received, derived.hpTotals.received, 'hp.received'],
          ] as const
        ).map(([label, value, testId]) => (
          <div key={testId} className="rounded-md border border-border px-1 py-1">
            <p className="truncate text-[11px] font-semibold text-muted">{label}</p>
            <p className="tabular text-xl font-bold" data-testid={testId} data-value={value}>
              {value}
            </p>
          </div>
        ))}
        <div className="rounded-md border border-border px-1 py-1">
          <p className="truncate text-[11px] font-semibold text-muted">{t.sheet.hp.max}</p>
          <ExplainButton
            explained={derived.hpMax}
            title={t.sheet.hp.max}
            signed={false}
            testId="hp.max"
            className="text-xl font-bold"
            extra={
              <div className="space-y-1.5">
                <Label htmlFor={maxId}>{t.sheet.hp.maxManual}</Label>
                <NumberField
                  id={maxId}
                  value={sheet.combat.hpMaxOverride ?? max}
                  min={1}
                  max={999}
                  onCommit={(v) => edit((d) => void (d.combat.hpMaxOverride = v))}
                  label={t.sheet.hp.maxManual}
                  className="h-9 border-border text-left"
                />
                <p className="text-xs text-muted">{t.sheet.hp.maxHint}</p>
                {sheet.combat.hpMaxOverride !== undefined ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => edit((d) => void delete d.combat.hpMaxOverride)}
                  >
                    {t.sheet.hp.maxAuto}
                  </Button>
                ) : null}
              </div>
            }
          />
        </div>
      </div>

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          apply('damage');
        }}
      >
        <div className="w-24">
          <Label htmlFor={amountId}>{t.sheet.hp.amount}</Label>
          <Input
            id={amountId}
            type="number"
            inputMode="numeric"
            min={1}
            max={9999}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="tabular mt-0.5 text-center"
            data-testid="hp.amount"
          />
        </div>
        <Button
          variant="danger"
          size="md"
          disabled={!validAmount}
          onClick={() => apply('damage')}
          data-testid="hp.damage"
        >
          <HeartMinus className="size-4" />
          {t.sheet.hp.damage}
        </Button>
        <Button
          variant="success"
          size="md"
          disabled={!validAmount}
          onClick={() => apply('heal')}
          data-testid="hp.heal"
        >
          <HeartPlus className="size-4" />
          {t.sheet.hp.heal}
        </Button>
        <Button
          variant="subtle"
          size="md"
          disabled={!validAmount}
          onClick={() => apply('set-temp-hp')}
          title={t.sheet.hp.tempLong}
          data-testid="hp.temp.add"
        >
          <ShieldPlus className="size-4" />
          {t.sheet.hp.addTemp}
        </Button>
        {current === 0 ? (
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={critical}
              onChange={(e) => setCritical(e.target.checked)}
              className="size-4 accent-[var(--accent)]"
            />
            {t.sheet.hp.critical}
          </label>
        ) : null}
      </form>
      <HpHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />
    </Panel>
  );
}

function HitDicePanel() {
  const { sheet, derived } = useSheet();
  const dispatch = useSheetStore((s) => s.dispatch);
  const edit = useSheetStore((s) => s.edit);
  const roll = useDiceStore((s) => s.roll);
  const notify = useNotify();
  const dieId = useId();
  const { die, total, remaining } = derived.hitDice;

  const spend = () => {
    if (remaining <= 0) return notify(['no-hit-dice']);
    if (sheet.state.hp.current < 1) return notify(['needs-1-hp']);
    const outcome = roll({ label: t.sheet.hitDice.rollName, expression: `1d${die}` });
    if (outcome.ok) notify(dispatch({ type: 'spend-hit-die', rolled: outcome.entry.result.total }));
  };

  return (
    <Panel title={t.sheet.hitDice.title} bodyClassName="flex flex-col items-center gap-2">
      <p
        className="tabular text-2xl font-bold"
        data-testid="hitdice.remaining"
        data-value={remaining}
      >
        {t.sheet.hitDice.remaining(remaining, total, die)}
      </p>
      <div className="flex items-center gap-2">
        <label htmlFor={dieId} className="sr-only">
          {t.sheet.hitDice.die}
        </label>
        <Select
          id={dieId}
          value={die}
          onChange={(e) =>
            edit((d) => void (d.combat.hitDie = Number(e.target.value) as HitDieSides))
          }
          className="h-8 w-20"
        >
          {HIT_DIE_SIDES.map((s) => (
            <option key={s} value={s}>
              {`d${s}`}
            </option>
          ))}
        </Select>
        <Button
          size="sm"
          variant="outline"
          onClick={spend}
          aria-label={t.sheet.hitDice.rollLabel}
          title={t.sheet.hitDice.rollLabel}
        >
          {t.sheet.hitDice.roll}
        </Button>
      </div>
    </Panel>
  );
}

function DeathSavesPanel() {
  const { sheet } = useSheet();
  const dispatch = useSheetStore((s) => s.dispatch);
  const roll = useDiceStore((s) => s.roll);
  const notify = useNotify();
  const dying = sheet.state.hp.current === 0;
  const { successes, failures } = sheet.state.deathSaves;
  const ds = t.sheet.deathSaves;

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
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm">{label}</span>
      <div className="flex gap-1" data-testid={`deathsaves.${kind}`} data-value={value}>
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
              'size-5 rounded border transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              value >= i
                ? kind === 'successes'
                  ? 'border-success bg-success'
                  : 'border-danger bg-danger'
                : 'border-border-strong bg-surface',
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
        <button
          type="button"
          onClick={rollSave}
          aria-label={ds.roll}
          title={dying ? ds.roll : ds.onlyAtZero}
          className={cn(
            'grid size-7 place-items-center rounded-md text-muted hover:bg-accent-soft hover:text-accent',
            !dying && 'opacity-50',
          )}
        >
          <D20Icon className="size-5" />
        </button>
      }
      bodyClassName="space-y-1.5"
    >
      {row('successes', ds.success, successes)}
      {row('failures', ds.failure, failures)}
    </Panel>
  );
}

function SkillRow({ skill }: { skill: SkillKey }) {
  const { derived } = useSheet();
  const edit = useSheetStore((s) => s.edit);
  const s = derived.skills[skill];
  const name = t.skills[skill];
  return (
    <li className="flex items-center gap-1.5 py-0.5" title={`${name} (${t.abilities[s.ability]})`}>
      <ProficiencyToggle
        value={s.proficiency}
        onChange={(v) =>
          edit((d) => {
            if (v === 0) delete d.build.skillProficiencies[skill];
            else d.build.skillProficiencies[skill] = v;
          })
        }
        name={name}
        testId={`skill.${skill}.prof`}
      />
      <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
      <ExplainButton
        explained={s.bonus}
        title={name}
        testId={`skill.${skill}`}
        className="text-sm"
      />
      <RollButton
        rollLabel={name}
        expression={withModifier('1d20', s.bonus.value)}
        ariaLabel={t.sheet.rollSkill(name)}
        className="size-7 max-xl:size-8"
      />
    </li>
  );
}

function SkillsPanel() {
  const { derived } = useSheet();
  const sorted = [...SKILL_KEYS].sort((a, b) => t.skills[a].localeCompare(t.skills[b], 'pt-BR'));
  return (
    <Panel title={t.sheet.skillsTitle}>
      <ul className="grid grid-cols-1 gap-x-4 min-[420px]:grid-cols-2">
        {sorted.map((skill) => (
          <SkillRow key={skill} skill={skill} />
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm">
        <span className="text-muted">{t.sheet.passivePerception}</span>
        <ExplainButton
          explained={derived.passivePerception}
          title={t.sheet.passivePerception}
          signed={false}
          testId="stat.passive-perception"
        />
      </div>
    </Panel>
  );
}

export function CombatColumn() {
  return (
    <div className="space-y-3">
      <CombatStats />
      <HpPanel />
      <div className="grid grid-cols-2 gap-3">
        <HitDicePanel />
        <DeathSavesPanel />
      </div>
      <SkillsPanel />
    </div>
  );
}
