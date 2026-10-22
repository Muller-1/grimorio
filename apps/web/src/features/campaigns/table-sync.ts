import { applyGameAction } from '@grimorio/rules/campaign';
import {
  SHEET_SECTIONS,
  sectionOf,
  type CharacterDocument,
  type LocalSheet,
  type SheetSection,
} from '@grimorio/shared';
import {
  UpdatesResponseSchema,
  type CharacterEvent,
  type UpdatesResponse,
} from '@grimorio/shared/campaign';
import { dirtySections, type SyncSnapshot } from '@/features/characters/merge';
import { adoptRemote, currentSync } from '@/features/characters/sync';
import { campaignApi } from './api';

/**
 * A ficha da conta numa campanha (docs/plano-escala-e-campanha.md, 2.2 e 2.4): a mestre (ou uma
 * cura aceita) muda o estado de jogo no servidor; o aparelho da dona recebe essas AÇÕES e as
 * reaplica sobre o que está na tela. As duas mudanças ficam, sem perguntar nada.
 */

/** Reaplica as ações, na ordem, com o mesmo id e horário do servidor (o histórico fica igual). */
export function replayEvents(sheet: LocalSheet, events: CharacterEvent[]): LocalSheet {
  return events.reduce(
    (s, e) => applyGameAction(s, e.action, { now: e.at, actionId: e.actionId }).sheet,
    sheet,
  );
}

function setSection(target: Record<string, unknown>, section: SheetSection, value: unknown) {
  if (value === null || value === undefined) delete target[section];
  else target[section] = value;
}

/**
 * Junta o que está na tela com a ficha nova do servidor.
 * - Seção que o jogador não mexeu: vem do servidor.
 * - Seção mexida aqui e que o servidor não mudou: fica a daqui.
 * - Estado de jogo mexido aqui E mudado no servidor só por ações: as ações são reaplicadas sobre
 *   o que está na tela.
 * - Qualquer outra mudança dos dois lados: fica a daqui com a base antiga, e o servidor acusa o
 *   conflito no próximo salvamento (a escolha continua com o jogador, como antes).
 */
export function withRemote(
  snapshot: SyncSnapshot,
  knownVersion: number,
  server: CharacterDocument,
  events: CharacterEvent[],
  truncated: boolean,
): SyncSnapshot {
  const dirty = new Set(dirtySections(snapshot));
  const versions = new Set(events.map((e) => e.version));
  let onlyActions = !truncated;
  for (let v = knownVersion + 1; v <= server.version; v++)
    if (!versions.has(v)) onlyActions = false;
  const replayed = onlyActions && dirty.has('state') ? replayEvents(snapshot.local, events) : null;

  const local: Record<string, unknown> = { ...server.sheet };
  const base: Record<string, unknown> = { ...server.sheet };
  const revs = { ...server.sectionRevs };
  for (const section of SHEET_SECTIONS) {
    if (!dirty.has(section)) continue;
    const serverChanged = server.sectionRevs[section] !== snapshot.revs[section];
    if (!serverChanged) {
      setSection(local, section, sectionOf(snapshot.local, section));
    } else if (section === 'state' && replayed) {
      setSection(local, section, sectionOf(replayed, section));
    } else {
      setSection(local, section, sectionOf(snapshot.local, section));
      setSection(base, section, sectionOf(snapshot.base, section));
      revs[section] = snapshot.revs[section];
    }
  }
  return {
    local: local as LocalSheet,
    base: base as LocalSheet,
    revs,
    version: server.version,
  };
}

/** O que a ficha precisa saber da mesa: em que campanha está e as curas esperando a dona. */
export type TableState = Pick<UpdatesResponse, 'campaign' | 'proposals'> & {
  /** Ações de outras pessoas que acabaram de chegar (para avisar na tela). */
  arrived: CharacterEvent[];
};

/**
 * Pergunta ao servidor o que mudou e junta com a tela. Devolve o estado da mesa, ou `null` se
 * não deu (sem rede, ficha trocada, salvamento no caminho).
 */
export async function pullUpdates(id: string): Promise<TableState | null> {
  const open = currentSync();
  if (!open || open.id !== id || open.snapshot.version === undefined) return null;
  const known = open.snapshot.version;
  const result = await campaignApi.updates(id, known);
  if (!result.ok) return null;
  const parsed = UpdatesResponseSchema.safeParse(result.data);
  if (!parsed.success) return null;
  const { document, events, truncated, campaign, proposals } = parsed.data;
  let arrived: CharacterEvent[] = [];
  if (document) {
    const now = currentSync();
    // Só junta se nada mudou por aqui enquanto a resposta vinha (senão, na próxima rodada).
    if (!now || now.id !== id || now.busy || now.snapshot.version !== known) {
      return { campaign, proposals, arrived };
    }
    if (!adoptRemote(id, withRemote(now.snapshot, known, document, events, truncated))) {
      return { campaign, proposals, arrived };
    }
    arrived = events.filter((e) => e.actor.role !== 'owner');
  }
  return { campaign, proposals, arrived };
}
