/**
 * Atalhos de rolagem com nome (RF-72), ex.: "Magia da mesa" → `100d2`.
 *
 * No R1 ficam no navegador; no R2 migram para a conta (tabela `roll_shortcuts`).
 * Por isso o formato tem número de versão desde já (plano de início, Etapa 7).
 * A expressão é guardada na forma canônica do motor (ex.: "2d6+3").
 *
 * A conferência é escrita à mão, sem o Zod: o rolador de dados (/dados) só precisa dela, e o
 * Zod sozinho pesa uns 26 kB no carregamento da página. As regras são as mesmas de um schema.
 */

export const ROLL_SHORTCUTS_SCHEMA_VERSION = 1;
export const ROLL_SHORTCUTS_LIMIT = 100;

export interface RollShortcut {
  /** 1 a 64 caracteres. */
  id: string;
  /** Nome do atalho, sem espaços nas pontas: 1 a 40 caracteres. */
  label: string;
  /** 1 a 200 caracteres. */
  expression: string;
  /** Data e hora ISO em UTC, ex.: "2026-09-22T12:00:00.000Z". */
  createdAt: string;
}

export interface RollShortcutsFile {
  schemaVersion: typeof ROLL_SHORTCUTS_SCHEMA_VERSION;
  shortcuts: RollShortcut[];
}

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z$/;

const sized = (value: unknown, min: number, max: number): value is string =>
  typeof value === 'string' && value.length >= min && value.length <= max;

function parseShortcut(raw: unknown): RollShortcut | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { id, label, expression, createdAt } = raw as Record<string, unknown>;
  const name = typeof label === 'string' ? label.trim() : label;
  if (!sized(id, 1, 64) || !sized(name, 1, 40) || !sized(expression, 1, 200)) return null;
  if (typeof createdAt !== 'string' || !ISO_UTC.test(createdAt)) return null;
  if (Number.isNaN(Date.parse(createdAt))) return null;
  return { id, label: name, expression, createdAt };
}

/** Lê o que foi salvo; devolve `null` se o formato não for reconhecido. */
export function parseRollShortcuts(raw: unknown): RollShortcut[] | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { schemaVersion, shortcuts } = raw as Record<string, unknown>;
  if (schemaVersion !== ROLL_SHORTCUTS_SCHEMA_VERSION || !Array.isArray(shortcuts)) return null;
  if (shortcuts.length > ROLL_SHORTCUTS_LIMIT) return null;
  const parsed: RollShortcut[] = [];
  for (const item of shortcuts) {
    const shortcut = parseShortcut(item);
    if (!shortcut) return null;
    parsed.push(shortcut);
  }
  return parsed;
}

export function serializeRollShortcuts(shortcuts: RollShortcut[]): RollShortcutsFile {
  return { schemaVersion: ROLL_SHORTCUTS_SCHEMA_VERSION, shortcuts };
}
