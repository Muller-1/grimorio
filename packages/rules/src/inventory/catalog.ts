import type { DamageType, Item, LocalSheet, Weapon } from '@grimorio/shared';
import { toSheetWeapon, weaponProperties } from '../creation/build';
import { CLASSES, WEAPONS, type ClassId, type WeaponId } from '../creation/content';
import { ARMOR, armorItemData, type ArmorKind } from './armor';
import { itemKey, KNOWN_ITEM_WEIGHTS, knownWeightKg } from './weights';

/**
 * Catálogo "Adicionar do livro" do Inventário: as armas, armaduras e o equipamento que o site já
 * conhece (cap. 6), com os números do livro. Só junta dados que já existiam; fica fora do pedaço
 * da ficha (carrega com o diálogo).
 */

export type CatalogKind = 'weapon' | 'armor' | 'gear';

export interface CatalogEntry {
  /** "weapon:longsword", "armor:chain-mail", "gear:kit de explorador". */
  id: string;
  kind: CatalogKind;
  name: string;
  /** Peso de uma unidade, em kg. */
  weightKg?: number;
  weapon?: { dice: string; damageType: DamageType; properties: string; martial: boolean };
  armor?: { kind: ArmorKind; base: number; dexCap: number | null };
}

let cache: CatalogEntry[] | undefined;

export function bookCatalog(): CatalogEntry[] {
  if (cache) return cache;
  const weight = (name: string) => {
    const kg = knownWeightKg(name);
    return kg === undefined ? {} : { weightKg: kg };
  };
  const weapons: CatalogEntry[] = Object.values(WEAPONS).map((w) => ({
    id: `weapon:${w.id}`,
    kind: 'weapon',
    name: w.name,
    ...weight(w.name),
    weapon: {
      dice: w.dice,
      damageType: w.damageType,
      properties: w.properties,
      martial: w.category === 'martial',
    },
  }));
  const armor: CatalogEntry[] = Object.values(ARMOR).map((a) => ({
    id: `armor:${a.id}`,
    kind: 'armor',
    name: a.name,
    ...weight(a.name),
    armor: { kind: a.kind, base: a.base, dexCap: a.dexCap },
  }));
  const taken = new Set([...weapons, ...armor].map((e) => itemKey(e.name)));
  // Ataque Desarmado está na tabela de pesos (peso 0), mas não é item.
  const gear: CatalogEntry[] = KNOWN_ITEM_WEIGHTS.filter(
    ([name]) => !taken.has(itemKey(name)) && !name.startsWith('Ataque Desarmado'),
  ).map(([name, kg]) => ({ id: `gear:${itemKey(name)}`, kind: 'gear', name, weightKg: kg }));
  const byName = (a: CatalogEntry, b: CatalogEntry) => a.name.localeCompare(b.name, 'pt-BR');
  cache = [...weapons.sort(byName), ...armor, ...gear.sort(byName)];
  return cache;
}

/** Busca sem acento e no singular ("flechas" acha Flecha), pelo nome e pelas propriedades das armas. */
export function searchCatalog(query: string, kind?: CatalogKind): CatalogEntry[] {
  const q = itemKey(query);
  return bookCatalog().filter(
    (e) =>
      (!kind || e.kind === kind) &&
      (q === '' || itemKey(`${e.name} ${e.weapon?.properties ?? ''}`).includes(q)),
  );
}

/**
 * O que entra na ficha: arma vai para as armas (proficiência e maestria pela classe, como no
 * assistente); armadura e equipamento vão para os itens (armadura já com CA, teto de Destreza e
 * Força do livro, guardada: o jogador veste quando quiser).
 */
export function catalogToSheet(
  entry: CatalogEntry,
  sheet: Pick<LocalSheet, 'progression' | 'creation'>,
  newId: () => string,
): { weapon: Weapon } | { item: Item } {
  if (entry.kind === 'weapon') {
    const def = WEAPONS[entry.id.slice('weapon:'.length) as WeaponId];
    const classId = (sheet.progression?.classId ?? sheet.creation?.classId) as ClassId | undefined;
    const cls = classId ? CLASSES[classId] : undefined;
    if (def && cls) {
      const option = cls.option?.choices.find((c) => c.id === sheet.creation?.classOptionId);
      const mastery = sheet.creation?.weaponMasteries?.includes(def.id) ?? false;
      return {
        weapon: toSheetWeapon(cls, def, 1, Boolean(option?.martialWeapons), mastery, newId),
      };
    }
    if (def) {
      // Ficha sem classe do assistente: o jogador marca a proficiência no editor da arma.
      return {
        weapon: {
          id: newId(),
          name: def.name,
          ability: def.ranged ? 'dex' : def.finesse ? 'finesse' : 'str',
          proficient: true,
          damageDice: def.dice,
          damageType: def.damageType,
          magicBonus: 0,
          critRange: 20,
          properties: def.properties,
          ...weaponProperties(def),
          ...(entry.weightKg !== undefined ? { weightKg: entry.weightKg } : {}),
        },
      };
    }
  }
  const armorDef =
    entry.kind === 'armor'
      ? Object.values(ARMOR).find((a) => `armor:${a.id}` === entry.id)
      : undefined;
  return {
    item: {
      id: newId(),
      name: entry.name,
      quantity: 1,
      ...(entry.weightKg !== undefined ? { weightKg: entry.weightKg } : {}),
      ...(armorDef ? { armor: armorItemData(armorDef), equipped: false } : {}),
    },
  };
}
