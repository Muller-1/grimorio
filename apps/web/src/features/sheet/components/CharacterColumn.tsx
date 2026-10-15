import { withModifier } from '@grimorio/rules';
import { ABILITY_KEYS, type AbilityKey } from '@grimorio/shared';
import { ImageUp, TrendingUp, UserRound } from 'lucide-react';
import { lazy, Suspense, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Panel } from '@/components/ui/panel';
import { Popover } from '@/components/ui/popover';
import { useToastStore } from '@/features/toast/store';
import type { ImageError } from '@/lib/image';
import { formatModifier } from '@/lib/format';
import { t } from '@/lib/i18n';
import { useSheet } from '../hooks';
import { useSheetStore } from '../store';
import { ExplainButton } from './Explain';
import { NumberField, Stepper } from '@/components/ui/number-field';
import { AdvantageBadge, d20 } from './AdvantageBadge';
import { ProficiencyToggle } from './ProficiencyToggle';
import { RollButton } from './RollButton';

type TextField = 'name' | 'className' | 'playerName' | 'origin';

// O diálogo de subir de nível (com a lista de magias) só carrega quando o jogador abre.
const LevelUpDialog = lazy(() => import('@/features/levelup/LevelUpDialog'));

function LevelUpButton() {
  const level = useSheetStore((s) => s.sheet.build.level);
  const [open, setOpen] = useState(false);
  const l = t.sheet.levelUp;
  return (
    <>
      <Button
        size="sm"
        variant="primary"
        className="w-full px-1 text-xs"
        onClick={() => setOpen(true)}
        disabled={level >= 20}
        title={level >= 20 ? l.max : l.hint}
        data-testid="levelup.open"
      >
        <TrendingUp className="size-3.5" />
        {l.button}
      </Button>
      {open ? (
        <Suspense fallback={null}>
          <LevelUpDialog onClose={() => setOpen(false)} />
        </Suspense>
      ) : null}
    </>
  );
}

function InlineField({ field, label }: { field: TextField; label: string }) {
  const value = useSheetStore((s) => s.sheet.identity[field]);
  const edit = useSheetStore((s) => s.edit);
  const id = useId();
  return (
    <div className="min-w-0 border-b border-border">
      <label htmlFor={id} className="block text-[11px] leading-tight font-semibold text-muted">
        {label}
      </label>
      <input
        id={id}
        value={value}
        maxLength={field === 'origin' ? 120 : 80}
        onChange={(e) => edit((d) => void (d.identity[field] = e.target.value))}
        className="w-full min-w-0 truncate bg-transparent pb-1 text-sm font-medium outline-none focus-visible:outline-none"
        data-testid={`identity.${field}`}
      />
    </div>
  );
}

function Portrait() {
  const url = useSheetStore((s) => s.sheet.identity.portraitUrl);
  const data = useSheetStore((s) => s.sheet.identity.portraitData);
  const edit = useSheetStore((s) => s.edit);
  const toast = useToastStore((s) => s.push);
  const [draft, setDraft] = useState(url ?? '');
  const [busy, setBusy] = useState(false);
  const id = useId();
  const fileId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const shown = data ?? url;
  const i = t.sheet.identity;

  const commit = (text: string) => {
    setDraft(text);
    const trimmed = text.trim();
    if (trimmed === '') {
      edit((d) => void delete d.identity.portraitUrl);
      return;
    }
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'https:') edit((d) => void (d.identity.portraitUrl = parsed.href));
    } catch {
      // ainda digitando
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      // A compressão só carrega quando o jogador escolhe uma foto.
      const { compressPortrait } = await import('@/lib/image');
      const compressed = await compressPortrait(file);
      edit((d) => void (d.identity.portraitData = compressed));
    } catch (err) {
      const code: ImageError =
        err instanceof Error && ['not-image', 'too-big'].includes(err.message)
          ? (err.message as ImageError)
          : 'unreadable';
      toast(i.portraitErrors[code], 'danger');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Popover
      align="start"
      trigger={
        <button
          type="button"
          className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-border-strong bg-surface-2 text-muted hover:border-accent sm:size-24"
          aria-label={i.portrait}
          data-testid="portrait.trigger"
        >
          {shown ? (
            <img
              src={shown}
              alt={i.portrait}
              className="size-full object-cover"
              referrerPolicy="no-referrer"
              data-testid="portrait.image"
            />
          ) : (
            <UserRound className="size-10" />
          )}
        </button>
      }
    >
      <div className="space-y-3">
        <div>
          <input
            ref={fileRef}
            id={fileId}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => void upload(e.target.files?.[0])}
            data-testid="portrait.file"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="primary"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <ImageUp className="size-4" />
              {busy ? i.portraitBusy : i.portraitUpload}
            </Button>
            {data ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => edit((d) => void delete d.identity.portraitData)}
                data-testid="portrait.remove"
              >
                {i.portraitRemove}
              </Button>
            ) : null}
          </div>
          <p className="mt-1.5 text-xs text-muted">{i.portraitUploadHint}</p>
        </div>
        <div className="border-t border-border pt-3">
          <Label htmlFor={id}>{i.portraitUrl}</Label>
          <Input
            id={id}
            type="url"
            inputMode="url"
            placeholder={i.portraitPlaceholder}
            value={draft}
            onChange={(e) => commit(e.target.value)}
            className="mt-1"
          />
          <p className="mt-1.5 text-xs text-muted">{i.portraitHint}</p>
        </div>
      </div>
    </Popover>
  );
}

function IdentityPanel() {
  const { sheet, derived } = useSheet();
  const edit = useSheetStore((s) => s.edit);
  const descId = useId();

  return (
    <Panel bodyClassName="space-y-3">
      <div className="flex gap-3">
        <Portrait />
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-x-3 gap-y-1.5 min-[420px]:grid-cols-2">
          <InlineField field="name" label={t.sheet.identity.name} />
          <InlineField field="className" label={t.sheet.identity.className} />
          <InlineField field="playerName" label={t.sheet.identity.player} />
          <InlineField field="origin" label={t.sheet.identity.origin} />
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <label htmlFor={descId} className="text-xs font-semibold text-muted">
            {t.sheet.identity.description}:
          </label>
          <Textarea
            id={descId}
            value={sheet.identity.description}
            maxLength={4000}
            placeholder={t.sheet.identity.descriptionPlaceholder}
            onChange={(e) => edit((d) => void (d.identity.description = e.target.value))}
            className="mt-1 min-h-24 flex-1 text-sm"
          />
        </div>
        <div className="flex w-28 shrink-0 flex-col gap-2">
          <div className="rounded-lg border border-border-strong bg-surface-2 px-1 pt-1 pb-1.5 text-center">
            <p className="text-xs font-semibold text-muted">{t.sheet.identity.level}</p>
            {/* Sem − e +: o nível muda pelo "Subir de nível", que mostra o que se ganha. */}
            <p
              className="tabular font-display text-3xl font-bold"
              data-testid="stat.level"
              data-value={sheet.build.level}
            >
              {sheet.build.level}
            </p>
          </div>
          <LevelUpButton />
          <div className="rounded-lg border border-border px-1 py-1 text-center">
            <p className="text-xs font-semibold text-muted">{t.sheet.identity.proficiency}</p>
            <ExplainButton
              explained={derived.proficiencyBonus}
              title={t.sheet.identity.proficiency}
              testId="stat.prof"
              className="text-lg"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">{t.sheet.identity.inspiration}:</span>
        <Stepper
          value={sheet.state.inspiration}
          min={0}
          max={10}
          onChange={(v) => edit((d) => void (d.state.inspiration = v))}
          label={t.sheet.identity.inspiration}
          className="w-32"
          inputClassName="text-lg font-bold"
          testId="stat.inspiration"
        />
      </div>
    </Panel>
  );
}

function AbilityCard({ ability }: { ability: AbilityKey }) {
  const { derived } = useSheet();
  const edit = useSheetStore((s) => s.edit);
  const { score, mod } = derived.abilities[ability];
  const name = t.abilities[ability];
  return (
    <div className="rounded-lg border border-border bg-surface-2/60 p-2 text-center">
      <p className="truncate text-xs font-bold tracking-wide text-muted uppercase">
        <abbr title={name} className="no-underline sm:hidden">
          {t.abilitiesShort[ability]}
        </abbr>
        <span className="max-sm:hidden">{name}</span>
      </p>
      <div className="mt-1 flex items-center justify-center gap-1">
        <NumberField
          value={score}
          min={1}
          max={30}
          onCommit={(v) => edit((d) => void (d.build.abilities[ability] = v))}
          label={t.sheet.abilityScore(name)}
          className="w-12 font-display text-2xl font-bold"
          data-testid={`ability.${ability}.score`}
          data-value={score}
        />
        <div className="flex flex-col items-center">
          <span
            className="tabular text-sm font-semibold"
            data-testid={`ability.${ability}.mod`}
            data-value={mod}
            title={t.sheet.abilityMod}
          >
            {formatModifier(mod)}
          </span>
          <RollButton
            rollLabel={t.sheet.checkLabel(name)}
            expression={withModifier('1d20', mod)}
            ariaLabel={t.sheet.rollCheck(name)}
            className="size-7"
            testId={`ability.${ability}.roll`}
          />
        </div>
      </div>
    </div>
  );
}

function AbilitiesPanel() {
  return (
    <Panel title={t.sheet.abilitiesTitle}>
      <div className="grid grid-cols-3 gap-2">
        {ABILITY_KEYS.map((a) => (
          <AbilityCard key={a} ability={a} />
        ))}
      </div>
    </Panel>
  );
}

function SavesPanel() {
  const { sheet, derived } = useSheet();
  const edit = useSheetStore((s) => s.edit);
  // Ordem do protótipo: Força, Inteligência / Destreza, Sabedoria / Constituição, Carisma
  const order: AbilityKey[] = ['str', 'int', 'dex', 'wis', 'con', 'cha'];
  return (
    <Panel title={t.sheet.savesTitle}>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-1 min-[420px]:grid-cols-2">
        {order.map((ability) => {
          const save = derived.saves[ability];
          const name = t.abilities[ability];
          const bonus = save.bonus.value;
          return (
            <li key={ability} className="flex items-center gap-2">
              <ProficiencyToggle
                binary
                value={sheet.build.saveProficiencies.includes(ability) ? 1 : 0}
                onChange={(v) =>
                  edit((d) => {
                    const set = new Set(d.build.saveProficiencies);
                    if (v > 0) set.add(ability);
                    else set.delete(ability);
                    d.build.saveProficiencies = ABILITY_KEYS.filter((k) => set.has(k));
                  })
                }
                name={t.sheet.saveLabel(name)}
                testId={`save.${ability}.prof`}
              />
              <span className="flex-1 truncate text-sm">{name}</span>
              <AdvantageBadge advantage={save.advantage} disadvantage={save.disadvantage} />
              <ExplainButton
                explained={save.bonus}
                title={t.sheet.saveLabel(name)}
                testId={`save.${ability}`}
              />
              <RollButton
                rollLabel={t.sheet.saveLabel(name)}
                expression={`${withModifier(d20(save.advantage, save.disadvantage), bonus)}${save.bonusDice.join('')}`}
                ariaLabel={t.sheet.rollSave(name)}
                className="size-7"
              />
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function CharacterColumn() {
  return (
    <div className="space-y-3">
      <IdentityPanel />
      <AbilitiesPanel />
      <SavesPanel />
    </div>
  );
}
