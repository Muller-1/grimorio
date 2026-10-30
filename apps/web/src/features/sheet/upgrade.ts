import { upgradeSheetContent } from '@grimorio/rules';
import { useToastStore } from '@/features/toast/store';
import { te } from '@/lib/i18n/editors';
import { newId } from '@/ports/ids';
import { useSheetStore } from './store';

/**
 * Fichas antigas: marca de onde vem cada característica, passa o texto do "Equipamento inicial"
 * para o Inventário e dá os números do livro às armaduras (a CA passa a ser calculada). Carregado
 * sob demanda (precisa das listas das espécies e das classes), só quando a ficha aberta precisa.
 * Roda uma vez: depois disso não sobra o que organizar.
 */
export function upgradeOpenSheet(): void {
  const { sheet, edit } = useSheetStore.getState();
  const out = upgradeSheetContent(sheet, { newId });
  if (!out) return;
  edit((d) => {
    d.features = out.sheet.features;
    d.inventory = out.sheet.inventory;
    d.combat = out.sheet.combat;
    if (out.sheet.creation) d.creation = out.sheet.creation;
  });
  if (out.movedEquipment) useToastStore.getState().push(te.inventory.moved, 'info');
}
