import { deriveSheet, type SheetDerived } from '@grimorio/rules';
import type { LocalSheet } from '@grimorio/shared';

/**
 * Valores derivados de cada versão da ficha, calculados uma vez só. A ficha do store nunca é
 * alterada no lugar (cada edição cria outra), então o próprio objeto serve de chave: todos os
 * painéis que mostram a mesma ficha, e a ação que vem depois, usam o mesmo cálculo. Fichas que
 * saem de uso somem do cache sozinhas.
 */
const cache = new WeakMap<LocalSheet, SheetDerived>();

export function derivedOf(sheet: LocalSheet): SheetDerived {
  let derived = cache.get(sheet);
  if (!derived) {
    derived = deriveSheet(sheet);
    cache.set(sheet, derived);
  }
  return derived;
}
