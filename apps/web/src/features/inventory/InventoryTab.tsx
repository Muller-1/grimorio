import {
  armorItemData,
  itemUnitWeightKg,
  knownArmor,
  knownWeightKg,
  weaponWeightKg,
} from '@grimorio/rules';
import { COIN_KEYS, type Item, type ItemArmor } from '@grimorio/shared';
import { Coins, Minus, Pencil, Plus, Scale, TriangleAlert } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { NumberField } from '@/components/ui/number-field';
import { useSheet } from '@/features/sheet/hooks';
import { useSheetStore } from '@/features/sheet/store';
import { formatKg } from '@/lib/format';
import { te } from '@/lib/i18n/editors';
import { ts } from '@/lib/i18n/sheet';
import { cn } from '@/lib/utils';
import { newId } from '@/ports/ids';

const inv = te.inventory;

/** Normaliza para busca (sem acentos e sem maiúsculas). */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Botão "Equipada/Guardada" (armas) ou "Com você/Guardado" (itens). */
function CarryToggle({
  on,
  onLabel,
  offLabel,
  ariaLabel,
  onToggle,
  testId,
}: {
  on: boolean;
  onLabel: string;
  offLabel: string;
  ariaLabel: string;
  onToggle: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={ariaLabel}
      onClick={onToggle}
      className={cn(
        'h-7 shrink-0 rounded-full border px-2.5 text-xs font-semibold transition-colors',
        on
          ? 'border-accent bg-accent-soft text-accent'
          : 'border-border text-muted hover:bg-surface-2',
      )}
      data-testid={testId}
    >
      {on ? onLabel : offLabel}
    </button>
  );
}

type ArmorKind = ItemArmor['kind'];
const ARMOR_KINDS: ArmorKind[] = ['light', 'medium', 'heavy', 'shield'];
/** Números típicos de cada tipo, para quem inventa uma armadura (cap. 6). */
const KIND_DEFAULTS: Record<ArmorKind, ItemArmor> = {
  light: { kind: 'light', base: 11 },
  medium: { kind: 'medium', base: 13, dexCap: 2 },
  heavy: { kind: 'heavy', base: 16, dexCap: 0 },
  shield: { kind: 'shield', base: 2 },
};

/** Os números são os do livro para este nome? (aí trocar o nome troca os números junto) */
function isBookArmor(item: Item): boolean {
  const def = knownArmor(item.name);
  return Boolean(def && JSON.stringify(armorItemData(def)) === JSON.stringify(item.armor));
}

function ItemEditor({ initial, onClose }: { initial: Item | null; onClose: () => void }) {
  const edit = useSheetStore((s) => s.edit);
  const e = inv.editor;
  const [item, setItem] = useState<Item>(() => initial ?? { id: newId(), name: '', quantity: 1 });
  const [weight, setWeight] = useState(() =>
    initial?.weightKg !== undefined ? String(initial.weightKg).replace('.', ',') : '',
  );
  const [error, setError] = useState<string | null>(null);
  const ids = {
    name: useId(),
    qty: useId(),
    weight: useId(),
    notes: useId(),
    carried: useId(),
    armor: useId(),
    base: useId(),
    bonus: useId(),
    strength: useId(),
    stealth: useId(),
  };
  const book = knownWeightKg(item.name);
  const armor = item.armor;
  const setArmor = (patch: Partial<ItemArmor> | null) =>
    setItem((prev) => {
      const next = { ...prev };
      if (patch === null) delete next.armor;
      else next.armor = { ...(prev.armor ?? KIND_DEFAULTS.light), ...patch };
      return next;
    });
  // Nome de armadura do livro preenche os números (se ainda não foram mudados à mão).
  const setName = (name: string) =>
    setItem((prev) => {
      const next = { ...prev, name };
      const def = knownArmor(name);
      if (def && (!prev.armor || isBookArmor(prev))) next.armor = armorItemData(def);
      return next;
    });
  const numberOr = (v: string, min: number, max: number): number | undefined => {
    const n = Math.trunc(Number(v));
    return v.trim() !== '' && Number.isFinite(n) && n >= min && n <= max ? n : undefined;
  };

  const save = () => {
    const name = item.name.trim();
    if (!name) return setError(e.nameRequired);
    const kg = weight.trim() === '' ? undefined : Number(weight.replace(',', '.'));
    const clean: Item = { ...item, name };
    if (kg !== undefined && Number.isFinite(kg) && kg >= 0 && kg <= 1000) clean.weightKg = kg;
    else delete clean.weightKg;
    if (!clean.notes?.trim()) delete clean.notes;
    // Campos opcionais apagados não ficam como "undefined" na ficha.
    if (clean.armor) {
      clean.armor = Object.fromEntries(
        Object.entries(clean.armor).filter(([, v]) => v !== undefined),
      ) as ItemArmor;
    }
    edit((d) => {
      const i = d.inventory.items.findIndex((x) => x.id === clean.id);
      if (i >= 0) d.inventory.items[i] = clean;
      else d.inventory.items.push(clean);
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
          {initial ? (
            <Button
              variant="ghost"
              className="mr-auto text-danger"
              onClick={() => {
                edit(
                  (d) =>
                    void (d.inventory.items = d.inventory.items.filter((x) => x.id !== initial.id)),
                );
                onClose();
              }}
              data-testid="item.remove"
            >
              {e.remove}
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>
            {e.cancel}
          </Button>
          <Button variant="primary" onClick={save} data-testid="item.save">
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
            value={item.name}
            maxLength={80}
            placeholder={e.namePlaceholder}
            onChange={(ev) => setName(ev.target.value)}
            data-testid="item.name"
          />
        </div>
        <div>
          <Label htmlFor={ids.qty}>{e.quantity}</Label>
          <Input
            id={ids.qty}
            type="number"
            inputMode="numeric"
            min={0}
            max={9999}
            value={item.quantity}
            onChange={(ev) => {
              const n = Math.trunc(Number(ev.target.value));
              if (Number.isFinite(n) && n >= 0 && n <= 9999) setItem({ ...item, quantity: n });
            }}
            data-testid="item.qty"
          />
        </div>
        <div>
          <Label htmlFor={ids.weight}>{e.weight}</Label>
          <Input
            id={ids.weight}
            inputMode="decimal"
            value={weight}
            maxLength={8}
            placeholder={book !== undefined ? formatKg(book) : '—'}
            onChange={(ev) => setWeight(ev.target.value.replace(/[^\d.,]/g, ''))}
            data-testid="item.weight"
          />
        </div>
        <p className="col-span-2 -mt-1 text-xs text-muted">
          {book !== undefined ? e.weightAuto(formatKg(book)) : e.weightNone}
        </p>
        <label htmlFor={ids.carried} className="col-span-2 flex items-center gap-2 text-sm">
          <input
            id={ids.carried}
            type="checkbox"
            checked={item.equipped !== false}
            onChange={(ev) => {
              const next = { ...item };
              if (ev.target.checked) delete next.equipped;
              else next.equipped = false;
              setItem(next);
            }}
            className="size-4 accent-[var(--accent)]"
          />
          {armor ? e.wornArmor : e.carried}
        </label>
        <div className="col-span-2">
          <Label htmlFor={ids.armor}>{e.armor}</Label>
          <Select
            id={ids.armor}
            value={armor?.kind ?? ''}
            onChange={(ev) => {
              const kind = ev.target.value as ArmorKind | '';
              setArmor(kind === '' ? null : { ...KIND_DEFAULTS[kind], bonus: armor?.bonus });
            }}
            data-testid="item.armor.kind"
          >
            <option value="">{e.notArmor}</option>
            {ARMOR_KINDS.map((k) => (
              <option key={k} value={k}>
                {inv.armorKinds[k]}
              </option>
            ))}
          </Select>
        </div>
        {armor ? (
          <>
            <div>
              <Label htmlFor={ids.base}>
                {armor.kind === 'shield' ? e.shieldBonus : e.armorBase}
              </Label>
              <Input
                id={ids.base}
                type="number"
                inputMode="numeric"
                min={0}
                max={30}
                value={armor.base}
                onChange={(ev) => {
                  const n = numberOr(ev.target.value, 0, 30);
                  if (n !== undefined) setArmor({ base: n });
                }}
                data-testid="item.armor.base"
              />
            </div>
            <div>
              <Label htmlFor={ids.bonus}>{e.armorBonus}</Label>
              <Select
                id={ids.bonus}
                value={armor.bonus ?? 0}
                onChange={(ev) => {
                  const n = Number(ev.target.value);
                  setArmor({ bonus: n === 0 ? undefined : n });
                }}
              >
                {[0, 1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {n === 0 ? '—' : `+${n}`}
                  </option>
                ))}
              </Select>
            </div>
            {armor.kind !== 'shield' ? (
              <>
                <div>
                  <Label htmlFor={ids.strength}>{e.armorStrength}</Label>
                  <Input
                    id={ids.strength}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={30}
                    placeholder="—"
                    value={armor.strength ?? ''}
                    onChange={(ev) => setArmor({ strength: numberOr(ev.target.value, 1, 30) })}
                  />
                </div>
                <label
                  htmlFor={ids.stealth}
                  className="flex items-center gap-2 self-end pb-2 text-sm"
                >
                  <input
                    id={ids.stealth}
                    type="checkbox"
                    checked={Boolean(armor.stealthDisadvantage)}
                    onChange={(ev) =>
                      setArmor({ stealthDisadvantage: ev.target.checked || undefined })
                    }
                    className="size-4 accent-[var(--accent)]"
                  />
                  {e.stealth}
                </label>
              </>
            ) : null}
            <p className="col-span-2 -mt-1 text-xs text-muted">{e.armorHint}</p>
          </>
        ) : null}
        <div className="col-span-2">
          <Label htmlFor={ids.notes}>{e.notes}</Label>
          <Textarea
            id={ids.notes}
            value={item.notes ?? ''}
            maxLength={500}
            onChange={(ev) => setItem({ ...item, notes: ev.target.value })}
            className="min-h-16"
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

/**
 * Inventário (ADR-011): ouro e peso no topo, como o cabeçalho das magias; depois as
 * armas (equipada ou guardada) e os itens, com quantidade e peso.
 */
export default function InventoryTab({
  query,
  adding,
  onAddDone,
}: {
  query: string;
  /** O "+" do topo das abas pediu um item novo. */
  adding: boolean;
  onAddDone: () => void;
}) {
  const { sheet, derived } = useSheet();
  const edit = useSheetStore((s) => s.edit);
  const [editing, setEditing] = useState<{ item: Item | null } | null>(null);
  const load = derived.load;
  const q = fold(query.trim());
  const weapons = sheet.weapons.filter((w) => q === '' || fold(w.name).includes(q));
  const items = sheet.inventory.items.filter(
    (i) => q === '' || fold(`${i.name} ${i.notes ?? ''}`).includes(q),
  );
  const ratio = load.capacityKg > 0 ? Math.min(1, load.carriedKg / load.capacityKg) : 1;

  const setCoin = (key: (typeof COIN_KEYS)[number], value: number) =>
    edit((d) => void (d.inventory.coins[key] = value));
  const changeQty = (id: string, delta: number) =>
    edit((d) => {
      const it = d.inventory.items.find((x) => x.id === id);
      if (it) it.quantity = Math.max(0, Math.min(9999, it.quantity + delta));
    });

  return (
    <div className="space-y-4" data-testid="inventory">
      {/* Cabeçalho: ouro e peso */}
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-md border border-border bg-surface px-2 py-1">
          <p className="flex items-center justify-center gap-1 text-xs font-semibold text-muted">
            <Coins className="size-3.5 text-gold" aria-hidden="true" />
            {inv.gold}
          </p>
          <NumberField
            value={sheet.inventory.coins.gp}
            min={0}
            max={9_999_999}
            onCommit={(n) => setCoin('gp', n)}
            label={inv.goldEdit}
            className="font-display text-2xl font-bold"
            data-testid="inventory.gp"
          />
        </div>
        <div
          className={cn(
            'rounded-md border bg-surface px-2 py-1',
            load.over ? 'border-danger/60' : 'border-border',
          )}
          data-testid="inventory.load"
          data-carried={load.carriedKg}
          data-capacity={load.capacityKg}
        >
          <p className="flex items-center justify-center gap-1 text-xs font-semibold text-muted">
            <Scale className="size-3.5" aria-hidden="true" />
            {inv.load}
          </p>
          <p
            className={cn(
              'tabular font-display text-lg leading-8 font-bold',
              load.over && 'text-danger',
            )}
          >
            {inv.loadValue(formatKg(load.carriedKg), formatKg(load.capacityKg))}
            <span className="ml-1 font-sans text-sm font-semibold text-muted">{inv.kg}</span>
          </p>
          <div
            className="mb-1 h-1.5 overflow-hidden rounded-full bg-surface-2"
            role="meter"
            aria-label={inv.load}
            aria-valuemin={0}
            aria-valuemax={load.capacityKg}
            aria-valuenow={load.carriedKg}
          >
            <div
              className={cn('h-full rounded-full', load.over ? 'bg-danger' : 'bg-accent')}
              style={{ width: `${Math.round(ratio * 100)}%` }}
            />
          </div>
        </div>
      </div>
      <p className="-mt-2 text-xs text-muted">{inv.loadHint(formatKg(load.multiplierKg))}</p>
      {load.over ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger"
          data-testid="inventory.over"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {load.overDrag ? inv.loadOverDrag : inv.loadOver}
        </p>
      ) : null}
      {load.unknown > 0 ? (
        <p className="text-xs text-muted">{inv.unknownWeights(load.unknown)}</p>
      ) : null}

      <details className="rounded-md border border-border px-3 py-2">
        <summary className="cursor-pointer text-sm font-semibold">{inv.otherCoins}</summary>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {COIN_KEYS.filter((k) => k !== 'gp').map((k) => (
            <div key={k} className="rounded-md border border-border px-2 py-1 text-center">
              <p className="text-xs text-muted">{inv.coins[k]}</p>
              <NumberField
                value={sheet.inventory.coins[k]}
                min={0}
                max={9_999_999}
                onCommit={(n) => setCoin(k, n)}
                label={inv.coins[k]}
                className="font-display text-lg font-bold"
                data-testid={`inventory.${k}`}
              />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">{inv.coinsHint}</p>
      </details>

      {/* Armas: todas aparecem aqui; só as equipadas atacam e pesam. */}
      <section className="space-y-1.5">
        <header>
          <h3 className="font-display text-sm font-bold">{inv.weapons}</h3>
          <p className="text-xs text-muted">{inv.weaponsHint}</p>
        </header>
        {sheet.weapons.length === 0 ? (
          <p className="py-2 text-sm text-muted">{inv.emptyWeapons}</p>
        ) : (
          <ul className="space-y-1.5">
            {weapons.map((w) => {
              const on = w.equipped !== false;
              const kg = weaponWeightKg(w);
              return (
                <li
                  key={w.id}
                  className={cn(
                    'flex items-center gap-2 rounded-md border border-border px-2.5 py-2',
                    !on && 'opacity-70',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold break-words">{w.name}</p>
                    <p className="text-xs text-muted">
                      {kg === undefined ? inv.noWeight : inv.total(formatKg(kg))}
                    </p>
                  </div>
                  <CarryToggle
                    on={on}
                    onLabel={inv.equipped}
                    offLabel={inv.stored}
                    ariaLabel={inv.toggleWeapon(w.name, on)}
                    onToggle={() =>
                      edit((d) => {
                        const x = d.weapons.find((y) => y.id === w.id);
                        if (!x) return;
                        if (on) x.equipped = false;
                        else delete x.equipped;
                      })
                    }
                    testId={`inventory.weapon.${w.id}.equipped`}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-1.5">
        <header className="flex items-center justify-between gap-2">
          <h3 className="font-display text-sm font-bold">{inv.items}</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditing({ item: null })}
            data-testid="inventory.add"
          >
            <Plus className="size-4" />
            {inv.add}
          </Button>
        </header>
        {sheet.inventory.items.length === 0 ? (
          <p className="py-2 text-sm text-muted">{inv.empty}</p>
        ) : items.length === 0 ? (
          <p className="py-2 text-sm text-muted">{ts.actions.noResults}</p>
        ) : (
          <ul className="space-y-1.5">
            {items.map((item) => {
              const on = item.equipped !== false;
              const unit = itemUnitWeightKg(item);
              return (
                <li
                  key={item.id}
                  className={cn(
                    'rounded-md border border-border py-1.5 pr-1.5 pl-2.5',
                    !on && 'opacity-70',
                  )}
                  data-testid={`inventory.item.${item.id}`}
                >
                  {/* Nome inteiro em cima (no celular não corta); conta e botões embaixo. */}
                  <div className="flex items-start gap-1.5">
                    <p className="min-w-0 flex-1 pt-1 text-sm font-semibold break-words">
                      {item.name}
                    </p>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={inv.editItem(item.name)}
                      onClick={() => setEditing({ item })}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <p className="min-w-0 flex-1 truncate text-xs text-muted">
                      {item.armor ? `${inv.armorMeta(item.armor.kind, item.armor.base)} · ` : ''}
                      {unit === undefined
                        ? inv.noWeight
                        : item.quantity > 1
                          ? `${inv.total(formatKg(unit * item.quantity))} · ${inv.each(formatKg(unit))}`
                          : inv.total(formatKg(unit))}
                      {item.notes ? ` · ${item.notes}` : ''}
                    </p>
                    <div className="flex shrink-0 items-center">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={inv.less(item.name)}
                        disabled={item.quantity === 0}
                        onClick={() => changeQty(item.id, -1)}
                      >
                        <Minus className="size-3.5" />
                      </Button>
                      <span
                        className="tabular w-8 text-center text-sm font-bold"
                        aria-label={inv.qty(item.name)}
                        data-testid={`inventory.item.${item.id}.qty`}
                        data-value={item.quantity}
                      >
                        {item.quantity}
                      </span>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={inv.more(item.name)}
                        onClick={() => changeQty(item.id, 1)}
                        data-testid={`inventory.item.${item.id}.more`}
                      >
                        <Plus className="size-3.5" />
                      </Button>
                    </div>
                    <CarryToggle
                      on={on}
                      onLabel={item.armor ? inv.worn : inv.carried}
                      offLabel={item.armor ? inv.stored : inv.storedItem}
                      ariaLabel={inv.toggleItem(item.name, on)}
                      onToggle={() =>
                        edit((d) => {
                          const x = d.inventory.items.find((y) => y.id === item.id);
                          if (!x) return;
                          if (on) x.equipped = false;
                          else delete x.equipped;
                        })
                      }
                      testId={`inventory.item.${item.id}.carried`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {editing || adding ? (
        <ItemEditor
          initial={editing?.item ?? null}
          onClose={() => {
            setEditing(null);
            onAddDone();
          }}
        />
      ) : null}
    </div>
  );
}
