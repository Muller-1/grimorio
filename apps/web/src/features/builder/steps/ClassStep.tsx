import {
  CLASS_ORDER,
  CLASSES,
  FIGHTING_STYLES,
  MASTERY_PROPERTIES,
  masteryOptions,
  suggestedMasteries,
  WEAPONS,
  withClass,
  type ClassDef,
  type EquipmentPack,
  type FightingStyleId,
} from '@grimorio/rules';
import { SKILL_KEYS } from '@grimorio/shared';
import type { ReactNode } from 'react';
import {
  Axe,
  BookOpenText,
  BowArrow,
  Coins,
  Eye,
  Flame,
  HandFist,
  Leaf,
  MousePointerClick,
  Music,
  Shield,
  ShieldPlus,
  Sparkles,
  Sun,
  Swords,
  VenetianMask,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { t } from '@/lib/i18n';
import { tw } from '@/lib/i18n/wizard';
import { cn } from '@/lib/utils';
import {
  Badge,
  BlockTitle,
  ChoiceCard,
  Facts,
  SkillPicker,
  Term,
  type GlossaryKey,
} from '../components/parts';
import { useBuilderStore } from '../store';

const w = tw.class;

/** Características de nível 1 que ganham explicação ao tocar. */
const FEATURE_TERMS: Record<string, GlossaryKey> = {
  Especialização: 'expertise',
  'Maestria em Arma': 'weaponMastery',
};

function abilityList(keys: readonly string[]): string {
  return keys.map((k) => t.abilities[k as keyof typeof t.abilities]).join(' e ');
}

function EquipmentChoice({ cls }: { cls: ClassDef }) {
  const value = useBuilderStore((s) => s.draft.classEquipment);
  const update = useBuilderStore((s) => s.update);
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {cls.equipment.map((pack: EquipmentPack) => (
        <ChoiceCard
          key={pack.option}
          selected={value === pack.option}
          onSelect={() => update((d) => void (d.classEquipment = pack.option))}
          title={w.equipmentOption(pack.option)}
          testId={`wizard.class-equipment.${pack.option}`}
        >
          <span className="mt-1 flex-1 text-sm text-muted">
            {pack.items.length ? pack.items.join(', ') : w.goldOnly(pack.gold)}
          </span>
          {pack.items.length ? (
            <span className="mt-2 flex items-center gap-1 text-sm font-semibold text-gold">
              <Coins className="size-4" aria-hidden="true" />
              {w.gold(pack.gold)}
            </span>
          ) : null}
        </ChoiceCard>
      ))}
    </div>
  );
}

function MasteryChoice({ cls }: { cls: ClassDef }) {
  const selected = useBuilderStore((s) => s.draft.weaponMasteries);
  const equipment = useBuilderStore((s) => s.draft.classEquipment);
  const update = useBuilderStore((s) => s.update);
  const count = cls.weaponMastery?.count ?? 0;
  const suggested = suggestedMasteries(cls, equipment);
  // Sugeridas (do equipamento) primeiro; depois a ordem da tabela de armas.
  const options = [...masteryOptions(cls)].sort(
    (a, b) => Number(suggested.includes(b)) - Number(suggested.includes(a)),
  );
  const full = selected.length >= count;
  return (
    <Panel
      id="wizard-weapon-mastery"
      title={<Term id="weaponMastery">{w.mastery(count)}</Term>}
      actions={<Badge tone="accent">{w.chosen(selected.length, count)}</Badge>}
    >
      <p className="mb-2 text-sm text-muted">{w.masteryHint}</p>
      {suggested.length ? (
        <Button
          size="sm"
          variant="outline"
          className="mb-3"
          onClick={() => update((d) => void (d.weaponMasteries = [...suggested]))}
          data-testid="wizard.mastery.suggest"
        >
          <Sparkles className="size-4" aria-hidden="true" />
          {w.masterySuggest}
        </Button>
      ) : null}
      <fieldset>
        <legend className="sr-only">{w.mastery(count)}</legend>
        <div className="grid max-h-72 grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
          {options.map((id) => {
            const weapon = WEAPONS[id];
            const checked = selected.includes(id);
            const disabled = !checked && full;
            return (
              <label
                key={id}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-sm transition-colors',
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
                        void (d.weaponMasteries = checked
                          ? d.weaponMasteries.filter((x) => x !== id)
                          : [...d.weaponMasteries, id]),
                    )
                  }
                  data-testid={`wizard.mastery.${id}`}
                />
                <span className="flex-1">{weapon.name}</span>
                {suggested.includes(id) ? <Badge tone="gold">{w.masterySuggested}</Badge> : null}
                <Badge>{MASTERY_PROPERTIES[weapon.mastery].name}</Badge>
              </label>
            );
          })}
        </div>
      </fieldset>
      {selected.length ? (
        <div className="mt-3">
          <BlockTitle>{w.masteryChosen}</BlockTitle>
          <ul className="space-y-1 text-sm">
            {selected.map((id) => {
              const property = MASTERY_PROPERTIES[WEAPONS[id].mastery];
              return (
                <li key={id}>
                  <span className="font-semibold">
                    {WEAPONS[id].name} · {property.name}.
                  </span>{' '}
                  <span className="text-muted">{property.text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </Panel>
  );
}

function ClassDetails({ cls }: { cls: ClassDef }) {
  const draft = useBuilderStore((s) => s.draft);
  const update = useBuilderStore((s) => s.update);
  const skillOptions = cls.skills.from === 'any' ? SKILL_KEYS : cls.skills.from;

  const facts: [ReactNode, ReactNode][] = [
    [
      <Term key="hd" id="hitDie">
        {w.hitDie}
      </Term>,
      `${w.hitDieValue(cls.hitDie)} · ${w.hpAtLevel1(cls.hitDie)}`,
    ],
    [
      <Term key="sv" id="save">
        {w.saves}
      </Term>,
      abilityList(cls.saves),
    ],
    [
      w.armor,
      cls.armorTraining.length
        ? cls.armorTraining.map((a) => tw.armorKinds[a]).join(', ')
        : w.armorNone,
    ],
    [w.weapons, cls.weaponsText],
  ];
  if (cls.toolsText) facts.push([w.tools, cls.toolsText]);
  if (cls.spellcasting) {
    const sc = cls.spellcasting;
    facts.push([w.spellcasting, w.spellcastingValue(sc.cantrips, sc.prepared, sc.slots)]);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2" data-testid="wizard.class-details">
      <Panel title={cls.name}>
        <p className="mb-3 text-sm">{cls.tagline}</p>
        <Facts items={facts} />
        {cls.spellcasting ? <p className="mt-2 text-xs text-muted">{w.spellsLater}</p> : null}
        <div className="mt-4">
          <BlockTitle>{w.features}</BlockTitle>
          <ul className="space-y-2 text-sm">
            {cls.features.map((f) => {
              const term = FEATURE_TERMS[f.name];
              return (
                <li key={f.name}>
                  <span className="font-semibold">
                    {term ? <Term id={term}>{f.name}</Term> : f.name}.{' '}
                  </span>
                  <span className="text-muted">{f.text}</span>
                </li>
              );
            })}
          </ul>
          {cls.expertise ? <p className="mt-3 text-xs text-muted">{w.expertiseLater}</p> : null}
        </div>
      </Panel>

      <div className="space-y-4">
        <Panel
          id="wizard-class-skills"
          title={
            cls.skills.from === 'any' ? w.skillsAny(cls.skills.count) : w.skills(cls.skills.count)
          }
          actions={
            <Badge tone="accent">{w.chosen(draft.classSkills.length, cls.skills.count)}</Badge>
          }
        >
          <SkillPicker
            name={w.skills(cls.skills.count)}
            options={skillOptions}
            selected={draft.classSkills}
            count={cls.skills.count}
            onChange={(next) => update((d) => void (d.classSkills = next))}
          />
        </Panel>

        {cls.option ? (
          <Panel id="wizard-class-option" title={cls.option.label}>
            <div className="grid gap-2 sm:grid-cols-2">
              {cls.option.choices.map((choice) => (
                <ChoiceCard
                  key={choice.id}
                  selected={draft.classOptionId === choice.id}
                  onSelect={() => update((d) => void (d.classOptionId = choice.id))}
                  title={choice.name}
                  subtitle={choice.text}
                  testId={`wizard.class-option.${choice.id}`}
                />
              ))}
            </div>
          </Panel>
        ) : null}

        {cls.fightingStyle ? (
          <Panel id="wizard-fighting-style" title={w.fightingStyle}>
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(FIGHTING_STYLES) as FightingStyleId[]).map((id) => (
                <ChoiceCard
                  key={id}
                  selected={draft.fightingStyleId === id}
                  onSelect={() => update((d) => void (d.fightingStyleId = id))}
                  title={FIGHTING_STYLES[id].name}
                  subtitle={FIGHTING_STYLES[id].text}
                  badges={
                    FIGHTING_STYLES[id].source === 'book' ? (
                      <Badge tone="gold">{tw.bookTag}</Badge>
                    ) : undefined
                  }
                  testId={`wizard.fighting-style.${id}`}
                />
              ))}
            </div>
          </Panel>
        ) : null}

        <Panel id="wizard-class-equipment" title={w.equipment}>
          <EquipmentChoice cls={cls} />
        </Panel>

        {cls.weaponMastery ? <MasteryChoice cls={cls} /> : null}
      </div>
    </div>
  );
}

/**
 * ADR-012: cada classe com um símbolo (do mesmo conjunto de ícones do
 * site) e a dificuldade em pontos, no lugar das etiquetas coloridas repetidas em todo cartão.
 */
const CLASS_ICONS: Record<string, LucideIcon> = {
  barbarian: Axe,
  bard: Music,
  cleric: Sun,
  druid: Leaf,
  fighter: Swords,
  monk: HandFist,
  paladin: ShieldPlus,
  ranger: BowArrow,
  rogue: VenetianMask,
  sorcerer: Flame,
  warlock: Eye,
  wizard: BookOpenText,
};
const COMPLEXITY_DOTS = { low: 1, medium: 2, high: 3 } as const;

function Difficulty({ level }: { level: keyof typeof COMPLEXITY_DOTS }) {
  const n = COMPLEXITY_DOTS[level];
  return (
    <span className="flex items-center gap-1.5" title={w.complexityLabel(w.complexity[level]!)}>
      <span className="flex gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              'size-1.5 rounded-full',
              i <= n ? 'bg-accent' : 'border border-border-strong',
            )}
          />
        ))}
      </span>
      <span className="sr-only">{w.complexityLabel(w.complexity[level]!)}</span>
      <span aria-hidden="true">{w.complexity[level]}</span>
    </span>
  );
}

export function ClassStep() {
  const classId = useBuilderStore((s) => s.draft.classId);
  const update = useBuilderStore((s) => s.update);
  const selected = classId ? CLASSES[classId] : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] lg:items-start">
        <div className="space-y-3 text-sm leading-relaxed">
          <h1 className="font-display text-2xl font-bold">{w.title}</h1>
          {w.intro.map((p) => (
            <p key={p}>{p}</p>
          ))}
          {classId ? null : (
            <p className="flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-2 text-sm font-semibold text-accent">
              <MousePointerClick className="size-4 shrink-0" aria-hidden="true" />
              {w.pickHint}
            </p>
          )}
          <ul className="space-y-1 pt-2 text-sm text-muted">
            <li className="flex items-center gap-2">
              <Sparkles className="size-4 text-accent" aria-hidden="true" />
              {w.legendCaster}
            </li>
            <li className="flex items-center gap-2">
              <Shield className="size-4 text-accent" aria-hidden="true" />
              {w.legendHitDie}
            </li>
          </ul>
        </div>

        <div
          id="wizard-class-list"
          className="grid scroll-mt-24 grid-cols-2 gap-2 sm:grid-cols-3"
          role="list"
        >
          {CLASS_ORDER.map((id) => {
            const cls = CLASSES[id];
            const Icon = CLASS_ICONS[id] ?? Swords;
            return (
              <div role="listitem" key={id}>
                <ChoiceCard
                  selected={classId === id}
                  onSelect={() => update((d) => withClass(d, id))}
                  title={cls.name}
                  icon={<Icon className="size-4 shrink-0 text-gold" aria-hidden="true" />}
                  testId={`wizard.option.class.${id}`}
                >
                  <span className="mt-1 text-xs text-muted">{abilityList(cls.primary)}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <Difficulty level={cls.complexity} />
                    <span className="flex items-center gap-1">
                      <Shield className="size-3.5" aria-hidden="true" />
                      {w.hitDieValue(cls.hitDie)}
                    </span>
                    {cls.spellcasting ? (
                      <span className="flex items-center gap-1">
                        <Sparkles className="size-3.5" aria-hidden="true" />
                        {w.caster}
                      </span>
                    ) : null}
                  </span>
                </ChoiceCard>
              </div>
            );
          })}
        </div>
      </div>

      {selected ? <ClassDetails cls={selected} /> : null}
    </div>
  );
}
