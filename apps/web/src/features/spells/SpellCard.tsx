import {
  SPELL_ACTIVE_PREFIX,
  SPELL_EFFECTS,
  spellRoll,
  withModifier,
  type SpellcastingView,
} from '@grimorio/rules';
import { ChevronDown, Sparkles, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
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
  const self = spell.range.startsWith('Pessoal');
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
    // Magia em você mesmo (alcance Pessoal) com efeito na ficha: já liga.
    if (hasEffect && self && !useSheetStore.getState().sheet.state.active.includes(effectKey)) {
      dispatch({ type: 'toggle-spell-effect', spellId: spell.id });
    }
    toast(tsp.castDone(spell.name, slot), 'success');
  };

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
        {spell.attack && sc ? (
          <RollButton
            rollLabel={tsp.attackLabel(spell.name)}
            expression={withModifier('1d20', sc.attack)}
            ariaLabel={tsp.attackLabel(spell.name)}
            testId={`spell.${spell.id}.attack`}
          />
        ) : null}
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
            <Button
              size="sm"
              variant="primary"
              onClick={cast}
              disabled={spell.level > 0 && !selected?.available}
              aria-label={tsp.castLabel(spell.name, slot)}
              data-testid={`spell.${spell.id}.cast`}
            >
              <Sparkles className="size-3.5" />
              {tsp.cast}
            </Button>
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
            {hasEffect ? (
              <Button
                size="sm"
                variant={onMe ? 'primary' : 'outline'}
                aria-pressed={onMe}
                aria-label={tsp.onMeLabel(spell.name, onMe)}
                onClick={() => dispatch({ type: 'toggle-spell-effect', spellId: spell.id })}
              >
                {tsp.onMe}
              </Button>
            ) : null}
          </div>
          {granted?.freePerLongRest ? (
            <p className="text-xs text-muted">{tsp.freeUses(freeLeft, granted.freePerLongRest)}</p>
          ) : null}
          {sc && spell.attack ? (
            <p className="text-xs text-muted">
              {tsp.attack}: {formatModifier(sc.attack)}
            </p>
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
