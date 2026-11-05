/**
 * O que cada jogador virtual faz, imitando o site de verdade:
 *
 * - **solo**: abre o painel e uma ficha; de tempos em tempos edita algo (PV, notas, moedas) e o
 *   site salva a seção; às vezes volta à lista e abre outra ficha; raramente cria uma nova.
 * - **jogador** (numa mesa): a ficha aberta pergunta à mesa a cada 10 s (`/updates`, como a
 *   faixa da mesa do site); usa o canal de ações (dano, cura, condição) na própria ficha; propõe
 *   cura para a ficha de outro jogador; aceita as curas que recebe.
 * - **mestre**: a tela da campanha pergunta o resumo da mesa a cada 10 s (`/party`) e aplica
 *   dano, cura e condições nas fichas dos jogadores.
 * - **visitante**: sem conta; abre páginas e o site pergunta se há sessão.
 *
 * O tempo "pensando" entre ações é sorteado (com semente) e multiplicado por --pensar. As
 * consultas de 10 s não mudam com --pensar: são um relógio do site, não da pessoa.
 */
import { randomUUID } from 'node:crypto';
import type { CharacterDocument, SheetSection } from '@grimorio/shared';
import type { GameAction, UpdatesResponse } from '@grimorio/shared/campaign';
import { sleep, type Client, type RequestInput, type UserKind } from './http';
import type { Rng } from './rng';
import type { CharacterState, VirtualUser } from './setup';

/** Mesmo intervalo do site (TableBar e CampaignPage). */
export const POLL_MS = 10_000;

export interface UserContext {
  client: Client;
  rng: Rng;
  signal: AbortSignal;
  think: number;
}

type Call = Omit<RequestInput, 'kind' | 'cookie' | 'ip'>;

function caller(user: VirtualUser, ctx: UserContext, kind: UserKind) {
  return <T>(input: Call) =>
    ctx.client.request<T>({ ...input, kind, cookie: user.cookie, ip: user.ip });
}

function pause(ctx: UserContext, minMs: number, maxMs: number) {
  return sleep(ctx.rng.int(minMs, maxMs) * ctx.think, ctx.signal);
}

function apply(state: CharacterState, doc: CharacterDocument | undefined | null) {
  if (!doc) return;
  state.version = doc.version;
  state.revs = doc.sectionRevs;
  state.sheet = doc.sheet;
}

async function openCharacter<T extends ReturnType<typeof caller>>(call: T, state: CharacterState) {
  const res = await call<CharacterDocument>({
    method: 'GET',
    path: `/api/v1/characters/${state.id}`,
    label: 'GET /api/v1/characters/:id',
  });
  if (res.status === 200) apply(state, res.data);
}

/** Muda uma seção e salva como o site salva (só a seção, com a revisão em que se baseou). */
async function saveSection(
  call: ReturnType<typeof caller>,
  ctx: UserContext,
  state: CharacterState,
  sections: readonly SheetSection[],
) {
  const section = ctx.rng.pick(sections);
  const sheet = state.sheet;
  if (section === 'state') {
    sheet.state.hp.current = Math.max(1, sheet.state.hp.current + ctx.rng.int(-5, 5));
  } else if (section === 'identity') {
    sheet.identity.description = `Anotação da sessão nº ${ctx.rng.int(1, 9999)}. ${'Diário de viagem. '.repeat(ctx.rng.int(1, 10))}`;
  } else {
    sheet.inventory.coins.gp = Math.max(0, sheet.inventory.coins.gp + ctx.rng.int(-3, 5));
  }
  const res = await call<CharacterDocument>({
    method: 'PATCH',
    path: `/api/v1/characters/${state.id}`,
    label: 'PATCH /api/v1/characters/:id',
    body: { sections: { [section]: sheet[section] }, baseRevs: { [section]: state.revs[section] } },
  });
  if (res.status === 200) apply(state, res.data);
  // Conflito: o site busca a versão do servidor e segue (aqui, sem tentar de novo).
  else if (res.status === 409) await openCharacter(call, state);
}

function randomAction(rng: Rng): GameAction {
  const roll = rng.next();
  if (roll < 0.6) return { type: 'damage', amount: rng.int(1, 8) };
  if (roll < 0.85) return { type: 'heal', amount: rng.int(1, 8) };
  return { type: 'set-condition', key: 'cond:poisoned', on: rng.next() < 0.5 };
}

async function sendAction(
  call: ReturnType<typeof caller>,
  characterId: string,
  action: GameAction,
): Promise<CharacterDocument | null> {
  const res = await call<{ document: CharacterDocument }>({
    method: 'POST',
    path: `/api/v1/characters/${characterId}/actions`,
    label: 'POST /api/v1/characters/:id/actions',
    body: { actions: [{ actionId: randomUUID(), action }] },
  });
  return res.status === 200 ? (res.data?.document ?? null) : null;
}

async function openSite(call: ReturnType<typeof caller>) {
  await call({ method: 'GET', path: '/api/v1/session', label: 'GET /api/v1/session' });
}

export async function soloUser(user: VirtualUser, ctx: UserContext): Promise<void> {
  const call = caller(user, ctx, 'solo');
  await openSite(call);
  await call({ method: 'GET', path: '/api/v1/characters', label: 'GET /api/v1/characters' });
  let current = user.characters[0]!;
  await openCharacter(call, current);
  while (!ctx.signal.aborted) {
    await pause(ctx, 8_000, 20_000);
    if (ctx.signal.aborted) break;
    const roll = ctx.rng.next();
    if (roll < 0.8) {
      await saveSection(call, ctx, current, ['state', 'identity', 'inventory']);
    } else if (roll < 0.97 || user.characters.length >= 6) {
      await call({ method: 'GET', path: '/api/v1/characters', label: 'GET /api/v1/characters' });
      current = ctx.rng.pick(user.characters);
      await openCharacter(call, current);
    } else {
      const created = await call<CharacterDocument>({
        method: 'POST',
        path: '/api/v1/characters',
        label: 'POST /api/v1/characters',
        body: {
          id: randomUUID(),
          sheet: {
            ...current.sheet,
            identity: { ...current.sheet.identity, name: `${user.name} nova` },
          },
        },
      });
      if (created.status === 201 && created.data) {
        current = {
          id: created.data.id,
          version: created.data.version,
          revs: created.data.sectionRevs,
          sheet: created.data.sheet,
        };
        user.characters.push(current);
      }
    }
  }
}

export async function tablePlayer(user: VirtualUser, ctx: UserContext): Promise<void> {
  const call = caller(user, ctx, 'jogador');
  const mine = user.characters[0]!;
  const mates = (user.table?.players ?? []).filter((p) => p !== user && p.characters[0]);
  await openSite(call);
  await call({ method: 'GET', path: '/api/v1/characters', label: 'GET /api/v1/characters' });
  await openCharacter(call, mine);

  const poll = async () => {
    await sleep(ctx.rng.int(0, POLL_MS), ctx.signal);
    while (!ctx.signal.aborted) {
      const res = await call<UpdatesResponse>({
        method: 'GET',
        path: `/api/v1/characters/${mine.id}/updates?after=${mine.version}`,
        label: 'GET /api/v1/characters/:id/updates',
      });
      if (res.status === 200 && res.data) {
        if (res.data.document) apply(mine, res.data.document);
        else mine.version = res.data.version;
        const proposal = res.data.proposals[0];
        if (proposal && !ctx.signal.aborted) {
          await pause(ctx, 2_000, 6_000);
          const decided = await call<{ document: CharacterDocument }>({
            method: 'POST',
            path: `/api/v1/characters/${mine.id}/proposals/${proposal.id}/accept`,
            label: 'POST /api/v1/characters/:id/proposals/:proposalId/accept',
          });
          if (decided.status === 200) apply(mine, decided.data?.document);
        }
      }
      await sleep(POLL_MS, ctx.signal);
    }
  };

  const act = async () => {
    while (!ctx.signal.aborted) {
      await pause(ctx, 20_000, 45_000);
      if (ctx.signal.aborted) break;
      const roll = ctx.rng.next();
      if (roll < 0.6) {
        apply(mine, await sendAction(call, mine.id, randomAction(ctx.rng)));
      } else if (roll < 0.8 && mates.length > 0) {
        const mate = ctx.rng.pick(mates);
        await call({
          method: 'POST',
          path: `/api/v1/characters/${mate.characters[0]!.id}/proposals`,
          label: 'POST /api/v1/characters/:id/proposals',
          body: { proposalId: randomUUID(), amount: ctx.rng.int(1, 8), note: 'Palavra Curativa' },
        });
      } else {
        // O estado de jogo vai pelo canal de ações; as outras seções, pelo salvamento normal.
        await saveSection(call, ctx, mine, ['identity', 'inventory']);
      }
    }
  };

  await Promise.all([poll(), act()]);
}

export async function gameMaster(user: VirtualUser, ctx: UserContext): Promise<void> {
  const call = caller(user, ctx, 'mestre');
  const table = user.table;
  if (!table) return;
  const targets = table.players.map((p) => p.characters[0]?.id).filter((id): id is string => !!id);
  await openSite(call);
  await call({ method: 'GET', path: '/api/v1/campaigns', label: 'GET /api/v1/campaigns' });
  await call({
    method: 'GET',
    path: `/api/v1/campaigns/${table.campaignId}`,
    label: 'GET /api/v1/campaigns/:id',
  });

  const poll = async () => {
    await sleep(ctx.rng.int(0, POLL_MS), ctx.signal);
    while (!ctx.signal.aborted) {
      await call({
        method: 'GET',
        path: `/api/v1/campaigns/${table.campaignId}/party`,
        label: 'GET /api/v1/campaigns/:id/party',
      });
      await sleep(POLL_MS, ctx.signal);
    }
  };

  const act = async () => {
    while (!ctx.signal.aborted && targets.length > 0) {
      await pause(ctx, 15_000, 30_000);
      if (ctx.signal.aborted) break;
      await sendAction(call, ctx.rng.pick(targets), randomAction(ctx.rng));
    }
  };

  await Promise.all([poll(), act()]);
}

/** Visitante sem conta, para o site publicado: páginas (Cloudflare) e as perguntas do site à API. */
export async function visitor(user: VirtualUser, ctx: UserContext): Promise<void> {
  const call = caller(user, ctx, 'visitante');
  const pages = ['/', '/dados', '/comecar', '/criar'];
  while (!ctx.signal.aborted) {
    const page = ctx.rng.pick(pages);
    await call({ method: 'GET', path: page, label: `GET ${page} (página)` });
    await openSite(call);
    await call({
      method: 'GET',
      path: '/api/v1/auth/providers',
      label: 'GET /api/v1/auth/providers',
    });
    await pause(ctx, 15_000, 30_000);
  }
}

export function behaviorFor(kind: VirtualUser['kind']) {
  switch (kind) {
    case 'solo':
      return soloUser;
    case 'jogador':
      return tablePlayer;
    case 'mestre':
      return gameMaster;
    case 'visitante':
      return visitor;
  }
}
