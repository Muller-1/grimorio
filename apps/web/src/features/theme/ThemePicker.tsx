import { Check, Palette } from 'lucide-react';
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { t } from '@/lib/i18n';
import { currentTheme, setTheme, subscribeTheme, THEMES, type ThemeId } from '@/lib/theme';
import { cn } from '@/lib/utils';

/** No HTML pré-renderizado ainda não sabemos o tema; a lista só aparece depois de aberta. */
const serverTheme = (): ThemeId => 'auto';

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
          <span className={cn(STRIPE, 'bg-gold')} />
          <span className={cn(STRIPE, 'bg-accent')} />
        </span>
      )}
    </span>
  );
}

/**
 * Botão de paleta da barra superior que troca as cores do site (pedido dos testadores).
 * Painel simples, sem Radix, para não pesar na página inicial: fecha com Esc, clique fora ou
 * quando o foco sai dele; as setas trocam o tema (grupo de rádio do próprio navegador).
 */
export function ThemePicker() {
  const theme = useSyncExternalStore(subscribeTheme, currentTheme, serverTheme);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    rootRef.current?.querySelector<HTMLInputElement>('input:checked')?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(event) => {
        // Tab para fora fecha. Sem `relatedTarget` (clique num texto do painel) não fecha: o
        // clique fora já é tratado no pointerdown.
        const next = event.relatedTarget as Node | null;
        if (open && next && !rootRef.current?.contains(next)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          'grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text',
          open && 'bg-surface-2 text-text',
        )}
        aria-label={t.theme.trigger}
        title={t.theme.trigger}
        aria-expanded={open}
        aria-controls={panelId}
        data-testid="theme.trigger"
        onClick={() => setOpen((o) => !o)}
      >
        <Palette className="size-5" aria-hidden="true" />
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute top-full right-0 z-50 mt-2 w-80 max-w-[calc(100vw-1.5rem)] rounded-lg border border-border bg-surface p-3 text-sm shadow-card"
        >
          <fieldset data-testid="theme.picker">
            <legend className="font-display font-bold">{t.theme.title}</legend>
            <p className="text-xs text-muted">{t.theme.hint}</p>
            <div className="mt-2 grid gap-1">
              {THEMES.map((id) => {
                const option = t.theme.options[id];
                const checked = theme === id;
                return (
                  <label
                    key={id}
                    data-testid={`theme.option.${id}`}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-md border px-2.5 py-2',
                      'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-focus',
                      checked
                        ? 'border-accent bg-accent-soft'
                        : 'border-transparent hover:bg-surface-2',
                    )}
                  >
                    <input
                      type="radio"
                      name="grimorio-tema"
                      value={id}
                      checked={checked}
                      onChange={() => setTheme(id)}
                      className="sr-only"
                    />
                    <Swatch id={id} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{option.name}</span>
                      <span className="block text-xs text-muted">{option.text}</span>
                    </span>
                    {checked && (
                      <Check className="size-4 shrink-0 text-accent" aria-hidden="true" />
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>
      )}
    </div>
  );
}
