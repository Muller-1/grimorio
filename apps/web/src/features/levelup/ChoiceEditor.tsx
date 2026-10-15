import {
  CLASS_PROGRESSIONS,
  columnAt,
  FIGHTING_STYLES,
  INVOCATIONS,
  LEVEL_FEATS,
  METAMAGIC,
  pactSlots,
  slotTable,
  type ChoiceDef,
  type ClassProgression,
  type LevelChoiceSlot,
  type SpellChoiceDef,
  type SpellLevel,
} from '@grimorio/rules';
import { spellById } from '@grimorio/rules/spells-data';
import {
  ABILITY_KEYS,
  SKILL_KEYS,
  type AbilityKey,
  type LevelChoice,
  type LocalSheet,
  type SkillKey,
} from '@grimorio/shared';
import { useId, type ReactNode } from 'react';
import { Input, Label, Select } from '@/components/ui/input';
import { SpellList } from '@/features/spells/SpellPicker';
import { t } from '@/lib/i18n';
import { tl } from '@/lib/i18n/levelup';
import { tsp } from '@/lib/i18n/spells';
import { cn } from '@/lib/utils';
import { knownSpellIds, spellbookIds, SUB_KEY, type LevelDraft } from './state';

export interface ChoiceContext {
  sheet: LocalSheet;
  progression: ClassProgression;
  level: number;
  drafts: Record<number, LevelDraft>;
  draft: LevelDraft;
  setPicks: (key: string, picks: LevelChoice[]) => void;
  setMeta: (key: string, value: string) => void;
  /** Atributos já com os aumentos dos níveis anteriores desta subida. */
  scores: Record<AbilityKey, number>;
}

const range = (from: number, to: number) =>
  Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => (from + i) as SpellLevel);

function Radio({
  name,
  checked,
  onChange,
  title,
  text,
  testId,
  disabled,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  text?: string;
  testId?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm',
        checked ? 'border-accent bg-accent-soft' : 'border-border',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="mt-0.5 size-4 accent-[var(--accent)]"
        data-testid={testId}
      />
      <span className="min-w-0 flex-1">
        <span className="font-semibold">{title}</span>
        {text ? (
          <span className="mt-0.5 block text-[13px] leading-snug text-muted">{text}</span>
        ) : null}
      </span>
    </label>
  );
}

function Check({
  checked,
  onChange,
  title,
  text,
  disabled,
  testId,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  text?: string;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm',
        checked ? 'border-accent bg-accent-soft' : 'border-border',
        disabled && !checked && 'cursor-not-allowed opacity-50',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled && !checked}
        className="mt-0.5 size-4 accent-[var(--accent)]"
        data-testid={testId}
      />
      <span className="min-w-0 flex-1">
        <span className="font-semibold">{title}</span>
        {text ? (
          <span className="mt-0.5 block text-[13px] leading-snug text-muted">{text}</span>
        ) : null}
      </span>
    </label>
  );
}

/** Lista de marcar até `count` (perícias, metamagias, invocações). */
function MultiPick({
  slot,
  ctx,
  kind,
  count,
  options,
}: {
  slot: LevelChoiceSlot;
  ctx: ChoiceContext;
  kind: string;
  count: number;
  options: { id: string; name: string; text?: string; disabled?: boolean }[];
}) {
  const picks = ctx.draft.picks[slot.key] ?? [];
  const ids = picks.map((p) => p.id);
  const full = picks.length >= count;
  if (options.length === 0) return <p className="text-sm text-muted">{tl.noOptions}</p>;
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted">{tl.pickCount(picks.length, count)}</p>
      {/* Opções com texto longo (metamagias, invocações) ficam em uma coluna: mais fácil de ler. */}
      <div
        className={cn(
          'grid gap-1.5',
          !options.some((o) => (o.text?.length ?? 0) > 50) && 'sm:grid-cols-2',
        )}
      >
        {options.map((o) => {
          const on = ids.includes(o.id);
          return (
            <Check
              key={o.id}
              checked={on}
              disabled={o.disabled || (full && !on)}
              title={o.name}
              {...(o.text ? { text: o.text } : {})}
              onChange={() =>
                ctx.setPicks(
                  slot.key,
                  on ? picks.filter((p) => p.id !== o.id) : [...picks, { kind, id: o.id }],
                )
              }
              testId={`choice.${slot.key}.${o.id}`}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Escolha de magias pela lista (truques, preparadas, grimório, Arcano Místico…). */
function SpellPick({
  slot,
  ctx,
  pickKey,
  kind,
  count,
  lists,
  levels,
  school,
  onlyIds,
}: {
  slot: LevelChoiceSlot;
  ctx: ChoiceContext;
  pickKey?: string;
  kind: string;
  count: number;
  lists: string[];
  levels: SpellLevel[];
  school?: string;
  onlyIds?: string[];
}) {
  const key = pickKey ?? slot.key;
  const picks = ctx.draft.picks[key] ?? [];
  const ids = picks.map((p) => p.id!).filter(Boolean);
  const known = knownSpellIds(ctx.sheet, ctx.drafts, [
    'cantrip',
    'spell',
    'spellbook',
    'extra-spell',
    'chosen-spell',
    'arcanum',
  ]);
  // Magias desta caixinha não contam como "já na ficha".
  for (const id of ids) known.delete(id);
  // Mago: preparar do grimório — as do grimório não ficam bloqueadas.
  if (kind === 'spell' && onlyIds) for (const id of onlyIds) known.delete(id);
  if (kind === 'spell') {
    for (const id of ctx.sheet.spells.prepared) known.add(id);
  }
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted">{tl.pickCount(ids.length, count)}</p>
      <SpellList
        lists={lists}
        maxCircle={Math.max(...levels, 0)}
        levels={levels}
        {...(school ? { school } : {})}
        {...(onlyIds ? { onlyIds } : {})}
        selected={ids}
        disabledIds={known}
        allowAllLists={false}
        onToggle={(s) => {
          if (ids.includes(s.id))
            ctx.setPicks(
              key,
              picks.filter((p) => p.id !== s.id),
            );
          else if (ids.length < count) ctx.setPicks(key, [...picks, { kind, id: s.id }]);
        }}
        testId={`choice.${key}`}
      />
    </div>
  );
}

function AbilitySelect({
  id,
  value,
  onChange,
  scores,
  max,
  exclude,
  allowed = ABILITY_KEYS,
  placeholder,
}: {
  id: string;
  value: AbilityKey | undefined;
  onChange: (a: AbilityKey | undefined) => void;
  scores: Record<AbilityKey, number>;
  max: number;
  exclude?: AbilityKey | undefined;
  allowed?: readonly AbilityKey[];
  placeholder: string;
}) {
  return (
    <Select
      id={id}
      value={value ?? ''}
      onChange={(e) => onChange((e.target.value || undefined) as AbilityKey | undefined)}
      data-testid={`ability-select.${id}`}
    >
      <option value="">{placeholder}</option>
      {allowed.map((k) => (
        <option key={k} value={k} disabled={k === exclude || scores[k] >= max}>
          {tl.abilityOption(t.abilities[k], scores[k])}
        </option>
      ))}
    </Select>
  );
}

function FeatPick({
  slot,
  ctx,
  category,
}: {
  slot: LevelChoiceSlot;
  ctx: ChoiceContext;
  category: 'general' | 'epic-boon';
}) {
  const featId = useId();
  const nameId = useId();
  const abilityId = useId();
  const pick = ctx.draft.picks[slot.key]?.[0];
  const feats = LEVEL_FEATS.filter((f) => f.category === category && f.minLevel <= ctx.level);
  const feat = feats.find((f) => f.id === pick?.id);
  const meetsReq = (f: (typeof feats)[number]) =>
    !f.requiresAbility || f.requiresAbility.some((a) => ctx.scores[a] >= 13);
  const set = (next: Partial<LevelChoice>) =>
    ctx.setPicks(slot.key, [{ kind: 'feat', ...pick, ...next } as LevelChoice]);
  return (
    <div className="space-y-2">
      <div>
        <Label htmlFor={featId}>{category === 'epic-boon' ? tl.boon : tl.feat}</Label>
        <Select
          id={featId}
          value={pick?.id ?? ''}
          onChange={(e) =>
            ctx.setPicks(slot.key, e.target.value ? [{ kind: 'feat', id: e.target.value }] : [])
          }
          data-testid={`choice.${slot.key}.feat`}
        >
          <option value="">{tl.featNone}</option>
          {feats.map((f) => (
            <option key={f.id} value={f.id} disabled={!meetsReq(f)}>
              {f.name}
              {!meetsReq(f) && f.requiresAbility
                ? ` — ${tl.featRequires(f.requiresAbility.map((a) => t.abilities[a]).join(' ou '))}`
                : ''}
            </option>
          ))}
          <option value="custom">{tl.featOther}</option>
        </Select>
        {feat ? <p className="mt-1 text-xs text-muted">{feat.text}</p> : null}
      </div>
      {pick?.id === 'custom' ? (
        <div>
          <Label htmlFor={nameId}>{tl.featOtherName}</Label>
          <Input
            id={nameId}
            value={pick.text ?? ''}
            maxLength={80}
            onChange={(e) => set({ text: e.target.value })}
            data-testid={`choice.${slot.key}.feat-name`}
          />
        </div>
      ) : null}
      {pick?.id && (pick.id === 'custom' || feat?.abilityIncrease) ? (
        <div>
          <Label htmlFor={abilityId}>{tl.featAbility}</Label>
          <AbilitySelect
            id={abilityId}
            value={pick.ability}
            onChange={(a) => {
              const next: LevelChoice = { kind: 'feat', id: pick.id! };
              if (pick.text) next.text = pick.text;
              if (a) next.ability = a;
              ctx.setPicks(slot.key, [next]);
            }}
            scores={ctx.scores}
            max={feat?.abilityIncrease?.max ?? 20}
            allowed={feat?.abilityIncrease?.from ?? ABILITY_KEYS}
            placeholder={tl.featAbilityNone}
          />
        </div>
      ) : null}
    </div>
  );
}

function AsiPick({ slot, ctx }: { slot: LevelChoiceSlot; ctx: ChoiceContext }) {
  const name = useId();
  const a1 = useId();
  const a2 = useId();
  const mode = ctx.draft.meta[slot.key] ?? 'two';
  const picks = ctx.draft.picks[slot.key] ?? [];
  const setMode = (m: string) => {
    ctx.setMeta(slot.key, m);
    ctx.setPicks(slot.key, []);
  };
  return (
    <div className="space-y-2">
      <div className="grid gap-1.5 sm:grid-cols-3">
        {(['two', 'split', 'feat'] as const).map((m) => (
          <Radio
            key={m}
            name={name}
            checked={mode === m}
            onChange={() => setMode(m)}
            title={tl.asiModes[m]}
            testId={`choice.${slot.key}.mode.${m}`}
          />
        ))}
      </div>
      {mode === 'two' ? (
        <div>
          <Label htmlFor={a1}>
            {tl.asiAbility} ({tl.asiMax})
          </Label>
          <AbilitySelect
            id={a1}
            value={picks[0]?.ability}
            onChange={(a) =>
              ctx.setPicks(slot.key, a ? [{ kind: 'asi', ability: a, amount: 2 }] : [])
            }
            scores={ctx.scores}
            max={20}
            placeholder={tl.featAbilityNone}
          />
        </div>
      ) : mode === 'split' ? (
        <div className="grid grid-cols-2 gap-2">
          {[0, 1].map((i) => (
            <div key={i}>
              <Label htmlFor={i === 0 ? a1 : a2}>{i === 0 ? tl.asiFirst : tl.asiSecond}</Label>
              <AbilitySelect
                id={i === 0 ? a1 : a2}
                value={picks[i]?.ability}
                exclude={picks[1 - i]?.ability}
                onChange={(a) => {
                  const next = [picks[0], picks[1]];
                  next[i] = a ? { kind: 'asi', ability: a, amount: 1 } : undefined;
                  ctx.setPicks(
                    slot.key,
                    next.filter((x): x is LevelChoice => Boolean(x)),
                  );
                }}
                scores={ctx.scores}
                max={20}
                placeholder={tl.featAbilityNone}
              />
            </div>
          ))}
        </div>
      ) : (
        <FeatPick slot={slot} ctx={ctx} category="general" />
      )}
    </div>
  );
}

function SubclassPick({ slot, ctx }: { slot: LevelChoiceSlot; ctx: ChoiceContext }) {
  const name = useId();
  const otherId = useId();
  const pick = ctx.draft.picks[slot.key]?.[0];
  return (
    <div className="space-y-1.5">
      {ctx.progression.subclasses.map((s) => (
        <Radio
          key={s.id}
          name={name}
          checked={pick?.id === s.id}
          onChange={() => ctx.setPicks(slot.key, [{ kind: 'subclass', id: s.id }])}
          title={s.name}
          text={s.tagline}
          testId={`choice.subclass.${s.id}`}
        />
      ))}
      <Radio
        name={name}
        checked={pick?.id === 'custom'}
        onChange={() => ctx.setPicks(slot.key, [{ kind: 'subclass', id: 'custom', text: '' }])}
        title={tl.subclassOther}
        text={tl.subclassOtherHint}
        testId="choice.subclass.custom"
      />
      {pick?.id === 'custom' ? (
        <div>
          <Label htmlFor={otherId}>{tl.subclassOtherName}</Label>
          <Input
            id={otherId}
            value={pick.text ?? ''}
            maxLength={80}
            onChange={(e) =>
              ctx.setPicks(slot.key, [{ kind: 'subclass', id: 'custom', text: e.target.value }])
            }
            data-testid="choice.subclass.custom-name"
          />
        </div>
      ) : null}
    </div>
  );
}

function ReplacePick({
  slot,
  ctx,
  kind,
  current,
  lists,
  levels,
}: {
  slot: LevelChoiceSlot;
  ctx: ChoiceContext;
  kind: 'replace-cantrip' | 'replace-spell';
  current: string[];
  lists: string[];
  levels: SpellLevel[];
}) {
  const oldId = useId();
  const pick = ctx.draft.picks[slot.key]?.[0];
  const old = pick?.text;
  return (
    <div className="space-y-2">
      <div>
        <Label htmlFor={oldId}>{tl.replaceOld}</Label>
        <Select
          id={oldId}
          value={old ?? ''}
          onChange={(e) =>
            ctx.setPicks(slot.key, e.target.value ? [{ kind, text: e.target.value }] : [])
          }
        >
          <option value="">{tl.replaceNone}</option>
          {current.map((id) => (
            <option key={id} value={id}>
              {spellById(id)?.name ?? id}
            </option>
          ))}
        </Select>
      </div>
      {old ? (
        <SpellList
          lists={lists}
          maxCircle={Math.max(...levels, 0)}
          levels={levels}
          selected={pick?.id ? [pick.id] : []}
          disabledIds={knownSpellIds(ctx.sheet, ctx.drafts, ['cantrip', 'spell', 'extra-spell'])}
          allowAllLists={false}
          onToggle={(s) => ctx.setPicks(slot.key, [{ kind, text: old, id: s.id }])}
          testId={`choice.${slot.key}`}
        />
      ) : null}
    </div>
  );
}

/** Uma escolha do nível (o tipo decide o formulário). */
export function ChoiceEditor({
  slot,
  ctx,
  standalone = false,
}: {
  slot: LevelChoiceSlot;
  ctx: ChoiceContext;
  /** Sozinha numa tela da subida de nível: título maior e sem caixa em volta. */
  standalone?: boolean;
}) {
  const def = slot.def as ChoiceDef | SpellChoiceDef;
  const radio = useId();
  const picks = ctx.draft.picks[slot.key] ?? [];
  let body: ReactNode = null;

  switch (def.kind) {
    case 'subclass':
      body = <SubclassPick slot={slot} ctx={ctx} />;
      break;
    case 'asi':
      body = <AsiPick slot={slot} ctx={ctx} />;
      break;
    case 'epic-boon':
      body = <FeatPick slot={slot} ctx={ctx} category="epic-boon" />;
      break;
    case 'expertise': {
      const from = (def.from ?? SKILL_KEYS).filter(
        (k) => (ctx.sheet.build.skillProficiencies[k] ?? 0) >= 1,
      );
      const already = new Set(
        Object.entries(ctx.sheet.build.skillProficiencies)
          .filter(([, v]) => v === 2)
          .map(([k]) => k),
      );
      body = (
        <MultiPick
          slot={slot}
          ctx={ctx}
          kind="expertise"
          count={def.count}
          options={from.map((k) => ({
            id: k,
            name: t.skills[k],
            disabled: already.has(k),
          }))}
        />
      );
      break;
    }
    case 'skill':
      body = (
        <MultiPick
          slot={slot}
          ctx={ctx}
          kind="skill"
          count={def.count}
          options={def.from.map((k: SkillKey) => ({
            id: k,
            name: t.skills[k],
            disabled: (ctx.sheet.build.skillProficiencies[k] ?? 0) >= 1,
          }))}
        />
      );
      break;
    case 'fighting-style': {
      const pick = picks[0];
      const options = [
        ...Object.values(FIGHTING_STYLES).map((s) => ({
          id: s.id as string,
          name: s.name,
          text: s.text,
        })),
        ...(def.alternatives ?? []),
      ];
      const alt =
        pick?.id === 'blessed-warrior' ? 'cleric' : pick?.id === 'druidic-warrior' ? 'druid' : null;
      body = (
        <div className="space-y-1.5">
          {options.map((o) => (
            <Radio
              key={o.id}
              name={radio}
              checked={pick?.id === o.id}
              onChange={() => {
                ctx.setPicks(slot.key, [{ kind: 'fighting-style', id: o.id }]);
                ctx.setPicks(SUB_KEY(slot.key), []);
              }}
              title={o.name}
              text={o.text}
              testId={`choice.${slot.key}.${o.id}`}
            />
          ))}
          {alt ? (
            <div className="pt-2">
              <p className="mb-1 text-sm font-semibold">{tl.blessedCantrips(tsp.classes[alt]!)}</p>
              <SpellPick
                slot={slot}
                ctx={ctx}
                pickKey={SUB_KEY(slot.key)}
                kind="extra-spell"
                count={2}
                lists={[alt]}
                levels={[0]}
              />
            </div>
          ) : null}
        </div>
      );
      break;
    }
    case 'option':
      body = (
        <div className="space-y-1.5">
          {def.options.map((o) => (
            <Radio
              key={o.id}
              name={radio}
              checked={picks[0]?.id === `${slot.featureId}:${o.id}`}
              onChange={() =>
                ctx.setPicks(slot.key, [{ kind: 'option', id: `${slot.featureId}:${o.id}` }])
              }
              title={o.name}
              text={o.text}
              testId={`choice.${slot.key}.${o.id}`}
            />
          ))}
        </div>
      );
      break;
    case 'metamagic': {
      const known = new Set(
        (ctx.sheet.progression?.levels ?? []).flatMap((r) =>
          r.choices.filter((c) => c.kind === 'metamagic').map((c) => c.id),
        ),
      );
      body = (
        <MultiPick
          slot={slot}
          ctx={ctx}
          kind="metamagic"
          count={def.count}
          options={METAMAGIC.filter((m) => !known.has(m.id)).map((m) => ({ ...m }))}
        />
      );
      break;
    }
    case 'invocations': {
      const p = CLASS_PROGRESSIONS.warlock;
      const before = Number(columnAt(p, 'invocations', ctx.level - 1) ?? 0);
      const now = Number(columnAt(p, 'invocations', ctx.level) ?? 0);
      const known = new Set<string>([
        ...(ctx.sheet.creation?.classId === 'warlock' && ctx.sheet.creation.classOptionId
          ? [ctx.sheet.creation.classOptionId]
          : []),
        ...(ctx.sheet.progression?.levels ?? []).flatMap((r) =>
          r.choices.filter((c) => c.kind === 'invocation').map((c) => c.id ?? ''),
        ),
        ...Object.values(ctx.drafts)
          .filter((d) => d !== ctx.draft)
          .flatMap((d) => Object.values(d.picks).flat())
          .filter((c) => c.kind === 'invocation')
          .map((c) => c.id ?? ''),
      ]);
      const mine = new Set(picks.map((c) => c.id));
      body = (
        <MultiPick
          slot={slot}
          ctx={ctx}
          kind="invocation"
          count={Math.max(0, now - before)}
          options={INVOCATIONS.filter(
            (i) => i.minLevel <= ctx.level && (i.repeatable || !known.has(i.id)),
          ).map((i) => ({
            id: i.id,
            name: i.name,
            text: [
              i.minLevel > 1 ? tl.invocationLevel(i.minLevel) : '',
              i.requires
                ? tl.invocationRequires(
                    INVOCATIONS.find((x) => x.id === i.requires)?.name ?? i.requires,
                  )
                : '',
              i.text,
            ]
              .filter(Boolean)
              .join(' · '),
            disabled: Boolean(i.requires && !known.has(i.requires) && !mine.has(i.requires)),
          }))}
        />
      );
      break;
    }
    case 'arcanum':
      body = (
        <SpellPick
          slot={slot}
          ctx={ctx}
          kind="arcanum"
          count={1}
          lists={['warlock']}
          levels={[def.circle as SpellLevel]}
        />
      );
      break;
    case 'languages':
      body = (
        <div className="grid gap-2 sm:grid-cols-2">
          {Array.from({ length: def.count }, (_, i) => (
            <div key={i}>
              <Label htmlFor={`${radio}-${i}`}>{tl.language(i + 1)}</Label>
              <Input
                id={`${radio}-${i}`}
                value={picks[i]?.text ?? ''}
                maxLength={40}
                onChange={(e) => {
                  const next = Array.from({ length: def.count }, (_, j) =>
                    j === i
                      ? { kind: 'language', text: e.target.value }
                      : (picks[j] ?? { kind: 'language', text: '' }),
                  );
                  ctx.setPicks(
                    slot.key,
                    next.filter((c) => c.text?.trim()),
                  );
                }}
              />
            </div>
          ))}
        </div>
      );
      break;
    case 'chosen-spells': {
      const book = spellbookIds(ctx.sheet, ctx.drafts);
      body = (
        <div className="space-y-3">
          {def.picks.map((p, i) => (
            <SpellPick
              key={i}
              slot={slot}
              ctx={ctx}
              pickKey={i === 0 ? slot.key : `${slot.key}.${i}`}
              kind={def.toSpellbook ? 'spellbook' : 'chosen-spell'}
              count={p.count}
              lists={[ctx.progression.classId]}
              levels={p.maxCircle ? range(1, p.circle) : [p.circle as SpellLevel]}
              {...(p.school ? { school: p.school } : {})}
              {...(def.from === 'spellbook' ? { onlyIds: book } : {})}
            />
          ))}
          {def.from === 'spellbook' ? (
            <p className="text-xs text-muted">{tl.fromSpellbook}</p>
          ) : null}
        </div>
      );
      break;
    }
    case 'extra-spells': {
      const sc = ctx.progression.spellcasting;
      const max = sc ? maxCircleAt(ctx.progression, ctx.level) : 0;
      body = (
        <SpellPick
          slot={slot}
          ctx={ctx}
          kind="extra-spell"
          count={def.count}
          lists={def.lists}
          levels={range(def.cantripsAllowed ? 0 : 1, max)}
        />
      );
      break;
    }
    case 'cantrips':
      body = (
        <SpellPick
          slot={slot}
          ctx={ctx}
          kind="cantrip"
          count={def.count}
          lists={def.lists}
          levels={[0]}
        />
      );
      break;
    case 'spellbook':
      body = (
        <SpellPick
          slot={slot}
          ctx={ctx}
          kind="spellbook"
          count={def.count}
          lists={['wizard']}
          levels={range(1, def.maxCircle)}
        />
      );
      break;
    case 'prepared':
      body = (
        <SpellPick
          slot={slot}
          ctx={ctx}
          kind="spell"
          count={def.count}
          lists={def.lists}
          levels={range(1, def.maxCircle)}
          {...(def.fromSpellbook ? { onlyIds: spellbookIds(ctx.sheet, ctx.drafts) } : {})}
        />
      );
      break;
    case 'replace-cantrip':
      body = (
        <ReplacePick
          slot={slot}
          ctx={ctx}
          kind="replace-cantrip"
          current={ctx.sheet.spells.cantrips}
          lists={def.lists}
          levels={[0]}
        />
      );
      break;
    case 'replace-spell':
      body = (
        <ReplacePick
          slot={slot}
          ctx={ctx}
          kind="replace-spell"
          current={ctx.sheet.spells.prepared}
          lists={def.lists}
          levels={range(1, def.maxCircle)}
        />
      );
      break;
  }

  return (
    <section
      className={cn('space-y-3', !standalone && 'rounded-lg border border-border p-3')}
      data-testid={`choice.${slot.key}`}
    >
      <header className="space-y-1">
        <h3 className={cn('font-display font-bold', standalone ? 'text-lg' : 'text-sm')}>
          {slot.title}{' '}
          <span className="font-sans text-xs font-normal text-muted">
            ({slot.required ? tl.required : tl.optional})
          </span>
        </h3>
        {slot.text && def.kind !== 'subclass' ? (
          <p className={cn('leading-relaxed text-muted', standalone ? 'text-sm' : 'text-xs')}>
            {slot.text}
          </p>
        ) : null}
      </header>
      {body}
    </section>
  );
}

function maxCircleAt(p: ClassProgression, level: number): number {
  const sc = p.spellcasting;
  if (!sc) return 0;
  if (sc.kind === 'pact') return pactSlots(level).circle;
  return slotTable(sc.kind, level).reduce((max, n, i) => (n > 0 ? i + 1 : max), 0);
}
