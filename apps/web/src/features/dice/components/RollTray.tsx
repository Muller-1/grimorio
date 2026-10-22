import { History, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { t } from '@/lib/i18n';
import { useDiceStore } from '../store';
import { RollHistory } from './RollHistory';
import { RollResultView } from './RollResultView';

/** Quanto tempo a última rolagem fica na tela (no celular, ficar parada na tela atrapalhava). */
const VISIBLE_MS = 6000;

/**
 * Bandeja com a última rolagem. Some sozinha depois de alguns segundos (fica enquanto o mouse
 * ou o foco estiverem nela) e deixa só um botão pequeno para o histórico. `aria-live` anuncia
 * o resultado para leitores de tela.
 */
export function RollTray() {
  const history = useDiceStore((s) => s.history);
  const clear = useDiceStore((s) => s.clear);
  const animate = useDiceStore((s) => s.animate);
  const [open, setOpen] = useState(false);
  const [hiddenId, setHiddenId] = useState<string | null>(null);
  const [hold, setHold] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const last = history[0];
  const visible = last ? last.id !== hiddenId : false;

  // Cada rolagem nova aparece de novo e recomeça a contagem.
  useEffect(() => {
    if (!last || hold || last.id === hiddenId) return;
    timer.current = setTimeout(() => setHiddenId(last.id), VISIBLE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [last, hold, hiddenId]);

  return (
    <>
      <div aria-live="polite" className="fixed right-3 bottom-3 left-3 z-30 sm:left-auto sm:w-96">
        {visible && last ? (
          <div
            className="flex items-start gap-2 rounded-xl border border-border-strong bg-surface p-3 shadow-card"
            onMouseEnter={() => setHold(true)}
            onMouseLeave={() => setHold(false)}
            onFocus={() => setHold(true)}
            onBlur={() => setHold(false)}
            data-testid="roll.tray"
          >
            <div className="min-w-0 flex-1">
              <RollResultView key={last.id} entry={last} isLast compact animate={animate} />
            </div>
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setHiddenId(last.id)}
                aria-label={t.dice.hideResult}
                title={t.dice.hideResult}
              >
                <X className="size-4" />
              </Button>
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
          </div>
        ) : null}
      </div>
      {!visible && last ? (
        <Button
          variant="outline"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label={t.dice.showHistory}
          title={t.dice.showHistory}
          className="fixed right-3 bottom-3 z-30 rounded-full shadow-card"
          data-testid="roll.history-button"
        >
          <History className="size-4" />
        </Button>
      ) : null}
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
