import type { Item, Weapon } from '@grimorio/shared';
import { itemKey, knownWeightKg, splitQuantity } from './weights';

/** Nome da característica que as fichas de antes do inventário usavam para o equipamento. */
export const STARTING_EQUIPMENT_FEATURE = 'Equipamento inicial';

const STARTING_TEXT =
  /^(?:(.+)\. )?(\d+) PO\. \(Classe: opção [ABC]; antecedente: opção [ABC]\. O ouro pode ser gasto em equipamento do capítulo 6\.\)$/;

/**
 * Lê o texto que o assistente escrevia em "Equipamento inicial" ("Machado Grande, 4 Machadinhas,
 * Kit de Aventureiro. 15 PO. (Classe: opção A; …)"). `null` se o jogador mudou o texto: aí a
 * característica fica como está.
 */
export function parseStartingEquipment(text: string): { items: string[]; gold: number } | null {
  const m = STARTING_TEXT.exec(text.trim());
  if (!m) return null;
  const items = (m[1] ?? '')
    .split(', ')
    .map((s) => s.trim())
    .filter(Boolean);
  return { items, gold: Number(m[2]) };
}

const weaponKey = (name: string) => itemKey(splitQuantity(name).name);

/**
 * Linhas do inventário a partir da lista do equipamento inicial. As armas ficam de fora: elas já
 * estão na ficha (aba Armas) e aparecem no inventário por lá. O cajado que é Foco Arcano é a
 * mesma arma Cajado: pesa uma vez só.
 */
export function startingItems(list: string[], weapons: Weapon[], newId: () => string): Item[] {
  const weaponKeys = new Set(weapons.map((w) => weaponKey(w.name)));
  const items: Item[] = [];
  for (const entry of list) {
    if (weaponKeys.has(weaponKey(entry))) continue;
    const { quantity, name } = splitQuantity(entry);
    const sameStaff = /\(cajado\)$/i.test(name) && weaponKeys.has(itemKey('Cajado'));
    const kg = sameStaff ? 0 : knownWeightKg(name);
    items.push({
      id: newId(),
      name: name.slice(0, 80),
      quantity,
      ...(kg !== undefined ? { weightKg: kg } : {}),
      ...(sameStaff ? { notes: 'É a arma Cajado (o peso conta lá).' } : {}),
    });
  }
  return items;
}
