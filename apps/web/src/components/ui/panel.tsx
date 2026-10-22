import { Component, useId, type ErrorInfo, type ReactNode } from 'react';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from './button';

/** Barreira de erro: um problema num painel não derruba a ficha inteira (plano v2, 8). */
class PanelErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Na Etapa 8 isto vai para o rastreamento de erros (ex.: Sentry).
    console.error('[Panel]', error, info.componentStack);
  }

  override render() {
    if (this.state.failed) {
      return (
        <div role="alert" className="space-y-2 p-3 text-sm text-danger">
          <p>{t.common.panelError}</p>
          <Button size="sm" onClick={() => this.setState({ failed: false })}>
            {t.common.retry}
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface PanelProps {
  title?: ReactNode;
  /** Ações à direita do título. */
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
  as?: 'section' | 'div';
  /** Âncora (ex.: o assistente leva o jogador até o bloco que falta). */
  id?: string;
}

export function Panel({
  title,
  actions,
  className,
  bodyClassName,
  children,
  as = 'section',
  id,
}: PanelProps) {
  const Tag = as;
  // A seção leva o nome do título (o leitor de tela anuncia "Perícias, região").
  const titleId = useId();
  return (
    <Tag
      id={id}
      {...(title && as === 'section' ? { 'aria-labelledby': titleId } : {})}
      className={cn(
        'scroll-mt-24 rounded-xl border border-border bg-surface shadow-card',
        className,
      )}
    >
      {title || actions ? (
        <header className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-border px-3 py-2">
          {/* O título nunca fica mais estreito que a sua maior palavra: se as ações não cabem ao
              lado, descem para a linha de baixo. */}
          {title ? (
            <h2
              id={titleId}
              className="flex-1 font-display text-sm font-bold text-balance break-words"
            >
              {title}
            </h2>
          ) : (
            <span />
          )}
          {actions ? (
            <div className="flex max-w-full flex-wrap items-center gap-1">{actions}</div>
          ) : null}
        </header>
      ) : null}
      <div className={cn('p-3', bodyClassName)}>
        <PanelErrorBoundary>{children}</PanelErrorBoundary>
      </div>
    </Tag>
  );
}
