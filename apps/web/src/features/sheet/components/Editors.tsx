import { knownWeightKg, parse, splitQuantity, weaponTraits, withModifier } from '@grimorio/rules';
import {
  DAMAGE_TYPES,
  FEATURE_SOURCES,
  type DamageType,
  type Feature,
  type FeatureSource,
  type Weapon,
} from '@grimorio/shared';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { formatKg, formatModifier } from '@/lib/format';
import { t } from '@/lib/i18n';
import { ts } from '@/lib/i18n/sheet';
import { newId } from '@/ports/ids';
import { useSheet } from '../hooks';
import { useSheetStore } from '../store';

/**
 * Janelas de criar/editar arma e característica. Carregadas só quando o jogador abre uma
 * (a página da ficha fica mais leve).
 */

const a = ts.actions;

const blankWeapon = (): Weapon => ({
  id: newId(),
  name: '',
  ability: 'str',
  proficient: true,
  damageDice: '',
  magicBonus: 0,
  critRange: 20,
  range: 'melee',
  finesse: false,
});

/** Arma de ficha antiga (sem alcance e Acuidade guardados): o editor mostra o que a ficha deduz. */
function withTraits(weapon: Weapon): Weapon {
  const t = weaponTraits(weapon);
  return { ...weapon, range: t.range, finesse: t.finesse };
}

/** Propriedades de marcar (a lista do livro, cap. 6). */
const FLAGS = ['finesse', 'thrown', 'twoHanded', 'light', 'reach'] as const;

export function WeaponEditor({
  initial,
  onClose,
}: {
  initial: Weapon | null;
  onClose: () => void;
}) {
  const edit = useSheetStore((s) => s.edit);
  const { derived } = useSheet();
  const [w, setW] = useState<Weapon>(() => (initial ? withTraits(initial) : blankWeapon()));
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
    equipped: useId(),
    weight: useId(),
    range: useId(),
    normal: useId(),
    long: useId(),
  };
  const e = ts.weaponEditor;
  const [weight, setWeight] = useState(() =>
    initial?.weightKg !== undefined ? String(initial.weightKg).replace('.', ',') : '',
  );
  const named = splitQuantity(w.name);
  const bookUnit = knownWeightKg(named.name);
  const bookKg = bookUnit === undefined ? undefined : bookUnit * named.quantity;

  const set = <K extends keyof Weapon>(key: K, value: Weapon[K]) =>
    setW((prev) => ({ ...prev, [key]: value }));
  /** Marca/desmarca uma propriedade; Acuidade e "à distância" sugerem o atributo certo. */
  const setFlag = (key: (typeof FLAGS)[number], on: boolean) =>
    setW((prev) => {
      const next = { ...prev };
      if (key === 'finesse') next.finesse = on;
      else if (on) next[key] = true;
      else delete next[key];
      if (key === 'finesse' && on && prev.ability === 'str') next.ability = 'finesse';
      return next;
    });
  const setRange = (range: 'melee' | 'ranged') =>
    setW((prev) => ({
      ...prev,
      range,
      ...(range === 'ranged' && prev.ability === 'str' ? { ability: 'dex' as const } : {}),
    }));
  const [distance, setDistance] = useState(() => ({
    normal: initial?.rangeM ? String(initial.rangeM.normal).replace('.', ',') : '',
    long: initial?.rangeM ? String(initial.rangeM.long).replace('.', ',') : '',
  }));
  const meters = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')));

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
    const kg = weight.trim() === '' ? undefined : Number(weight.replace(',', '.'));
    if (kg !== undefined && Number.isFinite(kg) && kg >= 0 && kg <= 1000) clean.weightKg = kg;
    else delete clean.weightKg;
    const normal = meters(distance.normal);
    const long = meters(distance.long);
    const okM = (n: number) => Number.isFinite(n) && n > 0 && n <= 1000;
    if ((clean.range === 'ranged' || clean.thrown) && okM(normal)) {
      clean.rangeM = { normal, long: okM(long) ? Math.max(long, normal) : normal };
    } else delete clean.rangeM;
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
        <div className="col-span-2">
          <Label htmlFor={ids.range}>{e.range}</Label>
          <Select
            id={ids.range}
            value={w.range ?? 'melee'}
            onChange={(ev) => setRange(ev.target.value as 'melee' | 'ranged')}
            data-testid="weapon.range"
          >
            <option value="melee">{e.melee}</option>
            <option value="ranged">{e.ranged}</option>
          </Select>
        </div>
        <fieldset className="col-span-2">
          <legend className="mb-1 text-sm font-medium">{e.flags}</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {FLAGS.map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(w[key])}
                  onChange={(ev) => setFlag(key, ev.target.checked)}
                  className="size-4 accent-[var(--accent)]"
                  data-testid={`weapon.flag.${key}`}
                />
                {e.flag[key]}
              </label>
            ))}
          </div>
        </fieldset>
        {w.range === 'ranged' || w.thrown ? (
          <>
            <div>
              <Label htmlFor={ids.normal}>{e.normalRange}</Label>
              <Input
                id={ids.normal}
                inputMode="decimal"
                value={distance.normal}
                maxLength={6}
                placeholder="24"
                onChange={(ev) =>
                  setDistance((d) => ({ ...d, normal: ev.target.value.replace(/[^\d.,]/g, '') }))
                }
              />
            </div>
            <div>
              <Label htmlFor={ids.long}>{e.longRange}</Label>
              <Input
                id={ids.long}
                inputMode="decimal"
                value={distance.long}
                maxLength={6}
                placeholder="96"
                onChange={(ev) =>
                  setDistance((d) => ({ ...d, long: ev.target.value.replace(/[^\d.,]/g, '') }))
                }
              />
            </div>
          </>
        ) : null}
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
        <label htmlFor={ids.equipped} className="col-span-2 flex items-start gap-2 text-sm">
          <input
            id={ids.equipped}
            type="checkbox"
            checked={w.equipped !== false}
            onChange={(ev) =>
              setW((prev) => {
                const next = { ...prev };
                if (ev.target.checked) delete next.equipped;
                else next.equipped = false;
                return next;
              })
            }
            className="mt-0.5 size-4 accent-[var(--accent)]"
            data-testid="weapon.equipped"
          />
          <span>
            {e.equipped}
            <span className="block text-xs text-muted">{e.equippedHint}</span>
          </span>
        </label>
        <div>
          <Label htmlFor={ids.weight}>{e.weight}</Label>
          <Input
            id={ids.weight}
            inputMode="decimal"
            value={weight}
            maxLength={8}
            placeholder={bookKg !== undefined ? formatKg(bookKg) : '—'}
            onChange={(ev) => setWeight(ev.target.value.replace(/[^\d.,]/g, ''))}
          />
        </div>
        <p className="self-end pb-2 text-xs text-muted">
          {bookKg !== undefined ? e.weightAuto(formatKg(bookKg)) : e.weightNone}
        </p>
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

export function FeatureEditor({
  initial,
  onClose,
}: {
  initial: Feature | null;
  onClose: () => void;
}) {
  const edit = useSheetStore((s) => s.edit);
  const [f, setF] = useState<Feature>(
    () => initial ?? { id: newId(), name: '', text: '', source: 'other' },
  );
  const [error, setError] = useState<string | null>(null);
  const nameId = useId();
  const textId = useId();
  const sourceId = useId();
  const e = ts.featureEditor;

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
          <Label htmlFor={sourceId}>{e.source}</Label>
          <Select
            id={sourceId}
            value={f.source ?? 'other'}
            onChange={(ev) => setF({ ...f, source: ev.target.value as FeatureSource })}
            data-testid="feature.source"
          >
            {FEATURE_SOURCES.map((k) => (
              <option key={k} value={k}>
                {a.featureGroups[k]}
              </option>
            ))}
          </Select>
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
