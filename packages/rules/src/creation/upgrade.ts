import type { Feature, FeatureSource, LocalSheet } from '@grimorio/shared';
import { CLASS_PROGRESSIONS } from '../classes';
import {
  parseStartingEquipment,
  STARTING_EQUIPMENT_FEATURE,
  startingItems,
} from '../inventory/starting';
import { subclassOf } from '../levelup/plan';
import { CLASSES, SPECIES, type ClassId } from './content';

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
  if (sheet.features.every((f) => f.source)) return null;
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
