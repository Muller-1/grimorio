/**
 * Preparo do teste (não entra na conta): limpa o banco descartável, cria as contas pela API de
 * teste, as fichas e as mesas (1 mestre + 4 jogadores, cada jogador com a ficha na mesa).
 */
import { randomUUID } from 'node:crypto';
import type { CharacterDocument, LocalSheet, SectionRevs } from '@grimorio/shared';
import type { Client, UserKind } from './http';
import type { Rng } from './rng';
import { characterSheet } from './sheets';

export const TABLE_SIZE = 5;
const TEST_TOKEN_HEADER = 'x-test-token';

export interface CharacterState {
  id: string;
  version: number;
  revs: SectionRevs;
  sheet: LocalSheet;
}

export interface Table {
  campaignId: string;
  dm: VirtualUser;
  players: VirtualUser[];
}

export interface VirtualUser {
  index: number;
  name: string;
  kind: Exclude<UserKind, 'preparo'>;
  ip: string;
  cookie: string;
  characters: CharacterState[];
  table?: Table;
}

/** IP falso, um por jogador (ou o mesmo para todos, com --mesmo-ip). */
export function fakeIp(index: number, sameIp: boolean): string {
  if (sameIp) return '198.51.100.7';
  return `10.${(index >> 16) & 255}.${(index >> 8) & 255}.${(index & 255) + 1}`;
}

/**
 * Ordem em que os jogadores entram: mesas e jogadores sozinhos intercalados, para a mistura
 * valer em todos os degraus (com 10 jogadores e metade em mesas: 1 mesa + 5 sozinhos).
 */
export function arrival(total: number, tableShare: number): Exclude<UserKind, 'preparo'>[] {
  const tables = Math.floor((total * tableShare) / TABLE_SIZE);
  const solos = total - tables * TABLE_SIZE;
  const order: Exclude<UserKind, 'preparo'>[] = [];
  let t = 0;
  let s = 0;
  while (t < tables || s < solos) {
    // Escolhe o que deixa a mistura mais perto da pedida até aqui.
    const placed = t * TABLE_SIZE + s;
    const ifTable = Math.abs(((t + 1) * TABLE_SIZE) / (placed + TABLE_SIZE) - tableShare);
    const ifSolo = Math.abs((t * TABLE_SIZE) / (placed + 1) - tableShare);
    if (t < tables && (s >= solos || ifTable <= ifSolo)) {
      order.push('mestre', 'jogador', 'jogador', 'jogador', 'jogador');
      t++;
    } else {
      order.push('solo');
      s++;
    }
  }
  return order;
}

async function pool<T>(items: T[], size: number, work: (item: T) => Promise<void>) {
  let next = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) await work(items[next++]!);
  });
  await Promise.all(workers);
}

export class SetupError extends Error {
  override name = 'SetupError';
}

function expectStatus(what: string, res: { status: number; data: unknown }, ...ok: number[]) {
  if (!ok.includes(res.status)) {
    throw new SetupError(
      `${what}: esperava ${ok.join('/')} e veio ${res.status} ${JSON.stringify(res.data)}`,
    );
  }
}

export function toState(doc: CharacterDocument): CharacterState {
  return { id: doc.id, version: doc.version, revs: doc.sectionRevs, sheet: doc.sheet };
}

/** Espera a API responder (o contêiner pode estar subindo e migrando o banco). */
export async function waitForApi(client: Client, timeoutMs = 120_000): Promise<void> {
  const until = Date.now() + timeoutMs;
  for (;;) {
    try {
      const res = await fetch(`${client.target}/health`, { signal: AbortSignal.timeout(5_000) });
      if (res.ok) return;
    } catch {
      // ainda subindo
    }
    if (Date.now() > until) {
      throw new SetupError(
        `A API em ${client.target} não respondeu. Ela está no ar? (pnpm load:up sobe a do teste)`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
}

export async function prepare(
  client: Client,
  opts: { users: number; tableShare: number; sameIp: boolean; testToken: string; rng: Rng },
  log: (line: string) => void,
): Promise<VirtualUser[]> {
  const kind = 'preparo' as const;
  const reset = await client.request({
    method: 'POST',
    path: '/__test__/reset',
    label: 'preparo: limpar banco',
    kind,
    headers: { [TEST_TOKEN_HEADER]: opts.testToken },
  });
  if (reset.status === 404) {
    throw new SetupError(
      'A API de teste não respondeu (404). O alvo precisa de ENABLE_TEST_API e do mesmo ' +
        'TEST_API_TOKEN; a API do `pnpm load:up` já vem assim. Nunca ligue isso em produção.',
    );
  }
  expectStatus('limpar o banco', reset, 200);

  const order = arrival(opts.users, opts.tableShare);
  const users: VirtualUser[] = order.map((k, index) => ({
    index,
    name: `Carga ${String(index + 1).padStart(3, '0')}`,
    kind: k,
    ip: fakeIp(index, opts.sameIp),
    cookie: '',
    characters: [],
  }));

  log(`  contas: ${users.length}`);
  await pool(users, 8, async (user) => {
    const res = await client.request<{ cookie: string }>({
      method: 'POST',
      path: '/__test__/session',
      label: 'preparo: sessão',
      kind,
      ip: user.ip,
      headers: { [TEST_TOKEN_HEADER]: opts.testToken },
      body: { email: `carga${user.index + 1}@teste.grimorio.net.br`, name: user.name },
    });
    expectStatus('criar sessão', res, 200);
    user.cookie = res.data!.cookie;
  });

  const createCharacter = async (user: VirtualUser, name: string) => {
    const withPortrait = opts.rng.next() < 0.2;
    const res = await client.request<CharacterDocument>({
      method: 'POST',
      path: '/api/v1/characters',
      label: 'preparo: criar ficha',
      kind,
      cookie: user.cookie,
      ip: user.ip,
      body: { id: randomUUID(), sheet: characterSheet(opts.rng, name, withPortrait) },
    });
    expectStatus('criar ficha', res, 201);
    const state = toState(res.data!);
    user.characters.push(state);
    return state;
  };

  log('  fichas');
  await pool(
    users.filter((u) => u.kind !== 'mestre'),
    8,
    async (user) => {
      const count = user.kind === 'solo' ? 2 : 1;
      for (let i = 0; i < count; i++) await createCharacter(user, `${user.name} ${i + 1}`);
    },
  );

  const tables: Table[] = [];
  for (let i = 0; i < users.length; i++) {
    if (users[i]!.kind !== 'mestre') continue;
    tables.push({
      campaignId: randomUUID(),
      dm: users[i]!,
      players: users.slice(i + 1, i + TABLE_SIZE),
    });
  }
  log(`  mesas: ${tables.length}`);
  await pool(tables, 4, async (table) => {
    const created = await client.request<{ invite: { code: string } }>({
      method: 'POST',
      path: '/api/v1/campaigns',
      label: 'preparo: criar campanha',
      kind,
      cookie: table.dm.cookie,
      ip: table.dm.ip,
      body: { id: table.campaignId, name: `Mesa de ${table.dm.name}` },
    });
    expectStatus('criar campanha', created, 201);
    const code = created.data!.invite.code;
    table.dm.table = table;
    for (const player of table.players) {
      player.table = table;
      const joined = await client.request({
        method: 'POST',
        path: '/api/v1/campaigns/join',
        label: 'preparo: entrar na mesa',
        kind,
        cookie: player.cookie,
        ip: player.ip,
        body: { code },
      });
      expectStatus('entrar na mesa', joined, 201);
      const added = await client.request({
        method: 'POST',
        path: `/api/v1/campaigns/${table.campaignId}/characters`,
        label: 'preparo: ficha na mesa',
        kind,
        cookie: player.cookie,
        ip: player.ip,
        body: { characterId: player.characters[0]!.id },
      });
      expectStatus('pôr a ficha na mesa', added, 201);
    }
  });
  return users;
}
