// Pedidos AO MESMO TEMPO contra um Postgres de verdade (ADR-016): cliques duplos, reenvio com
// internet ruim, várias abas e muita gente entrando junto. Cada teste dispara os pedidos em
// paralelo e confere que os limites e as travas seguram, sem erro 500 e sem nada aplicado duas vezes.
import { randomUUID } from 'node:crypto';
import { createBlankSheet, MAX_CHARACTERS_PER_ACCOUNT, type LocalSheet } from '@grimorio/shared';
import {
  MAX_CAMPAIGNS_PER_USER,
  MAX_MEMBERS_PER_CAMPAIGN,
  MAX_PENDING_PROPOSALS,
} from '@grimorio/shared/campaign';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { actionProposals, campaignMembers, characterEvents, characters } from '../db/schema';
import { TEST_TOKEN } from '../testing/env';
import { loginAs, startApp, testDatabase } from '../testing/int-helpers';

const db = testDatabase();
let app: FastifyInstance;

afterAll(() => db.close());
beforeEach(async () => {
  await db.truncateAll();
  app = await startApp({ ENABLE_TEST_API: true, TEST_API_TOKEN: TEST_TOKEN });
});
afterEach(() => app.close());

function sheet(name: string): LocalSheet {
  const s = createBlankSheet();
  s.identity.name = name;
  s.combat.hpMaxOverride = 60;
  s.state.hp.current = 40;
  return s;
}

const call = (cookie: string, method: 'GET' | 'POST' | 'PATCH', url: string, payload?: object) =>
  app.inject(
    payload === undefined
      ? { method, url, headers: { cookie } }
      : { method, url, headers: { cookie }, payload },
  );

const codes = (results: { statusCode: number }[]) =>
  results.map((r) => r.statusCode).sort((a, b) => a - b);

const count = (list: number[], code: number) => list.filter((c) => c === code).length;

async function createCharacter(cookie: string, name: string) {
  const id = randomUUID();
  const res = await call(cookie, 'POST', '/api/v1/characters', { id, sheet: sheet(name) });
  expect(res.statusCode).toBe(201);
  return id;
}

/** Mesa com a mestre e `players` jogadores, cada um com a ficha na mesa. */
async function table(players: number) {
  const dm = await loginAs(app, { email: 'mestre@x.com', name: 'Mestre' });
  const campaignId = randomUUID();
  const created = await call(dm.cookie, 'POST', '/api/v1/campaigns', {
    id: campaignId,
    name: 'Mesa',
  });
  expect(created.statusCode).toBe(201);
  const code = created.json().invite.code as string;
  const seats = [];
  for (let i = 0; i < players; i++) {
    const who = await loginAs(app, { email: `p${i}@x.com`, name: `Jogador ${i}` });
    expect((await call(who.cookie, 'POST', '/api/v1/campaigns/join', { code })).statusCode).toBe(
      201,
    );
    const characterId = await createCharacter(who.cookie, `Ficha ${i}`);
    const added = await call(who.cookie, 'POST', `/api/v1/campaigns/${campaignId}/characters`, {
      characterId,
    });
    expect(added.statusCode).toBe(201);
    seats.push({ ...who, characterId });
  }
  return { dm, campaignId, code, seats };
}

describe('fichas: pedidos ao mesmo tempo', () => {
  it(`${MAX_CHARACTERS_PER_ACCOUNT + 10} criações juntas na mesma conta: entram ${MAX_CHARACTERS_PER_ACCOUNT}, o resto recebe o limite`, async () => {
    const me = await loginAs(app, { email: 'a@x.com' });
    const results = await Promise.all(
      Array.from({ length: MAX_CHARACTERS_PER_ACCOUNT + 10 }, (_, i) =>
        call(me.cookie, 'POST', '/api/v1/characters', { id: randomUUID(), sheet: sheet(`F${i}`) }),
      ),
    );
    const list = codes(results);
    expect(count(list, 201)).toBe(MAX_CHARACTERS_PER_ACCOUNT);
    expect(count(list, 409)).toBe(10);
    expect(
      results.filter((r) => r.statusCode === 409).every((r) => r.json().code === 'LIMIT_EXCEEDED'),
    ).toBe(true);
  });

  it('o mesmo id enviado 8 vezes juntas (clique duplo, reenvio): uma ficha só, nenhum erro', async () => {
    const me = await loginAs(app, { email: 'a@x.com' });
    // Várias rodadas: a corrida nem sempre aparece na primeira.
    for (let round = 0; round < 5; round++) {
      const id = randomUUID();
      const results = await Promise.all(
        Array.from({ length: 8 }, () =>
          call(me.cookie, 'POST', '/api/v1/characters', { id, sheet: sheet('Repetida') }),
        ),
      );
      expect(codes(results), `rodada ${round}`).toEqual([200, 200, 200, 200, 200, 200, 200, 201]);
    }
    expect(await db.orm.$count(characters)).toBe(5);
  });

  it('o id de uma ficha alheia enviado junto com a dona: a alheia não é sobrescrita (409, não 500)', async () => {
    const owner = await loginAs(app, { email: 'dona@x.com' });
    const other = await loginAs(app, { email: 'outra@x.com' });
    const id = randomUUID();
    const results = await Promise.all([
      call(owner.cookie, 'POST', '/api/v1/characters', { id, sheet: sheet('Da dona') }),
      ...Array.from({ length: 4 }, () =>
        call(other.cookie, 'POST', '/api/v1/characters', { id, sheet: sheet('Intrusa') }),
      ),
    ]);
    expect(results.every((r) => r.statusCode < 500)).toBe(true);
    const [row] = await db.orm.select().from(characters);
    const winner = results.find((r) => r.statusCode === 201)!;
    expect(winner).toBeDefined();
    expect(row!.name).toBe(winner.json().sheet.identity.name);
  });

  it('dois aparelhos salvando a mesma seção na mesma revisão, juntos: um salva, o outro recebe conflito', async () => {
    const me = await loginAs(app, { email: 'a@x.com' });
    const id = await createCharacter(me.cookie, 'Kaela');
    const doc = (await call(me.cookie, 'GET', `/api/v1/characters/${id}`)).json();
    const save = (description: string) =>
      call(me.cookie, 'PATCH', `/api/v1/characters/${id}`, {
        sections: { identity: { ...doc.sheet.identity, description } },
        baseRevs: { identity: doc.sectionRevs.identity },
      });
    const results = await Promise.all([save('celular'), save('computador'), save('tablet')]);
    const list = codes(results);
    expect(count(list, 200)).toBe(1);
    expect(count(list, 409)).toBe(2);
    const after = (await call(me.cookie, 'GET', `/api/v1/characters/${id}`)).json();
    expect(after.version).toBe(doc.version + 1);
  });

  it('30 contas salvando fichas diferentes ao mesmo tempo: todas salvam (fichas não se travam entre si)', async () => {
    const people = await Promise.all(
      Array.from({ length: 30 }, (_, i) => loginAs(app, { email: `c${i}@x.com` })),
    );
    const docs = await Promise.all(
      people.map(async (p, i) => {
        const id = await createCharacter(p.cookie, `F${i}`);
        return { p, doc: (await call(p.cookie, 'GET', `/api/v1/characters/${id}`)).json() };
      }),
    );
    const results = await Promise.all(
      docs.map(({ p, doc }) =>
        call(p.cookie, 'PATCH', `/api/v1/characters/${doc.id}`, {
          sections: {
            inventory: { ...doc.sheet.inventory, coins: { ...doc.sheet.inventory.coins, gp: 99 } },
          },
          baseRevs: { inventory: doc.sectionRevs.inventory },
        }),
      ),
    );
    expect(codes(results)).toEqual(Array(30).fill(200));
  });
});

describe('campanha: pedidos ao mesmo tempo', () => {
  it(`${MAX_CAMPAIGNS_PER_USER + 3} campanhas criadas juntas: entram ${MAX_CAMPAIGNS_PER_USER}`, async () => {
    const dm = await loginAs(app, { email: 'm@x.com' });
    const results = await Promise.all(
      Array.from({ length: MAX_CAMPAIGNS_PER_USER + 3 }, (_, i) =>
        call(dm.cookie, 'POST', '/api/v1/campaigns', { id: randomUUID(), name: `Mesa ${i}` }),
      ),
    );
    const list = codes(results);
    expect(count(list, 201)).toBe(MAX_CAMPAIGNS_PER_USER);
    expect(count(list, 409)).toBe(3);
  });

  it('a mesma campanha enviada 5 vezes juntas (clique duplo): uma só, nenhum erro', async () => {
    const dm = await loginAs(app, { email: 'm@x.com' });
    for (let round = 0; round < 3; round++) {
      const id = randomUUID();
      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          call(dm.cookie, 'POST', '/api/v1/campaigns', { id, name: `Mesa ${round}` }),
        ),
      );
      expect(codes(results), `rodada ${round}`).toEqual([200, 200, 200, 200, 201]);
    }
  });

  it(`${MAX_MEMBERS_PER_CAMPAIGN + 3} pessoas abrindo o convite ao mesmo tempo: a mesa fica com ${MAX_MEMBERS_PER_CAMPAIGN}`, async () => {
    const { campaignId, code } = await table(0);
    const people = await Promise.all(
      Array.from({ length: MAX_MEMBERS_PER_CAMPAIGN + 3 }, (_, i) =>
        loginAs(app, { email: `j${i}@x.com` }),
      ),
    );
    const results = await Promise.all(
      people.map((p) => call(p.cookie, 'POST', '/api/v1/campaigns/join', { code })),
    );
    const list = codes(results);
    // A mestre já ocupa um lugar.
    expect(count(list, 201)).toBe(MAX_MEMBERS_PER_CAMPAIGN - 1);
    expect(count(list, 409)).toBe(4);
    expect(await db.orm.$count(campaignMembers, eq(campaignMembers.campaignId, campaignId))).toBe(
      MAX_MEMBERS_PER_CAMPAIGN,
    );
  });

  it('a mesma pessoa clicando no convite 4 vezes juntas: entra uma vez', async () => {
    const { campaignId, code } = await table(0);
    const p = await loginAs(app, { email: 'j@x.com' });
    const results = await Promise.all(
      Array.from({ length: 4 }, () => call(p.cookie, 'POST', '/api/v1/campaigns/join', { code })),
    );
    expect(codes(results)).toEqual([200, 200, 200, 201]);
    const detail = (await call(p.cookie, 'GET', `/api/v1/campaigns/${campaignId}`)).json();
    expect(detail.members).toHaveLength(2);
  });

  it(`${MAX_PENDING_PROPOSALS + 4} propostas de cura juntas na mesma ficha: ficam ${MAX_PENDING_PROPOSALS} pendentes`, async () => {
    const { seats } = await table(2);
    const [target, healer] = seats;
    const results = await Promise.all(
      Array.from({ length: MAX_PENDING_PROPOSALS + 4 }, () =>
        call(healer!.cookie, 'POST', `/api/v1/characters/${target!.characterId}/proposals`, {
          proposalId: randomUUID(),
          amount: 3,
        }),
      ),
    );
    const list = codes(results);
    expect(count(list, 201)).toBe(MAX_PENDING_PROPOSALS);
    expect(count(list, 409)).toBe(4);
    expect(await db.orm.$count(actionProposals)).toBe(MAX_PENDING_PROPOSALS);
  });

  it('aceitar a mesma cura em três abas ao mesmo tempo: cura uma vez só', async () => {
    const { seats } = await table(2);
    const [target, healer] = seats;
    const proposalId = randomUUID();
    await call(healer!.cookie, 'POST', `/api/v1/characters/${target!.characterId}/proposals`, {
      proposalId,
      amount: 5,
    });
    const before = (
      await call(target!.cookie, 'GET', `/api/v1/characters/${target!.characterId}`)
    ).json();
    const accept = () =>
      call(
        target!.cookie,
        'POST',
        `/api/v1/characters/${target!.characterId}/proposals/${proposalId}/accept`,
      );
    const results = await Promise.all([accept(), accept(), accept()]);
    expect(codes(results)).toEqual([200, 200, 200]);
    expect(results.filter((r) => r.json().duplicate === false)).toHaveLength(1);
    const after = (
      await call(target!.cookie, 'GET', `/api/v1/characters/${target!.characterId}`)
    ).json();
    expect(after.sheet.state.hp.current).toBe(before.sheet.state.hp.current + 5);
    expect(await db.orm.$count(characterEvents)).toBe(1);
  });

  it('mestre e dona mandando 40 ações juntas na mesma ficha enquanto a dona salva outra seção: nada se perde', async () => {
    const { dm, seats } = await table(1);
    const [owner] = seats;
    const id = owner!.characterId;
    const doc = (await call(owner!.cookie, 'GET', `/api/v1/characters/${id}`)).json();
    const action = (cookie: string) =>
      call(cookie, 'POST', `/api/v1/characters/${id}/actions`, {
        actions: [{ actionId: randomUUID(), action: { type: 'damage', amount: 1 } }],
      });
    const results = await Promise.all([
      ...Array.from({ length: 40 }, (_, i) => action(i % 2 ? dm.cookie : owner!.cookie)),
      call(owner!.cookie, 'PATCH', `/api/v1/characters/${id}`, {
        sections: { identity: { ...doc.sheet.identity, description: 'Nota no meio do combate' } },
        baseRevs: { identity: doc.sectionRevs.identity },
      }),
    ]);
    expect(codes(results)).toEqual(Array(41).fill(200));
    const after = (await call(owner!.cookie, 'GET', `/api/v1/characters/${id}`)).json();
    expect(after.sheet.identity.description).toBe('Nota no meio do combate');
    expect(after.sheet.state.hp.current).toBe(Math.max(0, doc.sheet.state.hp.current - 40));
    expect(await db.orm.$count(characterEvents)).toBe(40);
  });
});
