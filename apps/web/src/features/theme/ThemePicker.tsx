import { Palette } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { RadioCard } from '@/components/ui/radio-card';
import { t } from '@/lib/i18n';
import { currentTheme, setTheme, subscribeTheme, THEMES, type ThemeId } from '@/lib/theme';
import { useDismiss } from '@/lib/use-dismiss';
import { cn } from '@/lib/utils';

/** No HTML pré-renderizado ainda não sabemos o tema; a lista só aparece depois de aberta. */
const serverTheme = (): ThemeId => 'auto';

/** O tema escolhido agora (acompanha a troca nesta e em outras abas). */
function useThemeChoice(): ThemeId {
  return useSyncExternalStore(subscribeTheme, currentTheme, serverTheme);
}

const STRIPE = 'h-full w-2.5';

/**
 * Amostra com as cores reais do tema: o `data-theme` no <span> faz as variáveis de cor valerem
 * só ali dentro (ver styles/index.css). "Automático" mostra metade claro, metade escuro.
 */
function Swatch({ id }: { id: ThemeId }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-6 shrink-0 overflow-hidden rounded border border-border-strong"
    >
      {id === 'auto' ? (
        (['light', 'dark'] as const).map((half) => (
          <span key={half} data-theme={half} className="flex">
            <span className={cn(STRIPE, 'bg-bg')} />
            <span className={cn(STRIPE, 'bg-accent')} />
          </span>
        ))
      ) : (
        <span data-theme={id} className="flex">
          <span className={cn(STRIPE, 'bg-bg')} />
          <span className={cn(STRIPE, 'bg-surface-2')} />
          <span className={cn(STRIPE, 'bg-ornament')} />
          <span className={cn(STRIPE, 'bg-accent')} />
        </span>
      )}
    </span>
  );
}

/**
 * As opções de tema: no balão da barra (sem conta), no menu da conta, no menu do celular e nas
 * Configurações. As setas trocam o tema (grupo de rádio do próprio navegador).
 */
export function ThemeOptions({ className }: { className?: string }) {
  const theme = useThemeChoice();
  return (
    <fieldset data-testid="theme.picker" className={className}>
      <legend className="font-display font-bold">{t.theme.title}</legend>
      <p className="text-xs text-muted">{t.theme.hint}</p>
      <div className="mt-2 grid gap-1">
        {THEMES.map((id) => (
          <RadioCard
            key={id}
            name="grimorio-tema"
            value={id}
            checked={theme === id}
            onSelect={() => setTheme(id)}
            title={t.theme.options[id].name}
            text={t.theme.options[id].text}
            visual={<Swatch id={id} />}
            testId={`theme.option.${id}`}
          />
        ))}
      </div>
    </fieldset>
  );
}

/** Botão de paleta da barra superior (no computador; no celular, as opções ficam no menu). */
export function ThemePicker({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const close = useCallback(() => setOpen(false), []);
  const onBlur = useDismiss(open, close, rootRef, triggerRef);

  useEffect(() => {
    if (open) rootRef.current?.querySelector<HTMLInputElement>('input:checked')?.focus();
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative', className)} onBlur={onBlur}>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          'grid size-11 place-items-center rounded-lg text-text hover:bg-surface-2',
          open && 'bg-surface-2',
        )}
        aria-label={t.theme.trigger}
        title={t.theme.trigger}
        aria-expanded={open}
        aria-controls={panelId}
        data-testid="theme.trigger"
        onClick={() => setOpen((o) => !o)}
      >
        <Palette className="size-5" strokeWidth={1.8} aria-hidden="true" />
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute top-full right-0 z-50 mt-2 w-80 max-w-[calc(100vw-1.5rem)] rounded-xl border border-border bg-surface p-3 text-sm shadow-card"
        >
          <ThemeOptions />
        </div>
      )}
    </div>
  );
}
