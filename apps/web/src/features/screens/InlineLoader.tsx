import { useState } from 'react';
import { D20Die } from '@/components/ui/d20-icon';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { getRng } from '@/ports/rng';

/** Uma dica de jogo, sorteada uma vez por tela. */
export function useTip(): string {
  const tips = t.screens.tips;
  const [index] = useState(() => getRng().int(0, tips.length - 1));
  return tips[index]!;
}

/** O losango que corre de um lado ao outro do filete. */
export function Corridor({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('relative h-0.5 bg-border', className)}>
      <span className="gr-corridor absolute inset-x-0 -top-1 h-2.5">
        <span className="block size-2.5 rotate-45 bg-border-strong shadow-[0_0_0_2px_var(--bg)] dark:bg-text dark:shadow-[0_0_10px_rgb(199_203_211/0.7)]" />
      </span>
    </div>
  );
}

/** Carregando dentro da página (lista de personagens, ficha da conta): o d20 rolando. */
export function InlineLoader({ label, className }: { label: string; className?: string }) {
  return (
    <div
      role="status"
      className={cn('flex flex-col items-center gap-3 py-16 text-center', className)}
    >
      <span className="gr-roll relative size-[60px]">
        <span className="absolute -inset-3 hidden rounded-full bg-[radial-gradient(closest-side,rgb(92_194_174/0.3),rgb(92_194_174/0))] dark:block" />
        <D20Die className="relative size-full" value={20} strokeWidth={6} />
      </span>
      <p className="text-muted">{label}</p>
      <Corridor className="mt-1 w-48" />
    </div>
  );
}

/**
 * Página que vem sob demanda carregando: o d20 rolando no lugar do conteúdo, com o cabeçalho do
 * site à vista. Só aparece depois de ~0,35 s (o que carrega rápido não pisca). O espaço ocupa a
 * tela toda: o rodapé fica fora da vista e não "pula" quando a página chega (Lighthouse,
 * CLS ≤ 0,1).
 */
export function PageLoader() {
  return (
    <div className="min-h-dvh px-4" data-testid="page.loading">
      <InlineLoader label={t.screens.loading.status} className="gr-appear" />
    </div>
  );
}
