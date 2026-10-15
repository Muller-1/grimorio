import type { SpellcastingView, SpellDef } from '@grimorio/rules';
import { spellById } from '@grimorio/rules/spells-data';
import type { GrantedSpell, LocalSheet } from '@grimorio/shared';

/** Onde a magia aparece na aba (a ficha guarda só os ids em cada lista). */
export type SpellSection = 'cantrips' | 'prepared' | 'granted' | 'spellbook';

export interface SheetSpellEntry {
  spell: SpellDef;
  section: SpellSection;
  granted?: GrantedSpell;
}

/** Usos grátis por descanso longo ficam em `state.resources` com este prefixo. */
export const FREE_USE_PREFIX = 'free:';

export function freeUsesLeft(sheet: LocalSheet, granted: GrantedSpell | undefined): number {
  const max = granted?.freePerLongRest ?? 0;
  if (!granted || max <= 0) return 0;
  return Math.max(0, max - (sheet.state.resources[`${FREE_USE_PREFIX}${granted.id}`] ?? 0));
}

/** Todas as magias da ficha, sem repetir (sempre preparadas > preparadas > grimório). */
export function sheetSpells(sheet: LocalSheet): SheetSpellEntry[] {
  const seen = new Set<string>();
  const out: SheetSpellEntry[] = [];
  const push = (id: string, section: SpellSection, granted?: GrantedSpell) => {
    const spell = spellById(id);
    if (!spell || seen.has(id)) return;
    seen.add(id);
    out.push({
      spell,
      section: spell.level === 0 ? 'cantrips' : section,
      ...(granted ? { granted } : {}),
    });
  };
  for (const g of sheet.spells.granted) push(g.id, 'granted', g);
  for (const id of sheet.spells.cantrips) push(id, 'cantrips');
  for (const id of sheet.spells.prepared) push(id, 'prepared');
  for (const id of sheet.spells.spellbook) push(id, 'spellbook');
  return out;
}

export interface CastOption {
  /** Valor do select: "1"…"9", "pact" ou "free". */
  value: string;
  circle: number;
  kind: 'slot' | 'pact' | 'free';
  available: boolean;
}

/** Com o que dá para conjurar a magia: espaços do círculo dela ou maiores, pacto ou uso grátis. */
export function castOptions(
  spell: SpellDef,
  sc: SpellcastingView | null,
  freeLeft: number,
): CastOption[] {
  if (spell.level === 0) return [];
  const out: CastOption[] = [];
  if (freeLeft > 0) out.push({ value: 'free', circle: spell.level, kind: 'free', available: true });
  for (const slot of sc?.slots ?? []) {
    if (slot.circle >= spell.level) {
      out.push({
        value: String(slot.circle),
        circle: slot.circle,
        kind: 'slot',
        available: slot.spent < slot.max,
      });
    }
  }
  if (sc?.pact && sc.pact.circle >= spell.level) {
    out.push({
      value: 'pact',
      circle: sc.pact.circle,
      kind: 'pact',
      available: sc.pact.spent < sc.pact.max,
    });
  }
  return out;
}
