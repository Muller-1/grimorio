import {
  CLASS_ORDER,
  CLASSES,
  FIGHTING_STYLES,
  withClass,
  type ClassDef,
  type EquipmentPack,
  type FightingStyleId,
} from '@grimorio/rules';
import { SKILL_KEYS } from '@grimorio/shared';
import { Coins, Shield, Sparkles } from 'lucide-react';
import { Panel } from '@/components/ui/panel';
import { t } from '@/lib/i18n';
import { tw } from '@/lib/i18n/wizard';
import { Badge, BlockTitle, ChoiceCard, Facts, SkillPicker } from '../components/parts';
import { useBuilderStore } from '../store';

const w = tw.class;

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

function ClassDetails({ cls }: { cls: ClassDef }) {
  const draft = useBuilderStore((s) => s.draft);
  const update = useBuilderStore((s) => s.update);
  const skillOptions = cls.skills.from === 'any' ? SKILL_KEYS : cls.skills.from;

  const facts: [string, string][] = [
    [w.hitDie, `${w.hitDieValue(cls.hitDie)} · ${w.hpAtLevel1(cls.hitDie)}`],
    [w.saves, abilityList(cls.saves)],
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
            {cls.features.map((f) => (
              <li key={f.name}>
                <span className="font-semibold">{f.name}. </span>
                <span className="text-muted">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      <div className="space-y-4">
        <Panel
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
          <Panel title={cls.option.label}>
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
          <Panel title={w.fightingStyle}>
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(FIGHTING_STYLES) as FightingStyleId[]).map((id) => (
                <ChoiceCard
                  key={id}
                  selected={draft.fightingStyleId === id}
                  onSelect={() => update((d) => void (d.fightingStyleId = id))}
                  title={FIGHTING_STYLES[id].name}
                  subtitle={FIGHTING_STYLES[id].text}
                  testId={`wizard.fighting-style.${id}`}
                />
              ))}
            </div>
          </Panel>
        ) : null}

        <Panel title={w.equipment}>
          <EquipmentChoice cls={cls} />
        </Panel>
      </div>
    </div>
  );
}

const COMPLEXITY_TONE = { low: 'gold', medium: 'muted', high: 'accent' } as const;

export function ClassStep() {
  const classId = useBuilderStore((s) => s.draft.classId);
  const update = useBuilderStore((s) => s.update);
  const selected = classId ? CLASSES[classId] : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] lg:items-start">
        <div className="space-y-3 text-[15px] leading-relaxed">
          <h1 className="font-display text-2xl font-bold">{w.title}</h1>
          {w.intro.map((p) => (
            <p key={p}>{p}</p>
          ))}
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

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="list">
          {CLASS_ORDER.map((id) => {
            const cls = CLASSES[id];
            return (
              <div role="listitem" key={id}>
                <ChoiceCard
                  selected={classId === id}
                  onSelect={() => update((d) => withClass(d, id))}
                  title={cls.name}
                  testId={`wizard.option.class.${id}`}
                  badges={
                    <>
                      <Badge tone={COMPLEXITY_TONE[cls.complexity]}>
                        {w.complexity[cls.complexity]}
                      </Badge>
                      <Badge>{abilityList(cls.primary)}</Badge>
                    </>
                  }
                >
                  <span className="mt-2 flex items-center gap-3 text-xs text-muted">
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
