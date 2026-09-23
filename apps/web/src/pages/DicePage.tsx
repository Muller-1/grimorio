import { useEffect, useId, useState } from 'react';
import { Panel } from '@/components/ui/panel';
import { DiceExpressionInput } from '@/features/dice/components/DiceExpressionInput';
import { QuickRollFields } from '@/features/dice/components/QuickRollFields';
import { RollHistory } from '@/features/dice/components/RollHistory';
import { RollResultView } from '@/features/dice/components/RollResultView';
import { ShortcutEditor, ShortcutPanel } from '@/features/dice/components/ShortcutPanel';
import { useDiceStore } from '@/features/dice/store';
import { useToastStore } from '@/features/toast/store';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';

/** Rolador de dados (Etapa 7): expressão livre, rolagem rápida, atalhos, histórico. */
export default function DicePage() {
  const history = useDiceStore((s) => s.history);
  const clear = useDiceStore((s) => s.clear);
  const animate = useDiceStore((s) => s.animate);
  const setAnimate = useDiceStore((s) => s.setAnimate);
  const recovered = useDiceStore((s) => s.shortcutsRecovered);
  const toast = useToastStore((s) => s.push);
  const [draft, setDraft] = useState<{ label: string; expression: string } | null>(null);
  const animId = useId();
  const [last, ...older] = history;

  useEffect(() => {
    document.title = `${t.dice.pageTitle} · ${t.brand.name}`;
  }, []);

  useEffect(() => {
    if (recovered) toast(t.dice.shortcuts.recovered, 'danger');
  }, [recovered, toast]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-5">
        <h1 className="font-display text-3xl font-bold">{t.dice.pageTitle}</h1>
        <p className="mt-2 max-w-2xl text-muted">{t.dice.pageLead}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="space-y-4">
          <Panel>
            <DiceExpressionInput
              onSaveAsShortcut={(expression) => setDraft({ label: '', expression })}
            />
          </Panel>

          <Panel title={t.dice.quick.title}>
            <QuickRollFields />
          </Panel>

          <Panel
            title={t.dice.resultTitle}
            actions={
              <label
                htmlFor={animId}
                className="flex items-center gap-1.5 text-xs text-muted"
                title={t.dice.animationHint}
              >
                <input
                  id={animId}
                  type="checkbox"
                  checked={animate}
                  onChange={(e) => setAnimate(e.target.checked)}
                  className="size-4 accent-[var(--accent)]"
                />
                {t.dice.animation}
              </label>
            }
          >
            <div aria-live="polite" className="min-h-16">
              {last ? (
                <RollResultView key={last.id} entry={last} isLast animate={animate} />
              ) : (
                <p className="text-sm text-muted">{t.dice.historyEmpty}</p>
              )}
            </div>
          </Panel>
        </div>

        <aside className="space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <ShortcutPanel onNew={() => setDraft({ label: '', expression: '' })} />
          <Panel title={t.dice.syntax.title}>
            <dl className="space-y-2 text-sm">
              {t.dice.syntax.items.map(([expr, meaning]) => (
                <div key={expr}>
                  <dt className="font-mono font-semibold">{expr}</dt>
                  <dd className="text-muted">{meaning}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </aside>

        <Panel
          title={t.dice.historyTitle}
          className="lg:col-start-1"
          actions={
            older.length > 0 ? (
              <Button size="sm" variant="ghost" onClick={clear}>
                {t.dice.clearHistory}
              </Button>
            ) : null
          }
        >
          <RollHistory entries={older} />
        </Panel>
      </div>

      {draft ? <ShortcutEditor initial={draft} onClose={() => setDraft(null)} /> : null}
    </div>
  );
}
