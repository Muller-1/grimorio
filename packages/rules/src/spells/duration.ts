import type { EffectDuration } from '@grimorio/shared';

/**
 * Duração da magia a partir do texto do livro ("Concentração, até 1 minuto", "8 horas",
 * "1 rodada"). `null` quando não há tempo para contar: Instantânea, Até ser dissipada, Especial.
 */
export function parseSpellDuration(text: string): EffectDuration | null {
  const m = /(\d+)\s*(rodada|minuto|hora|dia)s?\b/i.exec(text);
  if (!m) return null;
  const units = { rodada: 'round', minuto: 'minute', hora: 'hour', dia: 'day' } as const;
  return { amount: Number(m[1]), unit: units[m[2]!.toLowerCase() as keyof typeof units] };
}

const ROUNDS_PER = { round: 1, minute: 10, hour: 600, day: 14_400 } as const;

/** Quantas rodadas de 6 segundos cabem na duração. */
export function durationInRounds(d: EffectDuration): number {
  return d.amount * ROUNDS_PER[d.unit];
}
