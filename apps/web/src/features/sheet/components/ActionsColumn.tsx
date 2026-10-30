import { critical, parse, stringify, type AttackOption } from '@grimorio/rules';
import { FEATURE_SOURCES, type Feature, type Weapon } from '@grimorio/shared';
import { ChevronDown, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Tabs } from 'radix-ui';
import { lazy, Suspense, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { D20Icon } from '@/components/ui/d20-icon';
import { Panel } from '@/components/ui/panel';
import { StrokeIcon, type IconName } from '@/components/ui/stroke-icon';
import { formatModifier } from '@/lib/format';
import { t } from '@/lib/i18n';
import { ts } from '@/lib/i18n/sheet';
import { cn } from '@/lib/utils';
import { useSheet } from '../hooks';
import { useSheetStore } from '../store';
import { AdvantageBadge, d20 } from './AdvantageBadge';
import { ExplainButton } from './Explain';
import { RollButton } from './RollButton';

type TabKey = 'weapons' | 'spells' | 'inventory' | 'features';

/** A ficha não cresce sem fim: a lista de cada aba rola por dentro. */
const LIST_AREA = 'px-3.5 pb-3.5 md:max-h-[70dvh] md:overflow-y-auto';

/** O d20 que aparece no botão ao passar o mouse (no toque, sempre): "isto rola". */
const ROLL_HINT =
  'pointer-events-none absolute top-1/2 left-2.5 size-[15px] -translate-y-1/2 text-accent opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 pointer-coarse:opacity-100';
const ROLL_CELL =
  'group relative h-10 w-auto shrink-0 rounded-lg border border-border-strong bg-field text-base font-bold text-text hover:bg-surface-2 hover:text-text';
/** Larguras das colunas da tabela de armas (cabeçalho e linhas iguais). */
const COL = {
  name: 'flex-[0_0_160px]',
  props: 'min-w-0 flex-[1_1_180px]',
  crit: 'flex-[0_0_64px] text-center',
  toHit: 'flex-[0_0_96px] max-md:flex-1',
  damage: 'flex-[0_0_128px] max-md:flex-[1.4_1_0px]',
};

// A aba Magias traz a lista das 391 magias: só carrega quando o jogador abre a aba.
const SpellsTab = lazy(() => import('@/features/spells/SpellsTab'));
const InventoryTab = lazy(() => import('@/features/inventory/InventoryTab'));
const WeaponEditor = lazy(() => import('./Editors').then((m) => ({ default: m.WeaponEditor })));
const FeatureEditor = lazy(() => import('./Editors').then((m) => ({ default: m.FeatureEditor })));
const a = ts.actions;

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
  const first = attack.firstHitExpression;
  const typeLabel = weapon.damageType ? t.damageTypes[weapon.damageType] : null;
  // A jogada já vem com os dados extras (Bênção: +1d4); Vantagem troca o d20 por 2d20.
  const withD20 = (d20: string) => attack.attackExpression.replace(/^1d20/, d20);
  const mainRoll = withD20(d20(attack.advantage, attack.disadvantage));
  const extras = attack.extraDamage
    .map((x) => `${x.name} ${x.dice}${x.oncePerTurn ? ` (${a.oncePerTurn})` : ''}`)
    .join(', ');

  const props = [weapon.properties, typeLabel].filter(Boolean).join(' · ');

  return (
    <li
      className="rounded-[10px] border border-border-soft bg-field"
      data-testid={`attack.${weapon.id}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3.5 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={detailsId}
          aria-label={a.expand(weapon.name)}
          className={cn(COL.name, 'flex min-w-0 items-center gap-1.5 rounded-md text-left')}
        >
          <span className="truncate font-display text-lg font-bold">{weapon.name}</span>
          <ChevronDown
            className={cn(
              'size-4 shrink-0 text-muted transition-transform',
              open ? 'rotate-0' : '-rotate-90',
            )}
            aria-hidden="true"
          />
        </button>
        <span className={cn(COL.props, 'text-sm text-muted')}>{props}</span>
        <span
          className={cn(
            COL.crit,
            'font-display text-[1.0625rem] font-bold max-md:flex max-md:flex-col max-md:items-center',
          )}
          aria-label={a.critLabel(attack.critRange)}
          title={a.critLabel(attack.critRange)}
        >
          {/* No celular a tabela não tem cabeçalho: o número leva o nome da coluna. */}
          <span className="label-caps font-sans text-xs md:hidden">{a.columns.crit}</span>
          {a.critShort(attack.critRange)}
        </span>
        <RollButton
          rollLabel={a.attackRollLabel(weapon.name)}
          expression={mainRoll}
          critRange={attack.critRange}
          ariaLabel={a.rollAttack(weapon.name)}
          testId={`attack.${weapon.id}.roll`}
          className={cn(ROLL_CELL, COL.toHit)}
        >
          <D20Icon className={ROLL_HINT} />
          <span data-testid={`attack.${weapon.id}.tohit`} data-value={toHit}>
            {formatModifier(toHit)}
          </span>
          <AdvantageBadge advantage={attack.advantage} disadvantage={attack.disadvantage} />
        </RollButton>
        {dmg ? (
          <RollButton
            rollLabel={a.damageRollLabel(weapon.name)}
            expression={dmg}
            ariaLabel={a.rollDamageOf(weapon.name, dmg)}
            testId={`attack.${weapon.id}.damage`}
            className={cn(ROLL_CELL, COL.damage)}
          >
            <D20Icon className={ROLL_HINT} />
            {dmg}
          </RollButton>
        ) : (
          <span className={cn(COL.damage, 'text-center text-sm text-danger')}>
            {a.invalidDamage}
          </span>
        )}
      </div>

      {open ? (
        <div id={detailsId} className="space-y-3 border-t border-border-soft p-3.5 text-sm">
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
                <dt className="text-muted">{ts.weaponEditor.properties}</dt>
                <dd>{weapon.properties}</dd>
              </>
            ) : null}
          </dl>
          {extras ? (
            <p className="text-accent" data-testid={`attack.${weapon.id}.extras`}>
              {a.extraDamage(extras)}
            </p>
          ) : null}
          {weapon.notes ? <p className="whitespace-pre-line text-muted">{weapon.notes}</p> : null}

          <div className="flex flex-wrap gap-1.5">
            <RollButton
              rollLabel={a.advantageLabel(weapon.name)}
              expression={withD20('2d20kh1')}
              critRange={attack.critRange}
              ariaLabel={a.advantageLabel(weapon.name)}
              className="h-8 w-auto gap-1 border border-border px-2 text-xs text-text"
            >
              {a.advantage}
            </RollButton>
            <RollButton
              rollLabel={a.disadvantageLabel(weapon.name)}
              expression={withD20('2d20kl1')}
              critRange={attack.critRange}
              ariaLabel={a.disadvantageLabel(weapon.name)}
              className="h-8 w-auto gap-1 border border-border px-2 text-xs text-text"
            >
              {a.disadvantage}
            </RollButton>
            {first ? (
              <RollButton
                rollLabel={a.firstHitLabel(weapon.name, extras)}
                expression={first}
                ariaLabel={a.firstHitLabel(weapon.name, extras)}
                testId={`attack.${weapon.id}.first-hit`}
                className="h-8 w-auto gap-1 border border-accent/60 px-2 text-xs text-accent"
              >
                {a.firstHit}
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

// ---------------------------------------------------------------------------
// Características
// ---------------------------------------------------------------------------

function FeatureCard({ feature, onEdit }: { feature: Feature; onEdit: () => void }) {
  const edit = useSheetStore((s) => s.edit);
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  return (
    <li className="rounded-[10px] border border-border-soft bg-field">
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

// ---------------------------------------------------------------------------
// Coluna
// ---------------------------------------------------------------------------

const TABS: { key: TabKey; icon: IconName; label: string }[] = [
  { key: 'weapons', icon: 'swords', label: a.tabs.weapons },
  { key: 'spells', icon: 'sparkles', label: a.tabs.spells },
  { key: 'inventory', icon: 'backpack', label: a.tabs.inventory },
  { key: 'features', icon: 'book2', label: a.tabs.features },
];

type Editing =
  { kind: 'weapon'; item: Weapon | null } | { kind: 'feature'; item: Feature | null } | null;

export function ActionsColumn({ className }: { className?: string }) {
  const { sheet, derived } = useSheet();
  const [tab, setTab] = useState<TabKey>('weapons');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Editing>(null);
  const [addingItem, setAddingItem] = useState(false);
  const searchId = useId();

  const q = fold(query.trim());
  // Só as armas equipadas atacam; as guardadas ficam no Inventário.
  const equipped = sheet.weapons.filter((w) => w.equipped !== false);
  const stored = sheet.weapons.length - equipped.length;
  const weapons = equipped.filter((w) => q === '' || fold(w.name).includes(q));
  // Características separadas pela origem (classe, espécie, talentos…).
  const found = sheet.features.filter((f) => q === '' || fold(`${f.name} ${f.text}`).includes(q));
  const featureGroups = FEATURE_SOURCES.map((source) => ({
    source,
    list: found.filter((f) => (f.source ?? 'other') === source),
  })).filter((g) => g.list.length > 0);
  const attacks = new Map(derived.attacks.map((atk) => [atk.weaponId, atk]));
  const canAdd = tab !== 'spells';
  const current = TABS.find((x) => x.key === tab)!;

  return (
    <Panel
      as="div"
      className={cn('flex flex-col', className)}
      bodyClassName="flex flex-1 flex-col p-0"
    >
      <Tabs.Root
        value={tab}
        onValueChange={(v) => setTab(v as TabKey)}
        className="flex flex-1 flex-col"
      >
        <div className="flex items-end gap-1 rounded-t-[11px] border-b border-border bg-surface-2 px-2.5 pt-2">
          <Tabs.List
            className="flex min-w-0 flex-1 flex-wrap items-end gap-1"
            aria-label={ts.columns.actions}
          >
            {TABS.map((x) => (
              <Tabs.Trigger
                key={x.key}
                value={x.key}
                title={x.label}
                className="-mb-px inline-flex min-h-11 items-center gap-2 rounded-t-lg border border-transparent px-3 text-sm font-medium text-muted transition-colors hover:bg-field/70 hover:text-text data-[state=active]:border-border data-[state=active]:border-b-transparent data-[state=active]:bg-surface data-[state=active]:font-bold data-[state=active]:text-accent data-[state=active]:shadow-[inset_0_3px_0_var(--ornament)] sm:px-4"
              >
                <StrokeIcon name={x.icon} className="size-[18px] shrink-0" />
                <span className="max-sm:sr-only">{x.label}</span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <button
            type="button"
            onClick={() =>
              tab === 'inventory'
                ? setAddingItem(true)
                : setEditing(
                    tab === 'features'
                      ? { kind: 'feature', item: null }
                      : { kind: 'weapon', item: null },
                  )
            }
            disabled={!canAdd}
            aria-label={`${a.tabs.add}: ${current.label}`}
            title={`${a.tabs.add}: ${current.label}`}
            className="mb-1 grid size-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-field hover:text-accent disabled:opacity-40"
            data-testid="actions.add"
          >
            <Plus className="size-5" />
          </button>
        </div>

        <div className="space-y-3 p-3.5">
          <div className="relative">
            <label htmlFor={searchId} className="sr-only">
              {a.searchLabel}
            </label>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <Input
              id={searchId}
              type="search"
              value={query}
              onChange={(ev) => setQuery(ev.target.value)}
              placeholder={a.searchIn(current.label)}
              className="h-[42px] border-border pl-9 shadow-none"
            />
          </div>
          {tab === 'weapons' && weapons.length ? (
            <div
              aria-hidden="true"
              className="label-caps flex gap-3 px-3.5 text-xs tracking-[0.12em] max-md:hidden"
            >
              <span className={COL.name}>{a.columns.weapon}</span>
              <span className={COL.props}>{a.columns.properties}</span>
              <span className={COL.crit}>{a.columns.crit}</span>
              <span className={cn(COL.toHit, 'text-center')}>{a.columns.toHit}</span>
              <span className={cn(COL.damage, 'text-center')}>{a.columns.damage}</span>
            </div>
          ) : null}
        </div>

        <Tabs.Content value="weapons" className={LIST_AREA}>
          {sheet.weapons.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">{a.emptyWeapons}</p>
          ) : weapons.length === 0 && stored === 0 ? (
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
          {stored > 0 ? (
            <p
              className="mt-2 flex flex-wrap items-center justify-center gap-x-2 text-center text-xs text-muted"
              data-testid="weapons.stored"
            >
              {a.storedWeapons(stored)}
              <Button size="sm" variant="ghost" onClick={() => setTab('inventory')}>
                {a.seeInventory}
              </Button>
            </p>
          ) : null}
        </Tabs.Content>

        <Tabs.Content value="spells" className={LIST_AREA}>
          {tab === 'spells' ? (
            <Suspense
              fallback={<p className="py-4 text-center text-sm text-muted">{t.common.loading}</p>}
            >
              <SpellsTab query={query} />
            </Suspense>
          ) : null}
        </Tabs.Content>

        <Tabs.Content value="inventory" className={LIST_AREA}>
          {tab === 'inventory' ? (
            <Suspense
              fallback={<p className="py-4 text-center text-sm text-muted">{t.common.loading}</p>}
            >
              <InventoryTab
                query={query}
                adding={addingItem}
                onAddDone={() => setAddingItem(false)}
              />
            </Suspense>
          ) : null}
        </Tabs.Content>

        <Tabs.Content value="features" className={LIST_AREA}>
          {sheet.features.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">{a.emptyFeatures}</p>
          ) : featureGroups.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">{a.noResults}</p>
          ) : (
            <div className="space-y-3">
              {featureGroups.map((g) => (
                <details
                  key={g.source}
                  open
                  className="group rounded-lg border border-border bg-surface-2/40"
                  data-testid={`features.${g.source}`}
                >
                  <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 font-display text-sm font-bold">
                    <ChevronDown
                      className="size-4 shrink-0 text-muted transition-transform group-[:not([open])]:-rotate-90"
                      aria-hidden="true"
                    />
                    <span className="flex-1">{a.featureGroups[g.source]}</span>
                    <span className="rounded-full bg-surface px-2 text-xs font-semibold text-muted">
                      {g.list.length}
                    </span>
                  </summary>
                  <ul className="space-y-2 px-2 pb-2">
                    {g.list.map((f) => (
                      <FeatureCard
                        key={f.id}
                        feature={f}
                        onEdit={() => setEditing({ kind: 'feature', item: f })}
                      />
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          )}
        </Tabs.Content>
      </Tabs.Root>

      <Suspense fallback={null}>
        {editing?.kind === 'weapon' ? (
          <WeaponEditor initial={editing.item} onClose={() => setEditing(null)} />
        ) : null}
        {editing?.kind === 'feature' ? (
          <FeatureEditor initial={editing.item} onClose={() => setEditing(null)} />
        ) : null}
      </Suspense>
    </Panel>
  );
}
