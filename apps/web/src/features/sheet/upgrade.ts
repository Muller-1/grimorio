import { upgradeSheetContent } from '@grimorio/rules';
import { useToastStore } from '@/features/toast/store';
import { ts } from '@/lib/i18n/sheet';
import { newId } from '@/ports/ids';
import { useSheetStore } from './store';

/**
 * Fichas de antes do inventário (v2): marca de onde vem cada característica e passa o texto do
 * "Equipamento inicial" para o Inventário. Carregado sob demanda (precisa das listas das
 * espécies), só quando a ficha aberta ainda tem característica sem origem. Roda uma vez: depois
 * disso toda característica tem origem.
 */
export function upgradeOpenSheet(): void {
  const { sheet, edit } = useSheetStore.getState();
  const out = upgradeSheetContent(sheet, { newId });
  if (!out) return;
  edit((d) => {
    d.features = out.sheet.features;
    d.inventory = out.sheet.inventory;
  });
  if (out.movedEquipment) useToastStore.getState().push(ts.inventory.moved, 'info');
}
