import {
  BACKGROUNDS,
  CUSTOM_ID,
  draftClass,
  draftSpecies,
  featSkillCount,
  languageChoiceCount,
  ORIGIN_FEATS,
  overlappingSkills,
  SPECIES,
  SPECIES_ORDER,
  STANDARD_LANGUAGES,
  withBackground,
  withSpecies,
  type OriginFeatId,
} from '@grimorio/rules';
import { ABILITY_KEYS, SKILL_KEYS, type AbilityKey, type SkillKey } from '@grimorio/shared';
import { AlertTriangle, Coins } from 'lucide-react';
import { useId } from 'react';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { Panel } from '@/components/ui/panel';
import { feetToMeters, metersToFeet } from '@/lib/format';
import { t } from '@/lib/i18n';
import { tw } from '@/lib/i18n/wizard';
import { cn } from '@/lib/utils';
import { Badge, BlockTitle, ChoiceCard, Facts, Segmented, SkillPicker } from '../components/parts';
import { useBuilderStore } from '../store';

const o = tw.origin;
const FEAT_IDS = Object.keys(ORIGIN_FEATS) as OriginFeatId[];

function skillNames(skills: readonly SkillKey[]): string {
  return skills.map((s) => t.skills[s]).join(', ');
}

function BackgroundDetails() {
  const draft = useBuilderStore((s) => s.draft);
  const update = useBuilderStore((s) => s.update);
  const nameId = useId();
  const toolId = useId();
  const featId = useId();

  if (draft.backgroundId === CUSTOM_ID) {
    const c = draft.customBackground;
    return (
      <Panel title={o.custom}>
        <p className="mb-3 text-sm text-muted">{o.customHint}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={nameId}>{o.customBackground.name}</Label>
            <Input
              id={nameId}
              value={c.name}
              maxLength={60}
              placeholder={o.customBackground.namePlaceholder}
              onChange={(e) => update((d) => void (d.customBackground.name = e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor={toolId}>{o.customBackground.tool}</Label>
            <Input
              id={toolId}
              value={c.tool}
              maxLength={80}
              placeholder={o.customBackground.toolPlaceholder}
              onChange={(e) => update((d) => void (d.customBackground.tool = e.target.value))}
            />
          </div>
        </div>
        <div className="mt-3">
          <BlockTitle aside={`${c.abilities.length}/3`}>{o.customBackground.abilities}</BlockTitle>
          <div className="flex flex-wrap gap-1.5">
            {ABILITY_KEYS.map((k: AbilityKey) => {
              const on = c.abilities.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={on}
                  disabled={!on && c.abilities.length >= 3}
                  onClick={() =>
                    update((d) => {
                      const list = d.customBackground.abilities;
                      d.customBackground.abilities = on
                        ? list.filter((x) => x !== k)
                        : [...list, k];
                      d.backgroundBonus = {};
                    })
                  }
                  className={cn(
                    'h-8 rounded-md border px-3 text-sm font-semibold disabled:opacity-40',
                    on ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-surface',
                  )}
                >
                  {t.abilities[k]}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-3">
          <BlockTitle aside={`${c.skills.length}/2`}>{o.customBackground.skills}</BlockTitle>
          <SkillPicker
            name={o.customBackground.skills}
            options={SKILL_KEYS}
            selected={c.skills}
            count={2}
            onChange={(next) => update((d) => void (d.customBackground.skills = next))}
          />
        </div>
        <div className="mt-3 max-w-xs">
          <Label htmlFor={featId}>{o.customBackground.feat}</Label>
          <Select
            id={featId}
            value={c.feat}
            onChange={(e) =>
              update((d) => {
                d.customBackground.feat = e.target.value as OriginFeatId;
                d.featSkills = [];
              })
            }
          >
            {FEAT_IDS.map((id) => (
              <option key={id} value={id}>
                {ORIGIN_FEATS[id].name}
              </option>
            ))}
          </Select>
        </div>
        <p className="mt-3 text-xs text-muted">{o.customBackground.equipment}</p>
      </Panel>
    );
  }

  const bg = draft.backgroundId ? BACKGROUNDS[draft.backgroundId] : undefined;
  if (!bg) return null;
  const feat = ORIGIN_FEATS[bg.feat];
  return (
    <Panel title={bg.name}>
      <p className="mb-3 text-sm">{bg.summary}</p>
      <Facts
        items={[
          [o.abilities, bg.abilities.map((a) => t.abilities[a]).join(', ')],
          [o.feat, bg.featNote ? `${feat.name} (${o.featNote(bg.featNote)})` : feat.name],
          [o.skills, skillNames(bg.skills)],
          [o.tool, bg.tool],
        ]}
      />
      <p className="mt-2 text-sm text-muted">{feat.text}</p>
      <div className="mt-4">
        <BlockTitle>{o.equipment}</BlockTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          {bg.equipment.map((pack) => (
            <ChoiceCard
              key={pack.option}
              selected={draft.backgroundEquipment === pack.option}
              onSelect={() =>
                update((d) => void (d.backgroundEquipment = pack.option as 'A' | 'B'))
              }
              title={tw.class.equipmentOption(pack.option)}
              testId={`wizard.background-equipment.${pack.option}`}
            >
              <span className="mt-1 flex-1 text-sm text-muted">
                {pack.items.length ? pack.items.join(', ') : tw.class.goldOnly(pack.gold)}
              </span>
              {pack.items.length ? (
                <span className="mt-2 flex items-center gap-1 text-sm font-semibold text-gold">
                  <Coins className="size-4" aria-hidden="true" />
                  {tw.class.gold(pack.gold)}
                </span>
              ) : null}
            </ChoiceCard>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function SpeciesDetails() {
  const draft = useBuilderStore((s) => s.draft);
  const update = useBuilderStore((s) => s.update);
  const nameId = useId();
  const speedId = useId();
  const traitsId = useId();

  if (draft.speciesId === CUSTOM_ID) {
    const c = draft.customSpecies;
    return (
      <Panel title={o.custom}>
        <p className="mb-3 text-sm text-muted">{o.customHint}</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
          <div>
            <Label htmlFor={nameId}>{o.customSpecies.name}</Label>
            <Input
              id={nameId}
              value={c.name}
              maxLength={60}
              placeholder={o.customSpecies.namePlaceholder}
              onChange={(e) => update((d) => void (d.customSpecies.name = e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor={speedId}>{o.customSpecies.speed}</Label>
            <Input
              id={speedId}
              type="number"
              inputMode="decimal"
              min={1.5}
              max={36}
              step={1.5}
              value={feetToMeters(c.speedFt).replace(',', '.')}
              onChange={(e) => {
                const m = Number(e.target.value);
                if (Number.isFinite(m) && m > 0) {
                  update(
                    (d) =>
                      void (d.customSpecies.speedFt = Math.min(120, Math.max(5, metersToFeet(m)))),
                  );
                }
              }}
            />
          </div>
        </div>
        <div className="mt-3">
          <Label htmlFor={traitsId}>{o.customSpecies.traits}</Label>
          <Textarea
            id={traitsId}
            value={c.traits}
            maxLength={2000}
            placeholder={o.customSpecies.traitsPlaceholder}
            onChange={(e) => update((d) => void (d.customSpecies.traits = e.target.value))}
          />
        </div>
      </Panel>
    );
  }

  const species = draftSpecies(draft);
  if (!species) return null;
  const option = species.option?.choices.find((c) => c.id === draft.speciesOptionId);
  const speedFt = option?.speedFt ?? species.speedFt;
  const lockedForSpecies = [
    ...draft.classSkills,
    ...(draft.backgroundId ? (BACKGROUNDS[draft.backgroundId]?.skills ?? []) : []),
  ];

  return (
    <Panel title={species.name}>
      <p className="mb-3 text-sm">{species.summary}</p>
      <Facts
        items={[
          [o.size, o.sizes[species.size] ?? ''],
          [o.speed, o.speedValue(feetToMeters(speedFt))],
        ]}
      />
      <div className="mt-3">
        <BlockTitle>{o.traits}</BlockTitle>
      </div>
      <ul className="space-y-1.5 text-sm">
        {species.traits.map((trait) => (
          <li key={trait.name}>
            <span className="font-semibold">{trait.name}. </span>
            <span className="text-muted">{trait.text}</span>
          </li>
        ))}
      </ul>

      {species.size === 'medium-or-small' ? (
        <div className="mt-4">
          <BlockTitle>{o.size}</BlockTitle>
          <Segmented
            label={o.size}
            value={draft.speciesSize}
            options={[
              { value: 'medium', label: o.sizes.medium ?? '' },
              { value: 'small', label: o.sizes.small ?? '' },
            ]}
            onChange={(v) => update((d) => void (d.speciesSize = v))}
          />
        </div>
      ) : null}

      {species.option ? (
        <div className="mt-4">
          <BlockTitle>{species.option.label}</BlockTitle>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {species.option.choices.map((choice) => (
              <ChoiceCard
                key={choice.id}
                selected={draft.speciesOptionId === choice.id}
                onSelect={() => update((d) => void (d.speciesOptionId = choice.id))}
                title={choice.name}
                subtitle={choice.text}
                testId={`wizard.species-option.${choice.id}`}
              />
            ))}
          </div>
        </div>
      ) : null}

      {species.skillChoice ? (
        <div className="mt-4">
          <BlockTitle aside={`${draft.speciesSkills.length}/${species.skillChoice.count}`}>
            {o.speciesSkill(species.skillChoice.count)}
          </BlockTitle>
          <SkillPicker
            name={o.speciesSkill(species.skillChoice.count)}
            options={species.skillChoice.from === 'any' ? SKILL_KEYS : species.skillChoice.from}
            selected={draft.speciesSkills}
            count={species.skillChoice.count}
            locked={lockedForSpecies}
            onChange={(next) => update((d) => void (d.speciesSkills = next))}
          />
        </div>
      ) : null}

      {species.extraOriginFeat ? (
        <div className="mt-4">
          <BlockTitle>{o.speciesFeat}</BlockTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            {FEAT_IDS.map((id) => (
              <ChoiceCard
                key={id}
                selected={draft.speciesFeatId === id}
                onSelect={() =>
                  update((d) => {
                    d.speciesFeatId = id;
                    d.featSkills = [];
                  })
                }
                title={ORIGIN_FEATS[id].name}
                subtitle={ORIGIN_FEATS[id].text}
                testId={`wizard.species-feat.${id}`}
              />
            ))}
          </div>
        </div>
      ) : null}
    </Panel>
  );
}

function FeatSkills() {
  const draft = useBuilderStore((s) => s.draft);
  const update = useBuilderStore((s) => s.update);
  const count = featSkillCount(draft);
  if (count === 0) return null;
  const bgSkills =
    draft.backgroundId === CUSTOM_ID
      ? draft.customBackground.skills
      : draft.backgroundId
        ? (BACKGROUNDS[draft.backgroundId]?.skills ?? [])
        : [];
  const locked = [...draft.classSkills, ...bgSkills, ...draft.speciesSkills];
  return (
    <Panel
      title={o.featSkills(count)}
      actions={<Badge tone="accent">{`${draft.featSkills.length}/${count}`}</Badge>}
    >
      <SkillPicker
        name={o.featSkills(count)}
        options={SKILL_KEYS}
        selected={draft.featSkills}
        count={count}
        locked={locked}
        onChange={(next) => update((d) => void (d.featSkills = next))}
      />
    </Panel>
  );
}

function Languages() {
  const draft = useBuilderStore((s) => s.draft);
  const update = useBuilderStore((s) => s.update);
  const count = languageChoiceCount(draft);
  const fixed = draftClass(draft)?.languages?.fixed ?? [];
  return (
    <Panel
      title={o.languages}
      actions={<Badge tone="accent">{`${draft.languages.length}/${count}`}</Badge>}
    >
      <p className="mb-2 text-sm text-muted">{o.languagesHint(count)}</p>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {STANDARD_LANGUAGES.map((lang) => {
          const checked = draft.languages.includes(lang);
          const disabled = !checked && draft.languages.length >= count;
          return (
            <label
              key={lang}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-sm',
                checked ? 'border-accent bg-accent-soft' : 'border-border bg-surface',
                disabled && 'cursor-not-allowed opacity-50',
              )}
            >
              <input
                type="checkbox"
                className="accent-[var(--accent)]"
                checked={checked}
                disabled={disabled}
                onChange={() =>
                  update(
                    (d) =>
                      void (d.languages = checked
                        ? d.languages.filter((l) => l !== lang)
                        : [...d.languages, lang]),
                  )
                }
              />
              {lang}
            </label>
          );
        })}
      </div>
      {fixed.length ? (
        <p className="mt-2 text-xs text-muted">{o.languagesFixed(fixed.join(', '))}</p>
      ) : null}
    </Panel>
  );
}

export function OriginStep() {
  const draft = useBuilderStore((s) => s.draft);
  const update = useBuilderStore((s) => s.update);
  const overlap = overlappingSkills(draft);

  return (
    <div className="space-y-6">
      <div className="max-w-3xl space-y-3 text-[15px] leading-relaxed">
        <h1 className="font-display text-2xl font-bold">{tw.origin.title}</h1>
        {o.intro.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>

      <section aria-labelledby="origem-antecedente" className="space-y-3">
        <h2 id="origem-antecedente" className="font-display text-xl font-bold">
          {o.background}
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {Object.values(BACKGROUNDS).map((bg) => (
            <ChoiceCard
              key={bg.id}
              selected={draft.backgroundId === bg.id}
              onSelect={() => update((d) => withBackground(d, bg.id))}
              title={bg.name}
              testId={`wizard.option.background.${bg.id}`}
              badges={bg.abilities.map((a) => (
                <Badge key={a}>{t.abilitiesShort[a]}</Badge>
              ))}
            />
          ))}
          <ChoiceCard
            selected={draft.backgroundId === CUSTOM_ID}
            onSelect={() => update((d) => withBackground(d, CUSTOM_ID))}
            title={o.custom}
            subtitle={o.customHint}
            testId="wizard.option.background.custom"
            className="border-dashed"
          />
        </div>
        {overlap.length ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md bg-gold-soft px-3 py-2 text-sm text-gold"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {o.overlap(skillNames(overlap))}
          </p>
        ) : null}
        <BackgroundDetails />
      </section>

      <section aria-labelledby="origem-especie" className="space-y-3">
        <h2 id="origem-especie" className="font-display text-xl font-bold">
          {o.species}
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {SPECIES_ORDER.map((id) => {
            const species = SPECIES[id]!;
            return (
              <ChoiceCard
                key={id}
                selected={draft.speciesId === id}
                onSelect={() => update((d) => withSpecies(d, id))}
                title={species.name}
                testId={`wizard.option.species.${id}`}
                badges={
                  <>
                    <Badge>{o.sizes[species.size]}</Badge>
                    <Badge>{o.speedValue(feetToMeters(species.speedFt))}</Badge>
                  </>
                }
              />
            );
          })}
          <ChoiceCard
            selected={draft.speciesId === CUSTOM_ID}
            onSelect={() => update((d) => withSpecies(d, CUSTOM_ID))}
            title={o.custom}
            testId="wizard.option.species.custom"
            className="border-dashed"
          />
        </div>
        <SpeciesDetails />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <FeatSkills />
        <Languages />
      </div>
      <p className="text-xs text-muted">{tw.srdNote}</p>
    </div>
  );
}
