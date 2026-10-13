import { z } from '../zod';
import { LocalSheetSchema, type LocalSheet } from './local-sheet';

/**
 * Seções da ficha que o servidor salva separadamente (plano v2, 10.1 e 10.3). Mudar duas seções
 * diferentes em dois aparelhos nunca gera conflito; só a MESMA seção mudada nos dois.
 *
 * Enquanto o canal de ações (plano v2, 10.2) não existe, `state` (PV, testes contra a morte...)
 * também é salvo como seção.
 */
export const SHEET_SECTIONS = [
  'identity',
  'build',
  'combat',
  'state',
  'weapons',
  'features',
  'creation',
] as const;
export type SheetSection = (typeof SHEET_SECTIONS)[number];

/** Revisão de cada seção. Começa em 1 quando o personagem é criado. */
export type SectionRevs = Record<SheetSection, number>;

export function initialSectionRevs(): SectionRevs {
  return Object.fromEntries(SHEET_SECTIONS.map((s) => [s, 1])) as SectionRevs;
}

/** Valor de uma seção numa ficha (`creation` pode não existir). */
export function sectionOf(sheet: LocalSheet, section: SheetSection): unknown {
  return sheet[section] ?? null;
}

/**
 * JSON com as chaves em ordem alfabética. O Postgres (JSONB) devolve as chaves numa ordem própria,
 * então comparar `JSON.stringify` direto acusaria mudança onde não há.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(value ?? null, (_key, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1)),
        )
      : v,
  );
}

/** Comparação estrutural (as seções são JSON puro; a ordem das chaves não importa). */
export function sameSection(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

/** Seções em que `next` difere de `base`. */
export function changedSections(base: LocalSheet, next: LocalSheet): SheetSection[] {
  return SHEET_SECTIONS.filter((s) => !sameSection(sectionOf(base, s), sectionOf(next, s)));
}

/** Cópia profunda de JSON puro (a ficha não tem datas, funções nem `undefined` relevantes). */
function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Copia as seções pedidas de `from` para uma cópia de `into`. */
export function withSections(
  into: LocalSheet,
  from: Partial<Record<SheetSection, unknown>>,
): unknown {
  const copy: Record<string, unknown> = cloneJson(into);
  for (const section of SHEET_SECTIONS) {
    if (!(section in from)) continue;
    const value = from[section];
    if (value === null || value === undefined) delete copy[section];
    else copy[section] = cloneJson(value);
  }
  return copy;
}

// ---------- contratos da API de personagens (plano v2, 13) ----------

const sectionRevsShape = Object.fromEntries(
  SHEET_SECTIONS.map((s) => [s, z.number().int().min(0)]),
) as Record<SheetSection, z.ZodNumber>;

export const SectionRevsSchema = z.object(sectionRevsShape);

export const CharacterSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  level: z.number().int(),
  classSummary: z.string(),
  rulesEdition: z.string(),
  version: z.number().int(),
  updatedAt: z.string(),
});
export type CharacterSummary = z.infer<typeof CharacterSummarySchema>;

export const CharacterListSchema = z.object({ characters: z.array(CharacterSummarySchema) });

export const CharacterDocumentSchema = z.object({
  id: z.uuid(),
  version: z.number().int(),
  sectionRevs: SectionRevsSchema,
  sheet: LocalSheetSchema,
  updatedAt: z.string(),
});
export type CharacterDocument = z.infer<typeof CharacterDocumentSchema>;

export const CreateCharacterBodySchema = z.object({
  /** Gerado no navegador (porta de ids): repetir o pedido não duplica. */
  id: z.uuid(),
  sheet: LocalSheetSchema,
});
export type CreateCharacterBody = z.infer<typeof CreateCharacterBodySchema>;

/** Cada seção chega crua: a validação é feita na ficha inteira, depois de juntar. */
export const PatchCharacterBodySchema = z.object({
  sections: z.partialRecord(z.enum(SHEET_SECTIONS), z.unknown()),
  baseRevs: z.partialRecord(z.enum(SHEET_SECTIONS), z.number().int().min(0)),
});
export type PatchCharacterBody = z.infer<typeof PatchCharacterBodySchema>;

export interface SectionConflict {
  section: SheetSection;
  serverRev: number;
  server: unknown;
}

/** Códigos de erro fixos da API (plano v2, 13). O site traduz o código. */
export const API_ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT_SECTION',
  'CONFLICT_ID',
  'LIMIT_EXCEEDED',
  'RATE_LIMITED',
  'INTERNAL',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
}

/** Usuário logado, como a API devolve em GET /api/v1/me. */
export const MeSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  displayName: z.string(),
  image: z.string().nullable(),
});
export type Me = z.infer<typeof MeSchema>;

/** Limites (plano v2, 11.6). */
export const MAX_CHARACTERS_PER_ACCOUNT = 50;
