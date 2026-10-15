import {
  applyLevelUp,
  CLASS_PROGRESSIONS,
  CLASSES,
  deriveSheet,
  levelUpSteps,
  progressionFor,
  type LevelStep,
} from '@grimorio/rules';
import { spellById } from '@grimorio/rules/spells-data';
import { ABILITY_KEYS, type AbilityKey, type LevelChoice, type LocalSheet } from '@grimorio/shared';
import { ArrowLeft, ArrowRight, Check, Dices } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Label, Select } from '@/components/ui/input';
import { useDiceStore } from '@/features/dice/store';
import { useSheetStore } from '@/features/sheet/store';
import { useToastStore } from '@/features/toast/store';
import { formatModifier } from '@/lib/format';
import { t } from '@/lib/i18n';
import { tl } from '@/lib/i18n/levelup';
import { cn } from '@/lib/utils';
import { newId } from '@/ports/ids';
import { ChoiceEditor, type ChoiceContext } from './ChoiceEditor';
import { emptyDraft, pendingCount, toInputs, type LevelDraft } from './state';

type Phase = { kind: 'count' } | { kind: 'level'; index: number } | { kind: 'summary' };

/** Atributos depois dos aumentos escolhidos nos níveis anteriores a `upTo` (para limites). */
function scoresBefore(
  sheet: LocalSheet,
  steps: LevelStep[],
  drafts: Record<number, LevelDraft>,
  upTo: number,
) {
  const scores = { ...sheet.build.abilities };
  for (const step of steps) {
    if (step.level >= upTo) break;
    for (const c of Object.values(drafts[step.level]?.picks ?? {}).flat()) {
      if ((c.kind === 'asi' || c.kind === 'feat') && c.ability) {
        scores[c.ability] = Math.min(
          20,
          scores[c.ability] + (c.kind === 'asi' ? (c.amount ?? 0) : 1),
        );
      }
    }
  }
  return scores;
}

function Gains({ step }: { step: LevelStep }) {
  const g = step.gains;
  const lines: string[] = [];
  if (g.proficiency) lines.push(tl.proficiency(g.proficiency.from, g.proficiency.to));
  for (const c of g.columns) lines.push(tl.column(c.name, String(c.from), String(c.to)));
  if (g.cantrips) lines.push(tl.cantrips(g.cantrips.from, g.cantrips.to));
  if (g.prepared) lines.push(tl.prepared(g.prepared.from, g.prepared.to));
  if (g.pact) {
    lines.push(
      tl.pact(
        tl.pactValue(g.pact.from.count, g.pact.from.circle),
        tl.pactValue(g.pact.to.count, g.pact.to.circle),
      ),
    );
  }
  return (
    <div className="space-y-2 text-sm">
      {lines.length ? (
        <ul className="list-disc space-y-0.5 pl-5" data-testid="levelup.gains.numbers">
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      ) : null}
      {g.slots.length ? (
        <p>
          <strong>{tl.slots}: </strong>
          {g.slots.map((s) => tl.slot(s.circle, s.from, s.to)).join(' · ')}
        </p>
      ) : null}
      {g.grantedSpells.length ? (
        <p>
          <strong>{tl.granted}: </strong>
          {g.grantedSpells
            .map((s) => `${spellById(s.id)?.name ?? s.id} (${tl.grantedSource[s.source]})`)
            .join(', ')}
        </p>
      ) : null}
      {g.features.length ? (
        <ul className="space-y-1.5" data-testid="levelup.gains.features">
          {g.features.map((f) => (
            <li key={`${f.source}-${f.id}`} className="rounded-md bg-surface-2 px-2.5 py-1.5">
              <p className="font-semibold">
                {f.name}{' '}
                <span className="text-xs font-normal text-muted">({tl.featureFrom[f.source]})</span>
              </p>
              <p className="text-xs">{f.text}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function HpChoice({
  step,
  draft,
  onChange,
}: {
  step: LevelStep;
  draft: LevelDraft;
  onChange: (rolled: number | undefined) => void;
}) {
  const roll = useDiceStore((s) => s.roll);
  const { hitDie, hpAverage, conMod } = step.gains;
  const rolled = draft.hpRolled;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm" data-testid="levelup.hp">
      <strong>{tl.hp}:</strong>
      <span data-testid="levelup.hp.value" data-value={Math.max(1, (rolled ?? hpAverage) + conMod)}>
        {rolled === undefined ? tl.hpAverage(hpAverage, conMod) : tl.hpRolled(rolled, conMod)}
      </span>
      {rolled === undefined ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const out = roll({ label: tl.hpRollLabel(step.level), expression: `1d${hitDie}` });
            if (out.ok) onChange(out.entry.result.total);
          }}
          data-testid="levelup.hp.roll"
        >
          <Dices className="size-4" />
          {tl.hpRoll(hitDie)}
        </Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => onChange(undefined)}>
          {tl.hpUseAverage}
        </Button>
      )}
    </div>
  );
}

/**
 * Subir de nível (pedido do usuário, ADR-010): 1) quantos níveis, confirmar; 2) uma tela por
 * nível com o que ganhou (sempre) e o que escolher; 3) resumo antes → depois e aplicar, com
 * "Desfazer" logo depois.
 */
export default function LevelUpDialog({ onClose }: { onClose: () => void }) {
  const sheet = useSheetStore((s) => s.sheet);
  const replace = useSheetStore((s) => s.replace);
  const toast = useToastStore((s) => s.push);
  const from = sheet.build.level;
  const hasClass = Boolean(progressionFor(sheet));
  const [classId, setClassId] = useState<string>('');
  const [count, setCount] = useState(1);
  const [phase, setPhase] = useState<Phase>({ kind: 'count' });
  const [drafts, setDrafts] = useState<Record<number, LevelDraft>>({});
  const classSelect = useId();
  const target = Math.min(20, from + count);

  // A subclasse e as opções escolhidas agora mudam o que os níveis seguintes ganham.
  const allPicks = Object.values(drafts).flatMap((d) => Object.values(d.picks).flat());
  const subclassId = allPicks.find((c) => c.kind === 'subclass' && c.id && c.id !== 'custom')?.id;
  const optionsKey = JSON.stringify(
    allPicks.filter((c) => c.kind === 'option' && c.id?.includes(':')).map((c) => c.id),
  );
  const steps = useMemo(() => {
    const options = Object.fromEntries(
      (JSON.parse(optionsKey) as string[]).map((id) => id.split(':') as [string, string]),
    );
    return levelUpSteps(sheet, target, {
      ...(hasClass ? {} : classId ? { classId } : {}),
      ...(subclassId ? { subclassId } : {}),
      options,
    });
  }, [sheet, target, hasClass, classId, subclassId, optionsKey]);
  const progression = progressionFor(sheet, hasClass ? undefined : classId || undefined);

  const preview = useMemo(() => {
    if (phase.kind !== 'summary') return null;
    let n = 0;
    return applyLevelUp(sheet, toInputs(steps, drafts), {
      newId: () => `preview-${++n}`,
      ...(hasClass ? {} : { classId }),
    });
  }, [phase.kind, sheet, steps, drafts, hasClass, classId]);

  if (from >= 20) {
    return (
      <Dialog
        open
        onOpenChange={(o) => !o && onClose()}
        title={tl.title}
        description={tl.maxLevel}
      />
    );
  }

  const draftOf = (level: number) => drafts[level] ?? emptyDraft();
  const update = (level: number, fn: (d: LevelDraft) => LevelDraft) =>
    setDrafts((all) => ({ ...all, [level]: fn(all[level] ?? emptyDraft()) }));

  const apply = () => {
    const next = applyLevelUp(sheet, toInputs(steps, drafts), {
      newId,
      ...(hasClass ? {} : { classId }),
    });
    if (!next) return toast(tl.applyError, 'danger');
    const previous = sheet;
    replace(next);
    onClose();
    toast(tl.done(next.build.level), 'success', {
      label: tl.undo,
      run: () => {
        replace(previous);
        toast(tl.undone, 'info');
      },
    });
  };

  // ---------- 1) quantos níveis ----------
  if (phase.kind === 'count') {
    const maxCount = 20 - from;
    return (
      <Dialog
        open
        onOpenChange={(o) => !o && onClose()}
        title={tl.title}
        description={tl.howManyHint}
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {tl.cancel}
            </Button>
            <Button
              variant="primary"
              disabled={!hasClass && !classId}
              onClick={() => setPhase({ kind: 'level', index: 0 })}
              data-testid="levelup.confirm"
            >
              <Check className="size-4" />
              {tl.confirm}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {!hasClass ? (
            <div>
              <Label htmlFor={classSelect}>{tl.chooseClass}</Label>
              <Select
                id={classSelect}
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                data-testid="levelup.class"
              >
                <option value="">{tl.chooseClassNone}</option>
                {Object.keys(CLASS_PROGRESSIONS).map((id) => (
                  <option key={id} value={id}>
                    {CLASSES[id as keyof typeof CLASSES].name}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-muted">{tl.chooseClassHint}</p>
            </div>
          ) : null}
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">{tl.howMany}</legend>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: Math.min(maxCount, 10) }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={count === n}
                  onClick={() => setCount(n)}
                  className={cn(
                    'h-9 min-w-14 rounded-md border px-3 text-sm font-semibold',
                    count === n
                      ? 'border-accent bg-accent text-accent-contrast'
                      : 'border-border hover:bg-surface-2',
                  )}
                  data-testid={`levelup.count.${n}`}
                >
                  {tl.levels(n)}
                </button>
              ))}
              {maxCount > 10 ? (
                <Select
                  value={count > 10 ? count : ''}
                  onChange={(e) => e.target.value && setCount(Number(e.target.value))}
                  className="h-9 w-28"
                  aria-label={tl.howMany}
                >
                  <option value="">…</option>
                  {Array.from({ length: maxCount - 10 }, (_, i) => i + 11).map((n) => (
                    <option key={n} value={n}>
                      {tl.levels(n)}
                    </option>
                  ))}
                </Select>
              ) : null}
            </div>
          </fieldset>
          <p
            className="rounded-md bg-surface-2 px-3 py-2 text-center font-display text-lg font-bold"
            data-testid="levelup.from-to"
          >
            {tl.fromTo(from, target)}
          </p>
        </div>
      </Dialog>
    );
  }

  // ---------- 3) resumo ----------
  if (phase.kind === 'summary') {
    const before = deriveSheet(sheet);
    const after = preview ? deriveSheet(preview) : null;
    const rows: [string, string, string][] = after
      ? [
          [tl.rowLevel, String(from), String(after.level)],
          [tl.rowHp, String(before.hpMax.value), String(after.hpMax.value)],
          [
            tl.rowProf,
            formatModifier(before.proficiencyBonus.value),
            formatModifier(after.proficiencyBonus.value),
          ],
          ...ABILITY_KEYS.filter(
            (k: AbilityKey) => before.abilities[k].score !== after.abilities[k].score,
          ).map((k): [string, string, string] => [
            tl.rowAbility(t.abilities[k]),
            String(before.abilities[k].score),
            String(after.abilities[k].score),
          ]),
        ]
      : [];
    const newFeatures = preview
      ? preview.features.slice(sheet.features.length).map((f) => f.name)
      : [];
    const newSpells = preview
      ? [
          ...preview.spells.cantrips,
          ...preview.spells.prepared,
          ...preview.spells.spellbook,
          ...preview.spells.granted.map((g) => g.id),
        ]
          .filter(
            (id, i, all) =>
              all.indexOf(id) === i &&
              !sheet.spells.cantrips.includes(id) &&
              !sheet.spells.prepared.includes(id) &&
              !sheet.spells.spellbook.includes(id) &&
              !sheet.spells.granted.some((g) => g.id === id),
          )
          .map((id) => spellById(id)?.name ?? id)
      : [];
    return (
      <Dialog
        open
        onOpenChange={(o) => !o && onClose()}
        title={`${tl.summaryTitle} · ${tl.fromTo(from, target)}`}
        description={tl.summaryHint}
        className="max-w-2xl"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setPhase({ kind: 'level', index: steps.length - 1 })}
            >
              <ArrowLeft className="size-4" />
              {tl.back}
            </Button>
            <Button
              variant="primary"
              disabled={!preview}
              onClick={apply}
              data-testid="levelup.apply"
            >
              <Check className="size-4" />
              {tl.apply}
            </Button>
          </>
        }
      >
        {after ? (
          <div className="space-y-3 text-sm">
            <table className="w-full text-left" data-testid="levelup.summary">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="py-1 font-semibold" />
                  <th className="py-1 font-semibold">{tl.before}</th>
                  <th className="py-1 font-semibold">{tl.after}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, a, b]) => (
                  <tr key={label} className="border-b border-border/60">
                    <th className="py-1 font-medium">{label}</th>
                    <td className="tabular py-1">{a}</td>
                    <td className={cn('tabular py-1', a !== b && 'font-bold text-accent')}>{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {newFeatures.length ? (
              <p>
                <strong>{tl.newFeatures}: </strong>
                {newFeatures.join(', ')}
              </p>
            ) : null}
            {newSpells.length ? (
              <p>
                <strong>{tl.newSpells}: </strong>
                {newSpells.join(', ')}
              </p>
            ) : null}
          </div>
        ) : (
          <p role="alert" className="text-sm text-danger">
            {tl.applyError}
          </p>
        )}
      </Dialog>
    );
  }

  // ---------- 2) um nível ----------
  const step = steps[phase.index];
  if (!step || !progression) return null;
  const draft = draftOf(step.level);
  const pending = pendingCount(step, draft);
  const last = phase.index === steps.length - 1;
  const ctx: ChoiceContext = {
    sheet,
    progression,
    level: step.level,
    drafts,
    draft,
    setPicks: (key: string, picks: LevelChoice[]) =>
      update(step.level, (d) => ({ ...d, picks: { ...d.picks, [key]: picks } })),
    setMeta: (key: string, value: string) =>
      update(step.level, (d) => ({ ...d, meta: { ...d.meta, [key]: value } })),
    scores: scoresBefore(sheet, steps, drafts, step.level),
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`${tl.levelTitle(step.level)} · ${CLASSES[progression.classId].name}`}
      className="max-w-2xl"
      footer={
        <>
          <span className="mr-auto self-center text-xs text-muted">
            {tl.stepOf(phase.index + 1, steps.length)}
          </span>
          <Button
            variant="ghost"
            onClick={() =>
              setPhase(
                phase.index === 0 ? { kind: 'count' } : { kind: 'level', index: phase.index - 1 },
              )
            }
          >
            <ArrowLeft className="size-4" />
            {tl.back}
          </Button>
          <Button
            variant="primary"
            disabled={pending > 0}
            onClick={() =>
              setPhase(last ? { kind: 'summary' } : { kind: 'level', index: phase.index + 1 })
            }
            data-testid="levelup.next"
          >
            {last ? tl.toSummary : tl.next}
            <ArrowRight className="size-4" />
          </Button>
        </>
      }
    >
      <div className="space-y-4" data-testid={`levelup.level.${step.level}`}>
        <section className="space-y-2">
          <h3 className="font-display text-base font-bold">{tl.gainsTitle}</h3>
          <HpChoice
            step={step}
            draft={draft}
            onChange={(rolled) =>
              update(step.level, (d) => {
                const next = { ...d };
                if (rolled === undefined) delete next.hpRolled;
                else next.hpRolled = rolled;
                return next;
              })
            }
          />
          <Gains step={step} />
        </section>
        <section className="space-y-2">
          <h3 className="font-display text-base font-bold">{tl.choicesTitle}</h3>
          {step.choices.length === 0 ? (
            <p className="text-sm text-muted" data-testid="levelup.nothing">
              {tl.nothingToChoose}
            </p>
          ) : (
            step.choices.map((slot) => <ChoiceEditor key={slot.key} slot={slot} ctx={ctx} />)
          )}
          {pending > 0 ? (
            <p role="status" className="text-sm text-danger">
              {tl.pending(pending)}
            </p>
          ) : null}
        </section>
      </div>
    </Dialog>
  );
}
