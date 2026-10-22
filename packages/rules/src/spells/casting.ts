import type { AbilityKey, DamageType, LocalSheet } from '@grimorio/shared';
import { FULL_CASTER_SLOTS, HALF_CASTER_SLOTS, PACT_SLOTS } from '../classes/common';
import type { SpellcastingDef } from '../classes/types';
import type { ClassInfo } from '../engine/character';
import { cantripTier, type SpellDef } from './types';

/** Espaços de magia por círculo (índice 0 = 1º círculo) para o tipo de conjurador e nível. */
export function slotTable(kind: SpellcastingDef['kind'], level: number): number[] {
  const l = Math.min(20, Math.max(1, Math.floor(level)));
  const row =
    kind === 'full' ? FULL_CASTER_SLOTS[l - 1] : kind === 'half' ? HALF_CASTER_SLOTS[l - 1] : [];
  return Array.from({ length: 9 }, (_, i) => row?.[i] ?? 0);
}

export function pactSlots(level: number): { count: number; circle: number } {
  return PACT_SLOTS[Math.min(20, Math.max(1, Math.floor(level))) - 1]!;
}

export interface SlotView {
  circle: number;
  max: number;
  spent: number;
}

export interface SpellcastingView {
  ability: AbilityKey;
  /** `class`: vem da classe; `manual`: atributo escolhido na ficha (sem classe do assistente). */
  source: 'class' | 'manual';
  mod: number;
  dc: number;
  dcBonus: number;
  attack: number;
  /** Só os círculos com espaços. */
  slots: SlotView[];
  pact?: SlotView;
  /** Maior círculo que o personagem conjura (0 = só truques). */
  maxCircle: number;
  cantripsMax?: number;
  preparedMax?: number;
  /** Mago: magias mínimas no grimório neste nível. */
  spellbookMin?: number;
  swap?: SpellcastingDef['swap'];
  /** Listas de onde as magias da classe podem vir (Segredos Mágicos amplia a do Bardo). */
  lists: string[];
}

export function spellcastingView(
  sheet: LocalSheet,
  info: ClassInfo | null,
  mods: Record<AbilityKey, number>,
  proficiency: number,
  dcBonus: number,
): SpellcastingView | null {
  const def = info?.progression.spellcasting;
  const ability = def?.ability ?? sheet.spells.ability;
  if (!ability) return null;
  const level = sheet.build.level;
  const mod = mods[ability];
  const slots: SlotView[] = [];
  let pact: SlotView | undefined;
  let maxCircle = 0;
  if (def) {
    if (def.kind === 'pact') {
      const p = pactSlots(level);
      pact = {
        circle: p.circle,
        max: p.count,
        spent: Math.min(p.count, sheet.state.pactSlotsSpent),
      };
      maxCircle = p.circle;
    } else {
      slotTable(def.kind, level).forEach((max, i) => {
        if (max > 0) {
          slots.push({ circle: i + 1, max, spent: Math.min(max, sheet.state.slotsSpent[i] ?? 0) });
          maxCircle = i + 1;
        }
      });
    }
  }
  // Arcano Místico (Bruxo 11+): magias de 6º a 9º sem espaço, uma vez por descanso longo.
  if (def?.kind === 'pact') {
    for (const [lvl, circle] of [
      [11, 6],
      [13, 7],
      [15, 8],
      [17, 9],
    ] as const) {
      if (level >= lvl) maxCircle = Math.max(maxCircle, circle);
    }
  }
  const lists = info ? [info.classId] : [];
  if (info?.classId === 'bard' && level >= 10) lists.push('cleric', 'druid', 'wizard');
  const index = Math.min(20, Math.max(1, level)) - 1;
  // Clérigo Taumaturgo e Druida Mágico (Ordem Divina/Primal, nível 1) conhecem 1 truque a mais.
  const option = sheet.creation?.classOptionId;
  const extraCantrip =
    (info?.classId === 'cleric' && option === 'thaumaturge') ||
    (info?.classId === 'druid' && option === 'magician')
      ? 1
      : 0;
  return {
    ability,
    source: def ? 'class' : 'manual',
    mod,
    dc: 8 + mod + proficiency + dcBonus,
    dcBonus,
    attack: mod + proficiency,
    slots,
    ...(pact ? { pact } : {}),
    maxCircle,
    ...(def?.cantrips ? { cantripsMax: def.cantrips[index]! + extraCantrip } : {}),
    ...(def ? { preparedMax: def.prepared[index] } : {}),
    ...(def?.spellbook
      ? { spellbookMin: def.spellbook.initial + def.spellbook.perLevel * index }
      : {}),
    ...(def ? { swap: def.swap } : {}),
    lists,
  };
}

// ---------- rolagens das magias ----------

/** "2d6" × n → "4d6"; "10d6+40" × 2 → "20d6+80" (truques que crescem com o nível). */
function multiplyDice(dice: string, times: number): string {
  if (times === 1) return dice;
  return dice.replace(
    /(\d+)(d\d+)?/g,
    (_, n: string, d?: string) => `${Number(n) * times}${d ?? ''}`,
  );
}

/** Soma dados por círculo acima do base: "8d6" + 2 × "1d6" → "10d6". */
function addPerSlot(dice: string, perSlot: string, extra: number): string {
  if (extra <= 0) return dice;
  const m = /^(\d+)d(\d+)$/.exec(perSlot);
  if (!m) return dice;
  const [, count, die] = m;
  const same = new RegExp(`^(\\d+)d${die}(?=$|[+-])`);
  if (same.test(dice))
    return dice.replace(same, (_, n: string) => `${Number(n) + Number(count) * extra}d${die}`);
  return `${dice}+${Number(count) * extra}d${die}`;
}

function withMod(dice: string, mod: number): string {
  if (mod === 0) return dice;
  return mod > 0 ? `${dice}+${mod}` : `${dice}-${Math.abs(mod)}`;
}

export interface SpellRoll {
  /** Uma rolagem por tipo de dano (Coluna de Chamas: Ígneo e Radiante). */
  damage: { expression: string; type: DamageType }[];
  heal?: string;
  /** Rajada Mística: quantos raios (cada um rola o dano separado). */
  beams?: number;
}

/**
 * Expressões de dano/cura de uma magia conjurada com um espaço (`slot`, 0 para truque),
 * no nível do personagem e com o modificador de conjuração.
 */
export function spellRoll(
  spell: SpellDef,
  opts: { slot: number; characterLevel: number; mod: number },
): SpellRoll {
  const extra = spell.level > 0 ? Math.max(0, opts.slot - spell.level) : 0;
  const tier = spell.level === 0 && spell.cantripScaling ? cantripTier(opts.characterLevel) : 1;
  const damage = (spell.damage ?? []).map((d, i) => {
    let dice = multiplyDice(d.dice, tier);
    // Dados por círculo: só no primeiro tipo de dano (como no texto das magias).
    if (spell.perSlot && i === 0) dice = addPerSlot(dice, spell.perSlot, extra);
    return { expression: d.addMod ? withMod(dice, opts.mod) : dice, type: d.type };
  });
  let heal: string | undefined;
  if (spell.heal) {
    heal = spell.perSlot ? addPerSlot(spell.heal.dice, spell.perSlot, extra) : spell.heal.dice;
    if (spell.heal.addMod) heal = withMod(heal, opts.mod);
  }
  return {
    damage,
    ...(heal ? { heal } : {}),
    ...(spell.beams ? { beams: cantripTier(opts.characterLevel) } : {}),
  };
}
