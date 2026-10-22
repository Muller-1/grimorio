import type { Proposal } from '@grimorio/shared/campaign';
import { Check, HeartPulse, Swords, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { currentSync, setConflictRecovery } from '@/features/characters/sync';
import { useToastStore } from '@/features/toast/store';
import { tcp } from '@/lib/i18n/campaign';
import { campaignApi } from './api';
import { pullUpdates, type TableState } from './table-sync';

/** Com a aba visível, a ficha pergunta à mesa a cada 10 s; escondida, a cada 30 s. */
const POLL_MS = 10_000;
const HIDDEN_POLL_MS = 30_000;

/**
 * Faixa da mesa na ficha da conta: em que campanha a ficha está e as curas que outros jogadores
 * propuseram. Enquanto a ficha estiver numa campanha, acompanha o que a mestre muda.
 */
export function TableBar({ id }: { id: string }) {
  const toast = useToastStore((s) => s.push);
  const [table, setTable] = useState<TableState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const inCampaign = useRef(false);

  const pull = useCallback(async () => {
    const next = await pullUpdates(id);
    if (!next) return;
    inCampaign.current = next.campaign !== null;
    setTable(next);
    const who = [...new Set(next.arrived.map((e) => e.actor.name))].join(', ');
    if (who) toast(tcp.remoteChange(who), 'info');
  }, [id, toast]);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const loop = async () => {
      await pull();
      if (stopped || !inCampaign.current) return;
      timer = setTimeout(
        () => void loop(),
        document.visibilityState === 'hidden' ? HIDDEN_POLL_MS : POLL_MS,
      );
    };
    void loop();
    // Conflito ao salvar: junta as ações da mesa e tenta de novo (só se trouxe algo novo).
    setConflictRecovery(async () => {
      const before = currentSync()?.snapshot.version;
      await pull();
      const after = currentSync()?.snapshot.version;
      return before !== undefined && after !== undefined && after > before;
    });
    return () => {
      stopped = true;
      clearTimeout(timer);
      setConflictRecovery(null);
    };
  }, [pull]);

  if (!table?.campaign) return null;

  const decide = async (proposal: Proposal, accept: boolean) => {
    setBusy(proposal.id);
    const result = await campaignApi.decide(id, proposal.id, accept);
    setBusy(null);
    if (!result.ok) {
      toast(tcp.errors.generic!, 'danger');
    } else {
      toast(accept ? tcp.acceptedToast(proposal.amount) : tcp.rejectedToast, 'success');
    }
    await pull();
  };

  return (
    <section
      aria-label={tcp.atTable(table.campaign.name)}
      className="mb-3 space-y-2 rounded-lg border border-border bg-surface p-3 text-sm"
      data-testid="table.bar"
    >
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-1.5 font-semibold">
          <Swords className="size-4 text-accent" aria-hidden="true" />
          {tcp.atTable(table.campaign.name)}
        </span>
        <Link
          to={`/campanha?id=${table.campaign.id}`}
          className="text-accent underline-offset-2 hover:underline"
        >
          {tcp.seeTable}
        </Link>
      </p>
      {table.proposals.length ? (
        <ul className="divide-y divide-border rounded-md border border-border">
          {table.proposals.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-2 px-3 py-2"
              data-testid={`proposal.${p.id}`}
            >
              <HeartPulse className="size-4 shrink-0 text-success" aria-hidden="true" />
              <span className="min-w-0 flex-1">{tcp.proposalText(p.proposer, p.amount)}</span>
              <Button
                size="sm"
                variant="primary"
                disabled={busy === p.id}
                onClick={() => void decide(p, true)}
                data-testid={`proposal.${p.id}.accept`}
              >
                <Check className="size-3.5" aria-hidden="true" />
                {tcp.accept}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy === p.id}
                onClick={() => void decide(p, false)}
                data-testid={`proposal.${p.id}.reject`}
              >
                <X className="size-3.5" aria-hidden="true" />
                {tcp.reject}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
