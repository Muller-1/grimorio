import { critical, parse, stringify, withModifier, type AttackOption } from '@grimorio/rules';
import { DAMAGE_TYPES, type DamageType, type Feature, type Weapon } from '@grimorio/shared';
import {
  Backpack,
  ChevronDown,
  Pencil,
  Plus,
  ScrollText,
  Search,
  Swords,
  Trash2,
  WandSparkles,
} from 'lucide-react';
import { Tabs } from 'radix-ui';
import { useId, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { D20Icon } from '@/components/ui/d20-icon';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { Panel } from '@/components/ui/panel';
import { formatModifier } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { newId } from '@/ports/ids';
import { useSheet } from '../hooks';
import { useSheetStore } from '../store';
import { ExplainButton } from './Explain';
import { RollButton } from './RollButton';

type TabKey = 'weapons' | 'spells' | 'inventory' | 'features';
const a = t.sheet.actions;

/** Normaliza para busca: sem acentos e sem maiúsculas ("Rapiéira" acha "rapieira"). */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function critExpression(expression: string): string | null {
  const parsed = parse(expression);
  return parsed.ok ? stringify(critical(parsed.ast)) : null;
}

// ---------------------------------------------------------------------------
// Armas
// ---------------------------------------------------------------------------

function WeaponCard({
  weapon,
  attack,
  onEdit,
}: {
  weapon: Weapon;
  attack: AttackOption;
  onEdit: () => void;
}) {
  const edit = useSheetStore((s) => s.edit);
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const toHit = attack.toHit.value;
  const dmg = attack.damageExpression;
  const critDmg = dmg ? critExpression(dmg) : null;
  const typeLabel = weapon.damageType ? t.damageTypes[weapon.damageType] : null;

  return (
    <li className="rounded-lg border border-border bg-surface" data-testid={`attack.${weapon.id}`}>
      <div className="flex items-center gap-2 p-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={detailsId}
          aria-label={a.expand(weapon.name)}
          className="grid size-7 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-2"
        >
          <ChevronDown
            className={cn('size-4 transition-transform', open ? 'rotate-0' : '-rotate-90')}
          />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold">{weapon.name}</p>
          <p className="text-xs text-muted">
            <span data-testid={`attack.${weapon.id}.tohit`} data-value={toHit}>
              {a.toHit(formatModifier(toHit))}
            </span>
            {' · '}
            <span className={cn(!dmg && 'text-danger')}>
              {dmg ? a.damage(dmg) : a.invalidDamage}
            </span>
            {typeLabel ? ` ${typeLabel}` : ''}
            {' · '}
            {a.crit(attack.critRange)}
          </p>
        </div>
        <RollButton
          rollLabel={a.attackRollLabel(weapon.name)}
          expression={withModifier('1d20', toHit)}
          critRange={attack.critRange}
          ariaLabel={a.rollAttack(weapon.name)}
          testId={`attack.${weapon.id}.roll`}
        />
      </div>

      {open ? (
        <div id={detailsId} className="space-y-3 border-t border-border p-3 text-sm">
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
            <dt className="text-muted">{a.attack}</dt>
            <dd>
              <ExplainButton
                explained={attack.toHit}
                title={a.attackRollLabel(weapon.name)}
                testId={`attack.${weapon.id}.tohit.explain`}
              />
            </dd>
            <dt className="text-muted">{a.rollDamage}</dt>
            <dd className="font-mono">{dmg ?? a.invalidDamage}</dd>
            {weapon.properties ? (
              <>
                <dt className="text-muted">{t.sheet.weaponEditor.properties}</dt>
                <dd>{weapon.properties}</dd>
              </>
            ) : null}
          </dl>
          {weapon.notes ? <p className="whitespace-pre-line text-muted">{weapon.notes}</p> : null}

          <div className="flex flex-wrap gap-1.5">
            <RollButton
              rollLabel={a.advantageLabel(weapon.name)}
              expression={withModifier('2d20kh1', toHit)}
              critRange={attack.critRange}
              ariaLabel={a.advantageLabel(weapon.name)}
              className="h-8 w-auto gap-1 border border-border px-2 text-xs text-text"
            >
              {a.advantage}
            </RollButton>
            <RollButton
              rollLabel={a.disadvantageLabel(weapon.name)}
              expression={withModifier('2d20kl1', toHit)}
              critRange={attack.critRange}
              ariaLabel={a.disadvantageLabel(weapon.name)}
              className="h-8 w-auto gap-1 border border-border px-2 text-xs text-text"
            >
              {a.disadvantage}
            </RollButton>
            {dmg ? (
              <RollButton
                rollLabel={a.damageRollLabel(weapon.name)}
                expression={dmg}
                ariaLabel={a.damageRollLabel(weapon.name)}
                testId={`attack.${weapon.id}.damage`}
                className="h-8 w-auto gap-1 border border-border px-2 text-xs text-text"
              >
                {a.rollDamage}
              </RollButton>
            ) : null}
            {critDmg ? (
              <RollButton
                rollLabel={a.critDamageLabel(weapon.name)}
                expression={critDmg}
                ariaLabel={a.critDamageLabel(weapon.name)}
                className="h-8 w-auto gap-1 border border-gold/60 px-2 text-xs text-gold"
              >
                {a.rollCritDamage}
              </RollButton>
            ) : null}
          </div>

          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Pencil className="size-3.5" />
              {a.edit}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-danger"
              onClick={() =>
                edit((d) => void (d.weapons = d.weapons.filter((w) => w.id !== weapon.id)))
              }
            >
              <Trash2 className="size-3.5" />
              {a.remove}
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

const blankWeapon = (): Weapon => ({
  id: newId(),
  name: '',
  ability: 'str',
  proficient: true,
  damageDice: '',
  magicBonus: 0,
  critRange: 20,
});

function WeaponEditor({ initial, onClose }: { initial: Weapon | null; onClose: () => void }) {
  const edit = useSheetStore((s) => s.edit);
  const { derived } = useSheet();
  const [w, setW] = useState<Weapon>(() => initial ?? blankWeapon());
  const [error, setError] = useState<string | null>(null);
  const ids = {
    name: useId(),
    ability: useId(),
    dice: useId(),
    type: useId(),
    magic: useId(),
    crit: useId(),
    props: useId(),
    notes: useId(),
    prof: useId(),
  };
  const e = t.sheet.weaponEditor;

  const set = <K extends keyof Weapon>(key: K, value: Weapon[K]) =>
    setW((prev) => ({ ...prev, [key]: value }));

  // Prévia com as mesmas regras da ficha
  const mods = { str: derived.abilities.str.mod, dex: derived.abilities.dex.mod };
  const ability = w.ability === 'finesse' ? (mods.dex > mods.str ? 'dex' : 'str') : w.ability;
  const toHit = mods[ability] + (w.proficient ? derived.proficiencyBonus.value : 0) + w.magicBonus;
  const dmgBonus = mods[ability] + w.magicBonus;
  const dice = w.damageDice.trim();
  const diceOk = dice !== '' && parse(withModifier(dice, dmgBonus)).ok;

  const save = () => {
    if (w.name.trim() === '') return setError(e.nameRequired);
    if (!diceOk) return setError(e.invalidDice);
    const clean: Weapon = { ...w, name: w.name.trim(), damageDice: dice };
    edit((d) => {
      const i = d.weapons.findIndex((x) => x.id === clean.id);
      if (i >= 0) d.weapons[i] = clean;
      else d.weapons.push(clean);
    });
    onClose();
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={initial ? e.titleEdit : e.titleNew}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {e.cancel}
          </Button>
          <Button variant="primary" onClick={save} data-testid="weapon.save">
            {e.save}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label htmlFor={ids.name}>{e.name}</Label>
          <Input
            id={ids.name}
            value={w.name}
            maxLength={60}
            placeholder={e.namePlaceholder}
            onChange={(ev) => set('name', ev.target.value)}
            data-testid="weapon.name"
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor={ids.ability}>{e.ability}</Label>
          <Select
            id={ids.ability}
            value={w.ability}
            onChange={(ev) => set('ability', ev.target.value as Weapon['ability'])}
          >
            <option value="str">{e.abilityStr}</option>
            <option value="dex">{e.abilityDex}</option>
            <option value="finesse">{e.abilityFinesse}</option>
          </Select>
        </div>
        <label htmlFor={ids.prof} className="col-span-2 flex items-center gap-2 text-sm">
          <input
            id={ids.prof}
            type="checkbox"
            checked={w.proficient}
            onChange={(ev) => set('proficient', ev.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          {e.proficient}
        </label>
        <div>
          <Label htmlFor={ids.dice}>{e.damageDice}</Label>
          <Input
            id={ids.dice}
            value={w.damageDice}
            maxLength={40}
            placeholder={e.damageDicePlaceholder}
            onChange={(ev) => set('damageDice', ev.target.value)}
            className="font-mono"
            autoCapitalize="off"
            spellCheck={false}
            aria-invalid={dice !== '' && !diceOk ? true : undefined}
            data-testid="weapon.dice"
          />
        </div>
        <div>
          <Label htmlFor={ids.type}>{e.damageType}</Label>
          <Select
            id={ids.type}
            value={w.damageType ?? ''}
            onChange={(ev) => {
              const v = ev.target.value;
              setW((prev) => {
                const next = { ...prev };
                if (v === '') delete next.damageType;
                else next.damageType = v as DamageType;
                return next;
              });
            }}
          >
            <option value="">{e.noDamageType}</option>
            {DAMAGE_TYPES.map((dt) => (
              <option key={dt} value={dt}>
                {t.damageTypes[dt]}
              </option>
            ))}
          </Select>
        </div>
        <p className="col-span-2 -mt-1 text-xs text-muted">{e.damageDiceHint}</p>
        <div>
          <Label htmlFor={ids.magic}>{e.magicBonus}</Label>
          <Select
            id={ids.magic}
            value={w.magicBonus}
            onChange={(ev) => set('magicBonus', Number(ev.target.value))}
          >
            {[0, 1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {formatModifier(n)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={ids.crit}>{e.critRange}</Label>
          <Select
            id={ids.crit}
            value={w.critRange}
            onChange={(ev) => set('critRange', Number(ev.target.value))}
          >
            {[20, 19, 18].map((n) => (
              <option key={n} value={n}>
                {a.crit(n)}
              </option>
            ))}
          </Select>
        </div>
        <div className="col-span-2">
          <Label htmlFor={ids.props}>{e.properties}</Label>
          <Input
            id={ids.props}
            value={w.properties ?? ''}
            maxLength={120}
            placeholder={e.propertiesPlaceholder}
            onChange={(ev) => set('properties', ev.target.value)}
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor={ids.notes}>{e.notes}</Label>
          <Textarea
            id={ids.notes}
            value={w.notes ?? ''}
            maxLength={2000}
            onChange={(ev) => set('notes', ev.target.value)}
            className="min-h-16"
          />
        </div>
      </div>
      <p className="mt-3 rounded-md bg-surface-2 px-3 py-2 text-sm" aria-live="polite">
        {diceOk ? e.preview(formatModifier(toHit), withModifier(dice, dmgBonus)) : e.damageDiceHint}
      </p>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Características
// ---------------------------------------------------------------------------

function FeatureCard({ feature, onEdit }: { feature: Feature; onEdit: () => void }) {
  const edit = useSheetStore((s) => s.edit);
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  return (
    <li className="rounded-lg border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={detailsId}
        className="flex w-full items-center gap-2 p-2 text-left"
      >
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted transition-transform',
            open ? 'rotate-0' : '-rotate-90',
          )}
        />
        <span className="min-w-0 flex-1 truncate font-display font-bold">{feature.name}</span>
      </button>
      {open ? (
        <div id={detailsId} className="space-y-2 border-t border-border p-3 text-sm">
          <p className="whitespace-pre-line">{feature.text}</p>
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Pencil className="size-3.5" />
              {a.edit}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-danger"
              onClick={() =>
                edit((d) => void (d.features = d.features.filter((f) => f.id !== feature.id)))
              }
            >
              <Trash2 className="size-3.5" />
              {a.remove}
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function FeatureEditor({ initial, onClose }: { initial: Feature | null; onClose: () => void }) {
  const edit = useSheetStore((s) => s.edit);
  const [f, setF] = useState<Feature>(() => initial ?? { id: newId(), name: '', text: '' });
  const [error, setError] = useState<string | null>(null);
  const nameId = useId();
  const textId = useId();
  const e = t.sheet.featureEditor;

  const save = () => {
    if (f.name.trim() === '') return setError(e.nameRequired);
    const clean = { ...f, name: f.name.trim() };
    edit((d) => {
      const i = d.features.findIndex((x) => x.id === clean.id);
      if (i >= 0) d.features[i] = clean;
      else d.features.push(clean);
    });
    onClose();
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={initial ? e.titleEdit : e.titleNew}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {e.cancel}
          </Button>
          <Button variant="primary" onClick={save}>
            {e.save}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <Label htmlFor={nameId}>{e.name}</Label>
          <Input
            id={nameId}
            value={f.name}
            maxLength={80}
            placeholder={e.namePlaceholder}
            onChange={(ev) => setF({ ...f, name: ev.target.value })}
          />
        </div>
        <div>
          <Label htmlFor={textId}>{e.text}</Label>
          <Textarea
            id={textId}
            value={f.text}
            maxLength={4000}
            placeholder={e.textPlaceholder}
            onChange={(ev) => setF({ ...f, text: ev.target.value })}
            className="min-h-32"
          />
        </div>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Coluna
// ---------------------------------------------------------------------------

const TABS: { key: TabKey; icon: ReactNode; label: string }[] = [
  { key: 'weapons', icon: <Swords className="size-5" />, label: a.tabs.weapons },
  { key: 'spells', icon: <WandSparkles className="size-5" />, label: a.tabs.spells },
  { key: 'inventory', icon: <Backpack className="size-5" />, label: a.tabs.inventory },
  { key: 'features', icon: <ScrollText className="size-5" />, label: a.tabs.features },
];

type Editing =
  { kind: 'weapon'; item: Weapon | null } | { kind: 'feature'; item: Feature | null } | null;

export function ActionsColumn() {
  const { sheet, derived } = useSheet();
  const [tab, setTab] = useState<TabKey>('weapons');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Editing>(null);
  const searchId = useId();

  const q = fold(query.trim());
  const weapons = useMemo(
    () => sheet.weapons.filter((w) => q === '' || fold(w.name).includes(q)),
    [sheet.weapons, q],
  );
  const features = useMemo(
    () => sheet.features.filter((f) => q === '' || fold(`${f.name} ${f.text}`).includes(q)),
    [sheet.features, q],
  );
  const attacks = new Map(derived.attacks.map((atk) => [atk.weaponId, atk]));
  const canAdd = tab === 'weapons' || tab === 'features';
  const current = TABS.find((x) => x.key === tab)!;

  return (
    <Panel bodyClassName="p-0">
      <Tabs.Root value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <div className="flex items-stretch border-b border-border">
          <Tabs.List className="flex flex-1" aria-label={t.sheet.columns.actions}>
            {TABS.map((x) => (
              <Tabs.Trigger
                key={x.key}
                value={x.key}
                aria-label={x.label}
                title={x.label}
                className="grid h-12 flex-1 place-items-center border-r border-border text-muted transition-colors hover:bg-surface-2 data-[state=active]:bg-accent-soft data-[state=active]:text-accent"
              >
                {x.icon}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <button
            type="button"
            onClick={() =>
              setEditing(
                tab === 'features'
                  ? { kind: 'feature', item: null }
                  : { kind: 'weapon', item: null },
              )
            }
            disabled={!canAdd}
            aria-label={`${a.tabs.add}: ${current.label}`}
            title={`${a.tabs.add}: ${current.label}`}
            className="grid h-12 w-14 place-items-center text-muted transition-colors hover:bg-surface-2 hover:text-accent disabled:opacity-40"
            data-testid="actions.add"
          >
            <Plus className="size-5" />
          </button>
        </div>

        <div className="space-y-2 p-3">
          <h2 className="text-center font-display text-sm font-bold">{current.label}</h2>
          <div className="relative">
            <label htmlFor={searchId} className="sr-only">
              {a.searchLabel}
            </label>
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <Input
              id={searchId}
              type="search"
              value={query}
              onChange={(ev) => setQuery(ev.target.value)}
              placeholder={a.search}
              className="pl-8"
            />
          </div>
        </div>

        <Tabs.Content value="weapons" className="px-3 pb-3">
          {sheet.weapons.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">{a.emptyWeapons}</p>
          ) : weapons.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">{a.noResults}</p>
          ) : (
            <ul className="space-y-2">
              {weapons.map((w) => {
                const atk = attacks.get(w.id);
                return atk ? (
                  <WeaponCard
                    key={w.id}
                    weapon={w}
                    attack={atk}
                    onEdit={() => setEditing({ kind: 'weapon', item: w })}
                  />
                ) : null;
              })}
            </ul>
          )}
        </Tabs.Content>

        {(['spells', 'inventory'] as const).map((k) => (
          <Tabs.Content key={k} value={k} className="px-3 pb-6">
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
              <D20Icon className="size-8 opacity-50" />
              <p>{a.comingSoon}</p>
              <Button size="sm" variant="ghost" onClick={() => setTab('features')}>
                {a.tabs.features}
              </Button>
            </div>
          </Tabs.Content>
        ))}

        <Tabs.Content value="features" className="px-3 pb-3">
          {sheet.features.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">{a.emptyFeatures}</p>
          ) : features.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">{a.noResults}</p>
          ) : (
            <ul className="space-y-2">
              {features.map((f) => (
                <FeatureCard
                  key={f.id}
                  feature={f}
                  onEdit={() => setEditing({ kind: 'feature', item: f })}
                />
              ))}
            </ul>
          )}
        </Tabs.Content>
      </Tabs.Root>

      {editing?.kind === 'weapon' ? (
        <WeaponEditor initial={editing.item} onClose={() => setEditing(null)} />
      ) : null}
      {editing?.kind === 'feature' ? (
        <FeatureEditor initial={editing.item} onClose={() => setEditing(null)} />
      ) : null}
    </Panel>
  );
}
