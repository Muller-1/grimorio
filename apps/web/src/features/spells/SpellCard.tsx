import {
  SPELL_ACTIVE_PREFIX,
  SPELL_EFFECTS,
  spellRoll,
  type SpellcastingView,
} from '@grimorio/rules';
import { castRoll, spellTarget } from '@grimorio/rules/spells-data';
import { ChevronDown, Sparkles, Trash2, UserRound, Users } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { D20Icon } from '@/components/ui/d20-icon';
import { Select } from '@/components/ui/input';
import { useDiceStore } from '@/features/dice/store';
import { AdvantageBadge, d20 } from '@/features/sheet/components/AdvantageBadge';
import { RollButton } from '@/features/sheet/components/RollButton';
import { useSheet } from '@/features/sheet/hooks';
import { useSheetStore } from '@/features/sheet/store';
import { useToastStore } from '@/features/toast/store';
import { formatModifier } from '@/lib/format';
import { t } from '@/lib/i18n';
import { tsp } from '@/lib/i18n/spells';
import { cn } from '@/lib/utils';
import { castOptions, FREE_USE_PREFIX, freeUsesLeft, type SheetSpellEntry } from './model';

const btn = 'h-8 w-auto gap-1 border border-border px-2 text-xs text-text';

export function SpellCard({
  entry,
  sc,
  onRemove,
  onTogglePrepared,
}: {
  entry: SheetSpellEntry;
  sc: SpellcastingView | null;
  onRemove?: () => void;
  onTogglePrepared?: () => void;
}) {
  const { sheet, derived } = useSheet();
  const dispatch = useSheetStore((s) => s.dispatch);
  const edit = useSheetStore((s) => s.edit);
  const toast = useToastStore((s) => s.push);
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const slotId = useId();
  const { spell, granted } = entry;
  const school = tsp.schools[spell.school];
  const freeLeft = freeUsesLeft(sheet, granted);
  const options = castOptions(spell, sc, freeLeft);
  const firstAvailable = options.find((o) => o.available) ?? options[0];
  const [choice, setChoice] = useState<string>(firstAvailable?.value ?? '');
  const selected = options.find((o) => o.value === choice) ?? firstAvailable;
  const slot = spell.level === 0 ? 0 : (selected?.circle ?? spell.level);
  const mod = sc?.mod ?? 0;
  const roll = spellRoll(spell, { slot, characterLevel: derived.level, mod });
  const effectKey = `${SPELL_ACTIVE_PREFIX}${spell.id}`;
  const hasEffect = Boolean(SPELL_EFFECTS[spell.id]);
  const onMe = sheet.state.active.includes(effectKey);
  // "Em mim" só existe para magias que ajudam ou curam e aceitam você como alvo; as de alcance
  // Pessoal (e o dano extra da Marca do Predador) já são sempre suas.
  const target = spellTarget(spell);
  const rollKind = castRoll(spell);
  const [onSelf, setOnSelf] = useState(false);
  const onCaster = target === 'self' || (target === 'ally' && onSelf);
  const attack = spell.attack ? derived.spellAttack : null;
  const attackRoll = attack
    ? attack.expression.replace(/^1d20/, d20(attack.advantage, attack.disadvantage))
    : null;
  const canCast = spell.level === 0 || Boolean(selected?.available);
  const rollDice = useDiceStore((s) => s.roll);
  const components = [
    spell.components.v ? 'V' : null,
    spell.components.s ? 'S' : null,
    spell.components.m
      ? typeof spell.components.m === 'string'
        ? tsp.material(spell.components.m)
        : 'M'
      : null,
  ]
    .filter(Boolean)
    .join(', ');

  /** Rola e devolve o total (ou `null`, com o aviso do erro). */
  const rollNow = (label: string, expression: string, critRange?: number) => {
    const outcome = rollDice({ label, expression, ...(critRange ? { critRange } : {}) });
    if (outcome.ok) return outcome.entry.result.total;
    toast(t.dice.errors[outcome.error.code], 'danger');
    return null;
  };

  /** Gasta o espaço (ou o uso grátis), liga Concentração e efeito e já rola o dado da magia. */
  const cast = () => {
    if (spell.level > 0) {
      if (!selected || !selected.available) return toast(tsp.castNoSlot, 'danger');
      if (selected.kind === 'free') {
        const key = `${FREE_USE_PREFIX}${spell.id}`;
        edit((d) => void (d.state.resources[key] = (d.state.resources[key] ?? 0) + 1));
      } else {
        const notices = dispatch({
          type: 'spend-slot',
          circle: selected.circle,
          ...(selected.kind === 'pact' ? { pact: true } : {}),
        });
        if (notices.length) return toast(tsp.castNoSlot, 'danger');
      }
    }
    if (spell.concentration) dispatch({ type: 'set-concentration', spellId: spell.id });
    // Só vai para "Magias em você" quando a magia é sua ou foi conjurada em você mesmo.
    if (hasEffect && onCaster && !useSheetStore.getState().sheet.state.active.includes(effectKey)) {
      dispatch({ type: 'toggle-spell-effect', spellId: spell.id });
    }

    const message = [tsp.castDone(spell.name, slot)];
    if (rollKind === 'attack' && attackRoll) {
      rollNow(tsp.attackLabel(spell.name), attackRoll, 20);
    } else if (rollKind === 'damage') {
      for (const d of roll.damage) {
        rollNow(tsp.damageLabel(spell.name, t.damageTypes[d.type]), d.expression);
      }
    } else if (rollKind === 'heal' && roll.heal) {
      const total = rollNow(tsp.healLabel(spell.name), roll.heal);
      if (total !== null && onCaster) {
        dispatch({ type: 'heal', amount: total });
        message.push(tsp.healedSelf(total));
      }
    } else if (rollKind === 'temp-hp' && spell.tempHp) {
      const total = rollNow(tsp.tempLabel(spell.name), spell.tempHp);
      if (total !== null && onCaster) {
        dispatch({ type: 'set-temp-hp', amount: total });
        message.push(tsp.tempSelf(total));
      }
    }
    if (spell.save && sc) message.push(tsp.castSave(t.abilities[spell.save], sc.dc));
    toast(message.join(' '), 'success');
  };

  const castLabel = canCast
    ? tsp.quickCast(spell.name, slot, rollKind ? (tsp.quickRolls[rollKind] ?? null) : null)
    : tsp.noSlotLeft;

  return (
    <li className="rounded-lg border border-border bg-surface" data-testid={`spell.${spell.id}`}>
      <div className="flex items-center gap-2 p-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={detailsId}
          aria-label={tsp.expand(spell.name)}
          className="grid size-7 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-2"
        >
          <ChevronDown
            className={cn('size-4 transition-transform', open ? 'rotate-0' : '-rotate-90')}
          />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold">{spell.name}</p>
          <p className="truncate text-xs text-muted">
            {tsp.meta(spell.level, school)}
            {spell.concentration ? ` · ${tsp.concentrationTag}` : ''}
            {spell.ritual ? ` · ${tsp.ritualTag}` : ''}
            {granted ? ` · ${tsp.grantedFrom[granted.source]}` : ''}
          </p>
        </div>
        {attack ? (
          <AdvantageBadge advantage={attack.advantage} disadvantage={attack.disadvantage} />
        ) : null}
        {/* Atalho: conjura com a carta fechada. Tem a cor do Conjurar porque também gasta espaço. */}
        <button
          type="button"
          onClick={cast}
          disabled={!canCast}
          aria-label={castLabel}
          title={castLabel}
          data-testid={`spell.${spell.id}.quick`}
          className="grid size-8 shrink-0 place-items-center rounded-md border border-accent/50 bg-accent-soft text-accent transition-colors hover:bg-accent hover:text-accent-contrast focus-visible:bg-accent focus-visible:text-accent-contrast disabled:cursor-not-allowed disabled:border-border disabled:bg-transparent disabled:text-muted disabled:opacity-50"
        >
          {rollKind ? <D20Icon className="size-5" /> : <Sparkles className="size-4" />}
        </button>
      </div>

      {open ? (
        <div id={detailsId} className="space-y-3 border-t border-border p-3 text-sm">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            <dt className="text-muted">{tsp.castingTime}</dt>
            <dd>
              {spell.castingTime}
              {spell.ritual ? ` (${tsp.ritualTag})` : ''}
            </dd>
            <dt className="text-muted">{tsp.range}</dt>
            <dd>{spell.range}</dd>
            <dt className="text-muted">{tsp.components}</dt>
            <dd>{components}</dd>
            <dt className="text-muted">{tsp.duration}</dt>
            <dd>{spell.duration}</dd>
          </dl>
          <p className="whitespace-pre-line">{spell.text}</p>
          {spell.higher ? (
            <p className="whitespace-pre-line">
              <strong>{spell.level === 0 ? tsp.cantripUpgrade : tsp.higher}. </strong>
              {spell.higher}
            </p>
          ) : null}
          {spell.save && sc ? (
            <p className="font-semibold" data-testid={`spell.${spell.id}.save`}>
              {tsp.save(t.abilities[spell.save], sc.dc)}
            </p>
          ) : null}
          {roll.beams ? <p className="text-muted">{tsp.beams(roll.beams)}</p> : null}

          <div className="flex flex-wrap items-center gap-1.5">
            {options.length ? (
              <>
                <label htmlFor={slotId} className="sr-only">
                  {tsp.castWithLabel(spell.name)}
                </label>
                <Select
                  id={slotId}
                  value={selected?.value ?? ''}
                  onChange={(e) => setChoice(e.target.value)}
                  className="h-8 w-auto text-xs"
                  data-testid={`spell.${spell.id}.slot`}
                >
                  {options.map((o) => {
                    const slotView =
                      o.kind === 'pact' ? sc?.pact : sc?.slots.find((x) => x.circle === o.circle);
                    const left = slotView ? slotView.max - slotView.spent : 0;
                    return (
                      <option key={o.value} value={o.value}>
                        {o.kind === 'free'
                          ? tsp.freeOption
                          : o.kind === 'pact'
                            ? tsp.pactOption(o.circle, left, slotView?.max ?? 0)
                            : tsp.slotOption(o.circle, left, slotView?.max ?? 0)}
                      </option>
                    );
                  })}
                </Select>
              </>
            ) : null}
            {target === 'ally' ? (
              <div
                role="group"
                aria-label={tsp.castTarget(spell.name)}
                className="inline-flex h-8 divide-x divide-border overflow-hidden rounded-md border border-border text-xs font-semibold"
              >
                {[false, true].map((self) => (
                  <button
                    key={String(self)}
                    type="button"
                    aria-pressed={onSelf === self}
                    onClick={() => setOnSelf(self)}
                    className={cn(
                      'flex items-center gap-1 px-2.5 transition-colors',
                      onSelf === self
                        ? 'bg-accent-soft text-accent'
                        : 'text-muted hover:bg-surface-2 hover:text-text',
                    )}
                    data-testid={`spell.${spell.id}.${self ? 'on-self' : 'on-other'}`}
                  >
                    {self ? (
                      <UserRound className="size-3.5" aria-hidden="true" />
                    ) : (
                      <Users className="size-3.5" aria-hidden="true" />
                    )}
                    {self ? tsp.castOnSelf : tsp.castOnOther}
                  </button>
                ))}
              </div>
            ) : null}
            <Button
              size="sm"
              variant="primary"
              onClick={cast}
              disabled={!canCast}
              aria-label={castLabel}
              data-testid={`spell.${spell.id}.cast`}
            >
              <Sparkles className="size-3.5" />
              {tsp.cast}
            </Button>
            {attackRoll && sc ? (
              <RollButton
                rollLabel={tsp.attackLabel(spell.name)}
                expression={attackRoll}
                critRange={20}
                ariaLabel={tsp.attackLabel(spell.name)}
                testId={`spell.${spell.id}.attack`}
                className={btn}
              >
                {tsp.attack} {formatModifier(sc.attack)}
              </RollButton>
            ) : null}
            {roll.damage.map((d) => (
              <RollButton
                key={d.type}
                rollLabel={tsp.damageLabel(spell.name, t.damageTypes[d.type])}
                expression={d.expression}
                ariaLabel={tsp.damageLabel(spell.name, t.damageTypes[d.type])}
                testId={`spell.${spell.id}.damage`}
                className={btn}
              >
                {tsp.damage(t.damageTypes[d.type])} {d.expression}
              </RollButton>
            ))}
            {roll.heal ? (
              <RollButton
                rollLabel={tsp.healLabel(spell.name)}
                expression={roll.heal}
                ariaLabel={tsp.healLabel(spell.name)}
                testId={`spell.${spell.id}.heal`}
                className={btn}
              >
                {tsp.heal} {roll.heal}
              </RollButton>
            ) : null}
          </div>
          {hasEffect && onMe ? <p className="text-xs text-accent">{tsp.onMeNow}</p> : null}
          {granted?.freePerLongRest ? (
            <p className="text-xs text-muted">{tsp.freeUses(freeLeft, granted.freePerLongRest)}</p>
          ) : null}

          {onTogglePrepared || onRemove ? (
            <div className="flex justify-end gap-1.5">
              {onTogglePrepared ? (
                <Button size="sm" variant="ghost" onClick={onTogglePrepared}>
                  {entry.section === 'prepared' ? tsp.unprepare : tsp.prepare}
                </Button>
              ) : null}
              {onRemove ? (
                <Button size="sm" variant="ghost" className="text-danger" onClick={onRemove}>
                  <Trash2 className="size-3.5" />
                  {tsp.remove}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
