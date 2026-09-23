import { Component, type ErrorInfo, type ReactNode } from 'react';
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
  labelledBy?: string;
}

export function Panel({
  title,
  actions,
  className,
  bodyClassName,
  children,
  as = 'section',
}: PanelProps) {
  const Tag = as;
  return (
    <Tag className={cn('rounded-xl border border-border bg-surface shadow-card', className)}>
      {title || actions ? (
        <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          {title ? (
            <h2 className="font-display text-sm font-bold tracking-wide">{title}</h2>
          ) : (
            <span />
          )}
          {actions}
        </header>
      ) : null}
      <div className={cn('p-3', bodyClassName)}>
        <PanelErrorBoundary>{children}</PanelErrorBoundary>
      </div>
    </Tag>
  );
}
