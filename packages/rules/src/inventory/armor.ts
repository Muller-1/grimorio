import type { Item, LocalSheet } from '@grimorio/shared';
import { itemKey } from './weights';

/**
 * Armaduras e Escudo (Livro do Jogador 2024, cap. 6), com os nomes da edição brasileira. A ficha
 * guarda os números na própria linha do Inventário (`item.armor`), então uma armadura feita pelo
 * jogador funciona igual; esta tabela só preenche os números quando o nome é o do livro.
 */

export type ArmorKind = 'light' | 'medium' | 'heavy' | 'shield';

export interface ArmorDef {
  id: string;
  name: string;
  kind: ArmorKind;
  /** CA base (escudo: bônus). */
  base: number;
  /** Teto do modificador de Destreza: `null` = sem teto; 0 = não soma. */
  dexCap: number | null;
  /** Força mínima; abaixo dela, −3 m de deslocamento. */
  strength?: number;
  stealthDisadvantage?: boolean;
}

export const ARMOR = {
  padded: {
    id: 'padded',
    name: 'Armadura Acolchoada',
    kind: 'light',
    base: 11,
    dexCap: null,
    stealthDisadvantage: true,
  },
  leather: { id: 'leather', name: 'Armadura de Couro', kind: 'light', base: 11, dexCap: null },
  'studded-leather': {
    id: 'studded-leather',
    name: 'Armadura de Couro Batido',
    kind: 'light',
    base: 12,
    dexCap: null,
  },
  hide: { id: 'hide', name: 'Gibão de Peles', kind: 'medium', base: 12, dexCap: 2 },
  'chain-shirt': {
    id: 'chain-shirt',
    name: 'Cota de Malha Parcial',
    kind: 'medium',
    base: 13,
    dexCap: 2,
  },
  'scale-mail': {
    id: 'scale-mail',
    name: 'Loriga de Escamas',
    kind: 'medium',
    base: 14,
    dexCap: 2,
    stealthDisadvantage: true,
  },
  breastplate: {
    id: 'breastplate',
    name: 'Couraça Peitoral',
    kind: 'medium',
    base: 14,
    dexCap: 2,
  },
  'half-plate': {
    id: 'half-plate',
    name: 'Armadura de Placas Parcial',
    kind: 'medium',
    base: 15,
    dexCap: 2,
    stealthDisadvantage: true,
  },
  'ring-mail': {
    id: 'ring-mail',
    name: 'Cota de Anéis',
    kind: 'heavy',
    base: 14,
    dexCap: 0,
    stealthDisadvantage: true,
  },
  'chain-mail': {
    id: 'chain-mail',
    name: 'Cota de Malha',
    kind: 'heavy',
    base: 16,
    dexCap: 0,
    strength: 13,
    stealthDisadvantage: true,
  },
  splint: {
    id: 'splint',
    name: 'Armadura de Tala',
    kind: 'heavy',
    base: 17,
    dexCap: 0,
    strength: 15,
    stealthDisadvantage: true,
  },
  plate: {
    id: 'plate',
    name: 'Armadura de Placas',
    kind: 'heavy',
    base: 18,
    dexCap: 0,
    strength: 15,
    stealthDisadvantage: true,
  },
  shield: { id: 'shield', name: 'Escudo', kind: 'shield', base: 2, dexCap: 0 },
} as const satisfies Record<string, ArmorDef>;

export type ArmorId = keyof typeof ARMOR;

const BY_KEY = new Map<string, ArmorDef>(Object.values(ARMOR).map((a) => [itemKey(a.name), a]));

/** Armadura do livro pelo nome do item ("Cota de Malha", "cota de malha"). */
export function knownArmor(name: string): ArmorDef | undefined {
  return BY_KEY.get(itemKey(name));
}

/** Os números que a linha do Inventário guarda. */
export function armorItemData(def: ArmorDef): NonNullable<Item['armor']> {
  return {
    kind: def.kind,
    base: def.base,
    ...(def.dexCap !== null && def.kind !== 'shield' ? { dexCap: def.dexCap } : {}),
    ...(def.strength ? { strength: def.strength } : {}),
    ...(def.stealthDisadvantage ? { stealthDisadvantage: true } : {}),
  };
}

/**
 * A ficha tem armadura do livro no Inventário ainda sem os números (de antes da tabela)? Aí o
 * site roda `upgradeSheetContent` ao abrir a ficha.
 */
export function needsArmorUpgrade(sheet: LocalSheet): boolean {
  return sheet.inventory.items.some((i) => !i.armor && knownArmor(i.name));
}
