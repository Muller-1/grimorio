import { CONDITION_PREFIX, CONDITIONS, EXHAUSTION_ID } from '@grimorio/rules';
import type { CharacterSummary } from '@grimorio/shared';
import type { CampaignDetail, GameAction, PartyMember } from '@grimorio/shared/campaign';
import {
  ArrowLeft,
  Copy,
  Crown,
  HeartPulse,
  RefreshCw,
  Shield,
  ShieldPlus,
  Swords,
  UserRound,
} from 'lucide-react';
import { useCallback, useEffect, useId, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label, Select } from '@/components/ui/input';
import { Popover } from '@/components/ui/popover';
import { ServerStatus } from '@/features/auth/ServerStatus';
import { useAuthStore } from '@/features/auth/store';
import { listCharacters } from '@/features/characters/api';
import { useToastStore } from '@/features/toast/store';
import { formatDateTime } from '@/lib/format';
import { tcp } from '@/lib/i18n/campaign';
import { cn } from '@/lib/utils';
import { campaignApi, inviteLink } from './api';
import { campaignError } from './CampaignsPage';

/** A mesa se atualiza sozinha enquanto a página está aberta. */
const POLL_MS = 10_000;

const CONDITION_LIST = CONDITIONS.filter((c) => c.id !== EXHAUSTION_ID);
const EXHAUSTION_NAME = CONDITIONS.find((c) => c.id === EXHAUSTION_ID)?.name ?? EXHAUSTION_ID;

function conditionName(key: string): string {
  const exhaustion = `${CONDITION_PREFIX}${EXHAUSTION_ID}:`;
  if (key.startsWith(exhaustion)) return `${EXHAUSTION_NAME} ${key.slice(exhaustion.length)}`;
  return CONDITIONS.find((c) => `${CONDITION_PREFIX}${c.id}` === key)?.name ?? key;
}

function exhaustionOf(conditions: string[]): number {
  const prefix = `${CONDITION_PREFIX}${EXHAUSTION_ID}:`;
  const key = conditions.find((k) => k.startsWith(prefix));
  return key ? Number(key.slice(prefix.length)) || 0 : 0;
}

function HpBar({ hp }: { hp: PartyMember['summary']['hp'] }) {
  const pct = hp.max > 0 ? Math.max(0, Math.min(100, (hp.current / hp.max) * 100)) : 0;
  return (
    <div>
      <p className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">
          {tcp.hp} {hp.current}/{hp.max}
        </span>
        {hp.temp ? <span className="text-xs text-accent">{tcp.temp(hp.temp)}</span> : null}
      </p>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
        <div
          className={cn(
            'h-full rounded-full',
            pct > 50 ? 'bg-success' : pct > 20 ? 'bg-gold' : 'bg-danger',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Mestre: dano, cura, PV temporários e condições, sem mexer no resto da ficha. */
function DmControls({ member, onDone }: { member: PartyMember; onDone: () => void }) {
  const toast = useToastStore((s) => s.push);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const amountId = useId();
  const { name, conditions } = member.summary;

  const send = async (action: GameAction) => {
    setBusy(true);
    const result = await campaignApi.act(member.characterId, action);
    setBusy(false);
    if (!result.ok) return toast(campaignError(result, 'other'), 'danger');
    toast(tcp.applied(name), 'success');
    onDone();
  };
  const withAmount = (type: 'damage' | 'heal' | 'set-temp-hp') => {
    const value = Math.floor(Number(amount));
    if (!Number.isFinite(value) || value < (type === 'set-temp-hp' ? 0 : 1)) {
      return toast(tcp.needAmount, 'danger');
    }
    setAmount('');
    void send({ type, amount: Math.min(9999, value) });
  };

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <div className="grid grid-cols-[4.5rem_repeat(3,minmax(0,1fr))] items-end gap-1.5">
        <div>
          <Label htmlFor={amountId} className="text-xs">
            {tcp.amount}
          </Label>
          <Input
            id={amountId}
            type="number"
            inputMode="numeric"
            min={0}
            max={9999}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label={tcp.amountFor(name)}
            data-testid={`party.${member.characterId}.amount`}
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="w-full border-danger/50 px-1.5 text-danger"
          disabled={busy}
          onClick={() => withAmount('damage')}
          data-testid={`party.${member.characterId}.damage`}
        >
          {tcp.damage}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="w-full border-success/50 px-1.5 text-success"
          disabled={busy}
          onClick={() => withAmount('heal')}
          data-testid={`party.${member.characterId}.heal`}
        >
          {tcp.heal}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="w-full px-1.5"
          disabled={busy}
          onClick={() => withAmount('set-temp-hp')}
        >
          {tcp.tempHp}
        </Button>
      </div>
      <Popover
        align="start"
        trigger={
          <Button size="sm" variant="ghost" aria-label={tcp.conditionsFor(name)}>
            <ShieldPlus className="size-4" aria-hidden="true" />
            {tcp.conditions}
          </Button>
        }
      >
        <p className="mb-2 font-semibold">{tcp.conditionsFor(name)}</p>
        <div className="flex flex-wrap gap-1.5">
          {CONDITION_LIST.map((c) => {
            const key = `${CONDITION_PREFIX}${c.id}`;
            const on = conditions.includes(key);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                disabled={busy}
                title={c.text}
                onClick={() => void send({ type: 'set-condition', key, on: !on })}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
                  on
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-border text-muted hover:text-text',
                )}
              >
                {c.name}
              </button>
            );
          })}
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs">
          {EXHAUSTION_NAME}
          <Select
            value={String(exhaustionOf(conditions))}
            disabled={busy}
            onChange={(e) => void send({ type: 'set-exhaustion', level: Number(e.target.value) })}
            className="h-8 w-auto text-xs"
          >
            {[0, 1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </label>
      </Popover>
    </div>
  );
}

/** Outro jogador: a cura vai como proposta; a dona da ficha decide. */
function ProposeHeal({ member }: { member: PartyMember }) {
  const toast = useToastStore((s) => s.push);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const amountId = useId();
  const { name } = member.summary;
  const send = async () => {
    const value = Math.floor(Number(amount));
    if (!Number.isFinite(value) || value < 1) return toast(tcp.needAmount, 'danger');
    setBusy(true);
    const result = await campaignApi.propose(member.characterId, Math.min(999, value));
    setBusy(false);
    if (!result.ok) {
      return toast(
        result.error?.code === 'LIMIT_EXCEEDED'
          ? tcp.proposalLimit
          : campaignError(result, 'other'),
        'danger',
      );
    }
    setAmount('');
    toast(tcp.proposed(name), 'success');
  };
  return (
    <div className="flex items-end gap-1.5 border-t border-border pt-3">
      <div className="w-20">
        <Label htmlFor={amountId} className="text-xs">
          {tcp.amount}
        </Label>
        <Input
          id={amountId}
          type="number"
          inputMode="numeric"
          min={1}
          max={999}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label={tcp.amountFor(name)}
          data-testid={`party.${member.characterId}.propose-amount`}
        />
      </div>
      <Button
        size="sm"
        variant="outline"
        className="border-success/50 text-success"
        disabled={busy}
        onClick={() => void send()}
        aria-label={tcp.proposeFor(name)}
        data-testid={`party.${member.characterId}.propose`}
      >
        <HeartPulse className="size-4" aria-hidden="true" />
        {tcp.proposeHeal}
      </Button>
    </div>
  );
}

function PartyCard({
  member,
  role,
  campaignId,
  onChanged,
}: {
  member: PartyMember;
  role: CampaignDetail['role'];
  campaignId: string;
  onChanged: () => void;
}) {
  const toast = useToastStore((s) => s.push);
  const { summary } = member;
  const remove = async () => {
    const result = await campaignApi.removeCharacter(campaignId, member.characterId);
    if (!result.ok) return toast(campaignError(result, 'other'), 'danger');
    toast(tcp.removed, 'success');
    onChanged();
  };
  return (
    <li
      className="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-card"
      data-testid={`party.${member.characterId}`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold">{summary.name || '—'}</p>
          <p className="truncate text-sm text-muted">
            {[summary.className, tcp.level(summary.level), tcp.playedBy(member.player)]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <span
          className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-sm font-bold"
          title={tcp.ac}
        >
          <Shield className="size-4 text-muted" aria-hidden="true" />
          <span className="sr-only">{tcp.ac}</span>
          {summary.ac}
        </span>
      </div>
      <HpBar hp={summary.hp} />
      <ul className="flex flex-wrap gap-1" aria-label={tcp.conditions}>
        {summary.conditions.length ? (
          summary.conditions.map((key) => (
            <li
              key={key}
              className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent"
            >
              {conditionName(key)}
            </li>
          ))
        ) : (
          <li className="text-xs text-muted">{tcp.noConditions}</li>
        )}
      </ul>

      {role === 'dm' ? <DmControls member={member} onDone={onChanged} /> : null}
      {role !== 'dm' && !member.mine ? <ProposeHeal member={member} /> : null}

      {member.mine || role === 'dm' ? (
        <div className="flex flex-wrap justify-end gap-1.5">
          {member.mine ? (
            <Button asChild size="sm" variant="outline">
              <Link to={`/personagem?id=${member.characterId}`}>{tcp.openMine}</Link>
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" className="text-danger" onClick={() => void remove()}>
            {tcp.removeFromTable}
          </Button>
        </div>
      ) : null}
    </li>
  );
}

function InviteBox({ campaign, onRenewed }: { campaign: CampaignDetail; onRenewed: () => void }) {
  const toast = useToastStore((s) => s.push);
  if (!campaign.invite) return null;
  const link = inviteLink(campaign.invite.code);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast(tcp.copied, 'success');
    } catch {
      toast(tcp.errors.generic!, 'danger');
    }
  };
  const renew = async () => {
    const result = await campaignApi.renewInvite(campaign.id);
    if (!result.ok) return toast(campaignError(result, 'other'), 'danger');
    toast(tcp.newCodeDone, 'success');
    onRenewed();
  };
  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="font-display font-bold">{tcp.inviteTitle}</h2>
      <p className="mt-1 text-sm text-muted">{tcp.inviteText}</p>
      <p
        className="mt-2 rounded-md bg-surface-2 px-3 py-2 font-mono text-xs break-all"
        data-testid="campaign.invite"
      >
        {link}
      </p>
      <p className="mt-1 text-xs text-muted">
        {tcp.inviteExpires(formatDateTime(campaign.invite.expiresAt))}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button size="sm" onClick={() => void copy()}>
          <Copy className="size-4" aria-hidden="true" />
          {tcp.copy}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void renew()}>
          <RefreshCw className="size-4" aria-hidden="true" />
          {tcp.newCode}
        </Button>
      </div>
    </section>
  );
}

function AddSheet({
  campaignId,
  party,
  onAdded,
}: {
  campaignId: string;
  party: PartyMember[];
  onAdded: () => void;
}) {
  const toast = useToastStore((s) => s.push);
  const [mine, setMine] = useState<CharacterSummary[] | null>(null);
  const [choice, setChoice] = useState('');
  const selectId = useId();
  useEffect(() => {
    void listCharacters().then((r) => setMine(r.ok ? r.data : []));
  }, []);
  const atTable = new Set(party.map((p) => p.characterId));
  const options = (mine ?? []).filter((c) => !atTable.has(c.id));
  const selected = options.find((c) => c.id === choice) ?? options[0];
  const add = async () => {
    if (!selected) return;
    const result = await campaignApi.addCharacter(campaignId, selected.id);
    if (!result.ok) {
      return toast(
        result.error?.code === 'CONFLICT_ID'
          ? tcp.errors.otherCampaign!
          : campaignError(result, 'other'),
        'danger',
      );
    }
    toast(tcp.added, 'success');
    onAdded();
  };
  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="font-display font-bold">{tcp.addTitle}</h2>
      <p className="mt-1 text-sm text-muted">{tcp.addText}</p>
      {mine === null ? null : options.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{tcp.addNone}</p>
      ) : (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1">
            <Label htmlFor={selectId} className="text-xs">
              {tcp.addChoose}
            </Label>
            <Select
              id={selectId}
              value={selected?.id ?? ''}
              onChange={(e) => setChoice(e.target.value)}
              data-testid="campaign.add-choice"
            >
              {options.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || '—'} · {c.classSummary} {c.level}
                </option>
              ))}
            </Select>
          </div>
          <Button onClick={() => void add()} data-testid="campaign.add">
            {tcp.add}
          </Button>
        </div>
      )}
    </section>
  );
}

/** /campanha?id=…: a mesa (membros, convite, resumo das fichas, ações da mestre). */
export default function CampaignPage() {
  const [params] = useSearchParams();
  const id = params.get('id') ?? '';
  const status = useAuthStore((s) => s.status);
  const toast = useToastStore((s) => s.push);
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<CampaignDetail | null | 'missing'>(null);
  const [party, setParty] = useState<PartyMember[]>([]);
  const [confirm, setConfirm] = useState(false);

  const loadParty = useCallback(async () => {
    const result = await campaignApi.party(id);
    if (result.ok) setParty(result.data.party);
  }, [id]);
  const loadCampaign = useCallback(async () => {
    const result = await campaignApi.detail(id);
    setCampaign(result.ok ? result.data : 'missing');
  }, [id]);

  useEffect(() => {
    if (status !== 'signed-in' || !id) return;
    let stopped = false;
    void campaignApi.detail(id).then((result) => {
      if (!stopped) setCampaign(result.ok ? result.data : 'missing');
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const loop = async () => {
      if (document.visibilityState !== 'hidden') await loadParty();
      if (!stopped) timer = setTimeout(() => void loop(), POLL_MS);
    };
    void loop();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [status, id, loadParty]);

  useEffect(() => {
    if (campaign && campaign !== 'missing') document.title = tcp.meta.one(campaign.name);
  }, [campaign]);

  if (status !== 'signed-in') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-muted">{status === 'signed-out' ? tcp.signedOut : tcp.loading}</p>
        <ServerStatus className="mx-auto mt-4 max-w-md text-left" />
      </div>
    );
  }
  if (campaign === null) return <p className="p-8 text-center text-muted">{tcp.loading}</p>;
  if (campaign === 'missing') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-xl font-bold">{tcp.notFound}</h1>
        <Button asChild className="mt-4">
          <Link to="/campanhas">{tcp.backToList}</Link>
        </Button>
      </div>
    );
  }

  const dm = campaign.role === 'dm';
  const finish = async () => {
    setConfirm(false);
    const result = dm ? await campaignApi.end(campaign.id) : await campaignApi.leave(campaign.id);
    if (!result.ok) return toast(campaignError(result, 'other'), 'danger');
    toast(dm ? tcp.ended : tcp.left, 'success');
    void navigate('/campanhas');
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-5 px-4 py-6">
      <header className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="icon-sm" aria-label={tcp.backToList}>
          <Link to="/campanhas">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
            <Swords className="size-5 text-accent" aria-hidden="true" />
            <span className="truncate">{campaign.name}</span>
          </h1>
          <p className="text-sm text-muted">{dm ? tcp.roleDm : tcp.rolePlayer}</p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <section aria-labelledby="party-title" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="party-title" className="font-display text-lg font-bold">
              {tcp.partyTitle}
            </h2>
            <p className="text-xs text-muted">{tcp.partyUpdated}</p>
          </div>
          {party.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface px-4 py-6 text-center text-muted">
              {tcp.partyEmpty}
            </p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2" data-testid="party.list">
              {party.map((m) => (
                <PartyCard
                  key={m.characterId}
                  member={m}
                  role={campaign.role}
                  campaignId={campaign.id}
                  onChanged={() => void loadParty()}
                />
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-4">
          <InviteBox campaign={campaign} onRenewed={() => void loadCampaign()} />
          <AddSheet campaignId={campaign.id} party={party} onAdded={() => void loadParty()} />
          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="font-display font-bold">{tcp.members}</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {campaign.members.map((m, i) => (
                <li key={`${m.name}-${i}`} className="flex items-center gap-2">
                  {m.role === 'dm' ? (
                    <Crown className="size-4 text-gold" aria-label={tcp.roleDm} />
                  ) : (
                    <UserRound className="size-4 text-muted" aria-label={tcp.rolePlayer} />
                  )}
                  <span className="truncate">
                    {m.name}
                    {m.me ? ` (${tcp.you})` : ''}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">{tcp.privacyNote}</p>
          </section>
          <Button
            variant="ghost"
            className="w-full text-danger"
            onClick={() => setConfirm(true)}
            data-testid={dm ? 'campaign.end' : 'campaign.leave'}
          >
            {dm ? tcp.end : tcp.leave}
          </Button>
        </aside>
      </div>

      <Dialog
        open={confirm}
        onOpenChange={setConfirm}
        title={dm ? tcp.end : tcp.leave}
        description={dm ? tcp.endConfirm : tcp.leaveConfirm}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              {tcp.cancel}
            </Button>
            <Button variant="danger" onClick={() => void finish()}>
              {tcp.confirm}
            </Button>
          </>
        }
      />
    </div>
  );
}
