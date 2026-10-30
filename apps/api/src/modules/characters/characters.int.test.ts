// Personagens na conta (plano v2, 10.3, 11 e 13) contra um Postgres de verdade.
import { readFileSync } from 'node:fs';
import {
  createBlankSheet,
  LOCAL_SHEET_SCHEMA_VERSION,
  MAX_CHARACTERS_PER_ACCOUNT,
  type LocalSheet,
} from '@grimorio/shared';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { characters } from '../../db/schema';
import { controllableClock, sequentialIds } from '../../ports';
import { TEST_TOKEN } from '../../testing/env';
import { loginAs, startApp, testDatabase } from '../../testing/int-helpers';

const db = testDatabase();
let app: FastifyInstance;
let ids = sequentialIds(1000);
const clock = controllableClock();

afterAll(() => db.close());
beforeEach(async () => {
  await db.truncateAll();
  ids = sequentialIds(1000);
  clock.set('2026-10-08T12:00:00.000Z');
  app = await startApp(
    { ENABLE_TEST_API: true, TEST_API_TOKEN: TEST_TOKEN },
    { ports: { clock, ids: sequentialIds() } },
  );
});
afterEach(() => app.close());

function sheet(name: string, edit: (s: LocalSheet) => void = () => {}): LocalSheet {
  const s = createBlankSheet();
  s.identity.name = name;
  s.identity.className = 'Guerreiro';
  edit(s);
  return s;
}

async function create(cookie: string, body: { id: string; sheet: LocalSheet }) {
  return app.inject({
    method: 'POST',
    url: '/api/v1/characters',
    headers: { cookie },
    payload: body,
  });
}

describe('sem sessão', () => {
  it('toda rota responde 401', async () => {
    const id = ids.uuid();
    const calls = [
      app.inject('/api/v1/characters'),
      app.inject({ method: 'POST', url: '/api/v1/characters', payload: { id, sheet: sheet('A') } }),
      app.inject(`/api/v1/characters/${id}`),
      app.inject({ method: 'PATCH', url: `/api/v1/characters/${id}`, payload: {} }),
      app.inject({ method: 'DELETE', url: `/api/v1/characters/${id}` }),
    ];
    for (const res of await Promise.all(calls)) {
      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({ code: 'UNAUTHENTICATED' });
    }
  });
});

describe('criar, listar e abrir', () => {
  it('cria com o id do navegador; repetir o pedido não duplica', async () => {
    const { cookie } = await loginAs(app, { email: 'ana@x.com' });
    const id = ids.uuid();
    const first = await create(cookie, { id, sheet: sheet('Thalia') });
    expect(first.statusCode).toBe(201);
    expect(first.json()).toMatchObject({ id, version: 1, sectionRevs: { identity: 1, build: 1 } });

    const again = await create(cookie, { id, sheet: sheet('Outro nome') });
    expect(again.statusCode).toBe(200);
    expect(again.json().sheet.identity.name).toBe('Thalia');
    expect(await db.orm.$count(characters)).toBe(1);
  });

  it('a lista traz o resumo, do mais recente para o mais antigo', async () => {
    const { cookie } = await loginAs(app, { email: 'ana@x.com' });
    await create(cookie, { id: ids.uuid(), sheet: sheet('Primeira') });
    clock.advance(60_000);
    await create(cookie, { id: ids.uuid(), sheet: sheet('Segunda', (s) => (s.build.level = 3)) });
    const res = await app.inject({ url: '/api/v1/characters', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    const list = res.json().characters;
    expect(list.map((c: { name: string }) => c.name)).toEqual(['Segunda', 'Primeira']);
    expect(list[0]).toMatchObject({ level: 3, classSummary: 'Guerreiro', rulesEdition: '2024' });
    expect(list[0]).not.toHaveProperty('sheet');
    // O cartão da tela inicial: CA e PV calculados no servidor, nada além disso.
    expect(Object.keys(list[0].card).sort()).toEqual(['ac', 'hp', 'origin']);
    expect(list[0].card.ac).toBeGreaterThan(0);
    expect(list[0].card.hp.max).toBeGreaterThan(0);
  });

  it('ficha inválida é recusada com VALIDATION_ERROR', async () => {
    const { cookie } = await loginAs(app, { email: 'ana@x.com' });
    const bad = sheet('X', (s) => (s.build.level = 99));
    const res = await create(cookie, { id: ids.uuid(), sheet: bad });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('VALIDATION_ERROR');
  });

  it('a ficha é normalizada ao criar (PV acima do máximo vira o máximo)', async () => {
    const { cookie } = await loginAs(app, { email: 'ana@x.com' });
    const res = await create(cookie, {
      id: ids.uuid(),
      sheet: sheet('X', (s) => (s.state.hp.current = 500)),
    });
    expect(res.json().sheet.state.hp.current).toBe(8);
  });

  it(`limite de ${MAX_CHARACTERS_PER_ACCOUNT} personagens por conta`, async () => {
    const { cookie, userId } = await loginAs(app, { email: 'ana@x.com' });
    const base = sheet('Muitos');
    await db.orm.insert(characters).values(
      Array.from({ length: MAX_CHARACTERS_PER_ACCOUNT }, () => ({
        id: ids.uuid(),
        ownerId: userId,
        name: 'Muitos',
        rulesEdition: '2024',
        data: base,
        schemaVersion: 1,
        sectionRevs: {
          identity: 1,
          build: 1,
          combat: 1,
          state: 1,
          weapons: 1,
          features: 1,
          creation: 1,
        },
      })),
    );
    const res = await create(cookie, { id: ids.uuid(), sheet: base });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('LIMIT_EXCEEDED');
  });
});

// ADR-010: fichas salvas no formato antigo (v1) continuam abrindo e salvando.
const v1Barbarian: unknown = JSON.parse(
  readFileSync(
    new URL('../../../../../packages/shared/src/sheet/fixtures/v1-barbarian.json', import.meta.url),
    'utf8',
  ),
);

const v2Barbarian: unknown = JSON.parse(
  readFileSync(
    new URL('../../../../../packages/shared/src/sheet/fixtures/v2-barbarian.json', import.meta.url),
    'utf8',
  ),
);

describe('fichas salvas em formatos antigos', () => {
  it('abre migrada, com as seções novas em 0, e salva já no formato novo', async () => {
    const { cookie, userId } = await loginAs(app, { email: 'ana@x.com' });
    const id = ids.uuid();
    await db.orm.insert(characters).values({
      id,
      ownerId: userId,
      name: 'Grum',
      rulesEdition: '2024',
      data: v1Barbarian,
      schemaVersion: 1,
      sectionRevs: {
        identity: 3,
        build: 1,
        combat: 1,
        state: 5,
        weapons: 1,
        features: 1,
        creation: 1,
      },
    });
    const opened = await app.inject({ url: `/api/v1/characters/${id}`, headers: { cookie } });
    expect(opened.statusCode).toBe(200);
    const doc = opened.json();
    expect(doc.sheet).toMatchObject({
      schemaVersion: LOCAL_SHEET_SCHEMA_VERSION,
      identity: { name: 'Grum' },
      progression: { classId: 'barbarian', levels: [] },
      spells: { cantrips: [], prepared: [] },
    });
    expect(doc.sectionRevs).toMatchObject({
      identity: 3,
      state: 5,
      progression: 0,
      spells: 0,
      inventory: 0,
    });

    const saved = await app.inject({
      method: 'PATCH',
      url: `/api/v1/characters/${id}`,
      headers: { cookie },
      payload: {
        sections: { spells: { ...doc.sheet.spells, cantrips: ['light'] } },
        baseRevs: { spells: 0 },
      },
    });
    expect(saved.statusCode).toBe(200);
    expect(saved.json().sectionRevs).toMatchObject({ spells: 1, identity: 3 });
    const [row] = await db.orm.select().from(characters);
    expect(row!.schemaVersion).toBe(LOCAL_SHEET_SCHEMA_VERSION);
    expect(row!.data).toMatchObject({
      schemaVersion: LOCAL_SHEET_SCHEMA_VERSION,
      spells: { cantrips: ['light'] },
    });
  });

  it('v2 (antes do inventário) abre com o inventário vazio e salva moedas e itens', async () => {
    const { cookie, userId } = await loginAs(app, { email: 'ana@x.com' });
    const id = ids.uuid();
    await db.orm.insert(characters).values({
      id,
      ownerId: userId,
      name: 'Grum',
      rulesEdition: '2024',
      data: v2Barbarian,
      schemaVersion: 2,
      sectionRevs: {
        identity: 1,
        build: 1,
        combat: 1,
        state: 1,
        weapons: 1,
        features: 1,
        creation: 1,
        progression: 1,
        spells: 1,
      },
    });
    const opened = await app.inject({ url: `/api/v1/characters/${id}`, headers: { cookie } });
    const doc = opened.json();
    expect(doc.sheet.inventory).toEqual({
      coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      items: [],
    });
    expect(doc.sectionRevs.inventory).toBe(0);

    const inventory = {
      coins: { cp: 0, sp: 0, ep: 0, gp: 29, pp: 0 },
      items: [{ id: 'kit', name: 'Kit de Aventureiro', quantity: 1, weightKg: 27.5 }],
    };
    const features = doc.sheet.features.map((f: { name: string }) => ({ ...f, source: 'other' }));
    const saved = await app.inject({
      method: 'PATCH',
      url: `/api/v1/characters/${id}`,
      headers: { cookie },
      payload: { sections: { inventory, features }, baseRevs: { inventory: 0, features: 1 } },
    });
    expect(saved.statusCode).toBe(200);
    expect(saved.json().sectionRevs).toMatchObject({ inventory: 1, features: 2 });
    const [row] = await db.orm.select().from(characters);
    expect(row!.schemaVersion).toBe(LOCAL_SHEET_SCHEMA_VERSION);
    expect(row!.data).toMatchObject({ inventory });
  });

  it('o navegador ainda com a versão antiga do site consegue criar (v1 vira a atual)', async () => {
    const { cookie } = await loginAs(app, { email: 'ana@x.com' });
    const res = await create(cookie, { id: ids.uuid(), sheet: v1Barbarian as never });
    expect(res.statusCode).toBe(201);
    expect(res.json().sheet.schemaVersion).toBe(LOCAL_SHEET_SCHEMA_VERSION);
  });
});

describe('autorização (plano v2, B8)', () => {
  it('ficha de outra pessoa "não existe": 404 ao abrir, salvar e excluir', async () => {
    const ana = await loginAs(app, { email: 'ana@x.com' });
    const bia = await loginAs(app, { email: 'bia@x.com' });
    const id = ids.uuid();
    await create(ana.cookie, { id, sheet: sheet('Da Ana') });

    const get = await app.inject({
      url: `/api/v1/characters/${id}`,
      headers: { cookie: bia.cookie },
    });
    const patch = await app.inject({
      method: 'PATCH',
      url: `/api/v1/characters/${id}`,
      headers: { cookie: bia.cookie },
      payload: { sections: { identity: sheet('Roubada').identity }, baseRevs: { identity: 1 } },
    });
    const del = await app.inject({
      method: 'DELETE',
      url: `/api/v1/characters/${id}`,
      headers: { cookie: bia.cookie },
    });
    for (const res of [get, patch, del]) {
      expect(res.statusCode).toBe(404);
      expect(res.json().code).toBe('NOT_FOUND');
    }
    const list = await app.inject({ url: '/api/v1/characters', headers: { cookie: bia.cookie } });
    expect(list.json().characters).toEqual([]);
    const own = await app.inject({
      url: `/api/v1/characters/${id}`,
      headers: { cookie: ana.cookie },
    });
    expect(own.json().sheet.identity.name).toBe('Da Ana');
  });

  it('criar com o id de uma ficha alheia não sobrescreve nada', async () => {
    const ana = await loginAs(app, { email: 'ana@x.com' });
    const bia = await loginAs(app, { email: 'bia@x.com' });
    const id = ids.uuid();
    await create(ana.cookie, { id, sheet: sheet('Da Ana') });
    const res = await create(bia.cookie, { id, sheet: sheet('Da Bia') });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('CONFLICT_ID');
  });

  it('id que não é UUID → 404', async () => {
    const { cookie } = await loginAs(app, { email: 'ana@x.com' });
    const res = await app.inject({ url: '/api/v1/characters/nao-e-uuid', headers: { cookie } });
    expect(res.statusCode).toBe(404);
  });
});

describe('salvar por seção (plano v2, 10.3)', () => {
  async function setup() {
    const { cookie } = await loginAs(app, { email: 'ana@x.com' });
    const id = ids.uuid();
    const created = (await create(cookie, { id, sheet: sheet('Thalia') })).json();
    const patch = (payload: object) =>
      app.inject({
        method: 'PATCH',
        url: `/api/v1/characters/${id}`,
        headers: { cookie },
        payload,
      });
    return { cookie, id, created, patch };
  }

  it('salva a seção, sobe só a revisão dela e atualiza a lista', async () => {
    const { created, patch, cookie } = await setup();
    const identity = { ...created.sheet.identity, name: 'Thalia, a Brava' };
    const res = await patch({ sections: { identity }, baseRevs: { identity: 1 } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      version: 2,
      sectionRevs: { identity: 2, build: 1, state: 1 },
      sheet: { identity: { name: 'Thalia, a Brava' } },
    });
    const list = await app.inject({ url: '/api/v1/characters', headers: { cookie } });
    expect(list.json().characters[0].name).toBe('Thalia, a Brava');
  });

  it('dois aparelhos em seções diferentes: os dois salvam, sem conflito', async () => {
    const { created, patch } = await setup();
    const notes = await patch({
      sections: { identity: { ...created.sheet.identity, description: 'do celular' } },
      baseRevs: { identity: 1 },
    });
    const hp = await patch({
      sections: { state: { ...created.sheet.state, inspiration: 1 } },
      baseRevs: { state: 1 },
    });
    expect(notes.statusCode).toBe(200);
    expect(hp.statusCode).toBe(200);
    expect(hp.json().sheet).toMatchObject({
      identity: { description: 'do celular' },
      state: { inspiration: 1 },
    });
  });

  it('mesma seção mudada em outro aparelho: 409 com a versão do servidor, nada gravado', async () => {
    const { created, patch, cookie, id } = await setup();
    await patch({
      sections: { identity: { ...created.sheet.identity, name: 'Do notebook' } },
      baseRevs: { identity: 1 },
    });
    const late = await patch({
      sections: {
        identity: { ...created.sheet.identity, name: 'Do celular' },
        state: { ...created.sheet.state, inspiration: 2 },
      },
      baseRevs: { identity: 1, state: 1 },
    });
    expect(late.statusCode).toBe(409);
    expect(late.json()).toMatchObject({
      code: 'CONFLICT_SECTION',
      details: {
        conflicts: [{ section: 'identity', serverRev: 2, server: { name: 'Do notebook' } }],
      },
    });
    const now = (await app.inject({ url: `/api/v1/characters/${id}`, headers: { cookie } })).json();
    expect(now.sheet.state.inspiration).toBe(0); // o lote inteiro foi recusado

    // O jogador escolhe "manter a minha": reenvia com a revisão do servidor.
    const keep = await patch({
      sections: { identity: { ...created.sheet.identity, name: 'Do celular' } },
      baseRevs: { identity: 2 },
    });
    expect(keep.statusCode).toBe(200);
    expect(keep.json().sheet.identity.name).toBe('Do celular');
  });

  it('seção sem revisão-base conta como conflito (nunca sobrescreve às cegas)', async () => {
    const { created, patch } = await setup();
    const res = await patch({ sections: { identity: created.sheet.identity }, baseRevs: {} });
    expect(res.statusCode).toBe(409);
  });

  it('conteúdo inválido numa seção → 400 e nada muda', async () => {
    const { created, patch } = await setup();
    const res = await patch({
      sections: { build: { ...created.sheet.build, level: 0 } },
      baseRevs: { build: 1 },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('VALIDATION_ERROR');
    const res2 = await patch({ sections: { kind: 'x' }, baseRevs: {} });
    expect(res2.statusCode).toBe(400);
  });

  it('descer de nível normaliza o PV e sobe a revisão do estado também', async () => {
    const { created, patch } = await setup();
    const up = await patch({
      sections: {
        build: { ...created.sheet.build, level: 5 },
        state: { ...created.sheet.state, hp: { current: 20, temp: 0 } },
      },
      baseRevs: { build: 1, state: 1 },
    });
    expect(up.json().sheet.state.hp.current).toBe(20); // nível 5 com d8: máximo 28
    const down = await patch({
      sections: { build: { ...created.sheet.build, level: 1 } },
      baseRevs: { build: 2 },
    });
    expect(down.statusCode).toBe(200);
    expect(down.json().sheet.state.hp.current).toBe(8);
    expect(down.json().sectionRevs).toMatchObject({ build: 3, state: 3 });
  });

  it('salvar algo igual ao que já está lá não cria versão nova', async () => {
    const { created, patch } = await setup();
    const res = await patch({
      sections: { identity: created.sheet.identity },
      baseRevs: { identity: 1 },
    });
    expect(res.json().version).toBe(1);
  });

  it('o registro do assistente de criação é uma seção como as outras', async () => {
    const { patch } = await setup();
    const creation = {
      version: 1,
      contentVersion: 'phb2024-1',
      classId: 'fighter',
      speciesId: 'human',
      backgroundId: 'soldier',
      abilityMethod: 'standard-array',
      baseAbilities: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
      backgroundBonus: { str: 2, con: 1 },
      classSkills: ['perception', 'survival'],
      extraSkills: [],
      originFeatId: 'savage-attacker',
      classEquipment: 'A',
      backgroundEquipment: 'A',
      languages: ['Comum', 'Anão'],
    };
    const res = await patch({ sections: { creation }, baseRevs: { creation: 1 } });
    expect(res.statusCode).toBe(200);
    expect(res.json().sheet.creation).toEqual(creation);
    expect(res.json().sectionRevs.creation).toBe(2);
  });
});

describe('excluir', () => {
  it('vai para a lixeira: some da lista e não abre mais', async () => {
    const { cookie } = await loginAs(app, { email: 'ana@x.com' });
    const id = ids.uuid();
    await create(cookie, { id, sheet: sheet('Tchau') });
    clock.advance(1000);
    const del = await app.inject({
      method: 'DELETE',
      url: `/api/v1/characters/${id}`,
      headers: { cookie },
    });
    expect(del.statusCode).toBe(204);
    expect(
      (await app.inject({ url: '/api/v1/characters', headers: { cookie } })).json().characters,
    ).toEqual([]);
    expect(
      (await app.inject({ url: `/api/v1/characters/${id}`, headers: { cookie } })).statusCode,
    ).toBe(404);
    const [row] = await db.orm.select().from(characters);
    expect(row!.deletedAt?.toISOString()).toBe('2026-10-08T12:00:01.000Z');
    // Excluir de novo: 404 (já não está ativa).
    const again = await app.inject({
      method: 'DELETE',
      url: `/api/v1/characters/${id}`,
      headers: { cookie },
    });
    expect(again.statusCode).toBe(404);
  });
});
