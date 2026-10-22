/**
 * Lista completa das magias do SRD 5.2 (ADR-010). Ponto de entrada próprio
 * (`@grimorio/rules/spells-data`) para o site baixar este arquivo só quando abre a parte de
 * magias. O resto do pacote não importa nada daqui.
 */
import type { SpellClass, SpellDef, SpellLevel } from '../types';
import { LEVEL_0 } from './level-0';
import { LEVEL_1 } from './level-1';
import { LEVEL_2 } from './level-2';
import { LEVEL_3 } from './level-3';
import { LEVEL_4 } from './level-4';
import { LEVEL_5 } from './level-5';
import { LEVEL_6 } from './level-6';
import { LEVEL_7 } from './level-7';
import { LEVEL_8 } from './level-8';
import { LEVEL_9 } from './level-9';

export { castRoll, spellTarget, type CastRoll, type SpellTarget } from './targeting';

/** Todas as magias, por círculo e depois pelo nome em português. */
export const SPELLS: readonly SpellDef[] = [
  ...LEVEL_0,
  ...LEVEL_1,
  ...LEVEL_2,
  ...LEVEL_3,
  ...LEVEL_4,
  ...LEVEL_5,
  ...LEVEL_6,
  ...LEVEL_7,
  ...LEVEL_8,
  ...LEVEL_9,
].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'pt-BR'));

const BY_ID: ReadonlyMap<string, SpellDef> = new Map(SPELLS.map((s) => [s.id, s]));

export function spellById(id: string): SpellDef | undefined {
  return BY_ID.get(id);
}

export interface SpellFilter {
  /** Uma ou mais listas de classe (Segredos Mágicos: Bardo + Clérigo + Druida + Mago). */
  classes?: readonly SpellClass[];
  /** Círculos aceitos (0 = truques). */
  levels?: readonly SpellLevel[];
  maxLevel?: number;
  ritual?: boolean;
  school?: string;
  /** Busca pelo nome, sem acento e sem diferenciar maiúsculas. */
  query?: string;
}

export function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function filterSpells(filter: SpellFilter): SpellDef[] {
  const q = filter.query ? normalizeSearch(filter.query) : '';
  const classes = filter.classes;
  return SPELLS.filter(
    (s) =>
      (!classes || s.classes.some((c) => classes.includes(c))) &&
      (!filter.levels || filter.levels.includes(s.level)) &&
      (filter.maxLevel === undefined || s.level <= filter.maxLevel) &&
      (filter.ritual === undefined || s.ritual === filter.ritual) &&
      (!filter.school || s.school === filter.school) &&
      (!q || normalizeSearch(s.name).includes(q)),
  );
}
