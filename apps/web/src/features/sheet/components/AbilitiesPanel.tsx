import { withModifier, type Explained } from '@grimorio/rules';
import {
  ABILITY_KEYS,
  SKILL_ABILITY,
  SKILL_KEYS,
  type AbilityKey,
  type ProficiencyLevel,
  type SkillKey,
} from '@grimorio/shared';
import { useId } from 'react';
import { D20Icon } from '@/components/ui/d20-icon';
import { NumberField } from '@/components/ui/number-field';
import { Panel } from '@/components/ui/panel';
import { formatModifier } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useSheet } from '../hooks';
import { useSheetStore } from '../store';
import { AdvantageBadge, d20 } from './AdvantageBadge';
import { ExplainButton } from './Explain';
import { ProficiencyDot, ProficiencyToggle } from './ProficiencyToggle';
import { RollButton } from './RollButton';

/** O d20 que aparece ao passar o mouse (no toque, sempre): "isto rola". */
const ROLL_HINT =
  'opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 pointer-coarse:opacity-100';

/**
 * Perícias de cada atributo, em ordem alfabética (pt-BR). Calculado no primeiro uso, não ao
 * carregar o módulo: as regras e o @grimorio/shared vêm em pedaços que se importam um ao outro
 * (vite.config.ts).
 */
let skillsByAbility: Record<AbilityKey, SkillKey[]> | null = null;
function skillsOf(ability: AbilityKey): SkillKey[] {
  skillsByAbility ??= Object.fromEntries(
    ABILITY_KEYS.map((a) => [
      a,
      SKILL_KEYS.filter((k) => SKILL_ABILITY[k] === a).sort((x, y) =>
        t.skills[x].localeCompare(t.skills[y], 'pt-BR'),
      ),
    ]),
  ) as Record<AbilityKey, SkillKey[]>;
  return skillsByAbility[ability];
}

/** Uma linha: proficiência, o nome (rola) e o número (explica). Salvaguarda em itálico. */
function CheckRow({
  save,
  label,
  explainTitle,
  rollLabel,
  rollAria,
  expression,
  bonus,
  proficiency,
  onProficiency,
  advantage,
  disadvantage,
  testId,
}: {
  save?: boolean;
  label: string;
  explainTitle: string;
  rollLabel: string;
  rollAria: string;
  expression: string;
  bonus: Explained;
  proficiency: ProficiencyLevel;
  onProficiency: (v: ProficiencyLevel) => void;
  advantage: boolean;
  disadvantage: boolean;
  testId: string;
}) {
  return (
    <li
      className={cn(
        'grid min-h-[34px] grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-1 rounded-md',
        save && 'bg-ornament/10',
      )}
    >
      <ProficiencyToggle
        binary={save}
        value={proficiency}
        onChange={onProficiency}
        name={explainTitle}
        testId={`${testId}.prof`}
      />
      <RollButton
        rollLabel={rollLabel}
        expression={expression}
        ariaLabel={rollAria}
        className={cn(
          'group flex h-8 w-auto min-w-0 justify-start gap-2 px-2 text-left text-base text-text hover:bg-surface-2 hover:text-text',
          save && 'italic',
        )}
      >
        <span className="truncate">{label}</span>
        <AdvantageBadge advantage={advantage} disadvantage={disadvantage} />
        <D20Icon className={cn('size-4 shrink-0 text-accent', ROLL_HINT)} />
      </RollButton>
      <ExplainButton
        explained={bonus}
        title={explainTitle}
        testId={testId}
        className="h-[30px] min-w-12 border border-transparent px-2 text-right text-base font-bold hover:border-ornament hover:bg-field hover:no-underline"
      />
    </li>
  );
}

function AbilityCard({ ability }: { ability: AbilityKey }) {
  const { sheet, derived } = useSheet();
  const edit = useSheetStore((s) => s.edit);
  const titleId = useId();
  const { score, mod } = derived.abilities[ability];
  const name = t.abilities[ability];
  const save = derived.saves[ability];
  const skills = skillsOf(ability);

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col rounded-[10px] border border-border-soft bg-field"
    >
      <div className="flex items-center gap-3 border-b border-border-soft px-3 py-2.5">
        <RollButton
          rollLabel={t.sheet.checkLabel(name)}
          expression={withModifier('1d20', mod)}
          ariaLabel={t.sheet.rollCheck(name)}
          testId={`ability.${ability}.roll`}
          className="group relative h-[50px] w-14 rounded-[10px] border-[1.5px] border-ornament bg-bg font-display text-2xl font-bold text-text hover:border-border-strong hover:bg-surface-2 hover:text-text"
        >
          <span
            className="tabular"
            data-testid={`ability.${ability}.mod`}
            data-value={mod}
            title={t.sheet.abilityMod}
          >
            {formatModifier(mod)}
          </span>
          <span
            aria-hidden="true"
            className={cn(
              'absolute -top-2 -right-2 grid size-5 place-items-center rounded-full border border-ornament bg-field',
              ROLL_HINT,
            )}
          >
            <D20Icon strokeWidth={16} className="size-3 text-accent" />
          </span>
        </RollButton>
        <h3 id={titleId} className="min-w-0 flex-1 text-[1.0625rem] leading-tight font-bold">
          {name}
        </h3>
        <div className="flex min-w-[52px] flex-col items-center rounded-lg border border-border bg-bg px-1.5 pt-0.5 pb-1">
          <span className="label-caps text-xs tracking-[0.1em]" aria-hidden="true">
            {t.sheet.abilityValue}
          </span>
          <NumberField
            value={score}
            min={1}
            max={30}
            onCommit={(v) => edit((d) => void (d.build.abilities[ability] = v))}
            label={t.sheet.abilityScore(name)}
            className="h-7 w-11 px-0 font-display text-xl leading-none font-bold"
            data-testid={`ability.${ability}.score`}
            data-value={score}
          />
        </div>
      </div>
      <ul className="flex flex-col px-1.5 pt-1.5 pb-2">
        <CheckRow
          save
          label={t.sheet.saveRow}
          explainTitle={t.sheet.saveLabel(name)}
          rollLabel={t.sheet.saveLabel(name)}
          rollAria={t.sheet.rollSave(name)}
          expression={`${withModifier(d20(save.advantage, save.disadvantage), save.bonus.value)}${save.bonusDice.join('')}`}
          bonus={save.bonus}
          proficiency={sheet.build.saveProficiencies.includes(ability) ? 1 : 0}
          onProficiency={(v) =>
            edit((d) => {
              const set = new Set(d.build.saveProficiencies);
              if (v > 0) set.add(ability);
              else set.delete(ability);
              d.build.saveProficiencies = ABILITY_KEYS.filter((k) => set.has(k));
            })
          }
          advantage={save.advantage}
          disadvantage={save.disadvantage}
          testId={`save.${ability}`}
        />
        {skills.map((skill) => {
          const s = derived.skills[skill];
          const skillName = t.skills[skill];
          return (
            <CheckRow
              key={skill}
              label={skillName}
              explainTitle={skillName}
              rollLabel={skillName}
              rollAria={t.sheet.rollSkill(skillName)}
              expression={withModifier(d20(s.advantage, s.disadvantage), s.bonus.value)}
              bonus={s.bonus}
              proficiency={s.proficiency}
              onProficiency={(v) =>
                edit((d) => {
                  if (v === 0) delete d.build.skillProficiencies[skill];
                  else d.build.skillProficiencies[skill] = v;
                })
              }
              advantage={s.advantage}
              disadvantage={s.disadvantage}
              testId={`skill.${skill}`}
            />
          );
        })}
        {skills.length === 0 ? (
          <li className="px-2.5 py-2 text-sm text-muted italic">{t.sheet.noSkills(name)}</li>
        ) : null}
      </ul>
    </section>
  );
}

/**
 * Atributos com a salvaguarda e as perícias de cada um dentro (docs/design.md): o nome rola,
 * o número mostra de onde vem.
 */
export function AbilitiesPanel({ className }: { className?: string }) {
  const { derived } = useSheet();
  const legend = t.sheet.legend;
  return (
    <Panel
      title={t.sheet.abilitiesTitle}
      actions={<p className="pr-1.5 text-sm text-muted">{t.sheet.abilitiesHint}</p>}
      className={cn('flex flex-col', className)}
      bodyClassName="flex flex-1 flex-col gap-3.5"
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-3">
        {ABILITY_KEYS.map((a) => (
          <AbilityCard key={a} ability={a} />
        ))}
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-5 gap-y-2.5 border-t border-border-soft pt-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted">
          {([0, 1, 2] as const).map((level) => (
            <span key={level} className="inline-flex items-center gap-1.5">
              <ProficiencyDot value={level} />
              {level === 0 ? legend.none : level === 1 ? legend.prof : legend.expert}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-bold">{t.sheet.passivePerception}</span>
          <ExplainButton
            explained={derived.passivePerception}
            title={t.sheet.passivePerception}
            signed={false}
            testId="stat.passive-perception"
            className="inline-flex h-9 min-w-11 items-center justify-center rounded-lg border-[1.5px] border-ornament bg-bg font-display text-xl font-bold hover:bg-surface-2 hover:no-underline"
          />
        </div>
      </div>
    </Panel>
  );
}
