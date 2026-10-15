import {
  ABILITY_KEYS,
  SKILL_ABILITY,
  SKILL_KEYS,
  type AbilityKey,
  type DamageType,
  type HitDieSides,
  type LocalSheet,
  type ProficiencyLevel,
  type SkillKey,
  type Weapon,
} from '@grimorio/shared';
import type { AdvantageTarget, AttackFilter } from '../classes/types';
import { parse } from '../dice';
import { withModifier } from '../dice/modifier';

export { withModifier };
import { characterEngine, type CharacterEngine, type SourcedEffect } from '../engine/character';
import { evalDice, evalScaling } from '../engine/scaling';
import { spellcastingView, type SpellcastingView } from '../spells/casting';

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
  /** `rolled`: quantos níveis usaram o dado rolado em vez da média. */
  | { kind: 'hit-die'; die: HitDieSides; levels: number; rolled?: number }
  | { kind: 'magic' }
  /** Traço de espécie ou talento (ex.: Tenacidade Anã). */
  | { kind: 'trait' }
  | { kind: 'override' }
  /** Característica, habilidade ligada ou magia (o nome vem do conteúdo das regras). */
  | { kind: 'effect'; name: string };

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

/** Dados extras de dano que valem para uma arma (Fúria não; Frenesi, Ataque Furtivo, Bênção…). */
export interface ExtraDamage {
  name: string;
  dice: string;
  damageType?: DamageType;
  /** Só no primeiro acerto do turno (Frenesi, Ataque Furtivo). */
  oncePerTurn: boolean;
}

export interface AttackOption {
  weaponId: string;
  ability: AbilityKey;
  toHit: Explained;
  /** Jogada de ataque pronta para rolar: "1d20+5", com Bênção "1d20+5+1d4". */
  attackExpression: string;
  /** Vantagem por alguma habilidade ligada (Ataque Imprudente). */
  advantage: boolean;
  damageBonus: Explained;
  /** Expressão de dano pronta para rolar (ex.: "1d8+3"), ou `null` se o dado for inválido. */
  damageExpression: string | null;
  /** Dano do primeiro acerto do turno, com os extras "uma vez por turno" (ou `null`). */
  firstHitExpression: string | null;
  extraDamage: ExtraDamage[];
  critRange: number;
}

export interface SourcedNote {
  text: string;
  source: string;
}

export interface SheetDerived {
  level: number;
  proficiencyBonus: Explained;
  abilities: Record<AbilityKey, { score: number; mod: number }>;
  saves: Record<
    AbilityKey,
    { bonus: Explained; proficient: boolean; advantage: boolean; bonusDice: string[] }
  >;
  skills: Record<
    SkillKey,
    { ability: AbilityKey; bonus: Explained; proficiency: ProficiencyLevel; advantage: boolean }
  >;
  armorClass: Explained;
  initiative: Explained;
  initiativeAdvantage: boolean;
  speedFt: number;
  resistances: { type: DamageType; source: string }[];
  /** Lembretes das habilidades e magias ativas ("Ataques contra você têm Vantagem"). */
  notes: SourcedNote[];
  /** Classe, características, recursos e o que dá para ligar (ADR-010). */
  engine: CharacterEngine;
  spellcasting: SpellcastingView | null;
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

/**
 * PV máximo (Livro do Jogador, Avanço de Nível): dado cheio no 1º nível; em cada nível seguinte,
 * o resultado rolado do Dado de Vida (guardado na progressão) ou a média fixa (dado/2 + 1).
 * A Constituição vale para todos os níveis, com mínimo de 1 PV por nível.
 */
function hpMaxFromLevels(
  level: number,
  die: HitDieSides,
  conMod: number,
  rolled: ReadonlyMap<number, number>,
  bonusPerLevel = 0,
): Explained {
  const average = die / 2 + 1;
  let diceTotal = die;
  let total = Math.max(1, die + conMod);
  let rolledLevels = 0;
  for (let l = 2; l <= level; l++) {
    const roll = rolled.get(l);
    if (roll !== undefined) rolledLevels++;
    const value = roll ?? average;
    diceTotal += value;
    total += Math.max(1, value + conMod);
  }
  // Explicação: dados de vida (sem Con) + Constituição × níveis, ajustando o mínimo de 1 por nível.
  return explained(
    withoutZeros([
      { source: { kind: 'hit-die', die, levels: level, rolled: rolledLevels }, value: diceTotal },
      { source: { kind: 'ability', ability: 'con' }, value: total - diceTotal },
      { source: { kind: 'trait' }, value: bonusPerLevel * level },
    ]),
  );
}

function attackAbility(weapon: Weapon, mods: Record<AbilityKey, number>): AbilityKey {
  if (weapon.ability === 'finesse') return mods.dex > mods.str ? 'dex' : 'str';
  return weapon.ability;
}

/**
 * O efeito vale para esta arma? A ficha não guarda o alcance da arma: Destreza fixa conta como
 * à distância (é como o assistente monta arcos e bestas); Acuidade e Força, como corpo a corpo.
 */
function matchesWeapon(filter: AttackFilter | undefined, weapon: Weapon, ability: AbilityKey) {
  if (!filter) return true;
  const ranged = weapon.ability === 'dex';
  if (filter.ability && filter.ability !== ability) return false;
  if (filter.range === 'melee' && ranged) return false;
  if (filter.range === 'ranged' && !ranged) return false;
  if (filter.finesseOrRanged && weapon.ability === 'str') return false;
  return true;
}

function hasAdvantage(effects: SourcedEffect[], target: AdvantageTarget): boolean {
  return effects.some((e) => e.effect.type === 'advantage' && e.effect.on.includes(target));
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

  // Classe, recursos e efeitos ligados agora (passivos, Fúria, Bênção…).
  const engine = characterEngine(sheet, mods, prof);
  const effects = engine.effects;
  const value = (v: Parameters<typeof evalScaling>[0]) => evalScaling(v, engine.scaling);
  const effectPart = (e: SourcedEffect, v: number): ExplainedPart => ({
    source: { kind: 'effect', name: e.source.name },
    value: v,
  });
  const of = <T extends SourcedEffect['effect']['type']>(type: T) =>
    effects.filter(
      (e): e is SourcedEffect & { effect: Extract<SourcedEffect['effect'], { type: T }> } =>
        e.effect.type === type,
    );

  const extraSaveProf = new Set(of('save-proficiency').flatMap((e) => e.effect.on));
  const rollDice = of('roll-bonus-dice');
  const saves = mapAbilities((k) => {
    const proficient = sheet.build.saveProficiencies.includes(k) || extraSaveProf.has(k);
    const parts: ExplainedPart[] = [{ source: { kind: 'ability', ability: k }, value: mods[k] }];
    if (proficient) parts.push({ source: { kind: 'proficiency', level: 1 }, value: prof });
    for (const e of of('save-bonus')) {
      if (!e.effect.on || e.effect.on.includes(k)) parts.push(effectPart(e, value(e.effect.value)));
    }
    return {
      bonus: explained(parts),
      proficient,
      advantage: hasAdvantage(effects, `save:${k}`),
      bonusDice: rollDice.filter((e) => e.effect.on.includes('save')).map((e) => e.effect.dice),
    };
  });

  const halfProf = of('half-proficiency-checks').length > 0;
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
      } else if (halfProf) {
        parts.push({ source: { kind: 'proficiency', level: 0.5 }, value: Math.floor(prof / 2) });
      }
      return [
        skill,
        {
          ability,
          bonus: explained(parts),
          proficiency,
          advantage: hasAdvantage(effects, `check:${ability}`),
        },
      ];
    }),
  ) as SheetDerived['skills'];

  // CA: ajuste manual (armadura do assistente) ou 10 + Destreza; fórmulas alternativas
  // (Armadura Arcana) valem se forem maiores; bônus (Escudo da Fé) somam; mínimos (Pele-Casca).
  let acParts: ExplainedPart[] =
    sheet.combat.armorClassOverride !== undefined
      ? [{ source: { kind: 'override' }, value: sheet.combat.armorClassOverride }]
      : [
          { source: { kind: 'base' }, value: 10 },
          { source: { kind: 'ability', ability: 'dex' }, value: mods.dex },
        ];
  for (const e of of('ac-formula')) {
    const alt: ExplainedPart[] = [
      effectPart(e, e.effect.base),
      { source: { kind: 'ability', ability: 'dex' }, value: mods.dex },
      ...e.effect.abilities.map((a) => ({
        source: { kind: 'ability', ability: a } as const,
        value: mods[a],
      })),
    ];
    if (explained(alt).value > explained(acParts).value) acParts = alt;
  }
  for (const e of of('ac-bonus')) acParts.push(effectPart(e, value(e.effect.value)));
  for (const e of of('ac-minimum')) {
    const total = explained(acParts).value;
    if (total < e.effect.value) acParts.push(effectPart(e, e.effect.value - total));
  }
  const armorClass = explained(acParts);

  const initiative = explained([
    { source: { kind: 'ability', ability: 'dex' }, value: mods.dex },
    ...(sheet.combat.initiativeProficiency
      ? [{ source: { kind: 'proficiency', level: 1 } as const, value: prof }]
      : halfProf
        ? [{ source: { kind: 'proficiency', level: 0.5 } as const, value: Math.floor(prof / 2) }]
        : []),
  ]);

  const passivePerception = explained([
    { source: { kind: 'base' }, value: 10 },
    ...skills.perception.bonus.parts,
  ]);

  const hpBonus = of('hp-max-bonus').map((e) => effectPart(e, value(e.effect.value)));
  const hpMax =
    sheet.combat.hpMaxOverride !== undefined
      ? explained([{ source: { kind: 'override' }, value: sheet.combat.hpMaxOverride }, ...hpBonus])
      : (() => {
          const base = hpMaxFromLevels(
            level,
            sheet.combat.hitDie,
            mods.con,
            new Map(
              (sheet.progression?.levels ?? []).flatMap((r) =>
                r.hpRolled === undefined ? [] : [[r.level, r.hpRolled] as const],
              ),
            ),
            sheet.combat.hpBonusPerLevel ?? 0,
          );
          return hpBonus.length ? explained([...base.parts, ...hpBonus]) : base;
        })();

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

  const critMin = Math.min(20, ...of('crit-range').map((e) => e.effect.min));
  const attackAdvantage = hasAdvantage(effects, 'attack');
  const attackDice = rollDice
    .filter((e) => e.effect.on.includes('attack'))
    .map((e) => e.effect.dice);

  const attacks = sheet.weapons.map((weapon): AttackOption => {
    const ability = attackAbility(weapon, mods);
    const applies = (filter: AttackFilter | undefined) => matchesWeapon(filter, weapon, ability);
    const magic: ExplainedPart[] =
      weapon.magicBonus !== 0 ? [{ source: { kind: 'magic' }, value: weapon.magicBonus }] : [];
    const toHitParts: ExplainedPart[] = [
      { source: { kind: 'ability', ability }, value: mods[ability] },
    ];
    if (weapon.proficient)
      toHitParts.push({ source: { kind: 'proficiency', level: 1 }, value: prof });
    const effectToHit = of('attack-bonus')
      .filter((e) => applies(e.effect.filter))
      .map((e) => effectPart(e, value(e.effect.value)));
    const toHit = explained([...toHitParts, ...magic, ...effectToHit]);
    const effectDamage = of('damage-bonus')
      .filter((e) => applies(e.effect.filter))
      .map((e) => effectPart(e, value(e.effect.value)));
    const damageBonus = explained([
      { source: { kind: 'ability', ability }, value: mods[ability] },
      ...magic,
      ...effectDamage,
    ]);

    const extraDamage: ExtraDamage[] = [];
    for (const e of of('extra-damage')) {
      if (!applies(e.effect.filter)) continue;
      const dice = evalDice(e.effect.dice, engine.scaling);
      if (!dice) continue;
      extraDamage.push({
        name: e.source.name,
        dice,
        ...(e.effect.damageType ? { damageType: e.effect.damageType } : {}),
        oncePerTurn: Boolean(e.effect.oncePerTurn),
      });
    }

    const dice = weapon.damageDice.trim();
    const expression = withModifier(dice, damageBonus.value);
    const valid = dice !== '' && parse(expression).ok;
    if (!valid) warnings.push({ code: 'invalid-damage-dice', weaponId: weapon.id });
    const always = extraDamage
      .filter((x) => !x.oncePerTurn)
      .map((x) => `+${x.dice}`)
      .join('');
    const once = extraDamage
      .filter((x) => x.oncePerTurn)
      .map((x) => `+${x.dice}`)
      .join('');
    const damageExpression = valid ? `${expression}${always}` : null;

    return {
      weaponId: weapon.id,
      ability,
      toHit,
      attackExpression: `${withModifier('1d20', toHit.value)}${attackDice.map((d) => `+${d}`).join('')}`,
      advantage: attackAdvantage || hasAdvantage(effects, `attack:${ability}`),
      damageBonus,
      damageExpression,
      firstHitExpression: damageExpression && once ? `${damageExpression}${once}` : null,
      extraDamage,
      critRange: Math.min(weapon.critRange, critMin),
    };
  });

  const speedFt = Math.max(
    0,
    sheet.combat.speedFt + of('speed-bonus').reduce((sum, e) => sum + value(e.effect.ft), 0),
  );
  const resistances = of('resistance').flatMap((e) =>
    e.effect.damage.map((type) => ({ type, source: e.source.name })),
  );
  const notes = of('note').map((e) => ({ text: e.effect.text, source: e.source.name }));
  const dcBonus = of('spell-dc-bonus').reduce((sum, e) => sum + value(e.effect.value), 0);
  const spellcasting = spellcastingView(sheet, engine.info, mods, prof, dcBonus);

  return {
    level,
    proficiencyBonus,
    abilities,
    saves,
    skills,
    armorClass,
    initiative,
    initiativeAdvantage: hasAdvantage(effects, 'initiative'),
    speedFt,
    passivePerception,
    hpMax,
    hitDice,
    hpTotals,
    attacks,
    resistances,
    notes,
    engine,
    spellcasting,
    warnings,
  };
}
