import { derivedOf } from './derived';
import { useSheetStore } from './store';

/** Ficha salva + valores derivados (calculados uma vez por versão da ficha, ver `derivedOf`). */
export function useSheet() {
  const sheet = useSheetStore((s) => s.sheet);
  return { sheet, derived: derivedOf(sheet) };
}
