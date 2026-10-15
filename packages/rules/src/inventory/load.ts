import { COIN_KEYS, type Item, type LocalSheet, type Weapon } from '@grimorio/shared';
import { knownWeightKg, splitQuantity } from './weights';

/** Peso de uma arma da ficha (a linha "Machadinha (×4)" pesa as quatro). */
export function weaponWeightKg(weapon: Weapon): number | undefined {
  if (weapon.weightKg !== undefined) return weapon.weightKg;
  const { quantity, name } = splitQuantity(weapon.name);
  const unit = knownWeightKg(name);
  return unit === undefined ? undefined : unit * quantity;
}

/** Peso de uma unidade do item (o que o jogador escreveu ou o do livro). */
export function itemUnitWeightKg(item: Item): number | undefined {
  return item.weightKg ?? knownWeightKg(item.name);
}

/** 50 moedas pesam 0,5 kg (cap. 6). */
export const COIN_WEIGHT_KG = 0.01;

export interface CarryLoad {
  /** Tudo que está com o personagem: armas equipadas, itens carregados e moedas. */
  carriedKg: number;
  coinsKg: number;
  /** Capacidade de Carga: Força × 7,5 kg (Porte Poderoso do Golias: conta como Grande, × 15). */
  capacityKg: number;
  /** Arrastar, levantar ou empurrar: até o dobro da capacidade. */
  dragKg: number;
  multiplierKg: number;
  /** Acima da capacidade: só dá para arrastar ou empurrar (Deslocamento de até 1,5 m). */
  over: boolean;
  /** Acima do dobro: não dá nem para arrastar. */
  overDrag: boolean;
  /** Quantas coisas carregadas estão sem peso conhecido. */
  unknown: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function carryingLoad(sheet: LocalSheet): CarryLoad {
  let carried = 0;
  let unknown = 0;
  for (const w of sheet.weapons) {
    if (w.equipped === false) continue;
    const kg = weaponWeightKg(w);
    if (kg === undefined) unknown++;
    else carried += kg;
  }
  for (const item of sheet.inventory.items) {
    if (item.equipped === false || item.quantity === 0) continue;
    const kg = itemUnitWeightKg(item);
    if (kg === undefined) unknown++;
    else carried += kg * item.quantity;
  }
  const coins = COIN_KEYS.reduce((sum, k) => sum + sheet.inventory.coins[k], 0);
  const coinsKg = round2(coins * COIN_WEIGHT_KG);
  carried += coinsKg;
  const multiplierKg = sheet.creation?.speciesId === 'goliath' ? 15 : 7.5;
  const capacityKg = sheet.build.abilities.str * multiplierKg;
  const carriedKg = round2(carried);
  return {
    carriedKg,
    coinsKg,
    capacityKg,
    dragKg: capacityKg * 2,
    multiplierKg,
    over: carriedKg > capacityKg,
    overDrag: carriedKg > capacityKg * 2,
    unknown,
  };
}
