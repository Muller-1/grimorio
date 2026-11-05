import { bookSubclassRevision, deriveSheet, type SheetDerived } from '@grimorio/rules';
import type { LocalSheet } from '@grimorio/shared';

/**
 * Valores derivados de cada versão da ficha, calculados uma vez só. A ficha do store nunca é
 * alterada no lugar (cada edição cria outra), então o próprio objeto serve de chave: todos os
 * painéis que mostram a mesma ficha, e a ação que vem depois, usam o mesmo cálculo. Fichas que
 * saem de uso somem do cache sozinhas.
 *
 * Quando chegam as subclasses do livro de uma classe (ADR-018), o que foi calculado antes não
 * vale mais: a revisão muda e a ficha é calculada de novo.
 */
const cache = new WeakMap<LocalSheet, { revision: number; derived: SheetDerived }>();

export function derivedOf(sheet: LocalSheet): SheetDerived {
  const revision = bookSubclassRevision();
  const hit = cache.get(sheet);
  if (hit && hit.revision === revision) return hit.derived;
  const derived = deriveSheet(sheet);
  cache.set(sheet, { revision, derived });
  return derived;
}
