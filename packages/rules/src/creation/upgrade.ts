import type { AbilityKey, Feature, FeatureSource, LocalSheet } from '@grimorio/shared';
import { CLASS_PROGRESSIONS } from '../classes';
import { armorItemData, knownArmor, needsArmorUpgrade, type ArmorDef } from '../inventory/armor';
import {
  parseStartingEquipment,
  STARTING_EQUIPMENT_FEATURE,
  startingItems,
} from '../inventory/starting';
import { subclassOf } from '../levelup/plan';
import { abilityModifier } from '../sheet/derive';
import { finalScores } from './abilities';
import {
  ARMOR,
  BACKGROUNDS,
  CLASSES,
  FIGHTING_STYLES,
  SPECIES,
  type ClassDef,
  type ClassId,
} from './content';

/**
 * Fichas de antes do inventário (v2): as características não diziam de onde vinham e o
 * equipamento inicial era um texto. Ao abrir a ficha, o site chama esta função uma vez:
 * - cada característica ganha a origem (classe, subclasse, espécie, talento, treinamento, outra);
 * - o texto do "Equipamento inicial" vira itens do Inventário e o ouro vai para as moedas (só
 *   se o texto for o que o assistente escreveu; se o jogador mudou, fica como está).
 * Fica em `creation/` porque precisa das listas de traços das espécies (carregadas sob demanda).
 * `null` = nada a fazer.
 */
export function upgradeSheetContent(
  sheet: LocalSheet,
  ctx: { newId: () => string },
): { sheet: LocalSheet; movedEquipment: boolean } | null {
  const sources = sheet.features.every((f) => f.source) ? null : upgradeSources(sheet, ctx);
  const base = sources?.sheet ?? sheet;
  const armored = upgradeArmor(base, Boolean(sources?.movedEquipment));
  if (!sources && !armored) return null;
  return { sheet: armored ?? base, movedEquipment: Boolean(sources?.movedEquipment) };
}

function upgradeSources(
  sheet: LocalSheet,
  ctx: { newId: () => string },
): { sheet: LocalSheet; movedEquipment: boolean } {
  const next = JSON.parse(JSON.stringify(sheet)) as LocalSheet;
  const guess = sourceGuesser(sheet);
  let movedEquipment = false;
  const features: Feature[] = [];
  for (const f of next.features) {
    if (f.source) {
      features.push(f);
      continue;
    }
    if (f.name === STARTING_EQUIPMENT_FEATURE) {
      const parsed = parseStartingEquipment(f.text);
      if (parsed && next.inventory.items.length + parsed.items.length <= 200) {
        next.inventory.items.push(...startingItems(parsed.items, next.weapons, ctx.newId));
        next.inventory.coins.gp = Math.min(9_999_999, next.inventory.coins.gp + parsed.gold);
        movedEquipment = true;
        continue;
      }
    }
    features.push({ ...f, source: guess(f.name) });
  }
  next.features = features;
  return { sheet: next, movedEquipment };
}

/**
 * Fichas de antes das armaduras no Inventário: a armadura do livro ganha os números (CA, teto de
 * Destreza, Força, Furtividade) e passa a calcular a CA. Nas fichas do assistente, que gravava a
 * CA como ajuste manual e já tirava os 3 m da armadura pesada do deslocamento:
 * - se o ajuste manual é o número que o assistente calculou, ele sai (a ficha calcula igual, e
 *   agora acompanha mudanças de Destreza ou de armadura); se o jogador mudou, fica;
 * - sem ajuste manual, o Estilo de Luta do nível 1 passa para o registro da criação (a ficha
 *   soma Defesa e Arquearia sozinha);
 * - os 3 m voltam para o deslocamento guardado: agora a ficha tira enquanto a armadura está vestida.
 * `null` = nada a fazer.
 */
function upgradeArmor(sheet: LocalSheet, movedEquipment: boolean): LocalSheet | null {
  if (!needsArmorUpgrade(sheet) && !movedEquipment) return null;
  const next = JSON.parse(JSON.stringify(sheet)) as LocalSheet;
  next.inventory.items = next.inventory.items.map((item) => {
    const def = item.armor ? undefined : knownArmor(item.name);
    return def ? { ...item, armor: armorItemData(def) } : item;
  });

  const record = next.creation;
  const cls = record ? CLASSES[record.classId as ClassId] : undefined;
  if (!record || !cls) return next;
  const style = Object.values(FIGHTING_STYLES).find((f) =>
    sheet.features.some((x) => x.name === `Estilo de Luta: ${f.name}`),
  );
  const classPack = cls.equipment.find((p) => p.option === record.classEquipment);
  const bgPack = BACKGROUNDS[record.backgroundId]?.equipment.find(
    (p) => p.option === record.backgroundEquipment,
  );
  const wizard = wizardArmorClass(
    cls,
    [...(classPack?.armor ?? []), ...(bgPack?.armor ?? [])].map((id) => ARMOR[id]),
    finalScores(record.baseAbilities, record.backgroundBonus),
    style?.id === 'defense',
  );
  if (next.combat.armorClassOverride === wizard.value) delete next.combat.armorClassOverride;
  if (wizard.slowedByArmor) next.combat.speedFt = Math.min(300, next.combat.speedFt + 10);
  if (next.combat.armorClassOverride === undefined && style && !record.fightingStyleId) {
    record.fightingStyleId = style.id;
  }
  return next;
}

/** A CA que o assistente gravava como ajuste manual (antes das armaduras no Inventário). */
function wizardArmorClass(
  cls: ClassDef,
  pieces: readonly ArmorDef[],
  scores: Record<AbilityKey, number>,
  defenseStyle: boolean,
): { value: number | undefined; slowedByArmor: boolean } {
  const mod = (k: AbilityKey) => abilityModifier(scores[k]);
  const body = pieces.find((a) => a.kind !== 'shield');
  const shield = pieces.some((a) => a.kind === 'shield');
  let total = 10 + mod('dex');
  if (body) {
    total = body.base + (body.dexCap === null ? mod('dex') : Math.min(mod('dex'), body.dexCap));
  } else if (cls.unarmoredDefense) {
    total += mod(cls.unarmoredDefense);
  }
  if (shield) total += 2;
  if (defenseStyle && body) total += 1;
  return {
    value: body || shield || cls.unarmoredDefense ? total : undefined,
    slowedByArmor: Boolean(body?.strength && scores.str < body.strength),
  };
}

/** Descobre a origem pelo nome, com as listas da classe, da subclasse e da espécie da ficha. */
function sourceGuesser(sheet: LocalSheet): (name: string) => FeatureSource {
  const classId = (sheet.progression?.classId ?? sheet.creation?.classId) as ClassId | undefined;
  const cls = classId ? CLASSES[classId] : undefined;
  const p = classId ? CLASS_PROGRESSIONS[classId] : undefined;
  const sub = p ? subclassOf(p, sheet.progression?.subclassId) : undefined;
  const species = sheet.creation ? SPECIES[sheet.creation.speciesId] : undefined;

  const classNames = new Set([
    ...(cls?.features.map((f) => f.name) ?? []),
    ...(p?.features.map((f) => f.name) ?? []),
  ]);
  const subNames = new Set(sub?.features.map((f) => f.name) ?? []);
  const speciesNames = new Set(species?.traits.map((t) => t.name) ?? []);
  // Escolhas com rótulo ("Ordem Divina: Protetor", "Ancestralidade Gigante: Fogo").
  const classPrefixes = [
    cls?.option?.label,
    ...(p?.features.map((f) => (f.choice?.kind === 'option' ? f.choice.label : undefined)) ?? []),
  ].filter((x): x is string => Boolean(x));
  const subPrefixes = (sub?.features ?? [])
    .map((f) => (f.choice?.kind === 'option' ? f.choice.label : undefined))
    .filter((x): x is string => Boolean(x));
  const startsWithLabel = (name: string, labels: string[]) =>
    labels.some((l) => name.startsWith(`${l}: `));

  return (name) => {
    if (name.startsWith('Talento: ')) return 'feat';
    if (name.startsWith('Subclasse: ') || subNames.has(name) || startsWithLabel(name, subPrefixes))
      return 'subclass';
    if (/^(Estilo de Luta|Metamagia|Invocação): /.test(name)) return 'class';
    if (
      name.startsWith('Idioma: ') ||
      name === 'Treinamento e idiomas' ||
      name === 'Classe de Armadura'
    )
      return 'training';
    if (name.startsWith('Traços de ') || speciesNames.has(name)) return 'species';
    if (species?.option && name.startsWith(`${species.option.label}: `)) return 'species';
    if (classNames.has(name) || startsWithLabel(name, classPrefixes)) return 'class';
    return 'other';
  };
}
