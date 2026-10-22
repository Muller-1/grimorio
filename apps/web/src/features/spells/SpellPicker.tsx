import type { SpellClass, SpellDef, SpellLevel } from '@grimorio/rules';
import { filterSpells } from '@grimorio/rules/spells-data';
import { Plus } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label, Select } from '@/components/ui/input';
import { tsp } from '@/lib/i18n/spells';

const LIMIT = 60;

export type AddAs = 'cantrip' | 'prepared' | 'spellbook';

/**
 * Lista para escolher magias: busca sem acento, círculo e listas de classe. Usada na aba Magias
 * e na subida de nível (com `pick` limitando quantas e de onde).
 */
export function SpellList({
  lists,
  maxCircle,
  levels,
  school,
  onlyIds,
  selected,
  onToggle,
  disabledIds,
  allowAllLists = true,
  highlightIds,
  highlightLabel,
  disabledLabel = tsp.added,
  describe = false,
  testId,
}: {
  lists: string[];
  maxCircle: number;
  /** Círculos aceitos (padrão: 0 até `maxCircle`). */
  levels?: SpellLevel[];
  school?: string;
  /** Só estas (ex.: as do grimório). */
  onlyIds?: string[];
  selected: string[];
  onToggle: (spell: SpellDef) => void;
  /** Já na ficha: aparecem marcadas e sem botão. */
  disabledIds?: Set<string>;
  allowAllLists?: boolean;
  /** Marcadas com `highlightLabel` e no topo da lista (ex.: as recomendadas pelo livro). */
  highlightIds?: string[] | undefined;
  highlightLabel?: string;
  /** Rótulo das que estão em `disabledIds` (padrão: "Na ficha"). */
  disabledLabel?: string;
  /** Mostra o começo do texto de cada magia (assistente: ajuda quem nunca jogou a escolher). */
  describe?: boolean;
  testId?: string;
}) {
  const [query, setQuery] = useState('');
  const [circle, setCircle] = useState<string>('');
  const [all, setAll] = useState(lists.length === 0);
  const searchId = useId();
  const circleId = useId();
  const allId = useId();
  const accepted = useMemo<SpellLevel[]>(
    () => levels ?? (Array.from({ length: maxCircle + 1 }, (_, i) => i) as SpellLevel[]),
    [levels, maxCircle],
  );

  const results = useMemo(() => {
    const only = onlyIds ? new Set(onlyIds) : null;
    return filterSpells({
      ...(all || lists.length === 0 ? {} : { classes: lists as SpellClass[] }),
      levels: circle === '' ? accepted : accepted.filter((l) => l === Number(circle)),
      ...(school ? { school } : {}),
      query,
    }).filter((s) => !only || only.has(s.id));
  }, [all, lists, circle, accepted, school, query, onlyIds]);
  const highlighted = new Set(highlightIds ?? []);
  const ordered = highlighted.size
    ? [
        ...results.filter((s) => highlighted.has(s.id)),
        ...results.filter((s) => !highlighted.has(s.id)),
      ]
    : results;

  return (
    <div className="space-y-2" data-testid={testId}>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div>
          <Label htmlFor={searchId}>{tsp.search}</Label>
          <Input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid={testId ? `${testId}.search` : undefined}
          />
        </div>
        {accepted.length > 1 ? (
          <div>
            <Label htmlFor={circleId}>{tsp.filterCircle}</Label>
            <Select id={circleId} value={circle} onChange={(e) => setCircle(e.target.value)}>
              <option value="">{tsp.anyCircle}</option>
              {accepted.map((l) => (
                <option key={l} value={l}>
                  {tsp.circle(l)}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>
      {allowAllLists && lists.length > 0 ? (
        <label htmlFor={allId} className="flex items-center gap-2 text-sm">
          <input
            id={allId}
            type="checkbox"
            checked={all}
            onChange={(e) => setAll(e.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          {tsp.allLists}
        </label>
      ) : null}
      {results.length === 0 ? (
        <p className="py-3 text-center text-sm text-muted">{tsp.noResults}</p>
      ) : (
        <ul className="max-h-[45dvh] space-y-1 overflow-y-auto pr-1">
          {ordered.slice(0, LIMIT).map((s) => {
            const inSheet = disabledIds?.has(s.id) ?? false;
            const on = selected.includes(s.id);
            return (
              <li key={s.id}>
                <label
                  className={`flex cursor-pointer items-start gap-2 rounded-md border px-2 py-1.5 text-sm ${
                    on ? 'border-accent bg-accent-soft' : 'border-border'
                  } ${inSheet ? 'opacity-60' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={on || inSheet}
                    disabled={inSheet}
                    onChange={() => onToggle(s)}
                    className="mt-0.5 size-4 accent-[var(--accent)]"
                    data-testid={`pick.${s.id}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold">{s.name}</span>
                    {highlightLabel && highlighted.has(s.id) ? (
                      <span className="ml-1.5 text-xs font-semibold text-gold">
                        {highlightLabel}
                      </span>
                    ) : null}
                    <span className="block text-xs text-muted">
                      {tsp.meta(s.level, tsp.schools[s.school])}
                      {s.concentration ? ` · ${tsp.concentrationTag}` : ''}
                      {s.ritual ? ` · ${tsp.ritualTag}` : ''}
                      {inSheet ? ` · ${disabledLabel}` : ''}
                    </span>
                    {describe ? (
                      <span className="mt-0.5 line-clamp-2 block text-xs text-text/80">
                        {s.text}
                      </span>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      {results.length > LIMIT ? <p className="text-xs text-muted">{tsp.more(LIMIT)}</p> : null}
    </div>
  );
}

/** Diálogo "Adicionar magia" da aba Magias. */
export function SpellPicker({
  lists,
  maxCircle,
  wizard,
  inSheet,
  onAdd,
  onClose,
}: {
  lists: string[];
  maxCircle: number;
  wizard: boolean;
  inSheet: Set<string>;
  onAdd: (spells: { id: string; as: AddAs }[]) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<SpellDef[]>([]);
  const [as, setAs] = useState<Exclude<AddAs, 'cantrip'>>(wizard ? 'spellbook' : 'prepared');
  const asId = useId();
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={tsp.pickerTitle}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {tsp.customCancel}
          </Button>
          <Button
            variant="primary"
            disabled={picked.length === 0}
            onClick={() => {
              onAdd(picked.map((s) => ({ id: s.id, as: s.level === 0 ? 'cantrip' : as })));
              onClose();
            }}
            data-testid="picker.add"
          >
            <Plus className="size-4" />
            {tsp.add}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <Label htmlFor={asId}>{tsp.addTo}</Label>
          <Select
            id={asId}
            value={as}
            onChange={(e) => setAs(e.target.value as Exclude<AddAs, 'cantrip'>)}
          >
            <option value="prepared">{tsp.addAs.prepared}</option>
            {wizard ? <option value="spellbook">{tsp.addAs.spellbook}</option> : null}
          </Select>
        </div>
        <SpellList
          lists={lists}
          maxCircle={Math.max(maxCircle, lists.length === 0 ? 9 : 0)}
          selected={picked.map((s) => s.id)}
          disabledIds={inSheet}
          onToggle={(s) =>
            setPicked((p) =>
              p.some((x) => x.id === s.id) ? p.filter((x) => x.id !== s.id) : [...p, s],
            )
          }
          testId="picker"
        />
      </div>
    </Dialog>
  );
}
