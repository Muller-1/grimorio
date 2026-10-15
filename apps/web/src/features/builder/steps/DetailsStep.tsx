import {
  ALIGNMENTS,
  buildCharacterSheet,
  deriveSheet,
  draftClass,
  proficientSkills,
} from '@grimorio/rules';
import { SKILL_KEYS } from '@grimorio/shared';
import { useId, useMemo } from 'react';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Panel } from '@/components/ui/panel';
import { feetToMeters, formatModifier } from '@/lib/format';
import { t } from '@/lib/i18n';
import { tw } from '@/lib/i18n/wizard';
import { cn } from '@/lib/utils';
import { Badge, BlockTitle, SkillPicker, Term } from '../components/parts';
import { useBuilderStore } from '../store';

const dt = tw.details;

let previewIds = 0;
const previewId = () => `previa-${++previewIds}`;

/** Prévia: exatamente o que vai para a ficha (o mesmo cálculo da ficha). */
function SheetPreview() {
  const draft = useBuilderStore((s) => s.draft);
  const sheet = useMemo(
    () =>
      buildCharacterSheet(
        { ...draft, name: draft.name.trim() || '—' },
        { newId: previewId, preview: true },
      ),
    [draft],
  );
  if (!sheet) return null;
  const d = deriveSheet(sheet);
  const skills = SKILL_KEYS.filter((s) => (sheet.build.skillProficiencies[s] ?? 0) > 0);
  const stats: [string, string, string][] = [
    [dt.hp, String(d.hpMax.value), 'hp'],
    [dt.ac, String(d.armorClass.value), 'ac'],
    [dt.initiative, formatModifier(d.initiative.value), 'initiative'],
    [dt.speed, `${feetToMeters(d.speedFt)} m`, 'speed'],
    [dt.proficiency, formatModifier(d.proficiencyBonus.value), 'prof'],
  ];

  return (
    <Panel title={dt.summary} className="lg:sticky lg:top-20">
      <p className="font-display text-xl font-bold">{sheet.identity.name}</p>
      <p className="text-sm text-muted">
        {sheet.identity.className} · {sheet.identity.origin}
      </p>
      <dl className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {stats.map(([label, value, id]) => (
          <div key={id} className="rounded-lg border border-border bg-bg p-2 text-center">
            <dt className="text-[10px] font-semibold text-muted uppercase">{label}</dt>
            <dd
              className="tabular font-display text-xl font-bold"
              data-testid={`wizard.preview.${id}`}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 grid grid-cols-6 gap-1 text-center">
        {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((k) => (
          <div
            key={k}
            className={cn(
              'rounded-md p-1',
              sheet.build.saveProficiencies.includes(k) && 'bg-accent-soft',
            )}
          >
            <p className="text-[10px] font-bold text-muted">{t.abilitiesShort[k]}</p>
            <p className="tabular font-bold">{d.abilities[k].score}</p>
            <p className="tabular text-xs">{formatModifier(d.abilities[k].mod)}</p>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <BlockTitle>{dt.skills}</BlockTitle>
        <p className="text-sm">
          {skills
            .map(
              (s) =>
                `${t.skills[s]} ${formatModifier(d.skills[s].bonus.value)}${d.skills[s].proficiency === 2 ? '★' : ''}`,
            )
            .join(' · ')}
        </p>
      </div>
      <div className="mt-3">
        <BlockTitle>{dt.attacks}</BlockTitle>
        {d.attacks.length ? (
          <ul className="space-y-0.5 text-sm">
            {d.attacks.map((atk) => {
              const weapon = sheet.weapons.find((w) => w.id === atk.weaponId)!;
              return (
                <li key={atk.weaponId} className="flex justify-between gap-2">
                  <span>{weapon.name}</span>
                  <span className="tabular text-muted">
                    {formatModifier(atk.toHit.value)} · {atk.damageExpression}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">{dt.noAttacks}</p>
        )}
      </div>
      <div className="mt-3">
        <BlockTitle>{dt.features}</BlockTitle>
        <div className="flex flex-wrap gap-1">
          {sheet.features.map((f) => (
            <Badge key={f.id}>{f.name}</Badge>
          ))}
        </div>
      </div>
    </Panel>
  );
}

export function DetailsStep({ saveTo }: { saveTo: 'account' | 'local' }) {
  const draft = useBuilderStore((s) => s.draft);
  const update = useBuilderStore((s) => s.update);
  const cls = draftClass(draft);
  const nameId = useId();
  const playerId = useId();
  const appearanceId = useId();
  const backstoryId = useId();
  const expertise = cls?.expertise ?? 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <div className="space-y-5">
        <div className="space-y-3 text-[15px] leading-relaxed">
          <h1 className="font-display text-2xl font-bold">{dt.title}</h1>
          {dt.intro.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div id="wizard-name" className="scroll-mt-24">
            <Label htmlFor={nameId}>{dt.name}</Label>
            <Input
              id={nameId}
              value={draft.name}
              maxLength={100}
              placeholder={dt.namePlaceholder}
              onChange={(e) => update((d) => void (d.name = e.target.value))}
              data-testid="wizard.name"
            />
          </div>
          <div>
            <Label htmlFor={playerId}>{dt.player}</Label>
            <Input
              id={playerId}
              value={draft.playerName}
              maxLength={80}
              placeholder={dt.playerPlaceholder}
              onChange={(e) => update((d) => void (d.playerName = e.target.value))}
            />
          </div>
        </div>

        <fieldset>
          <legend className="text-xs font-semibold text-muted">{dt.alignment}</legend>
          <p className="mb-2 text-xs text-muted">{dt.alignmentHint}</p>
          <div
            role="radiogroup"
            aria-label={dt.alignment}
            className="grid max-w-md grid-cols-3 gap-1"
          >
            {ALIGNMENTS.map((al) => (
              <button
                key={al}
                type="button"
                role="radio"
                aria-checked={draft.alignment === al}
                onClick={() => update((d) => void (d.alignment = d.alignment === al ? '' : al))}
                className={cn(
                  'min-h-10 rounded-md border px-1 text-xs font-semibold',
                  draft.alignment === al
                    ? 'border-accent bg-accent text-accent-contrast'
                    : 'border-border bg-surface hover:bg-surface-2',
                )}
              >
                {al}
              </button>
            ))}
          </div>
        </fieldset>

        {expertise ? (
          <div id="wizard-expertise" className="scroll-mt-24">
            <BlockTitle aside={`${draft.expertise.length}/${expertise}`}>
              {dt.expertise(expertise)}
            </BlockTitle>
            <p className="mb-2 text-sm text-muted">
              {dt.expertiseHint} <Term id="expertise" />
            </p>
            <SkillPicker
              name={dt.expertise(expertise)}
              options={proficientSkills(draft)}
              selected={draft.expertise}
              count={expertise}
              onChange={(next) => update((d) => void (d.expertise = next))}
            />
          </div>
        ) : null}

        <div>
          <Label htmlFor={appearanceId}>{dt.appearance}</Label>
          <Textarea
            id={appearanceId}
            value={draft.appearance}
            maxLength={2000}
            placeholder={dt.appearancePlaceholder}
            onChange={(e) => update((d) => void (d.appearance = e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor={backstoryId}>{dt.backstory}</Label>
          <Textarea
            id={backstoryId}
            value={draft.backstory}
            maxLength={2000}
            placeholder={dt.backstoryPlaceholder}
            onChange={(e) => update((d) => void (d.backstory = e.target.value))}
          />
        </div>
        <p className="text-sm text-muted">{dt.saveTo[saveTo]}</p>
      </div>

      <SheetPreview />
    </div>
  );
}
