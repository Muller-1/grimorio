/**
 * Maestria em Arma (Livro do Jogador 2024): no nível 1, Bárbaro, Guerreiro, Paladino, Guardião e
 * Ladino escolhem tipos de arma com que são proficientes e passam a usar a propriedade de
 * maestria delas.
 */
import { WEAPONS, type ClassDef, type WeaponDef, type WeaponId } from './content';

/** Proficiência com uma arma, conforme o treinamento da classe (e a Ordem escolhida). */
export function weaponProficient(
  cls: ClassDef,
  weapon: WeaponDef,
  martialFromOption: boolean,
): boolean {
  if (weapon.category === 'simple') return true;
  if (martialFromOption) return true;
  switch (cls.weaponTraining) {
    case 'simple':
      return false;
    case 'simple-martial':
      return true;
    case 'rogue':
      return weapon.finesse || weapon.light;
    case 'monk':
      return weapon.light;
  }
}

/** Armas que a classe pode escolher para a Maestria (vazio se a classe não tem a característica). */
export function masteryOptions(cls: ClassDef): WeaponId[] {
  const rule = cls.weaponMastery;
  if (!rule) return [];
  return (Object.keys(WEAPONS) as WeaponId[]).filter((id) => {
    const weapon: WeaponDef = WEAPONS[id];
    if (rule.melee && weapon.ranged) return false;
    return weaponProficient(cls, weapon, false);
  });
}

/** Sugestão: as armas do equipamento inicial escolhido que podem receber a maestria. */
export function suggestedMasteries(cls: ClassDef, equipment: 'A' | 'B' | 'C'): WeaponId[] {
  const options = new Set(masteryOptions(cls));
  const pack = cls.equipment.find((p) => p.option === equipment);
  const ids = (pack?.weapons ?? []).map((w) => w.id).filter((id) => options.has(id));
  return [...new Set(ids)].slice(0, cls.weaponMastery?.count ?? 0);
}
