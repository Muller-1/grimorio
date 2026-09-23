import { deriveSheet } from '@grimorio/rules';
import { useMemo } from 'react';
import { useSheetStore } from './store';

/** Ficha salva + valores derivados (recalculados só quando a ficha muda). */
export function useSheet() {
  const sheet = useSheetStore((s) => s.sheet);
  const derived = useMemo(() => deriveSheet(sheet), [sheet]);
  return { sheet, derived };
}
