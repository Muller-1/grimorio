import { History } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { t } from '@/lib/i18n';
import { useDiceStore } from '../store';
import { RollHistory } from './RollHistory';
import { RollResultView } from './RollResultView';

/**
 * Bandeja fixa com a última rolagem. `aria-live` anuncia o resultado para leitores de tela.
 */
export function RollTray() {
  const history = useDiceStore((s) => s.history);
  const clear = useDiceStore((s) => s.clear);
  const animate = useDiceStore((s) => s.animate);
  const [open, setOpen] = useState(false);
  const last = history[0];

  return (
    <>
      <div aria-live="polite" className="fixed right-3 bottom-3 left-3 z-30 sm:left-auto sm:w-96">
        {last ? (
          <div className="flex items-start gap-2 rounded-xl border border-border-strong bg-surface p-3 shadow-card">
            <div className="min-w-0 flex-1">
              <RollResultView key={last.id} entry={last} isLast compact animate={animate} />
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setOpen(true)}
              aria-label={t.dice.showHistory}
              title={t.dice.showHistory}
            >
              <History className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={t.dice.historyTitle}
        footer={
          <Button variant="ghost" onClick={clear} disabled={history.length === 0}>
            {t.dice.clearHistory}
          </Button>
        }
      >
        <RollHistory entries={history} />
      </Dialog>
    </>
  );
}
