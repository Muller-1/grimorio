import {
  catalogToSheet,
  searchCatalog,
  type CatalogEntry,
  type CatalogKind,
} from '@grimorio/rules/inventory-catalog';
import { Plus } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label, Select } from '@/components/ui/input';
import { useSheetStore } from '@/features/sheet/store';
import { useToastStore } from '@/features/toast/store';
import { formatKg } from '@/lib/format';
import { t } from '@/lib/i18n';
import { tb as b } from '@/lib/i18n/book-items';
import { te } from '@/lib/i18n/editors';
import { newId } from '@/ports/ids';

const inv = te.inventory;

/** Os mesmos tetos do formato da ficha (`WeaponSchema`, `InventorySchema`). */
const MAX_WEAPONS = 50;
const MAX_ITEMS = 200;

/** "1d8 Cortante · Versátil (1d10) · Maestria: Afligir" / "CA 16 · Armadura Pesada · sem Destreza". */
function detail(e: CatalogEntry): string {
  const parts: string[] = [];
  if (e.weapon)
    parts.push(`${e.weapon.dice} ${t.damageTypes[e.weapon.damageType]}`, e.weapon.properties);
  if (e.armor) {
    parts.push(inv.armorMeta(e.armor.kind, e.armor.base));
    if (e.armor.kind !== 'shield')
      parts.push(e.armor.dexCap === null ? b.dexAll : b.dexMax(e.armor.dexCap));
  }
  if (e.weightKg !== undefined) parts.push(inv.total(formatKg(e.weightKg)));
  return parts.join(' · ');
}

/**
 * "Adicionar do livro" do Inventário (carrega no clique, com o catálogo): busca e um toque em "+"
 * por item. Cada toque acrescenta um (duas adagas = dois toques).
 */
export default function BookItemsDialog({ onClose }: { onClose: () => void }) {
  const edit = useSheetStore((s) => s.edit);
  const toast = useToastStore((s) => s.push);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<CatalogKind | ''>('');
  const searchId = useId();
  const kindId = useId();
  const results = useMemo(() => searchCatalog(query, kind || undefined), [query, kind]);

  const add = (entry: CatalogEntry) => {
    const sheet = useSheetStore.getState().sheet;
    const out = catalogToSheet(entry, sheet, newId);
    // Item igual (mesmo nome, sem números mudados) soma na quantidade: 20 flechas, uma linha só.
    const same =
      'item' in out
        ? sheet.inventory.items.findIndex(
            (i) => i.name === out.item.name && Boolean(i.armor) === Boolean(out.item.armor),
          )
        : -1;
    const full =
      'weapon' in out
        ? sheet.weapons.length >= MAX_WEAPONS
        : same < 0 && sheet.inventory.items.length >= MAX_ITEMS;
    if (full) {
      toast(b.full, 'danger');
      return;
    }
    edit((d) => {
      if ('weapon' in out) d.weapons.push(out.weapon);
      else if (same >= 0) d.inventory.items[same]!.quantity += 1;
      else d.inventory.items.push(out.item);
    });
    toast(b.added(entry.name), 'success');
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={b.title}
      description={b.lead}
      footer={
        <Button variant="primary" onClick={onClose} data-testid="book-items.done">
          {b.done}
        </Button>
      }
    >
      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div>
            <Label htmlFor={searchId}>{b.search}</Label>
            <Input
              id={searchId}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              data-testid="book-items.search"
            />
          </div>
          <div>
            <Label htmlFor={kindId}>{b.kind}</Label>
            <Select
              id={kindId}
              value={kind}
              onChange={(e) => setKind(e.target.value as CatalogKind | '')}
              data-testid="book-items.kind"
            >
              <option value="">{b.kinds.all}</option>
              <option value="weapon">{b.kinds.weapon}</option>
              <option value="armor">{b.kinds.armor}</option>
              <option value="gear">{b.kinds.gear}</option>
            </Select>
          </div>
        </div>
        {results.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted">{b.empty}</p>
        ) : (
          <ul className="max-h-[50dvh] space-y-1 overflow-y-auto pr-1">
            {results.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-sm"
              >
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{e.name}</span>
                  <span className="block text-xs text-muted">{detail(e)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => add(e)}
                  aria-label={b.addOne(e.name)}
                  title={b.addOne(e.name)}
                  className="grid size-9 shrink-0 place-items-center rounded-md border border-accent/50 bg-accent-soft text-accent hover:bg-accent hover:text-accent-contrast"
                  data-testid={`book-items.add.${e.id}`}
                >
                  <Plus className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
