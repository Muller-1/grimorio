import { z } from '../zod';

/**
 * Atalhos de rolagem com nome (RF-72), ex.: "Magia da mesa" → `100d2`.
 *
 * No R1 ficam no navegador; no R2 migram para a conta (tabela `roll_shortcuts`).
 * Por isso o formato tem número de versão desde já (plano de início, Etapa 7).
 * A expressão é guardada na forma canônica do motor (ex.: "2d6+3").
 */

export const ROLL_SHORTCUTS_SCHEMA_VERSION = 1;
export const ROLL_SHORTCUTS_LIMIT = 100;

export const RollShortcutSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().trim().min(1).max(40),
  expression: z.string().min(1).max(200),
  createdAt: z.iso.datetime(),
});

export const RollShortcutsFileSchema = z.object({
  schemaVersion: z.literal(ROLL_SHORTCUTS_SCHEMA_VERSION),
  shortcuts: z.array(RollShortcutSchema).max(ROLL_SHORTCUTS_LIMIT),
});

export type RollShortcut = z.infer<typeof RollShortcutSchema>;
export type RollShortcutsFile = z.infer<typeof RollShortcutsFileSchema>;

/** Lê o que foi salvo; devolve `null` se o formato não for reconhecido. */
export function parseRollShortcuts(raw: unknown): RollShortcut[] | null {
  const result = RollShortcutsFileSchema.safeParse(raw);
  return result.success ? result.data.shortcuts : null;
}

export function serializeRollShortcuts(shortcuts: RollShortcut[]): RollShortcutsFile {
  return { schemaVersion: ROLL_SHORTCUTS_SCHEMA_VERSION, shortcuts };
}
