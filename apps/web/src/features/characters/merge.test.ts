import {
  createBlankSheet,
  initialSectionRevs,
  type CharacterDocument,
  type LocalSheet,
} from '@grimorio/shared';
import { describe, expect, it } from 'vitest';
import { afterSave, dirtySections, openWithCache, planPatch, resolveConflicts } from './merge';

function sheet(edit: (s: LocalSheet) => void = () => {}): LocalSheet {
  const s = createBlankSheet();
  edit(s);
  return s;
}

function doc(s: LocalSheet, revs = initialSectionRevs()): CharacterDocument {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    version: 1,
    sectionRevs: revs,
    sheet: s,
    updatedAt: '2026-10-08T12:00:00.000Z',
  };
}

describe('junção da ficha da conta (plano v2, 10.3)', () => {
  it('o pedido leva só as seções mudadas, com a revisão de cada uma', () => {
    const base = sheet();
    const local = sheet((s) => {
      s.identity.name = 'Thalia';
      s.state.inspiration = 1;
    });
    const plan = planPatch({ base, local, revs: { ...initialSectionRevs(), identity: 4 } });
    expect(plan.dirty).toEqual(['identity', 'state']);
    expect(plan.baseRevs).toEqual({ identity: 4, state: 1 });
    expect(Object.keys(plan.sections)).toEqual(['identity', 'state']);
  });

  it('depois de salvar, edições feitas durante o envio continuam pendentes', () => {
    const base = sheet();
    const sent = sheet((s) => (s.identity.name = 'A'));
    const atSend = { base, local: sent, revs: initialSectionRevs() };
    const plan = planPatch(atSend);
    // Enquanto o pedido ia, o jogador mudou o nome de novo e as notas.
    const localNow = sheet((s) => {
      s.identity.name = 'AB';
      s.state.inspiration = 2;
    });
    const server = doc(sent, { ...initialSectionRevs(), identity: 2 });
    const after = afterSave(atSend, plan.sections, localNow, server);
    expect(after.base).toEqual(sent);
    expect(after.local.identity.name).toBe('AB');
    expect(after.local.state.inspiration).toBe(2);
    expect(dirtySections(after)).toEqual(['identity', 'state']);
  });

  it('depois de salvar, seções que o servidor mudou (e eu não) vêm do servidor', () => {
    const base = sheet();
    const local = sheet((s) => (s.identity.name = 'A'));
    const atSend = { base, local, revs: initialSectionRevs() };
    const plan = planPatch(atSend);
    // O outro aparelho tinha mudado as armas; o servidor devolve tudo junto.
    const server = doc(
      sheet((s) => {
        s.identity.name = 'A';
        s.features = [{ id: 'f', name: 'Fúria', text: '' }];
      }),
      { ...initialSectionRevs(), identity: 2, features: 2 },
    );
    const after = afterSave(atSend, plan.sections, local, server);
    expect(after.local.features).toHaveLength(1);
    expect(dirtySections(after)).toEqual([]);
  });

  it('ao abrir com alterações guardadas no aparelho: as sujas ficam, o resto vem do servidor', () => {
    const cacheBase = sheet();
    const cache = {
      base: cacheBase,
      local: sheet((s) => (s.state.inspiration = 3)),
      revs: initialSectionRevs(),
    };
    const server = doc(
      sheet((s) => (s.identity.name = 'Mudou no PC')),
      {
        ...initialSectionRevs(),
        identity: 5,
      },
    );
    const opened = openWithCache(server, cache);
    expect(opened.local.identity.name).toBe('Mudou no PC');
    expect(opened.local.state.inspiration).toBe(3);
    expect(opened.revs.identity).toBe(5);
    expect(opened.revs.state).toBe(1);
    expect(dirtySections(opened)).toEqual(['state']);
  });

  it('sem cache (ou sem nada pendente), abre a versão do servidor', () => {
    const server = doc(sheet((s) => (s.identity.name = 'S')));
    expect(openWithCache(server, null).local.identity.name).toBe('S');
    const clean = { base: sheet(), local: sheet(), revs: initialSectionRevs() };
    expect(openWithCache(server, clean).local.identity.name).toBe('S');
  });

  it('conflito: "usar a do servidor" troca a seção; "manter a minha" reenvia sobre a nova revisão', () => {
    const snapshot = {
      base: sheet(),
      local: sheet((s) => (s.identity.name = 'Minha')),
      revs: initialSectionRevs(),
    };
    const conflicts = [
      {
        section: 'identity' as const,
        serverRev: 3,
        server: sheet((s) => (s.identity.name = 'Deles')).identity,
      },
    ];
    const theirs = resolveConflicts(snapshot, conflicts, 'theirs');
    expect(theirs.local.identity.name).toBe('Deles');
    expect(dirtySections(theirs)).toEqual([]);
    const mine = resolveConflicts(snapshot, conflicts, 'mine');
    expect(mine.local.identity.name).toBe('Minha');
    expect(planPatch(mine).baseRevs).toEqual({ identity: 3 });
  });
});
