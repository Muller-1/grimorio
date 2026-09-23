import {
  ABILITY_KEYS,
  SKILL_ABILITY,
  SKILL_KEYS,
  type AbilityKey,
  type HitDieSides,
  type LocalSheet,
  type ProficiencyLevel,
  type SkillKey,
  type Weapon,
} from '@grimorio/shared';
import { parse } from '../dice';

/**
 * Valores derivados da ficha local. NUNCA são salvos: são recalculados a cada mudança
 * (plano v2, 9.1 — "guarde as escolhas, calcule o resto").
 *
 * O motor não produz texto: cada número vem com as partes que o compõem (`Explained`)
 * e a interface traduz (plano v2, 9.4).
 */

export type PartSource =
  | { kind: 'base' }
  | { kind: 'ability'; ability: AbilityKey }
  | { kind: 'proficiency'; level: ProficiencyLevel }
  | { kind: 'level' }
  | { kind: 'hit-die'; die: HitDieSides; levels: number }
  | { kind: 'magic' }
  | { kind: 'override' };

export interface ExplainedPart {
  source: PartSource;
  value: number;
}

export interface Explained {
  value: number;
  parts: ExplainedPart[];
}

export type SheetWarning =
  | { code: 'invalid-damage-dice'; weaponId: string }
  | { code: 'value-clamped'; field: string; from: number; to: number };

export interface AttackOption {
  weaponId: string;
  ability: AbilityKey;
  toHit: Explained;
  damageBonus: Explained;
  /** Expressão de dano pronta para rolar (ex.: "1d8+3"), ou `null` se o dado for inválido. */
  damageExpression: string | null;
  critRange: number;
}

export interface SheetDerived {
  level: number;
  proficiencyBonus: Explained;
  abilities: Record<AbilityKey, { score: number; mod: number }>;
  saves: Record<AbilityKey, { bonus: Explained; proficient: boolean }>;
  skills: Record<
    SkillKey,
    { ability: AbilityKey; bonus: Explained; proficiency: ProficiencyLevel }
  >;
  armorClass: Explained;
  initiative: Explained;
  speedFt: number;
  passivePerception: Explained;
  hpMax: Explained;
  hitDice: { die: HitDieSides; total: number; remaining: number };
  /** Desde o último descanso longo, ignorando eventos desfeitos. */
  hpTotals: { received: number; healed: number };
  attacks: AttackOption[];
  warnings: SheetWarning[];
}

/** Modificador = ⌊(valor − 10) / 2⌋. */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** Bônus de proficiência = 2 + ⌊(nível − 1) / 4⌋ (níveis 1 a 20). */
export function proficiencyBonusForLevel(level: number): number {
  const l = Math.min(20, Math.max(1, Math.floor(level)));
  return 2 + Math.floor((l - 1) / 4);
}

/** Valor da proficiência para um nível de proficiência (metade arredonda para baixo). */
export function proficiencyValue(prof: number, level: ProficiencyLevel): number {
  return Math.floor(prof * level);
}

/** Monta "base+mod" / "base-mod" / "base". */
export function withModifier(base: string, mod: number): string {
  if (mod === 0) return base;
  return mod > 0 ? `${base}+${mod}` : `${base}-${Math.abs(mod)}`;
}

function explained(parts: ExplainedPart[]): Explained {
  return { value: parts.reduce((sum, p) => sum + p.value, 0), parts };
}

/** Partes com valor 0 só atrapalham a explicação (exceto a primeira, que dá o contexto). */
function withoutZeros(parts: ExplainedPart[]): ExplainedPart[] {
  return parts.filter((p, i) => i === 0 || p.value !== 0);
}

function mapAbilities<T>(fn: (key: AbilityKey) => T): Record<AbilityKey, T> {
  return Object.fromEntries(ABILITY_KEYS.map((k) => [k, fn(k)])) as Record<AbilityKey, T>;
}

/** PV máximo pela média fixa do livro: dado cheio no 1º nível, (dado/2 + 1) nos seguintes. */
function averageHpMax(level: number, die: HitDieSides, conMod: number): Explained {
  const first = Math.max(1, die + conMod);
  const perLevel = Math.max(1, die / 2 + 1 + conMod);
  const later = (level - 1) * perLevel;
  // Explicação: dado de vida (sem Con) + Constituição × níveis, ajustando o mínimo de 1 por nível.
  const diceTotal = die + (level - 1) * (die / 2 + 1);
  const conTotal = first + later - diceTotal;
  return explained(
    withoutZeros([
      { source: { kind: 'hit-die', die, levels: level }, value: diceTotal },
      { source: { kind: 'ability', ability: 'con' }, value: conTotal },
    ]),
  );
}

function attackAbility(weapon: Weapon, mods: Record<AbilityKey, number>): AbilityKey {
  if (weapon.ability === 'finesse') return mods.dex > mods.str ? 'dex' : 'str';
  return weapon.ability;
}

export function deriveSheet(sheet: LocalSheet): SheetDerived {
  const warnings: SheetWarning[] = [];
  const level = sheet.build.level;
  const prof = proficiencyBonusForLevel(level);
  const proficiencyBonus = explained([{ source: { kind: 'level' }, value: prof }]);

  const abilities = mapAbilities((k) => {
    const score = sheet.build.abilities[k];
    return { score, mod: abilityModifier(score) };
  });
  const mods = mapAbilities((k) => abilities[k].mod);

  const saves = mapAbilities((k) => {
    const proficient = sheet.build.saveProficiencies.includes(k);
    const parts: ExplainedPart[] = [{ source: { kind: 'ability', ability: k }, value: mods[k] }];
    if (proficient) parts.push({ source: { kind: 'proficiency', level: 1 }, value: prof });
    return { bonus: explained(parts), proficient };
  });

  const skills = Object.fromEntries(
    SKILL_KEYS.map((skill) => {
      const ability = SKILL_ABILITY[skill];
      const proficiency = sheet.build.skillProficiencies[skill] ?? 0;
      const parts: ExplainedPart[] = [
        { source: { kind: 'ability', ability }, value: mods[ability] },
      ];
      if (proficiency > 0) {
        parts.push({
          source: { kind: 'proficiency', level: proficiency },
          value: proficiencyValue(prof, proficiency),
        });
      }
      return [skill, { ability, bonus: explained(parts), proficiency }];
    }),
  ) as SheetDerived['skills'];

  const armorClass =
    sheet.combat.armorClassOverride !== undefined
      ? explained([{ source: { kind: 'override' }, value: sheet.combat.armorClassOverride }])
      : explained([
          { source: { kind: 'base' }, value: 10 },
          { source: { kind: 'ability', ability: 'dex' }, value: mods.dex },
        ]);

  const initiative = explained([{ source: { kind: 'ability', ability: 'dex' }, value: mods.dex }]);

  const passivePerception = explained([
    { source: { kind: 'base' }, value: 10 },
    ...skills.perception.bonus.parts,
  ]);

  const hpMax =
    sheet.combat.hpMaxOverride !== undefined
      ? explained([{ source: { kind: 'override' }, value: sheet.combat.hpMaxOverride }])
      : averageHpMax(level, sheet.combat.hitDie, mods.con);

  const hitDice = {
    die: sheet.combat.hitDie,
    total: level,
    remaining: Math.max(0, level - sheet.state.hitDiceSpent),
  };

  const hpTotals = { received: 0, healed: 0 };
  for (const e of sheet.state.hpLog) {
    if (e.undone) continue;
    if (e.kind === 'damage') hpTotals.received += e.amount;
    if (e.kind === 'heal') hpTotals.healed += Math.max(0, e.effect.current);
  }

  const attacks = sheet.weapons.map((weapon): AttackOption => {
    const ability = attackAbility(weapon, mods);
    const magic: ExplainedPart[] =
      weapon.magicBonus !== 0 ? [{ source: { kind: 'magic' }, value: weapon.magicBonus }] : [];
    const toHitParts: ExplainedPart[] = [
      { source: { kind: 'ability', ability }, value: mods[ability] },
    ];
    if (weapon.proficient)
      toHitParts.push({ source: { kind: 'proficiency', level: 1 }, value: prof });
    const toHit = explained([...toHitParts, ...magic]);
    const damageBonus = explained([
      { source: { kind: 'ability', ability }, value: mods[ability] },
      ...magic,
    ]);

    const dice = weapon.damageDice.trim();
    const expression = withModifier(dice, damageBonus.value);
    const valid = dice !== '' && parse(expression).ok;
    if (!valid) warnings.push({ code: 'invalid-damage-dice', weaponId: weapon.id });

    return {
      weaponId: weapon.id,
      ability,
      toHit,
      damageBonus,
      damageExpression: valid ? expression : null,
      critRange: weapon.critRange,
    };
  });

  return {
    level,
    proficiencyBonus,
    abilities,
    saves,
    skills,
    armorClass,
    initiative,
    speedFt: sheet.combat.speedFt,
    passivePerception,
    hpMax,
    hitDice,
    hpTotals,
    attacks,
    warnings,
  };
}
