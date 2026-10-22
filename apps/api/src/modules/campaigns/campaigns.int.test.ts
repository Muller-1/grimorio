// Campanha (docs/plano-escala-e-campanha.md, seção 2) contra um Postgres de verdade: canal de
// ações sem conflito, eventos, papéis, resumo da mesa e propostas de cura.
import { createBlankSheet, type LocalSheet } from '@grimorio/shared';
import { PARTY_FIELDS, type PartyMember } from '@grimorio/shared/campaign';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { characterEvents, characters } from '../../db/schema';
import { controllableClock, sequentialIds } from '../../ports';
import { TEST_TOKEN } from '../../testing/env';
import { loginAs, startApp, testDatabase } from '../../testing/int-helpers';

const db = testDatabase();
let app: FastifyInstance;
let ids = sequentialIds(5000);
const clock = controllableClock();

afterAll(() => db.close());
beforeEach(async () => {
  await db.truncateAll();
  ids = sequentialIds(5000);
  clock.set('2026-10-22T20:00:00.000Z');
  app = await startApp(
    { ENABLE_TEST_API: true, TEST_API_TOKEN: TEST_TOKEN },
    { ports: { clock, ids: sequentialIds() } },
  );
});
afterEach(() => app.close());

function sheet(name: string): LocalSheet {
  const s = createBlankSheet();
  s.identity.name = name;
  s.identity.className = 'Clériga';
  s.build.level = 3;
  s.combat.hpMaxOverride = 60;
  s.state.hp.current = 40;
  return s;
}

const call = (
  cookie: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  payload?: object,
) =>
  app.inject(
    payload === undefined
      ? { method, url, headers: { cookie } }
      : { method, url, headers: { cookie }, payload },
  );

/** Mestre (Ana), dona da Kaela (Bia) e dona da Duda (Carla), todas na mesma mesa. */
async function table() {
  const ana = await loginAs(app, { email: 'ana@x.com', name: 'Ana' });
  const bia = await loginAs(app, { email: 'bia@x.com', name: 'Bia' });
  const carla = await loginAs(app, { email: 'carla@x.com', name: 'Carla' });
  const campaignId = ids.uuid();
  const created = await call(ana.cookie, 'POST', '/api/v1/campaigns', {
    id: campaignId,
    name: 'A Torre',
  });
  expect(created.statusCode).toBe(201);
  const code = created.json().invite.code as string;
  for (const who of [bia, carla]) {
    expect((await call(who.cookie, 'POST', '/api/v1/campaigns/join', { code })).statusCode).toBe(
      201,
    );
  }
  const kaela = ids.uuid();
  const duda = ids.uuid();
  for (const [who, id, name] of [
    [bia, kaela, 'Kaela'],
    [carla, duda, 'Duda'],
  ] as const) {
    expect(
      (await call(who.cookie, 'POST', '/api/v1/characters', { id, sheet: sheet(name) })).statusCode,
    ).toBe(201);
    expect(
      (
        await call(who.cookie, 'POST', `/api/v1/campaigns/${campaignId}/characters`, {
          characterId: id,
        })
      ).statusCode,
    ).toBe(201);
  }
  return { ana, bia, carla, campaignId, kaela, duda, code };
}

const damage = (amount: number) => ({
  actionId: ids.uuid(),
  action: { type: 'damage', amount },
});

describe('campanha: criar, convidar, entrar', () => {
  it('a mestre vê o convite; os jogadores, só os nomes; quem não é da mesa recebe 404', async () => {
    const t = await table();
    const asDm = (await call(t.ana.cookie, 'GET', `/api/v1/campaigns/${t.campaignId}`)).json();
    expect(asDm.role).toBe('dm');
    expect(asDm.invite.code).toBe(t.code);
    expect(asDm.members.map((m: { name: string }) => m.name)).toEqual(['Ana', 'Bia', 'Carla']);
    const asPlayer = (await call(t.bia.cookie, 'GET', `/api/v1/campaigns/${t.campaignId}`)).json();
    expect(asPlayer.role).toBe('player');
    expect(asPlayer.invite).toBeUndefined();

    const outsider = await loginAs(app, { email: 'zeca@x.com' });
    expect(
      (await call(outsider.cookie, 'GET', `/api/v1/campaigns/${t.campaignId}`)).statusCode,
    ).toBe(404);
    const list = (await call(t.bia.cookie, 'GET', '/api/v1/campaigns')).json().campaigns;
    expect(list).toEqual([
      { id: t.campaignId, name: 'A Torre', role: 'player', members: 3, characters: 2 },
    ]);
  });

  it('código vencido ou trocado não entra mais', async () => {
    const t = await table();
    const zeca = await loginAs(app, { email: 'zeca@x.com' });
    const renewed = await call(t.ana.cookie, 'POST', `/api/v1/campaigns/${t.campaignId}/invite`);
    expect(renewed.json().invite.code).not.toBe(t.code);
    expect(
      (await call(zeca.cookie, 'POST', '/api/v1/campaigns/join', { code: t.code })).statusCode,
    ).toBe(404);
    clock.advance(8 * 24 * 60 * 60 * 1000);
    expect(
      (
        await call(zeca.cookie, 'POST', '/api/v1/campaigns/join', {
          code: renewed.json().invite.code,
        })
      ).statusCode,
    ).toBe(404);
  });

  it('uma ficha fica em uma campanha só, e só a dona a põe na mesa', async () => {
    const t = await table();
    const other = ids.uuid();
    await call(t.ana.cookie, 'POST', '/api/v1/campaigns', { id: other, name: 'Outra' });
    const code = (await call(t.ana.cookie, 'GET', `/api/v1/campaigns/${other}`)).json().invite.code;
    await call(t.bia.cookie, 'POST', '/api/v1/campaigns/join', { code });
    const again = await call(t.bia.cookie, 'POST', `/api/v1/campaigns/${other}/characters`, {
      characterId: t.kaela,
    });
    expect(again.statusCode).toBe(409);
    const notMine = await call(t.ana.cookie, 'POST', `/api/v1/campaigns/${other}/characters`, {
      characterId: t.kaela,
    });
    expect(notMine.statusCode).toBe(404);
  });
});

describe('canal de ações', () => {
  it('20 ações ao mesmo tempo na mesma ficha: todas valem, uma vez cada', async () => {
    const t = await table();
    const before = (await call(t.bia.cookie, 'GET', `/api/v1/characters/${t.kaela}`)).json();
    const batches = Array.from({ length: 20 }, () => [damage(1)]);
    const results = await Promise.all(
      batches.map((actions, i) =>
        call(i % 2 ? t.ana.cookie : t.bia.cookie, 'POST', `/api/v1/characters/${t.kaela}/actions`, {
          actions,
        }),
      ),
    );
    expect(results.map((r) => r.statusCode)).toEqual(Array(20).fill(200));
    const after = (await call(t.bia.cookie, 'GET', `/api/v1/characters/${t.kaela}`)).json();
    expect(after.sheet.state.hp.current).toBe(before.sheet.state.hp.current - 20);
    expect(after.version).toBe(before.version + 20);
    expect(await db.orm.$count(characterEvents)).toBe(20);

    // Reenviar o mesmo pedido (internet ruim) não aplica de novo.
    const repeat = await call(t.ana.cookie, 'POST', `/api/v1/characters/${t.kaela}/actions`, {
      actions: batches[0],
    });
    expect(repeat.json()).toMatchObject({ applied: [], duplicates: [batches[0]![0]!.actionId] });
    expect(repeat.json().document.version).toBe(after.version);
  });

  it('a mestre aplica dano enquanto a dona salva outra seção: as duas mudanças ficam', async () => {
    const t = await table();
    const doc = (await call(t.bia.cookie, 'GET', `/api/v1/characters/${t.kaela}`)).json();
    await call(t.ana.cookie, 'POST', `/api/v1/characters/${t.kaela}/actions`, {
      actions: [damage(7)],
    });
    const identity = { ...doc.sheet.identity, description: 'Anotação da sessão' };
    const saved = await call(t.bia.cookie, 'PATCH', `/api/v1/characters/${t.kaela}`, {
      sections: { identity },
      baseRevs: { identity: doc.sectionRevs.identity },
    });
    expect(saved.statusCode).toBe(200);
    expect(saved.json().sheet.state.hp.current).toBe(33);
    expect(saved.json().sheet.identity.description).toBe('Anotação da sessão');
  });

  it('marcar Envenenado duas vezes deixa Envenenado; condição desconhecida não entra', async () => {
    const t = await table();
    const poisoned = { type: 'set-condition', key: 'cond:poisoned', on: true };
    for (const cookie of [t.ana.cookie, t.bia.cookie]) {
      await call(cookie, 'POST', `/api/v1/characters/${t.kaela}/actions`, {
        actions: [{ actionId: ids.uuid(), action: poisoned }],
      });
    }
    await call(t.ana.cookie, 'POST', `/api/v1/characters/${t.kaela}/actions`, {
      actions: [{ actionId: ids.uuid(), action: { ...poisoned, key: 'cond:inventada' } }],
    });
    const now = (await call(t.bia.cookie, 'GET', `/api/v1/characters/${t.kaela}`)).json();
    expect(now.sheet.state.active).toEqual(['cond:poisoned']);
  });

  it('outro jogador não aplica ação direta; quem não é da mesa também não', async () => {
    const t = await table();
    const direct = await call(t.carla.cookie, 'POST', `/api/v1/characters/${t.kaela}/actions`, {
      actions: [damage(5)],
    });
    expect(direct.statusCode).toBe(404);
    const zeca = await loginAs(app, { email: 'zeca@x.com' });
    expect(
      (
        await call(zeca.cookie, 'POST', `/api/v1/characters/${t.kaela}/actions`, {
          actions: [damage(5)],
        })
      ).statusCode,
    ).toBe(404);
    expect((await call(t.carla.cookie, 'GET', `/api/v1/characters/${t.kaela}`)).statusCode).toBe(
      404,
    );
  });

  it('updates: eventos depois da versão N, com quem fez, e a ficha quando a versão andou', async () => {
    const t = await table();
    const start = (await call(t.bia.cookie, 'GET', `/api/v1/characters/${t.kaela}`)).json();
    const idle = await call(
      t.bia.cookie,
      'GET',
      `/api/v1/characters/${t.kaela}/updates?after=${start.version}`,
    );
    expect(idle.json()).toMatchObject({
      version: start.version,
      events: [],
      campaign: { id: t.campaignId, name: 'A Torre', role: 'owner' },
      proposals: [],
    });
    expect(idle.json().document).toBeUndefined();

    const hit = damage(4);
    await call(t.ana.cookie, 'POST', `/api/v1/characters/${t.kaela}/actions`, { actions: [hit] });
    const changed = (
      await call(
        t.bia.cookie,
        'GET',
        `/api/v1/characters/${t.kaela}/updates?after=${start.version}`,
      )
    ).json();
    expect(changed.events).toEqual([
      {
        actionId: hit.actionId,
        action: hit.action,
        version: start.version + 1,
        at: '2026-10-22T20:00:00.000Z',
        actor: { name: 'Ana', role: 'dm' },
      },
    ]);
    expect(changed.document.sheet.state.hp.current).toBe(36);
  });
});

describe('resumo da mesa', () => {
  it('só os seis campos, iguais para todos da mesa', async () => {
    const t = await table();
    await call(t.ana.cookie, 'POST', `/api/v1/characters/${t.kaela}/actions`, {
      actions: [
        damage(10),
        { actionId: ids.uuid(), action: { type: 'set-condition', key: 'cond:prone', on: true } },
      ],
    });
    const res = await call(t.carla.cookie, 'GET', `/api/v1/campaigns/${t.campaignId}/party`);
    expect(res.statusCode).toBe(200);
    const party = res.json().party as PartyMember[];
    expect(party.map((p) => p.summary.name)).toEqual(['Kaela', 'Duda']);
    for (const member of party)
      expect(Object.keys(member.summary).sort()).toEqual([...PARTY_FIELDS].sort());
    const kaela = party.find((p) => p.characterId === t.kaela)!;
    expect(kaela).toMatchObject({
      player: 'Bia',
      mine: false,
      summary: { level: 3, hp: { current: 30, max: 60, temp: 0 }, conditions: ['cond:prone'] },
    });
    // Nada da ficha além do resumo: nem notas, nem atributos, nem o estado inteiro.
    expect(JSON.stringify(res.json())).not.toContain('abilities');
  });
});

describe('propostas de cura', () => {
  const heal = (amount: number) => ({ proposalId: ids.uuid(), amount });

  it('não muda a ficha até a dona aceitar; aceitar duas vezes cura uma vez', async () => {
    const t = await table();
    const offer = heal(5);
    const sent = await call(
      t.carla.cookie,
      'POST',
      `/api/v1/characters/${t.kaela}/proposals`,
      offer,
    );
    expect(sent.statusCode).toBe(201);
    const pending = (
      await call(t.bia.cookie, 'GET', `/api/v1/characters/${t.kaela}/updates?after=0`)
    ).json();
    expect(pending.proposals).toEqual([
      expect.objectContaining({ id: offer.proposalId, proposer: 'Carla', amount: 5 }),
    ]);
    expect(pending.document.sheet.state.hp.current).toBe(40);

    const url = `/api/v1/characters/${t.kaela}/proposals/${offer.proposalId}/accept`;
    const [first, second] = await Promise.all([
      call(t.bia.cookie, 'POST', url),
      call(t.bia.cookie, 'POST', url),
    ]);
    expect([first.statusCode, second.statusCode]).toEqual([200, 200]);
    expect([first.json().duplicate, second.json().duplicate].sort()).toEqual([false, true]);
    const row = (await db.orm.select().from(characters)).find((c) => c.id === t.kaela)!;
    expect((row.data as LocalSheet).state.hp.current).toBe(45);

    const events = (
      await call(t.bia.cookie, 'GET', `/api/v1/characters/${t.kaela}/updates?after=0`)
    ).json().events;
    expect(events.at(-1)).toMatchObject({
      actionId: offer.proposalId,
      actor: { name: 'Carla', role: 'player' },
      approvedBy: 'Bia',
    });
  });

  it('recusar deixa a ficha igual; vencida não pode mais ser aceita', async () => {
    const t = await table();
    const no = heal(3);
    await call(t.carla.cookie, 'POST', `/api/v1/characters/${t.kaela}/proposals`, no);
    const rejected = await call(
      t.bia.cookie,
      'POST',
      `/api/v1/characters/${t.kaela}/proposals/${no.proposalId}/reject`,
    );
    expect(rejected.statusCode).toBe(204);
    const late = heal(3);
    await call(t.carla.cookie, 'POST', `/api/v1/characters/${t.kaela}/proposals`, late);
    clock.advance(25 * 60 * 60 * 1000);
    const accept = await call(
      t.bia.cookie,
      'POST',
      `/api/v1/characters/${t.kaela}/proposals/${late.proposalId}/accept`,
    );
    expect(accept.statusCode).toBe(404);
    const doc = (await call(t.bia.cookie, 'GET', `/api/v1/characters/${t.kaela}`)).json();
    expect(doc.sheet.state.hp.current).toBe(40);
  });

  it('no máximo 10 pendentes; ninguém propõe para a própria ficha; a mestre usa ações', async () => {
    const t = await table();
    for (let i = 0; i < 10; i++) {
      const res = await call(
        t.carla.cookie,
        'POST',
        `/api/v1/characters/${t.kaela}/proposals`,
        heal(1),
      );
      expect(res.statusCode).toBe(201);
    }
    const eleventh = await call(
      t.carla.cookie,
      'POST',
      `/api/v1/characters/${t.kaela}/proposals`,
      heal(1),
    );
    expect(eleventh.statusCode).toBe(409);
    expect(
      (await call(t.bia.cookie, 'POST', `/api/v1/characters/${t.kaela}/proposals`, heal(1)))
        .statusCode,
    ).toBe(404);
    expect(
      (await call(t.ana.cookie, 'POST', `/api/v1/characters/${t.kaela}/proposals`, heal(1)))
        .statusCode,
    ).toBe(404);
  });

  it('sair da mesa tira as fichas e as curas pendentes deixam de valer', async () => {
    const t = await table();
    const offer = heal(5);
    await call(t.carla.cookie, 'POST', `/api/v1/characters/${t.kaela}/proposals`, offer);
    expect(
      (await call(t.bia.cookie, 'DELETE', `/api/v1/campaigns/${t.campaignId}/members/me`))
        .statusCode,
    ).toBe(204);
    const party = (
      await call(t.ana.cookie, 'GET', `/api/v1/campaigns/${t.campaignId}/party`)
    ).json();
    expect(party.party.map((p: PartyMember) => p.summary.name)).toEqual(['Duda']);
    const accept = await call(
      t.bia.cookie,
      'POST',
      `/api/v1/characters/${t.kaela}/proposals/${offer.proposalId}/accept`,
    );
    expect(accept.statusCode).toBe(404);
    // A mestre não "sai": encerra a campanha.
    expect(
      (await call(t.ana.cookie, 'DELETE', `/api/v1/campaigns/${t.campaignId}/members/me`))
        .statusCode,
    ).toBe(403);
  });
});

describe('limite de pedidos', () => {
  it('passou do limite: 429 com Retry-After', async () => {
    await app.close();
    app = await startApp(
      { ENABLE_TEST_API: true, TEST_API_TOKEN: TEST_TOKEN },
      {
        ports: { clock, ids: sequentialIds() },
        rateLimit: [
          {
            name: 'teste',
            matches: (path, method) => method === 'POST' && path === '/api/v1/campaigns/join',
            limit: 2,
            windowMs: 60_000,
          },
        ],
      },
    );
    const who = await loginAs(app, { email: 'zeca@x.com' });
    const codes = ['aaaaaaaa1', 'aaaaaaaa2', 'aaaaaaaa3'];
    const statuses = [];
    for (const code of codes) {
      statuses.push(
        (await call(who.cookie, 'POST', '/api/v1/campaigns/join', { code })).statusCode,
      );
    }
    expect(statuses).toEqual([404, 404, 429]);
    clock.advance(61_000);
    expect(
      (await call(who.cookie, 'POST', '/api/v1/campaigns/join', { code: 'aaaaaaaa4' })).statusCode,
    ).toBe(404);
  });
});
