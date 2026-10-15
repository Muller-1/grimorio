import { withModifier, type SpellcastingView } from '@grimorio/rules';
import { spellById } from '@grimorio/rules/spells-data';
import { ABILITY_KEYS, type AbilityKey, type CustomSpell } from '@grimorio/shared';
import { ChevronDown, Pencil, Plus, ScrollText, Trash2 } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label, Select } from '@/components/ui/input';
import { RollButton } from '@/features/sheet/components/RollButton';
import { useSheet } from '@/features/sheet/hooks';
import { useSheetStore } from '@/features/sheet/store';
import { formatModifier } from '@/lib/format';
import { t } from '@/lib/i18n';
import { tsp } from '@/lib/i18n/spells';
import { cn } from '@/lib/utils';
import { CustomSpellEditor } from './CustomSpellEditor';
import { sheetSpells, type SheetSpellEntry, type SpellSection } from './model';
import { SpellCard } from './SpellCard';
import { SpellPicker, type AddAs } from './SpellPicker';

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function SlotsRow({ sc }: { sc: SpellcastingView }) {
  const dispatch = useSheetStore((s) => s.dispatch);
  const rows = [
    ...sc.slots.map((s) => ({ ...s, pact: false })),
    ...(sc.pact ? [{ ...sc.pact, pact: true }] : []),
  ];
  if (rows.length === 0) return <p className="text-sm text-muted">{tsp.noSlots}</p>;
  return (
    <ul className="space-y-1" data-testid="spells.slots">
      {rows.map((r) => (
        <li key={`${r.pact}-${r.circle}`} className="flex items-center gap-2 text-sm">
          <span className="w-24 shrink-0 text-muted">
            {r.pact ? `${tsp.pact} (${tsp.circleShort(r.circle)})` : tsp.circle(r.circle)}
          </span>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: r.max }, (_, i) => {
              // Disponíveis à esquerda; os gastos somem da direita para a esquerda.
              const spent = i >= r.max - r.spent;
              return (
                <button
                  key={i}
                  type="button"
                  role="checkbox"
                  aria-checked={spent}
                  aria-label={tsp.slotPip(r.circle, i + 1, r.max, spent)}
                  onClick={() =>
                    dispatch({
                      type: spent ? 'restore-slot' : 'spend-slot',
                      circle: r.circle,
                      ...(r.pact ? { pact: true } : {}),
                    })
                  }
                  className={cn(
                    'size-5 rounded-full border-2 transition-colors',
                    spent ? 'border-border-strong bg-surface-2' : 'border-accent bg-accent',
                  )}
                  data-testid={`slot.${r.pact ? 'pact' : r.circle}.${i + 1}`}
                />
              );
            })}
          </div>
        </li>
      ))}
    </ul>
  );
}

function CustomCard({ spell, onEdit }: { spell: CustomSpell; onEdit: () => void }) {
  const edit = useSheetStore((s) => s.edit);
  const { derived } = useSheet();
  const sc = derived.spellcasting;
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <li className="rounded-lg border border-border bg-surface">
      <div className="flex items-center gap-2 p-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={id}
          aria-label={tsp.expand(spell.name)}
          className="grid size-7 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-2"
        >
          <ChevronDown className={cn('size-4 transition-transform', open ? '' : '-rotate-90')} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold">{spell.name}</p>
          <p className="text-xs text-muted">
            {tsp.circle(spell.level)}
            {spell.concentration ? ` · ${tsp.concentrationTag}` : ''}
            {spell.ritual ? ` · ${tsp.ritualTag}` : ''}
          </p>
        </div>
        {spell.attack && sc ? (
          <RollButton
            rollLabel={tsp.attackLabel(spell.name)}
            expression={withModifier('1d20', sc.attack)}
            ariaLabel={tsp.attackLabel(spell.name)}
          />
        ) : null}
      </div>
      {open ? (
        <div id={id} className="space-y-2 border-t border-border p-3 text-sm">
          {spell.text ? <p className="whitespace-pre-line">{spell.text}</p> : null}
          {spell.save && sc ? (
            <p className="font-semibold">{tsp.save(t.abilities[spell.save], sc.dc)}</p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-1.5">
            {spell.damageDice ? (
              <RollButton
                rollLabel={tsp.damageLabel(
                  spell.name,
                  spell.damageType ? t.damageTypes[spell.damageType] : '',
                )}
                expression={spell.damageDice}
                ariaLabel={tsp.damageLabel(
                  spell.name,
                  spell.damageType ? t.damageTypes[spell.damageType] : '',
                )}
                className="h-8 w-auto gap-1 border border-border px-2 text-xs text-text"
              >
                {spell.damageDice}
              </RollButton>
            ) : null}
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Pencil className="size-3.5" />
              {t.sheet.actions.edit}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-danger"
              onClick={() =>
                edit(
                  (d) => void (d.spells.custom = d.spells.custom.filter((x) => x.id !== spell.id)),
                )
              }
            >
              <Trash2 className="size-3.5" />
              {tsp.remove}
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

/**
 * Aba Magias da ficha (ADR-010): CD e ataque, espaços para marcar, magias por lista (truques,
 * preparadas, sempre preparadas, grimório), conjurar com rolagem e Concentração, e "Outra
 * magia (do livro)". Carregada sob demanda junto com a lista de magias.
 */
export default function SpellsTab({ query }: { query: string }) {
  const { sheet, derived } = useSheet();
  const dispatch = useSheetStore((s) => s.dispatch);
  const edit = useSheetStore((s) => s.edit);
  const [picker, setPicker] = useState(false);
  const [custom, setCustom] = useState<CustomSpell | null | 'new'>(null);
  const abilityId = useId();
  const sc = derived.spellcasting;
  const wizard = Boolean(sc?.spellbookMin !== undefined);
  const entries = useMemo(() => sheetSpells(sheet), [sheet]);
  const q = fold(query.trim());
  const visible = entries.filter((e) => !q || fold(e.spell.name).includes(q));
  const customs = sheet.spells.custom.filter((c) => !q || fold(c.name).includes(q));
  const inSheet = new Set(entries.map((e) => e.spell.id));
  const concentration = sheet.state.concentration;
  const concentrationName = concentration
    ? (spellById(concentration)?.name ??
      sheet.spells.custom.find((c) => c.id === concentration)?.name ??
      concentration)
    : null;

  const counts = {
    cantrips: entries.filter((e) => e.section === 'cantrips' && !e.granted).length,
    prepared: entries.filter((e) => e.section === 'prepared').length,
    spellbook: sheet.spells.spellbook.length,
  };

  const add = (spells: { id: string; as: AddAs }[]) =>
    edit((d) => {
      for (const { id, as } of spells) {
        const list =
          as === 'cantrip'
            ? d.spells.cantrips
            : as === 'spellbook'
              ? d.spells.spellbook
              : d.spells.prepared;
        if (!list.includes(id)) list.push(id);
      }
    });

  const remove = (e: SheetSpellEntry) =>
    edit((d) => {
      const id = e.spell.id;
      d.spells.cantrips = d.spells.cantrips.filter((x) => x !== id);
      d.spells.prepared = d.spells.prepared.filter((x) => x !== id);
      d.spells.spellbook = d.spells.spellbook.filter((x) => x !== id);
      d.spells.granted = d.spells.granted.filter((x) => x.id !== id);
    });

  const togglePrepared = (e: SheetSpellEntry) =>
    edit((d) => {
      const id = e.spell.id;
      if (d.spells.prepared.includes(id))
        d.spells.prepared = d.spells.prepared.filter((x) => x !== id);
      else d.spells.prepared.push(id);
    });

  const section = (key: SpellSection, title: string, extra?: string) => {
    const list = visible.filter((e) => e.section === key);
    if (list.length === 0) return null;
    return (
      <section key={key} className="space-y-1.5" data-testid={`spells.section.${key}`}>
        <h3 className="flex items-baseline justify-between text-sm font-bold">
          {title}
          {extra ? <span className="text-xs font-normal text-muted">{extra}</span> : null}
        </h3>
        <ul className="space-y-2">
          {list.map((e) => (
            <SpellCard
              key={e.spell.id}
              entry={e}
              sc={sc}
              {...(e.section !== 'granted' ? { onRemove: () => remove(e) } : {})}
              {...(wizard && (e.section === 'spellbook' || e.section === 'prepared')
                ? { onTogglePrepared: () => togglePrepared(e) }
                : {})}
            />
          ))}
        </ul>
      </section>
    );
  };

  return (
    <div className="space-y-4" data-testid="spells.tab">
      <div className="space-y-3 rounded-lg border border-border bg-surface-2/60 p-3">
        {sc?.source !== 'class' ? (
          <div>
            <Label htmlFor={abilityId}>{tsp.ability}</Label>
            <Select
              id={abilityId}
              value={sheet.spells.ability ?? ''}
              onChange={(e) =>
                edit((d) => {
                  const v = e.target.value as AbilityKey | '';
                  if (v) d.spells.ability = v;
                  else delete d.spells.ability;
                })
              }
              data-testid="spells.ability"
            >
              <option value="">{tsp.abilityNone}</option>
              {ABILITY_KEYS.filter((k) => k !== 'str' && k !== 'dex' && k !== 'con').map((k) => (
                <option key={k} value={k}>
                  {t.abilities[k]}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-muted">{tsp.abilityHint}</p>
          </div>
        ) : null}
        {sc ? (
          <>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-md border border-border bg-surface px-2 py-1">
                <p className="text-xs font-semibold text-muted">{tsp.dc}</p>
                <p
                  className="tabular font-display text-2xl font-bold"
                  data-testid="spells.dc"
                  data-value={sc.dc}
                >
                  {sc.dc}
                </p>
              </div>
              <div className="rounded-md border border-border bg-surface px-2 py-1">
                <p className="text-xs font-semibold text-muted">{tsp.attack}</p>
                <div className="flex items-center justify-center gap-1">
                  <span
                    className="tabular font-display text-2xl font-bold"
                    data-testid="spells.attack"
                    data-value={sc.attack}
                  >
                    {formatModifier(sc.attack)}
                  </span>
                  <RollButton
                    rollLabel={tsp.attack}
                    expression={withModifier('1d20', sc.attack)}
                    ariaLabel={tsp.rollAttack}
                    className="size-7"
                  />
                </div>
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-muted">{tsp.slots}</p>
              <SlotsRow sc={sc} />
              {sc.pact ? <p className="mt-1 text-xs text-muted">{tsp.pactHint}</p> : null}
            </div>
            <p className="flex flex-wrap gap-x-3 text-xs text-muted" data-testid="spells.counts">
              {sc.cantripsMax !== undefined || counts.cantrips ? (
                <span
                  className={cn(
                    sc.cantripsMax !== undefined &&
                      counts.cantrips > sc.cantripsMax &&
                      'text-danger',
                  )}
                >
                  {tsp.counts.cantrips(counts.cantrips, sc.cantripsMax)}
                </span>
              ) : null}
              <span
                className={cn(
                  sc.preparedMax !== undefined && counts.prepared > sc.preparedMax && 'text-danger',
                )}
              >
                {tsp.counts.prepared(counts.prepared, sc.preparedMax)}
              </span>
              {wizard ? (
                <span>{tsp.counts.spellbook(counts.spellbook, sc.spellbookMin)}</span>
              ) : null}
            </p>
            {(sc.cantripsMax !== undefined && counts.cantrips < sc.cantripsMax) ||
            (sc.preparedMax !== undefined && counts.prepared < sc.preparedMax) ? (
              <p className="text-xs text-accent" data-testid="spells.missing">
                {tsp.counts.missing}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted">{tsp.notCaster}</p>
        )}
        {concentrationName ? (
          <div className="flex items-center justify-between gap-2 rounded-md border border-accent bg-accent-soft px-2 py-1.5 text-sm">
            <span data-testid="spells.concentration">{tsp.concentration(concentrationName)}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => dispatch({ type: 'set-concentration', spellId: null })}
            >
              {tsp.endConcentration}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="primary"
          onClick={() => setPicker(true)}
          data-testid="spells.add"
        >
          <Plus className="size-4" />
          {tsp.add}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setCustom('new')}
          data-testid="spells.add-custom"
        >
          <ScrollText className="size-4" />
          {tsp.addCustom}
        </Button>
      </div>

      {entries.length === 0 && sheet.spells.custom.length === 0 ? (
        <p className="py-2 text-center text-sm text-muted">{tsp.empty}</p>
      ) : null}
      {section('cantrips', tsp.sections.cantrips)}
      {section('granted', tsp.sections.granted)}
      {section('prepared', tsp.sections.prepared)}
      {section('spellbook', tsp.sections.spellbook)}
      {customs.length ? (
        <section className="space-y-1.5">
          <h3 className="text-sm font-bold">{tsp.sections.custom}</h3>
          <ul className="space-y-2">
            {customs.map((c) => (
              <CustomCard key={c.id} spell={c} onEdit={() => setCustom(c)} />
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-center text-[11px] text-muted">{tsp.credits}</p>

      {picker ? (
        <SpellPicker
          lists={sc?.lists ?? []}
          maxCircle={sc?.maxCircle ?? 9}
          wizard={wizard}
          inSheet={inSheet}
          onAdd={add}
          onClose={() => setPicker(false)}
        />
      ) : null}
      {custom ? (
        <CustomSpellEditor
          initial={custom === 'new' ? null : custom}
          onClose={() => setCustom(null)}
        />
      ) : null}
    </div>
  );
}
