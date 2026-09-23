import { createBlankSheet } from '@grimorio/shared';
import { FilePlus2, HardDriveDownload, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { RollTray } from '@/features/dice/components/RollTray';
import { useToastStore } from '@/features/toast/store';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { ActionsColumn } from './components/ActionsColumn';
import { CharacterColumn } from './components/CharacterColumn';
import { CombatColumn } from './components/CombatColumn';
import { exampleSheet } from './example';
import { useSheetStore } from './store';

type Column = 'character' | 'combat' | 'actions';
type Confirm = 'blank' | 'example' | null;

/**
 * A ficha do protótipo: 3 colunas no computador, 2 no tablet e abas no celular
 * (plano v2, seção 2 e RNF-02).
 */
export default function SheetPage() {
  const name = useSheetStore((s) => s.sheet.identity.name);
  const recovered = useSheetStore((s) => s.recoveredFromBadData);
  const replace = useSheetStore((s) => s.replace);
  const toast = useToastStore((s) => s.push);
  const [column, setColumn] = useState<Column>('character');
  const [confirm, setConfirm] = useState<Confirm>(null);

  useEffect(() => {
    document.title = `${name || t.sheet.unnamed} · ${t.brand.name}`;
  }, [name]);

  useEffect(() => {
    if (recovered) toast(t.sheet.restoredBackup, 'danger');
  }, [recovered, toast]);

  const columns: { key: Column; label: string }[] = [
    { key: 'character', label: t.sheet.mobileTabs.character },
    { key: 'combat', label: t.sheet.mobileTabs.combat },
    { key: 'actions', label: t.sheet.mobileTabs.actions },
  ];

  return (
    <div className="mx-auto w-full max-w-[1400px] px-3 pt-3 pb-40 sm:px-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl font-bold">{name || t.sheet.unnamed}</h1>
          <p className="flex items-center gap-1 text-xs text-muted">
            <HardDriveDownload className="size-3.5" aria-hidden="true" />
            {t.sheet.savedLocally}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setConfirm('example')}>
            <Sparkles className="size-4" />
            {t.sheet.loadExample}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setConfirm('blank')}>
            <FilePlus2 className="size-4" />
            {t.sheet.newSheet}
          </Button>
        </div>
      </div>

      {/* Abas só no celular */}
      <div
        role="tablist"
        aria-label={t.sheet.pageTitle}
        className="sticky top-14 z-20 mb-3 grid grid-cols-3 gap-1 rounded-lg border border-border bg-surface p-1 md:hidden"
      >
        {columns.map((c) => (
          <button
            key={c.key}
            type="button"
            role="tab"
            aria-selected={column === c.key}
            aria-controls={`col-${c.key}`}
            onClick={() => setColumn(c.key)}
            className={cn(
              'h-9 rounded-md text-sm font-semibold transition-colors',
              column === c.key ? 'bg-accent text-accent-contrast' : 'text-muted hover:bg-surface-2',
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <section
          id="col-character"
          aria-label={t.sheet.columns.character}
          className={cn(column !== 'character' && 'max-md:hidden')}
        >
          <CharacterColumn />
        </section>
        <section
          id="col-combat"
          aria-label={t.sheet.columns.combat}
          className={cn(column !== 'combat' && 'max-md:hidden')}
        >
          <CombatColumn />
        </section>
        <section
          id="col-actions"
          aria-label={t.sheet.columns.actions}
          className={cn('md:col-span-2 xl:col-span-1', column !== 'actions' && 'max-md:hidden')}
        >
          <ActionsColumn />
        </section>
      </div>

      <RollTray />

      <Dialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === 'example' ? t.sheet.exampleConfirmTitle : t.sheet.newSheetConfirmTitle}
        description={
          confirm === 'example' ? t.sheet.exampleConfirmText : t.sheet.newSheetConfirmText
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              {t.sheet.cancel}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                replace(confirm === 'example' ? exampleSheet() : createBlankSheet());
                setConfirm(null);
                setColumn('character');
              }}
            >
              {t.sheet.confirm}
            </Button>
          </>
        }
      />
    </div>
  );
}
