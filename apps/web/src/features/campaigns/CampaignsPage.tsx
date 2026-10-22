import type { CampaignSummary } from '@grimorio/shared/campaign';
import { LogIn, Plus, Swords, Ticket } from 'lucide-react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { ServerStatus } from '@/features/auth/ServerStatus';
import { useAuthStore } from '@/features/auth/store';
import type { ApiResult } from '@/lib/api';
import { t } from '@/lib/i18n';
import { tcp } from '@/lib/i18n/campaign';
import { campaignApi, inviteCodeFrom } from './api';

/** Mensagem do erro da API, na língua do site. */
export function campaignError(
  result: ApiResult<unknown>,
  where: 'create' | 'join' | 'other',
): string {
  if (result.ok) return '';
  const e = tcp.errors;
  if (result.status === 429) return e.rateLimited!;
  if (result.error?.code === 'LIMIT_EXCEEDED') return where === 'join' ? e.full! : e.limit!;
  if (result.status === 404 && where === 'join') return e.badInvite!;
  return e.generic!;
}

function CampaignCard({ campaign }: { campaign: CampaignSummary }) {
  return (
    <li>
      <Link
        to={`/campanha?id=${campaign.id}`}
        className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-card transition-colors hover:border-border-strong"
        data-testid="campaigns.item"
      >
        <Swords className="size-5 shrink-0 text-accent" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-lg font-bold">{campaign.name}</span>
          <span className="block text-sm text-muted">
            {campaign.role === 'dm' ? tcp.roleDm : tcp.rolePlayer} ·{' '}
            {tcp.counts(campaign.members, campaign.characters)}
          </span>
        </span>
      </Link>
    </li>
  );
}

/** /campanhas: as campanhas da pessoa, criar uma e entrar por convite (?convite=CÓDIGO). */
export default function CampaignsPage() {
  const status = useAuthStore((s) => s.status);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const invite = params.get('convite') ?? '';
  const [campaigns, setCampaigns] = useState<CampaignSummary[] | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState(invite);
  const [error, setError] = useState<{ where: 'create' | 'join'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const nameId = useId();
  const codeId = useId();

  useEffect(() => {
    document.title = tcp.meta.list;
  }, []);

  useEffect(() => {
    if (status !== 'signed-in') return;
    let cancelled = false;
    void campaignApi.list().then((result) => {
      if (!cancelled) setCampaigns(result.ok ? result.data.campaigns : []);
    });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const result = await campaignApi.create(name.trim());
    setBusy(false);
    if (!result.ok) return setError({ where: 'create', text: campaignError(result, 'create') });
    void navigate(`/campanha?id=${result.data.id}`);
  };

  const join = async (event?: FormEvent) => {
    event?.preventDefault();
    const parsed = inviteCodeFrom(code);
    if (!parsed) return;
    setBusy(true);
    const result = await campaignApi.join(parsed);
    setBusy(false);
    if (!result.ok) return setError({ where: 'join', text: campaignError(result, 'join') });
    void navigate(`/campanha?id=${result.data.campaignId}`);
  };

  const header = (
    <header>
      <h1 className="font-display text-2xl font-bold">{tcp.listTitle}</h1>
      <p className="mt-1 max-w-2xl text-muted">{tcp.listLead}</p>
    </header>
  );

  if (status !== 'signed-in') {
    const back = `/campanhas${invite ? `?convite=${encodeURIComponent(invite)}` : ''}`;
    return (
      <div className="mx-auto max-w-4xl space-y-5 px-4 py-8">
        {header}
        <div className="rounded-xl border border-border bg-surface p-5">
          {status === 'signed-out' ? (
            <>
              {invite ? <p className="mb-2 font-semibold">{tcp.inviteFromLink}</p> : null}
              <p className="text-sm text-muted">{tcp.signedOut}</p>
              <Button asChild size="sm" className="mt-3">
                <Link to={`/entrar?voltar=${encodeURIComponent(back)}`}>
                  <LogIn className="size-4" aria-hidden="true" />
                  {t.auth.signIn}
                </Link>
              </Button>
            </>
          ) : status === 'disabled' ? (
            <p className="text-sm text-muted">{tcp.disabled}</p>
          ) : (
            <ServerStatus />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      {header}

      {invite ? (
        <section className="rounded-xl border border-accent/50 bg-accent-soft p-4">
          <p className="font-semibold">{tcp.inviteFromLink}</p>
          <Button
            className="mt-3"
            variant="primary"
            disabled={busy}
            onClick={() => void join()}
            data-testid="campaigns.accept-invite"
          >
            <Ticket className="size-4" aria-hidden="true" />
            {busy ? tcp.joining : tcp.inviteAccept}
          </Button>
          {error?.where === 'join' ? (
            <p role="alert" className="mt-2 text-sm text-danger">
              {error.text}
            </p>
          ) : null}
        </section>
      ) : null}

      {campaigns === null ? (
        <p className="text-muted">{tcp.loading}</p>
      ) : campaigns.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-6 text-center text-muted">
          {tcp.empty}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2" data-testid="campaigns.list">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </ul>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <form
          onSubmit={(e) => void create(e)}
          className="rounded-xl border border-border bg-surface p-4"
        >
          <h2 className="font-display font-bold">{tcp.createTitle}</h2>
          <Label htmlFor={nameId} className="mt-3 block">
            {tcp.createName}
          </Label>
          <div className="mt-1 flex gap-2">
            <Input
              id={nameId}
              value={name}
              maxLength={80}
              placeholder={tcp.createPlaceholder}
              onChange={(e) => setName(e.target.value)}
              data-testid="campaigns.name"
            />
            <Button type="submit" disabled={busy || !name.trim()} data-testid="campaigns.create">
              <Plus className="size-4" aria-hidden="true" />
              {tcp.create}
            </Button>
          </div>
          {error?.where === 'create' ? (
            <p role="alert" className="mt-2 text-sm text-danger">
              {error.text}
            </p>
          ) : null}
        </form>

        {invite ? null : (
          <form
            onSubmit={(e) => void join(e)}
            className="rounded-xl border border-border bg-surface p-4"
          >
            <h2 className="font-display font-bold">{tcp.joinTitle}</h2>
            <Label htmlFor={codeId} className="mt-3 block">
              {tcp.joinCode}
            </Label>
            <div className="mt-1 flex gap-2">
              <Input
                id={codeId}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                data-testid="campaigns.code"
              />
              <Button type="submit" disabled={busy || !code.trim()} data-testid="campaigns.join">
                {busy ? tcp.joining : tcp.join}
              </Button>
            </div>
            {error?.where === 'join' ? (
              <p role="alert" className="mt-2 text-sm text-danger">
                {error.text}
              </p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}
