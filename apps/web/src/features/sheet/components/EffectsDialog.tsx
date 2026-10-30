import {
  CONDITION_PREFIX,
  CONDITIONS,
  DEBUFF_PREFIX,
  DEBUFF_SPELLS,
  exhaustionLevel,
  SPELL_ACTIVE_PREFIX,
  SPELL_EFFECTS,
  type Effect,
} from '@grimorio/rules';
import { useId, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Label, Select } from '@/components/ui/input';
import { feetToMeters, formatModifier } from '@/lib/format';
import { ts } from '@/lib/i18n/sheet';
import { cn } from '@/lib/utils';
import { useSheet } from '../hooks';
import { useSheetStore } from '../store';

/** Popup de "Efeitos em você": carregado só quando o jogador abre. */
const o = ts.powers.onYou;

/** Resumo do que uma magia que ajuda muda na ficha ("+1d4 em ataques e salvaguardas"). */
function describe(effects: Effect[]): string {
  const parts: string[] = [];
  const num = (v: unknown) => (typeof v === 'number' ? formatModifier(v) : '+?');
  for (const e of effects) {
    switch (e.type) {
      case 'roll-bonus-dice':
        parts.push(o.bonusDice(e.dice, e.on.map((x) => o.on[x]).join(' e ')));
        break;
      case 'ac-bonus':
        parts.push(o.ac(num(e.value)));
        break;
      case 'ac-formula':
        parts.push(o.acFormula(e.base));
        break;
      case 'ac-minimum':
        parts.push(o.acMinimum(e.value));
        break;
      case 'speed-bonus':
        if (typeof e.ft === 'number') parts.push(o.speed(`+${feetToMeters(e.ft)}`));
        break;
      case 'extra-damage':
        if (typeof e.dice === 'string') parts.push(o.extraDamage(e.dice));
        break;
      case 'attack-bonus':
        parts.push(o.attackBonus(num(e.value)));
        break;
      case 'damage-bonus':
        parts.push(o.damageBonus(num(e.value)));
        break;
      case 'advantage':
        parts.push(o.advantage);
        break;
      case 'resistance':
        parts.push(o.resistance);
        break;
      case 'hp-max-bonus':
        parts.push(o.hpMax(num(e.value)));
        break;
      case 'save-bonus':
        parts.push(o.saveBonus(num(e.value)));
        break;
    }
  }
  const noteText = effects.find((e) => e.type === 'note');
  if (parts.length === 0 && noteText?.type === 'note') return noteText.text;
  return [...new Set(parts)].join('; ');
}

function Row({
  name,
  text,
  on,
  tone,
  onToggle,
  testId,
}: {
  name: string;
  text: string;
  on: boolean;
  tone: 'good' | 'bad';
  onToggle: () => void;
  testId: string;
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={on}
        aria-label={o.toggle(name, on)}
        onClick={onToggle}
        className={cn(
          'flex w-full items-start gap-2 rounded-md border px-2.5 py-2 text-left text-sm transition-colors',
          on
            ? tone === 'good'
              ? 'border-accent bg-accent-soft'
              : 'border-danger/60 bg-danger-soft'
            : 'border-border hover:bg-surface-2',
        )}
        data-testid={testId}
      >
        <span
          className={cn(
            'mt-0.5 grid size-4 shrink-0 place-items-center rounded border text-[10px] font-bold',
            on ? 'border-current' : 'border-border-strong',
          )}
          aria-hidden="true"
        >
          {on ? '✓' : ''}
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-semibold">{name}</span>
          <span className="block text-xs text-muted">{text}</span>
        </span>
      </button>
    </li>
  );
}

export default function EffectsDialog({
  onClose,
  rounds,
  onRounds,
}: {
  onClose: () => void;
  /** Quantas rodadas dura a condição que for ligada agora (0 = até tirar). */
  rounds: number;
  onRounds: (n: number) => void;
}) {
  const { sheet } = useSheet();
  const dispatch = useSheetStore((s) => s.dispatch);
  const exhaustionId = useId();
  const roundsId = useId();
  /** Liga (com a duração escolhida) ou desliga uma condição ou magia que atrapalha. */
  const toggleOnYou = (key: string) =>
    dispatch({ type: 'toggle-on-you', key, ...(rounds > 0 ? { rounds } : {}) });
  const active = new Set(sheet.state.active);
  const buffs = Object.entries(SPELL_EFFECTS).sort(([, a], [, b]) =>
    a.name.localeCompare(b.name, 'pt-BR'),
  );
  const exhaustion = exhaustionLevel(sheet.state.active);

  const section = (title: string, children: ReactNode) => (
    <section className="space-y-1.5">
      <h3 className="font-display text-sm font-bold">{title}</h3>
      {children}
    </section>
  );

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={o.title}
      description={o.dialogHint}
      className="max-w-2xl"
      footer={
        <Button variant="primary" onClick={onClose} data-testid="on-you.done">
          {o.done}
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor={roundsId} className="mb-0">
            {o.rounds}
          </Label>
          <Select
            id={roundsId}
            value={rounds}
            onChange={(e) => onRounds(Number(e.target.value))}
            className="w-auto"
            data-testid="on-you.rounds"
          >
            {[0, 1, 2, 3, 10].map((n) => (
              <option key={n} value={n}>
                {o.roundsOption(n)}
              </option>
            ))}
          </Select>
        </div>
        {section(
          o.conditions,
          <>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {CONDITIONS.map((c) => {
                const key = `${CONDITION_PREFIX}${c.id}`;
                return (
                  <Row
                    key={key}
                    name={c.name}
                    text={c.text}
                    on={active.has(key)}
                    tone="bad"
                    onToggle={() => toggleOnYou(key)}
                    testId={`on-you.${key}`}
                  />
                );
              })}
            </ul>
            <div className="rounded-md border border-border p-2.5">
              <Label htmlFor={exhaustionId}>{o.exhaustion}</Label>
              <Select
                id={exhaustionId}
                value={exhaustion}
                onChange={(e) =>
                  dispatch({ type: 'set-exhaustion', level: Number(e.target.value) })
                }
                className="mt-1"
                data-testid="on-you.exhaustion"
              >
                {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {o.exhaustionLevel(n)}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-muted">{o.exhaustionHint}</p>
            </div>
          </>,
        )}
        {section(
          o.debuffs,
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {DEBUFF_SPELLS.map((d) => {
              const key = `${DEBUFF_PREFIX}${d.id}`;
              return (
                <Row
                  key={key}
                  name={d.name}
                  text={d.text}
                  on={active.has(key)}
                  tone="bad"
                  onToggle={() => toggleOnYou(key)}
                  testId={`on-you.${key}`}
                />
              );
            })}
          </ul>,
        )}
        {section(
          o.buffs,
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {buffs.map(([id, s]) => (
              <Row
                key={id}
                name={s.name}
                text={describe(s.effects)}
                on={active.has(`${SPELL_ACTIVE_PREFIX}${id}`)}
                tone="good"
                onToggle={() => dispatch({ type: 'toggle-spell-effect', spellId: id, by: 'other' })}
                testId={`on-you.spell.${id}`}
              />
            ))}
          </ul>,
        )}
      </div>
    </Dialog>
  );
}
