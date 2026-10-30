import { createBlankSheet } from '@grimorio/shared';
import { ArrowLeft, Wand2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { RollTray } from '@/features/dice/components/RollTray';
import { useToastStore } from '@/features/toast/store';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { AbilitiesPanel } from './components/AbilitiesPanel';
import { ActionsColumn } from './components/ActionsColumn';
import { CombatPanel, DeathSavesPanel } from './components/CombatColumn';
import { IdentityBar } from './components/Identity';
import { PowersPanel } from './components/PowersPanel';
import { safeStorage } from '@/ports/storage';
import { exampleSheet } from './example';
import { useSheetStore } from './store';
import { useSwipeTabs } from './swipe';

type Column = 'character' | 'combat' | 'actions';

/** Ordem das abas no celular (a mesma da barra de abas): o deslizar anda por ela. */
const COLUMN_ORDER: Column[] = ['character', 'combat', 'actions'];

/** O jogador disse que prefere preencher a ficha em branco à mão (não mostra mais a dica). */
const WIZARD_HINT_KEY = 'grimorio.ficha.dica-assistente';

/**
 * Feedback dos testadores ("não soube onde clicar"): quem cai na ficha em branco vê o caminho
 * para o assistente. Some quando a ficha ganha nome ou classe, ou se o jogador dispensar.
 */
function WizardHint() {
  const blank = useSheetStore((s) => !s.sheet.identity.name && !s.sheet.identity.className);
  const [dismissed, setDismissed] = useState(() => safeStorage.get(WIZARD_HINT_KEY) === '1');
  if (!blank || dismissed) return null;
  const h = t.sheet.wizardHint;
  return (
    <aside
      className="flex flex-col gap-3 rounded-xl border border-accent/30 bg-accent-soft p-4 sm:flex-row sm:items-center"
      data-testid="sheet.wizard-hint"
    >
      <Wand2 className="size-6 shrink-0 text-accent" aria-hidden="true" />
      <div className="flex-1 text-sm">
        <p className="font-semibold">{h.title}</p>
        <p className="mt-0.5">{h.text}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="primary">
          <Link to="/criar">{h.cta}</Link>
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            safeStorage.set(WIZARD_HINT_KEY, '1');
            setDismissed(true);
          }}
        >
          {h.dismiss}
        </Button>
      </div>
    </aside>
  );
}
type Confirm = 'blank' | 'example' | null;

/**
 * A ficha (docs/design.md): a faixa de identidade em cima; atributos (com salvaguardas e
 * perícias) ao lado do combate; embaixo, as abas de armas, magias, inventário e
 * características ao lado das habilidades. No celular, a identidade fica em cima e o resto vira
 * três abas (Personagem, Combate, Ações), que também trocam deslizando para os lados.
 *
 * `local` = a ficha deste navegador (/ficha). `account` = uma ficha da conta (/personagem),
 * aberta pela AccountSheetPage, com salvamento automático no servidor.
 */
export default function SheetPage({
  mode = 'local',
  status,
  banner,
}: {
  mode?: 'local' | 'account';
  /** Ficha da conta: a situação do salvamento, embaixo do nome (vem da AccountSheetPage). */
  status?: ReactNode;
  /** Ficha da conta: avisos da mesa (campanha, curas propostas) acima da ficha. */
  banner?: ReactNode;
}) {
  const name = useSheetStore((s) => s.sheet.identity.name);
  const openLocal = useSheetStore((s) => s.openLocal);
  const recovered = useSheetStore((s) => s.recoveredFromBadData);
  const replace = useSheetStore((s) => s.replace);
  const toast = useToastStore((s) => s.push);
  const [column, setColumn] = useState<Column>('character');
  const [confirm, setConfirm] = useState<Confirm>(null);

  // Celular: deslizar para os lados troca de aba (nas pontas, fica onde está).
  const columnsRef = useRef<HTMLDivElement>(null);
  const swipe = useCallback((dir: 1 | -1) => {
    setColumn((now) => COLUMN_ORDER[COLUMN_ORDER.indexOf(now) + dir] ?? now);
  }, []);
  useSwipeTabs(columnsRef, swipe);

  useEffect(() => {
    document.title = `${name || t.sheet.unnamed} · ${t.brand.name}`;
  }, [name]);

  useEffect(() => {
    if (recovered) toast(t.sheet.restoredBackup, 'danger');
  }, [recovered, toast]);

  // Vindo de uma ficha da conta, /ficha volta a mostrar a ficha deste navegador.
  useEffect(() => {
    if (mode === 'local') openLocal();
  }, [mode, openLocal]);

  // Ficha de antes do inventário: organiza as características e o equipamento (uma vez).
  const needsUpgrade = useSheetStore((s) => s.sheet.features.some((f) => !f.source));
  useEffect(() => {
    if (!needsUpgrade) return;
    let cancelled = false;
    void import('./upgrade').then((m) => {
      if (!cancelled) m.upgradeOpenSheet();
    });
    return () => {
      cancelled = true;
    };
  }, [needsUpgrade]);

  const columns: { key: Column; label: string }[] = [
    { key: 'character', label: t.sheet.mobileTabs.character },
    { key: 'combat', label: t.sheet.mobileTabs.combat },
    { key: 'actions', label: t.sheet.mobileTabs.actions },
  ];
  const hidden = (key: Column) => column !== key && 'max-md:hidden';
  const wide = 'min-w-0 md:flex-[2_1_760px]';
  const narrow = 'min-w-0 md:flex-[1_1_360px]';

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-3 pt-4 pb-24 md:gap-5 md:px-6 md:pt-5">
      {mode === 'account' ? (
        <Button asChild variant="ghost" size="sm" className="-mb-2 self-start text-muted">
          <Link to="/personagens">
            <ArrowLeft className="size-4" />
            {t.sync.backToList}
          </Link>
        </Button>
      ) : null}

      <IdentityBar
        {...(mode === 'account' ? { status } : {})}
        {...(mode === 'local'
          ? { onExample: () => setConfirm('example'), onBlank: () => setConfirm('blank') }
          : {})}
      />

      {mode === 'local' ? <WizardHint /> : banner}

      {/* Abas só no celular */}
      <div
        role="tablist"
        aria-label={t.sheet.pageTitle}
        className="sticky top-16 z-20 grid grid-cols-3 gap-1 rounded-[10px] border border-border bg-surface p-1 md:hidden"
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
              'h-10 rounded-[7px] text-sm transition-colors',
              column === c.key
                ? 'bg-accent font-bold text-accent-contrast'
                : 'font-medium text-muted hover:bg-surface-2',
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div
        ref={columnsRef}
        data-testid="sheet.columns"
        className="flex flex-col gap-4 max-md:min-h-[60svh] max-md:touch-pan-y max-md:touch-pinch-zoom md:gap-5"
      >
        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-stretch md:gap-5">
          <section
            id="col-character"
            aria-label={t.sheet.columns.character}
            className={cn(wide, 'flex flex-col', hidden('character'))}
          >
            <AbilitiesPanel className="flex-1" />
          </section>
          <section
            id="col-combat"
            aria-label={t.sheet.columns.combat}
            className={cn(narrow, 'flex flex-col gap-4 md:gap-5', hidden('combat'))}
          >
            <CombatPanel />
            <DeathSavesPanel className="flex-1" />
          </section>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-stretch md:gap-5">
          <section
            id="col-actions"
            aria-label={t.sheet.columns.actions}
            className={cn(wide, 'flex flex-col', hidden('actions'))}
          >
            <ActionsColumn className="flex-1" />
          </section>
          {/* No celular, as habilidades aparecem na aba Combate (logo abaixo dele). */}
          <div className={cn(narrow, 'flex flex-col', hidden('combat'))}>
            <PowersPanel className="flex-1" />
          </div>
        </div>
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
