/**
 * Personagens salvos na conta (plano v2, 10.3, 11.4 e 13).
 *
 * - A autorização está DENTRO da consulta (`owner_id = usuário`): ficha de outra pessoa é
 *   simplesmente "não encontrada" (404), nunca "proibida" (plano v2, 6.3).
 * - Salvar é por SEÇÃO: cada seção enviada traz a revisão em que o aparelho se baseou. Se outra
 *   revisão já foi salva (outro aparelho), aquela seção volta como conflito e nada é gravado.
 * - Depois de juntar as seções, a ficha inteira é validada e normalizada (plano v2, 9.5) e as
 *   colunas da lista (nome, nível, classe) são atualizadas.
 */
import { normalizeSheet } from '@grimorio/rules';
import {
  initialSectionRevs,
  MAX_CHARACTERS_PER_ACCOUNT,
  sameSection,
  sectionOf,
  SHEET_SECTIONS,
  withSections,
  type CharacterDocument,
  type CharacterSummary,
  type LocalSheet,
  type PatchCharacterBody,
  type SectionConflict,
  type SectionRevs,
  type SheetSection,
  SheetInputSchema,
} from '@grimorio/shared';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import type { Orm } from '../../db/client';
import { characters, type CharacterRow } from '../../db/schema';
import type { Ports } from '../../ports';

export type CreateResult =
  | { kind: 'created' | 'existing'; document: CharacterDocument }
  | { kind: 'id-taken' }
  | { kind: 'limit' };

export type PatchResult =
  | { kind: 'saved'; document: CharacterDocument }
  | { kind: 'not-found' }
  | { kind: 'conflict'; conflicts: SectionConflict[] }
  | { kind: 'invalid'; issues: unknown };

/** Colunas que a lista mostra, tiradas da ficha (o servidor é dono delas). */
export function summaryColumns(sheet: LocalSheet) {
  return {
    name: sheet.identity.name.slice(0, 100),
    level: sheet.build.level,
    classSummary: sheet.identity.className.slice(0, 120),
    rulesEdition: sheet.rulesEdition,
    schemaVersion: sheet.schemaVersion,
  };
}

/**
 * A ficha da linha no formato atual. Linhas antigas são migradas na leitura (ADR-010); só são
 * regravadas no formato novo quando o jogador salvar alguma mudança.
 */
export function sheetOf(row: CharacterRow): LocalSheet {
  const parsed = SheetInputSchema.safeParse(row.data);
  // Só entra no banco ficha validada; se um dia falhar, é bug de migração (aparece no log).
  if (!parsed.success) throw new Error(`ficha ${row.id} não pôde ser migrada`);
  return parsed.data;
}

/** Revisões com todas as seções (as que não existiam quando a linha foi salva contam 0). */
export function revsOf(row: CharacterRow): SectionRevs {
  const revs = Object.fromEntries(SHEET_SECTIONS.map((s) => [s, 0])) as SectionRevs;
  return { ...revs, ...row.sectionRevs };
}

export function toDocument(row: CharacterRow): CharacterDocument {
  return {
    id: row.id,
    version: row.version,
    sectionRevs: revsOf(row),
    sheet: sheetOf(row),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toSummary(row: Pick<CharacterRow, keyof CharacterSummary> & { updatedAt: Date }) {
  return {
    id: row.id,
    name: row.name,
    level: row.level,
    classSummary: row.classSummary,
    rulesEdition: row.rulesEdition,
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
  } satisfies CharacterSummary;
}

const active = (ownerId: string, id?: string) =>
  and(
    eq(characters.ownerId, ownerId),
    isNull(characters.deletedAt),
    ...(id === undefined ? [] : [eq(characters.id, id)]),
  );

export function characterService(orm: Orm, ports: Ports) {
  return {
    async list(ownerId: string): Promise<CharacterSummary[]> {
      const rows = await orm
        .select({
          id: characters.id,
          name: characters.name,
          level: characters.level,
          classSummary: characters.classSummary,
          rulesEdition: characters.rulesEdition,
          version: characters.version,
          updatedAt: characters.updatedAt,
        })
        .from(characters)
        .where(active(ownerId))
        .orderBy(desc(characters.updatedAt));
      return rows.map(toSummary);
    },

    async get(ownerId: string, id: string): Promise<CharacterDocument | null> {
      const [row] = await orm.select().from(characters).where(active(ownerId, id));
      return row ? toDocument(row) : null;
    },

    async create(ownerId: string, id: string, input: LocalSheet): Promise<CreateResult> {
      return orm.transaction(async (tx) => {
        // Mesmo id de novo (clique duplo, reenvio): devolve o que já existe, sem duplicar.
        const [existing] = await tx.select().from(characters).where(eq(characters.id, id));
        if (existing) {
          return existing.ownerId === ownerId && !existing.deletedAt
            ? { kind: 'existing', document: toDocument(existing) }
            : { kind: 'id-taken' };
        }
        // Trava as fichas do dono para a contagem do limite não "furar" com pedidos simultâneos.
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${ownerId}))`);
        const count = await tx.$count(characters, active(ownerId));
        if (count >= MAX_CHARACTERS_PER_ACCOUNT) return { kind: 'limit' };

        const sheet = normalizeSheet(input).sheet;
        const now = ports.clock.now();
        const [row] = await tx
          .insert(characters)
          .values({
            id,
            ownerId,
            data: sheet,
            sectionRevs: initialSectionRevs(),
            version: 1,
            createdAt: now,
            updatedAt: now,
            ...summaryColumns(sheet),
          })
          .returning();
        return { kind: 'created', document: toDocument(row!) };
      });
    },

    async patch(ownerId: string, id: string, body: PatchCharacterBody): Promise<PatchResult> {
      return orm.transaction(async (tx) => {
        const [row] = await tx.select().from(characters).where(active(ownerId, id)).for('update');
        if (!row) return { kind: 'not-found' };

        const current = sheetOf(row);
        const currentRevs = revsOf(row);
        const sent = SHEET_SECTIONS.filter((s) => s in body.sections);
        const conflicts: SectionConflict[] = [];
        for (const section of sent) {
          const serverRev = currentRevs[section];
          const base = body.baseRevs[section];
          if (base !== serverRev) {
            conflicts.push({ section, serverRev, server: sectionOf(current, section) });
          }
        }
        if (conflicts.length > 0) return { kind: 'conflict', conflicts };

        const merged = SheetInputSchema.safeParse(withSections(current, body.sections));
        if (!merged.success) return { kind: 'invalid', issues: merged.error.issues };
        const sheet = normalizeSheet(merged.data).sheet;

        // Sobe a revisão de toda seção que mudou de fato (inclusive as que a normalização mexeu).
        const revs: SectionRevs = { ...currentRevs };
        const changed: SheetSection[] = SHEET_SECTIONS.filter(
          (s) => !sameSection(sectionOf(current, s), sectionOf(sheet, s)),
        );
        if (changed.length === 0) return { kind: 'saved', document: toDocument(row) };
        for (const section of changed) revs[section] = (revs[section] ?? 0) + 1;

        const [updated] = await tx
          .update(characters)
          .set({
            data: sheet,
            sectionRevs: revs,
            version: row.version + 1,
            updatedAt: ports.clock.now(),
            ...summaryColumns(sheet),
          })
          .where(eq(characters.id, id))
          .returning();
        return { kind: 'saved', document: toDocument(updated!) };
      });
    },

    /** Vai para a lixeira (apagada de vez depois de 30 dias, plano v2, 11.6). */
    async remove(ownerId: string, id: string): Promise<boolean> {
      const rows = await orm
        .update(characters)
        .set({ deletedAt: ports.clock.now() })
        .where(active(ownerId, id))
        .returning({ id: characters.id });
      return rows.length > 0;
    },
  };
}

export type CharacterService = ReturnType<typeof characterService>;
