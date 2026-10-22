import {
  CLASSES,
  INITIATE_ABILITIES,
  INITIATE_LISTS,
  initiateChoices,
  RECOMMENDED_SPELLS,
  speciesSpellsAt,
  spellNeeds,
  emptyInitiate,
  type CreationDraft,
  type InitiateChoice,
  type SpellDef,
} from '@grimorio/rules';
import { WandSparkles } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Label, Select } from '@/components/ui/input';
import { Panel } from '@/components/ui/panel';
import { SpellList } from '@/features/spells/SpellPicker';
import { tw } from '@/lib/i18n/wizard';
import { useBuilderStore } from '../store';

const sp = tw.spells;

/** Liga/desliga um id numa lista com limite. */
function toggle(list: string[], id: string, max: number): string[] {
  if (list.includes(id)) return list.filter((x) => x !== id);
  return list.length < max ? [...list, id] : list;
}

function Section({
  id,
  title,
  hint,
  picked,
  total,
  children,
}: {
  id: string;
  title: string;
  hint: string;
  picked: number;
  total: number;
  children: ReactNode;
}) {
  return (
    <Panel
      id={id}
      title={title}
      actions={
        <span
          className={picked === total ? 'text-xs font-semibold text-success' : 'text-xs text-muted'}
          data-testid={`${id}.count`}
        >
          {sp.count(picked, total)}
        </span>
      }
    >
      <p className="mb-2 text-sm text-muted">{hint}</p>
      {children}
    </Panel>
  );
}

function InitiateEditor({
  index,
  choice,
  fixed,
  taken,
}: {
  index: number;
  choice: InitiateChoice;
  fixed: boolean;
  taken: Set<string>;
}) {
  const update = useBuilderStore((s) => s.update);
  const listId = useId();
  const abilityId = useId();
  const set = (next: Partial<InitiateChoice>) =>
    update((d) => {
      const all = [...d.initiates];
      while (all.length <= index) all.push(emptyInitiate());
      all[index] = { ...all[index]!, ...next };
      d.initiates = all;
    });
  const cantripsTaken = new Set([...taken].filter((id) => !choice.cantrips.includes(id)));
  return (
    <Panel
      id={index === 0 ? 'wizard-initiate' : `wizard-initiate-${index}`}
      title={sp.initiate}
      actions={
        <span className="text-xs text-muted">
          {sp.count(choice.cantrips.length + (choice.spell ? 1 : 0), 3)}
        </span>
      }
    >
      <p className="mb-3 text-sm text-muted">{sp.initiateHint}</p>
      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        {fixed && choice.list ? (
          <p className="self-end text-sm font-semibold">
            {sp.initiateListFixed(sp.lists[choice.list]!)}
          </p>
        ) : (
          <div>
            <Label htmlFor={listId}>{sp.initiateList}</Label>
            <Select
              id={listId}
              value={choice.list ?? ''}
              onChange={(e) =>
                set({
                  list: (e.target.value || null) as InitiateChoice['list'],
                  cantrips: [],
                  spell: null,
                })
              }
              data-testid={`wizard.initiate.${index}.list`}
            >
              <option value="">{sp.initiateListNone}</option>
              {INITIATE_LISTS.map((l) => (
                <option key={l} value={l}>
                  {sp.lists[l]}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div>
          <Label htmlFor={abilityId}>{sp.initiateAbility}</Label>
          <Select
            id={abilityId}
            value={choice.ability ?? ''}
            onChange={(e) =>
              set({ ability: (e.target.value || null) as InitiateChoice['ability'] })
            }
            data-testid={`wizard.initiate.${index}.ability`}
          >
            <option value="">{sp.initiateAbilityNone}</option>
            {INITIATE_ABILITIES.map((a) => (
              <option key={a} value={a}>
                {sp.abilities[a]}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {choice.list ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-1 text-sm font-semibold">
              {sp.initiateCantrips} · {sp.count(choice.cantrips.length, 2)}
            </p>
            <SpellList
              lists={[choice.list]}
              maxCircle={0}
              levels={[0]}
              selected={choice.cantrips}
              disabledIds={cantripsTaken}
              allowAllLists={false}
              describe
              disabledLabel={sp.alreadyChosen}
              onToggle={(s: SpellDef) => set({ cantrips: toggle(choice.cantrips, s.id, 2) })}
              testId={`wizard.initiate.${index}.cantrips`}
            />
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold">
              {sp.initiateSpell} · {sp.count(choice.spell ? 1 : 0, 1)}
            </p>
            <SpellList
              lists={[choice.list]}
              maxCircle={1}
              levels={[1]}
              selected={choice.spell ? [choice.spell] : []}
              allowAllLists={false}
              describe
              disabledLabel={sp.alreadyChosen}
              onToggle={(s: SpellDef) => set({ spell: choice.spell === s.id ? null : s.id })}
              testId={`wizard.initiate.${index}.spell`}
            />
          </div>
        </div>
      ) : null}
    </Panel>
  );
}

/** Preenche a etapa com as magias que o livro recomenda para a classe (o que faltar, fica). */
function withRecommended(d: CreationDraft): CreationDraft {
  const n = spellNeeds(d);
  const rec = d.classId ? RECOMMENDED_SPELLS[d.classId] : undefined;
  if (!rec) return d;
  return {
    ...d,
    cantrips: rec.cantrips.slice(0, n.cantrips),
    preparedSpells: rec.prepared.slice(0, n.prepared),
    spellbook: rec.spellbook ? rec.spellbook.slice(0, n.spellbook) : d.spellbook,
  };
}

/**
 * Etapa Magias do assistente (cap. 3 do livro, "Conjuração" de cada classe, e cap. 5, Iniciado
 * em Magia). Carregada sob demanda: é ela que traz a lista das magias.
 */
export default function SpellsStep() {
  const draft = useBuilderStore((s) => s.draft);
  const update = useBuilderStore((s) => s.update);
  const [filled, setFilled] = useState(false);
  const need = spellNeeds(draft);
  const cls = draft.classId ? CLASSES[draft.classId] : null;
  const rec = draft.classId ? RECOMMENDED_SPELLS[draft.classId] : undefined;
  const initiates = initiateChoices(draft);
  // Magias que o personagem já tem por outro caminho (espécie) não entram de novo.
  const species = new Set(
    speciesSpellsAt(draft.speciesId ?? undefined, draft.speciesOptionId ?? undefined, 1),
  );
  const classCantripsTaken = new Set([...species, ...initiates.flatMap((c) => c.cantrips)]);
  const wizard = need.spellbook > 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] lg:items-start">
        <div className="space-y-3 text-[15px] leading-relaxed">
          <h1 className="font-display text-2xl font-bold">{sp.title}</h1>
          {sp.intro.map((p) => (
            <p key={p}>{p}</p>
          ))}
          {cls && need.classList ? (
            <>
              <p className="text-sm text-muted">{sp.classNote(cls.name)}</p>
              <Button
                variant="outline"
                onClick={() => {
                  update(withRecommended);
                  setFilled(true);
                }}
                data-testid="wizard.spells.recommended"
              >
                <WandSparkles className="size-4" />
                {sp.useRecommended}
              </Button>
              {filled ? (
                <p role="status" className="text-sm text-success">
                  {sp.recommendedDone}
                </p>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="space-y-4">
          {need.cantrips > 0 ? (
            <Section
              id="wizard-spell-cantrips"
              title={sp.cantrips}
              hint={sp.cantripsHint}
              picked={draft.cantrips.length}
              total={need.cantrips}
            >
              <SpellList
                lists={[need.classList!]}
                maxCircle={0}
                levels={[0]}
                selected={draft.cantrips}
                disabledIds={classCantripsTaken}
                allowAllLists={false}
                describe
                disabledLabel={sp.alreadyChosen}
                highlightIds={rec?.cantrips}
                highlightLabel={sp.recommended}
                onToggle={(s) =>
                  update((d) => void (d.cantrips = toggle(d.cantrips, s.id, need.cantrips)))
                }
                testId="wizard.spells.cantrips"
              />
            </Section>
          ) : null}

          {wizard ? (
            <Section
              id="wizard-spellbook"
              title={sp.spellbook}
              hint={sp.spellbookHint}
              picked={draft.spellbook.length}
              total={need.spellbook}
            >
              <SpellList
                lists={[need.classList!]}
                maxCircle={1}
                levels={[1]}
                selected={draft.spellbook}
                allowAllLists={false}
                describe
                disabledLabel={sp.alreadyChosen}
                highlightIds={rec?.spellbook}
                highlightLabel={sp.recommended}
                onToggle={(s) =>
                  update((d) => {
                    d.spellbook = toggle(d.spellbook, s.id, need.spellbook);
                    // Tirou do grimório: deixa de estar preparada.
                    d.preparedSpells = d.preparedSpells.filter((id) => d.spellbook.includes(id));
                  })
                }
                testId="wizard.spells.spellbook"
              />
            </Section>
          ) : null}

          {need.prepared > 0 ? (
            <Section
              id="wizard-spell-prepared"
              title={wizard ? sp.preparedWizard : sp.prepared}
              hint={wizard ? sp.preparedWizardHint : sp.preparedHint}
              picked={draft.preparedSpells.length}
              total={need.prepared}
            >
              {wizard && draft.spellbook.length === 0 ? (
                <p className="text-sm text-muted">{sp.pickSpellbookFirst}</p>
              ) : (
                <SpellList
                  lists={[need.classList!]}
                  maxCircle={1}
                  levels={[1]}
                  {...(wizard ? { onlyIds: draft.spellbook } : {})}
                  selected={draft.preparedSpells}
                  disabledIds={species}
                  allowAllLists={false}
                  describe
                  disabledLabel={sp.alreadyChosen}
                  highlightIds={wizard ? undefined : rec?.prepared}
                  highlightLabel={sp.recommended}
                  onToggle={(s) =>
                    update(
                      (d) =>
                        void (d.preparedSpells = toggle(d.preparedSpells, s.id, need.prepared)),
                    )
                  }
                  testId="wizard.spells.prepared"
                />
              )}
            </Section>
          ) : null}

          {initiates.map((choice, i) => (
            <InitiateEditor
              key={i}
              index={i}
              choice={choice}
              fixed={Boolean(need.initiates[i]?.fixedList)}
              taken={new Set([...species, ...draft.cantrips])}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
