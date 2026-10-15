import { parse } from '@grimorio/rules';
import {
  ABILITY_KEYS,
  DAMAGE_TYPES,
  type AbilityKey,
  type CustomSpell,
  type DamageType,
} from '@grimorio/shared';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { useSheetStore } from '@/features/sheet/store';
import { t } from '@/lib/i18n';
import { tsp } from '@/lib/i18n/spells';
import { newId } from '@/ports/ids';

/** "Outra magia (do livro)": o jogador escreve, a ficha guarda (fora do SRD, ADR-008). */
export function CustomSpellEditor({
  initial,
  onClose,
}: {
  initial: CustomSpell | null;
  onClose: () => void;
}) {
  const edit = useSheetStore((s) => s.edit);
  const [s, setS] = useState<CustomSpell>(
    () => initial ?? { id: newId(), name: '', level: 1, prepared: true, text: '' },
  );
  const [error, setError] = useState<string | null>(null);
  const ids = {
    name: useId(),
    level: useId(),
    text: useId(),
    dice: useId(),
    type: useId(),
    save: useId(),
  };
  const set = <K extends keyof CustomSpell>(key: K, value: CustomSpell[K] | undefined) =>
    setS((prev) => {
      const next = { ...prev };
      if (value === undefined || (value === '' && key !== 'name' && key !== 'text'))
        delete next[key];
      else next[key] = value as CustomSpell[K];
      return next;
    });
  const check = (key: 'concentration' | 'ritual' | 'attack' | 'prepared', label: string) => (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={Boolean(s[key])}
        onChange={(e) =>
          set(key, key === 'prepared' ? e.target.checked : e.target.checked || undefined)
        }
        className="size-4 accent-[var(--accent)]"
      />
      {label}
    </label>
  );

  const save = () => {
    if (!s.name.trim()) return setError(tsp.customNameRequired);
    const dice = s.damageDice?.trim();
    if (dice && !parse(dice).ok) return setError(tsp.customInvalidDice);
    const clean: CustomSpell = { ...s, name: s.name.trim() };
    edit((d) => {
      const i = d.spells.custom.findIndex((x) => x.id === clean.id);
      if (i >= 0) d.spells.custom[i] = clean;
      else d.spells.custom.push(clean);
    });
    onClose();
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={tsp.customTitle}
      description={tsp.customHint}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {tsp.customCancel}
          </Button>
          <Button variant="primary" onClick={save} data-testid="custom-spell.save">
            {tsp.customSaveBtn}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label htmlFor={ids.name}>{tsp.customName}</Label>
          <Input
            id={ids.name}
            value={s.name}
            maxLength={80}
            onChange={(e) => set('name', e.target.value)}
            data-testid="custom-spell.name"
          />
        </div>
        <div>
          <Label htmlFor={ids.level}>{tsp.customLevel}</Label>
          <Select
            id={ids.level}
            value={s.level}
            onChange={(e) => set('level', Number(e.target.value))}
          >
            {Array.from({ length: 10 }, (_, i) => (
              <option key={i} value={i}>
                {tsp.circle(i)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={ids.save}>{tsp.customSave}</Label>
          <Select
            id={ids.save}
            value={s.save ?? ''}
            onChange={(e) => set('save', (e.target.value || undefined) as AbilityKey | undefined)}
          >
            <option value="">{tsp.customNoSave}</option>
            {ABILITY_KEYS.map((k) => (
              <option key={k} value={k}>
                {t.abilities[k]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={ids.dice}>{tsp.customDamage}</Label>
          <Input
            id={ids.dice}
            value={s.damageDice ?? ''}
            maxLength={40}
            onChange={(e) => set('damageDice', e.target.value)}
            className="font-mono"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>
        <div>
          <Label htmlFor={ids.type}>{t.sheet.weaponEditor.damageType}</Label>
          <Select
            id={ids.type}
            value={s.damageType ?? ''}
            onChange={(e) =>
              set('damageType', (e.target.value || undefined) as DamageType | undefined)
            }
          >
            <option value="">{t.sheet.weaponEditor.noDamageType}</option>
            {DAMAGE_TYPES.map((d) => (
              <option key={d} value={d}>
                {t.damageTypes[d]}
              </option>
            ))}
          </Select>
        </div>
        <div className="col-span-2 flex flex-wrap gap-x-4 gap-y-2">
          {check('prepared', tsp.customPrepared)}
          {check('concentration', tsp.customConcentration)}
          {check('ritual', tsp.customRitual)}
          {check('attack', tsp.customAttack)}
        </div>
        <div className="col-span-2">
          <Label htmlFor={ids.text}>{tsp.customText}</Label>
          <Textarea
            id={ids.text}
            value={s.text}
            maxLength={4000}
            onChange={(e) => set('text', e.target.value)}
            className="min-h-28"
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
