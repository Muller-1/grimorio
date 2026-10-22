import { applyGameAction } from '@grimorio/rules/campaign';
import {
  createBlankSheet,
  initialSectionRevs,
  type CharacterDocument,
  type LocalSheet,
} from '@grimorio/shared';
import type { CharacterEvent, GameAction } from '@grimorio/shared/campaign';
import { describe, expect, it, vi } from 'vitest';
import { dirtySections, type SyncSnapshot } from '@/features/characters/merge';

vi.stubGlobal('__APP_VERSION__', '0.1.0');
vi.stubGlobal('__APP_COMMIT__', 'teste');
const { withRemote } = await import('./table-sync');

const AT = '2026-10-22T21:14:00.000Z';

function kaela(): LocalSheet {
  const s = createBlankSheet();
  s.identity.name = 'Kaela';
  s.combat.hpMaxOverride = 30;
  s.state.hp.current = 30;
  return s;
}

function event(n: number, action: GameAction, version: number): CharacterEvent {
  return {
    actionId: `00000000-0000-4000-8000-00000000000${n}`,
    action,
    version,
    at: AT,
    actor: { name: 'Ana', role: 'dm' },
  };
}

/** A ficha do servidor depois das ações (o que a API devolveria). */
function serverAfter(base: LocalSheet, events: CharacterEvent[], revs = initialSectionRevs()) {
  const sheet = events.reduce(
    (s, e) => applyGameAction(s, e.action, { now: e.at, actionId: e.actionId }).sheet,
    base,
  );
  const doc: CharacterDocument = {
    id: '00000000-0000-4000-8000-000000000099',
    version: 1 + events.length,
    sectionRevs: { ...revs, state: revs.state + (events.length ? 1 : 0) },
    sheet,
    updatedAt: AT,
  };
  return doc;
}

function opened(): SyncSnapshot {
  const base = kaela();
  return { local: base, base, revs: initialSectionRevs(), version: 1 };
}

describe('ficha da conta na mesa: juntar o que a mestre fez com o que está na tela', () => {
  it('sem mudanças aqui: fica a ficha do servidor', () => {
    const snap = opened();
    const dmg = event(1, { type: 'damage', amount: 7 }, 2);
    const server = serverAfter(snap.base, [dmg]);
    const next = withRemote(snap, 1, server, [dmg], false);
    expect(next.local.state.hp.current).toBe(23);
    expect(dirtySections(next)).toEqual([]);
    expect(next.version).toBe(2);
  });

  it('a jogadora gastou um espaço e a mestre aplicou dano: as duas coisas ficam', () => {
    const snap = opened();
    snap.local = structuredClone(snap.local);
    snap.local.state.slotsSpent = [1, 0, 0, 0, 0, 0, 0, 0, 0];
    const dmg = event(1, { type: 'damage', amount: 7 }, 2);
    const server = serverAfter(snap.base, [dmg]);
    const next = withRemote(snap, 1, server, [dmg], false);
    expect(next.local.state.hp.current).toBe(23);
    expect(next.local.state.slotsSpent[0]).toBe(1);
    // A base é a do servidor: só o espaço gasto continua para salvar, e sem conflito.
    expect(next.base.state.hp.current).toBe(23);
    expect(next.revs.state).toBe(server.sectionRevs.state);
    expect(dirtySections(next)).toEqual(['state']);
  });

  it('mudança que não veio por ação (outro aparelho): mantém a base antiga para o conflito', () => {
    const snap = opened();
    snap.local = { ...snap.local, identity: { ...snap.local.identity, description: 'Aqui' } };
    const other = kaela();
    other.identity.description = 'No celular';
    const server: CharacterDocument = {
      id: '00000000-0000-4000-8000-000000000099',
      version: 2,
      sectionRevs: { ...initialSectionRevs(), identity: 2 },
      sheet: other,
      updatedAt: AT,
    };
    const next = withRemote(snap, 1, server, [], false);
    expect(next.local.identity.description).toBe('Aqui');
    expect(next.base.identity.description).toBe(snap.base.identity.description);
    expect(next.revs.identity).toBe(1);
  });

  it('com eventos faltando (muitos atrás), o estado de jogo não é reaplicado às cegas', () => {
    const snap = opened();
    snap.local = structuredClone(snap.local);
    snap.local.state.slotsSpent = [1, 0, 0, 0, 0, 0, 0, 0, 0];
    const dmg = event(1, { type: 'damage', amount: 7 }, 2);
    const server = serverAfter(snap.base, [dmg]);
    const next = withRemote(snap, 1, server, [], true);
    expect(next.local.state.hp.current).toBe(30);
    expect(next.revs.state).toBe(snap.revs.state);
  });
});
