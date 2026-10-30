import { deriveSheet, withModifier, type SheetDerived } from '@grimorio/rules';
import {
  MAX_CHARACTERS_PER_ACCOUNT,
  type CharacterDocument,
  type CharacterSummary,
} from '@grimorio/shared';
import type { CampaignSummary, CharacterCampaign } from '@grimorio/shared/campaign';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { D20Icon } from '@/components/ui/d20-icon';
import { Panel } from '@/components/ui/panel';
import { StrokeIcon } from '@/components/ui/stroke-icon';
import { useAuthStore } from '@/features/auth/store';
import { campaignApi } from '@/features/campaigns/api';
import { conditionName } from '@/features/campaigns/conditions';
import { getCharacter, listCharacters } from '@/features/characters/api';
import { DiceExpressionInput } from '@/features/dice/components/DiceExpressionInput';
import { useDiceStore, type RollEntry } from '@/features/dice/store';
import { InlineLoader, useTip } from '@/features/screens/LoadingScreen';
import { d20 } from '@/features/sheet/components/AdvantageBadge';
import { formatModifier } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { nowIso } from '@/ports/clock';

const d = t.dashboard;

/** Quantos personagens aparecem aqui (o resto fica em "Meus personagens"). */
const SHOWN_CHARACTERS = 6;

interface Latest {
  doc: CharacterDocument;
  derived: SheetDerived;
  campaign: CharacterCampaign | null;
}

type Load =
  | { kind: 'loading' }
  | { kind: 'failed' }
  | { kind: 'ready'; characters: CharacterSummary[]; campaigns: CampaignSummary[] };

/** "Hoje, 21:40" ou "em 26/10", no fuso do aparelho. */
function when(iso: string, today: (time: string) => string, other: (date: string) => string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date(nowIso());
  const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === now.toDateString()) return today(time.format(date));
  return other(new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date));
}

/** "Humana · Ladina · Nível 3": a espécie sai da origem do assistente ("Criminosa · Humana"). */
function summaryLine(origin: string | undefined, className: string, level: number): string {
  const species = origin?.includes(' · ') ? origin.split(' · ').pop() : origin;
  return [species, className, d.level(level)].filter(Boolean).join(' · ');
}

/** Tons dos selos dos personagens, um para cada (como no desenho da tela). */
const TONES = [
  'bg-bg text-accent shadow-[0_0_0_1.5px_var(--ornament)]',
  'bg-gold-soft text-gold shadow-[0_0_0_1.5px_var(--ornament)]',
  'bg-success-soft text-success shadow-[0_0_0_1.5px_var(--success)]',
  'bg-surface-2 text-muted shadow-[0_0_0_1.5px_var(--border)]',
];

function initialOf(name: string) {
  return name.trim()[0]?.toUpperCase() ?? '?';
}

// ---------- continuar de onde parou ----------

function HpTile({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  return (
    <div className="flex min-h-[72px] flex-col justify-center gap-1.5 rounded-[10px] border border-border-soft bg-field px-3 py-2 max-md:col-span-2">
      <span className="flex items-baseline justify-between gap-1.5">
        <span className="text-xs text-muted">{d.hp}</span>
        <span>
          <span className="font-display text-xl font-bold">{current}</span>
          <span className="text-sm text-muted"> / {max}</span>
        </span>
      </span>
      <span
        role="img"
        aria-label={d.hpLabel(current, max)}
        className="block h-2 overflow-hidden rounded bg-sunken"
      >
        <span
          className={cn(
            'block h-full',
            pct > 50 ? 'bg-success' : pct > 25 ? 'bg-ornament' : 'bg-danger',
          )}
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
}

function ContinuePanel({ latest }: { latest: Latest }) {
  const { doc, derived, campaign } = latest;
  const { sheet } = doc;
  const roll = useDiceStore((s) => s.roll);
  const name = sheet.identity.name || t.characters.unnamed;
  const portrait = sheet.identity.portraitData ?? sheet.identity.portraitUrl;
  const init = derived.initiative.value;
  const hitDice = derived.hitDice;
  const conditions = sheet.state.active.filter((key) => key.startsWith('cond:'));
  const inspired = sheet.state.inspiration > 0;

  return (
    <Panel
      title={d.continueTitle}
      actions={
        <span className="pr-1.5 text-sm text-muted">
          {when(doc.updatedAt, d.editedToday, d.editedOn)}
        </span>
      }
      className="flex min-w-0 flex-[2_1_720px] flex-col"
      bodyClassName="flex flex-1 flex-col gap-4 p-[18px]"
    >
      <div className="flex flex-wrap items-center gap-x-[18px] gap-y-3.5">
        {portrait ? (
          <img
            src={portrait}
            alt=""
            referrerPolicy="no-referrer"
            className="size-14 shrink-0 rounded-full object-cover shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--ornament)] md:size-[72px]"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-14 shrink-0 place-items-center rounded-full bg-bg font-display text-2xl font-bold text-accent shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--ornament)] md:size-[72px] md:text-[1.875rem]"
          >
            {initialOf(name)}
          </span>
        )}
        <div className="min-w-0 flex-[1_1_180px]">
          <p className="font-display text-[1.375rem] leading-[1.15] font-bold md:text-[1.625rem]">
            {name}
          </p>
          <p className="mt-1 text-muted">
            {summaryLine(sheet.identity.origin, sheet.identity.className, sheet.build.level)}
          </p>
          {campaign ? (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-rule bg-field px-2.5 py-0.5 text-sm font-bold text-gold">
              <StrokeIcon name="crossedSwords" strokeWidth={2} className="size-3.5" />
              {d.atTable(campaign.name)}
            </p>
          ) : null}
        </div>
        <Button asChild variant="primary" className="h-11 rounded-[10px] px-[18px] text-base">
          <Link to={`/personagem?id=${doc.id}`} data-testid="dashboard.open">
            {d.open}
            <StrokeIcon name="arrowRight" strokeWidth={2} className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-flow-row-dense grid-cols-2 gap-2.5 md:grid-cols-4">
        <div className="flex min-h-[72px] items-center gap-2.5 rounded-[10px] border border-border-soft bg-field px-3 py-2">
          <StrokeIcon name="shield" className="size-6 shrink-0 text-border-strong" />
          <span className="flex flex-col">
            <span className="font-display text-2xl leading-[1.05] font-bold">
              {derived.armorClass.value}
            </span>
            <span className="text-xs text-muted">{d.ac}</span>
          </span>
        </div>
        <HpTile current={sheet.state.hp.current} max={derived.hpMax.value} />
        <button
          type="button"
          className="group relative flex min-h-[72px] items-center gap-2.5 rounded-[10px] border border-border-soft bg-field px-3 py-2 text-left hover:bg-surface-2"
          aria-label={d.rollInitiative(formatModifier(init))}
          onClick={() =>
            roll({
              label: d.initiativeRoll(name),
              expression: withModifier(
                d20(derived.initiativeAdvantage, derived.initiativeDisadvantage),
                init,
              ),
            })
          }
        >
          <StrokeIcon name="zap" className="size-6 shrink-0 text-border-strong" />
          <span className="flex flex-col">
            <span className="font-display text-2xl leading-[1.05] font-bold">
              {formatModifier(init)}
            </span>
            <span className="text-xs text-muted">{d.initiative}</span>
          </span>
          <D20Icon className="absolute top-2 right-2 size-4 text-accent opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 pointer-coarse:opacity-100" />
        </button>
        <div
          className={cn(
            'flex min-h-[72px] items-center gap-2.5 rounded-[10px] px-3 py-2 max-md:col-span-2',
            inspired
              ? 'border-[1.5px] border-ornament bg-gold-soft'
              : 'border border-border-soft bg-field',
          )}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[22px] shrink-0">
            <path
              d="M12 2 14.2 9.8 22 12 14.2 14.2 12 22 9.8 14.2 2 12 9.8 9.8Z"
              strokeWidth="1"
              strokeLinejoin="round"
              className={inspired ? 'fill-ornament stroke-gold' : 'fill-none stroke-border-strong'}
            />
          </svg>
          <span className="flex flex-col">
            <span className="text-sm leading-tight font-bold">{d.inspiration}</span>
            <span className="text-xs text-muted">
              {inspired ? d.inspirationOn : d.inspirationOff}
            </span>
          </span>
        </div>
      </div>

      <div className="mt-auto flex items-center gap-2.5 rounded-[10px] bg-surface-2 px-3 py-2.5 text-sm">
        <StrokeIcon name="shieldCheck" className="size-[18px] shrink-0 text-border-strong" />
        <span className="min-w-0 flex-1">
          {[
            conditions.length ? conditions.map(conditionName).join(', ') : d.noConditions,
            d.hitDice(hitDice.remaining, hitDice.total),
          ].join(' · ')}
        </span>
      </div>
    </Panel>
  );
}

function NoCharacterPanel() {
  return (
    <Panel
      title={d.continueTitle}
      className="flex min-w-0 flex-[2_1_720px] flex-col"
      bodyClassName="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center"
    >
      <StrokeIcon name="feather" className="size-10 text-border-strong" />
      <p className="font-bold">{d.noCharacter}</p>
      <p className="text-muted">{d.noCharacterHint}</p>
      <Button asChild variant="primary" className="mt-1">
        <Link to="/criar">{d.create}</Link>
      </Button>
    </Panel>
  );
}

// ---------- rolagem rápida ----------

/** Dados da rolagem rápida, com o desenho de cada um. */
const QUICK = [
  ['d4', '1d4', 'M12 3 21.5 19.5H2.5zM12 3v16.5'],
  ['d6', '1d6', 'M4 7.5 12 3l8 4.5v9L12 21l-8-4.5zM4 7.5l8 4.5 8-4.5M12 12v9'],
  ['d8', '1d8', 'M12 2.5 21 12 12 21.5 3 12zM3 12h18M12 2.5 9 12l3 9.5M12 2.5l3 9.5-3 9.5'],
  ['d10', '1d10', 'M12 2.5 21 10l-9 11.5L3 10zM3 10l9 3.5 9-3.5M12 2.5v11'],
  [
    'd12',
    '1d12',
    'M12 2.5l7.2 3.5 2.3 7.6-4.5 6.4H7l-4.5-6.4L4.8 6zM12 7.5l4.3 3.2-1.6 5H9.3l-1.6-5zM12 2.5v5M19.2 6l-2.9 4.7M21.5 13.6l-6.8 2.1M17 20l-2.3-4.3M7 20l2.3-4.3M2.5 13.6l6.8 2.1M4.8 6l2.9 4.7',
  ],
  [
    'd20',
    '1d20',
    'M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5zM12 7l4.3 7.5H7.7zM12 2.5V7M3.8 7.25 7.7 14.5M20.2 7.25 16.3 14.5M7.7 14.5 12 21.5l4.3-7',
  ],
  ['d100', '1d100', 'M7 3.5l5.5 3.2v6.4L7 16.3l-5.5-3.2V6.7zM17 7.7l5.5 3.2v6.4L17 20.5l-5.5-3.2'],
  [d.advantage, '2d20kh1', 'M7.5 4l5 3v6l-5 3-5-3V7zM16.5 8l5 3v6l-5 3-5-3v-6z'],
] as const;

/** Soma dos dados que ficaram; o resto do total é o somador ("12 + 5"). */
function QuickResult({ entry }: { entry: RollEntry | undefined }) {
  if (!entry) {
    return <p className="m-auto py-2 text-center text-sm text-muted">{d.quickEmpty}</p>;
  }
  const { result } = entry;
  const kept = result.terms.flatMap((term) => term.dice.filter((die) => die.kept));
  const sum = kept.reduce((total, die) => total + die.value, 0);
  const rest = result.total - sum;
  // Só mostra o "+ N" quando a expressão é uma soma simples (sem ×, ÷ nem parênteses).
  const simple = /^[\dd+\-khl ]+$/i.test(result.expression);
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-sm text-muted">{entry.label}</p>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm font-bold">
          {result.terms.flatMap((term, ti) =>
            term.dice.map((die, di) => (
              <span
                key={`${ti}-${di}`}
                className={cn(
                  'tabular inline-flex h-[26px] min-w-7 items-center justify-center rounded-md px-1',
                  die.kept
                    ? 'border-[1.5px] border-ornament bg-gold-soft'
                    : 'border border-dashed border-border text-muted line-through',
                )}
              >
                {die.value}
              </span>
            )),
          )}
          {simple && rest !== 0 ? (
            <span className="text-muted">{`${rest > 0 ? '+' : '−'} ${Math.abs(rest)}`}</span>
          ) : null}
        </p>
      </div>
      <span
        className="tabular font-display text-[2.125rem] leading-none font-bold"
        data-testid="dashboard.roll.total"
      >
        {result.total}
      </span>
    </div>
  );
}

function QuickRollPanel() {
  const roll = useDiceStore((s) => s.roll);
  const last = useDiceStore((s) => s.history[0]);
  return (
    <Panel
      title={d.quickTitle}
      actions={
        <Link
          to="/dados"
          className="inline-flex min-h-8 items-center px-1.5 text-sm font-bold text-accent hover:text-accent-hover"
        >
          {d.openDice}
        </Link>
      }
      className="flex min-w-0 flex-[1_1_340px] flex-col"
      bodyClassName="flex flex-1 flex-col gap-3"
    >
      <div className="grid grid-cols-4 gap-2">
        {QUICK.map(([label, expression, shape]) => (
          <button
            key={label}
            type="button"
            aria-label={d.rollDie(label)}
            onClick={() => roll({ label, expression })}
            className="flex h-12 flex-col items-center justify-center gap-0.5 rounded-[10px] border border-border-soft bg-field hover:bg-surface-2"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
              aria-hidden="true"
              className="size-5 text-accent"
            >
              <path d={shape} />
            </svg>
            <span className="text-sm font-bold">{label}</span>
          </button>
        ))}
      </div>
      <DiceExpressionInput compact initial="1d20+5" />
      <div
        role="status"
        className="mt-auto flex min-h-[74px] flex-col justify-center rounded-[10px] border border-border-soft bg-field px-3.5 py-3"
      >
        <QuickResult entry={last} />
      </div>
    </Panel>
  );
}

// ---------- personagens e campanhas ----------

function CharactersPanel({ characters }: { characters: CharacterSummary[] }) {
  const shown = characters.slice(0, SHOWN_CHARACTERS);
  return (
    <Panel
      title={d.charactersTitle}
      actions={
        <span className="pr-1.5 text-sm text-muted">
          {d.count(characters.length, MAX_CHARACTERS_PER_ACCOUNT)}
        </span>
      }
      className="flex min-w-0 flex-[2_1_720px] flex-col"
      bodyClassName="flex flex-1 flex-col gap-3"
    >
      {shown.length ? (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {shown.map((c, i) => {
            const name = c.name || t.characters.unnamed;
            return (
              <li key={c.id}>
                <Link
                  to={`/personagem?id=${c.id}`}
                  aria-label={t.characters.open(name)}
                  className="flex h-full items-center gap-3.5 rounded-[10px] border border-border-soft bg-field px-3.5 py-3 text-text hover:border-ornament"
                  data-testid="dashboard.character"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'grid size-12 shrink-0 place-items-center rounded-full font-display text-xl font-bold',
                      TONES[i % TONES.length],
                    )}
                  >
                    {initialOf(name)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-display text-lg leading-tight font-bold">
                      {name}
                    </span>
                    <span className="truncate text-sm text-muted">
                      {summaryLine(c.card?.origin, c.classSummary, c.level)}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      {c.card ? (
                        <span className="font-bold text-text">
                          {d.status(c.card.ac, c.card.hp.current, c.card.hp.max)}
                        </span>
                      ) : null}
                      <span>{when(c.updatedAt, d.updatedToday, d.updatedOn)}</span>
                    </span>
                  </span>
                  <StrokeIcon
                    name="chevronRight"
                    strokeWidth={2}
                    className="size-[18px] shrink-0 text-border-strong"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
      {characters.length > SHOWN_CHARACTERS ? (
        <Link
          to="/personagens"
          className="self-start text-sm font-bold text-accent underline underline-offset-4"
        >
          {d.seeAllCharacters}
        </Link>
      ) : null}
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-[10px] border border-dashed border-ornament px-3.5 py-3">
        <StrokeIcon name="tray" className="size-[22px] shrink-0 text-border-strong" />
        <span className="min-w-0 flex-[1_1_260px]">
          <span className="block font-bold">{t.characters.localTitle}</span>
          <span className="block text-sm text-muted">{t.characters.localText}</span>
        </span>
        <Button asChild variant="outline">
          <Link to="/ficha">{t.characters.localOpen}</Link>
        </Button>
      </div>
    </Panel>
  );
}

function CampaignsPanel({
  campaigns,
  atTable,
}: {
  campaigns: CampaignSummary[];
  atTable: { campaignId: string; name: string } | null;
}) {
  return (
    <Panel
      title={d.campaignsTitle}
      actions={
        <Link
          to="/campanhas"
          className="inline-flex min-h-8 items-center px-1.5 text-sm font-bold text-accent hover:text-accent-hover"
        >
          {d.seeAll}
        </Link>
      }
      className="flex min-w-0 flex-[1_1_340px] flex-col"
      bodyClassName="flex flex-1 flex-col gap-2.5"
    >
      {campaigns.length ? (
        <ul className="flex flex-col gap-2">
          {campaigns.map((c) => {
            const dm = c.role !== 'player';
            return (
              <li key={c.id}>
                <Link
                  to={`/campanha?id=${c.id}`}
                  className="flex items-center gap-3 rounded-[10px] border border-border-soft bg-field px-3.5 py-3 text-text hover:border-ornament"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-[1.0625rem] font-bold">{c.name}</span>
                      <span
                        className={cn(
                          'rounded-full border px-2 text-xs font-bold',
                          dm
                            ? 'border-accent-border bg-accent text-accent-contrast'
                            : 'border-ornament bg-field text-gold',
                        )}
                      >
                        {dm ? d.roleDm : d.rolePlayer}
                      </span>
                    </span>
                    <span className="text-sm text-muted">{d.counts(c.members, c.characters)}</span>
                    {atTable?.campaignId === c.id ? (
                      <span className="text-sm font-bold text-success">
                        {d.hereAtTable(atTable.name)}
                      </span>
                    ) : null}
                  </span>
                  <StrokeIcon
                    name="chevronRight"
                    strokeWidth={2}
                    className="size-[18px] shrink-0 text-border-strong"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted">{d.noCampaigns}</p>
      )}
      <div className="mt-auto grid grid-cols-2 gap-2">
        <Button asChild variant="outline">
          <Link to="/campanhas">
            <StrokeIcon name="plus" strokeWidth={2.4} className="size-3.5" />
            {d.createCampaign}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/campanhas">
            <StrokeIcon name="link" strokeWidth={1.9} className="size-4" />
            {d.useInvite}
          </Link>
        </Button>
      </div>
    </Panel>
  );
}

function TipAside() {
  const tip = useTip();
  return (
    <aside
      aria-label={t.screens.tipLabel}
      className="flex flex-wrap items-center gap-3 rounded-xl border border-rule bg-surface px-[18px] py-3"
    >
      <span className="label-caps inline-flex items-center gap-2 text-xs tracking-[0.16em]">
        <StrokeIcon name="bulb" className="size-[18px] text-border-strong" />
        {t.screens.tipLabel}
      </span>
      <p className="min-w-0 flex-[1_1_300px] leading-normal text-pretty">{tip}</p>
    </aside>
  );
}

/**
 * Tela inicial de quem entrou (docs/design.md): continuar a última ficha, rolar dados, os
 * personagens e as campanhas. Carregada sob demanda: o visitante não baixa nada disto.
 */
export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [latest, setLatest] = useState<Latest | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [characters, campaigns] = await Promise.all([listCharacters(), campaignApi.list()]);
      if (cancelled) return;
      if (!characters.ok) {
        setLoad({ kind: 'failed' });
        return;
      }
      setLoad({
        kind: 'ready',
        characters: characters.data,
        campaigns: campaigns.ok ? campaigns.data.campaigns : [],
      });
      // A última ficha editada: abre inteira para mostrar CA, PV, iniciativa e a mesa.
      const first = characters.data[0];
      if (!first) return;
      const doc = await getCharacter(first.id);
      if (cancelled || !doc.ok) return;
      const table = await campaignApi.updates(first.id, doc.data.version);
      if (cancelled) return;
      setLatest({
        doc: doc.data,
        derived: deriveSheet(doc.data.sheet),
        campaign: table.ok ? table.data.campaign : null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const hour = new Date(nowIso()).getHours();
  const firstName = user?.displayName.trim().split(/\s+/)[0] ?? '';

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-4 pt-4 pb-8 md:gap-5 md:px-6 md:pt-6 md:pb-12">
      <section
        aria-labelledby="dashboard-title"
        className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3.5"
      >
        <div className="min-w-0">
          <h1
            id="dashboard-title"
            className="font-display text-[1.625rem] leading-[1.15] font-bold md:text-[2rem]"
          >
            {d.greeting(hour, firstName)}
          </h1>
          <p className="mt-1.5 flex items-center gap-2 text-muted">
            <StrokeIcon name="cloudCheck" className="size-[18px] text-success" />
            {d.saved}
          </p>
        </div>
        <Button
          asChild
          variant="primary"
          className="h-11 rounded-[10px] px-[18px] text-base max-md:flex-1"
        >
          <Link to="/criar" data-testid="dashboard.create">
            <StrokeIcon name="plus" strokeWidth={2.2} className="size-[18px]" />
            {d.create}
          </Link>
        </Button>
      </section>

      {load.kind === 'loading' ? (
        <InlineLoader label={d.opening} />
      ) : load.kind === 'failed' ? (
        <div className="rounded-xl border border-border bg-surface px-4 py-10 text-center">
          <p className="text-muted">{d.failed}</p>
          <Button
            className="mt-3"
            onClick={() => {
              setLoad({ kind: 'loading' });
              setAttempt((n) => n + 1);
            }}
          >
            {d.retry}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-stretch gap-4 md:gap-5">
            {latest ? (
              <ContinuePanel latest={latest} />
            ) : load.characters.length ? (
              <Panel
                title={d.continueTitle}
                className="flex min-w-0 flex-[2_1_720px] flex-col"
                bodyClassName="flex flex-1 items-center justify-center"
              >
                <InlineLoader label={d.opening} className="py-6" />
              </Panel>
            ) : (
              <NoCharacterPanel />
            )}
            <QuickRollPanel />
          </div>
          <div className="flex flex-wrap items-stretch gap-4 md:gap-5">
            <CharactersPanel characters={load.characters} />
            <CampaignsPanel
              campaigns={load.campaigns}
              atTable={
                latest?.campaign
                  ? {
                      campaignId: latest.campaign.id,
                      name: latest.doc.sheet.identity.name || t.characters.unnamed,
                    }
                  : null
              }
            />
          </div>
          <TipAside />
        </>
      )}
    </div>
  );
}
