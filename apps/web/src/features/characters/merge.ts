import {
  changedSections,
  sameSection,
  sectionOf,
  SHEET_SECTIONS,
  type CharacterDocument,
  type LocalSheet,
  type SectionRevs,
  type SheetSection,
} from '@grimorio/shared';

/**
 * Regras de junção da ficha da conta (plano v2, 10.3), puras e testáveis.
 *
 * - `base`: o que o servidor confirmou por último, seção a seção (pode misturar revisões).
 * - `revs`: a revisão do servidor em que cada seção de `base` se baseia.
 * - `local`: o que está na tela. Seção "suja" = diferente da base = ainda não foi salva.
 */
export interface SyncSnapshot {
  local: LocalSheet;
  base: LocalSheet;
  revs: SectionRevs;
}

export function dirtySections(snapshot: SyncSnapshot): SheetSection[] {
  return changedSections(snapshot.base, snapshot.local);
}

/** Monta uma ficha pegando cada seção de `a` ou de `b`. */
function compose(
  pick: (section: SheetSection) => 'a' | 'b',
  a: LocalSheet,
  b: LocalSheet,
): LocalSheet {
  const out: Record<string, unknown> = { ...a };
  for (const section of SHEET_SECTIONS) {
    const value = sectionOf(pick(section) === 'a' ? a : b, section);
    if (value === null || value === undefined) delete out[section];
    else out[section] = value;
  }
  return out as LocalSheet;
}

/** O pedido de salvamento: só as seções sujas, cada uma com a sua revisão-base. */
export function planPatch(snapshot: SyncSnapshot) {
  const dirty = dirtySections(snapshot);
  const sections: Partial<Record<SheetSection, unknown>> = {};
  const baseRevs: Partial<Record<SheetSection, number>> = {};
  for (const section of dirty) {
    // `creation` ausente vai como null (o servidor remove a seção).
    sections[section] = sectionOf(snapshot.local, section);
    baseRevs[section] = snapshot.revs[section];
  }
  return { dirty, sections, baseRevs };
}

/**
 * Depois de um salvamento aceito: a base vira a ficha do servidor. Na tela, cada seção vira a
 * do servidor, EXCETO as que o jogador mexeu enquanto o pedido estava no caminho (essas
 * continuam sujas e vão no próximo salvamento).
 */
export function afterSave(
  snapshotAtSend: SyncSnapshot,
  sent: Partial<Record<SheetSection, unknown>>,
  localNow: LocalSheet,
  server: CharacterDocument,
): SyncSnapshot {
  const local = compose(
    (section) => {
      const expected = section in sent ? sent[section] : sectionOf(snapshotAtSend.base, section);
      return sameSection(sectionOf(localNow, section), expected) ? 'b' : 'a';
    },
    localNow,
    server.sheet,
  );
  return { local, base: server.sheet, revs: server.sectionRevs };
}

/**
 * Ao abrir: havia alterações não enviadas guardadas neste aparelho? As seções sujas continuam
 * (com a base antiga, para o servidor detectar conflito); as demais vêm do servidor.
 */
export function openWithCache(server: CharacterDocument, cache: SyncSnapshot | null): SyncSnapshot {
  const fresh: SyncSnapshot = { local: server.sheet, base: server.sheet, revs: server.sectionRevs };
  if (!cache) return fresh;
  const dirty = new Set(dirtySections(cache));
  if (dirty.size === 0) return fresh;
  const fromCache = (section: SheetSection) => (dirty.has(section) ? 'a' : 'b');
  const revs = { ...server.sectionRevs };
  for (const section of dirty) revs[section] = cache.revs[section];
  return {
    local: compose(fromCache, cache.local, server.sheet),
    base: compose(fromCache, cache.base, server.sheet),
    revs,
  };
}

/**
 * Conflito resolvido pelo jogador:
 * - `theirs`: a seção fica como está no servidor (tela e base);
 * - `mine`: a seção da tela fica e vai de novo, agora sobre a revisão do servidor.
 */
export function resolveConflicts(
  snapshot: SyncSnapshot,
  conflicts: { section: SheetSection; serverRev: number; server: unknown }[],
  choice: 'mine' | 'theirs',
): SyncSnapshot {
  const local: Record<string, unknown> = { ...snapshot.local };
  const base: Record<string, unknown> = { ...snapshot.base };
  const revs = { ...snapshot.revs };
  for (const { section, serverRev, server } of conflicts) {
    revs[section] = serverRev;
    if (server === null || server === undefined) delete base[section];
    else base[section] = server;
    if (choice === 'theirs') {
      if (server === null || server === undefined) delete local[section];
      else local[section] = server;
    }
  }
  return { local: local as LocalSheet, base: base as LocalSheet, revs };
}
