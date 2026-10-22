/**
 * Monta a ficha a partir do rascunho do assistente (passo 5 do Livro do Jogador: "Preencha os
 * Detalhes"). Pura: ids e data entram por parâmetro.
 *
 * A ficha ainda é a local (ADR-002): o que ela não tem campo próprio (treinamentos, idiomas,
 * traços) vira "Características", cada uma marcada com a origem (classe, espécie, talento…), e a
 * CA da armadura inicial vira ajuste manual com o cálculo explicado. O equipamento inicial vai
 * para o Inventário, com o ouro e o peso de cada item.
 */
import {
  ABILITY_KEYS,
  CREATION_RECORD_VERSION,
  createBlankSheet,
  LocalSheetSchema,
  type AbilityKey,
  type CreationRecord,
  type Feature,
  type FeatureSource,
  type GrantedSpell,
  type LocalSheet,
  type ProficiencyLevel,
  type SkillKey,
  type Weapon,
} from '@grimorio/shared';
import { knownWeightKg } from '../inventory/weights';
import { startingItems } from '../inventory/starting';
import { abilityModifier, deriveSheet } from '../sheet/derive';
import { finalScores } from './abilities';
import { weaponProficient } from './mastery';
import {
  ARMOR,
  CREATION_CONTENT_VERSION,
  CUSTOM_BACKGROUND_GOLD,
  CUSTOM_ID,
  FIGHTING_STYLES,
  MASTERY_PROPERTIES,
  ORIGIN_FEATS,
  WEAPONS,
  type ArmorDef,
  type ArmorKind,
  type ClassDef,
  type EquipmentPack,
  type WeaponDef,
  type WeaponId,
} from './content';
import { speciesSpellsAt } from './species-spells';
import {
  draftBackground,
  draftClass,
  draftOriginFeats,
  draftSpecies,
  firstIncompleteStep,
  initiateChoices,
  proficientSkills,
  spellNeeds,
  type CreationDraft,
  type InitiateList,
} from './draft';

const INITIATE_LIST_NAMES: Record<InitiateList, string> = {
  cleric: 'Clérigo',
  druid: 'Druida',
  wizard: 'Mago',
};
const ABILITY_NAMES: Record<string, string> = {
  int: 'Inteligência',
  wis: 'Sabedoria',
  cha: 'Carisma',
};

export interface BuildContext {
  newId: () => string;
  /** Prévia da etapa final: monta mesmo com nome ou Especialização ainda faltando. */
  preview?: boolean;
}

const ARMOR_NAMES: Record<ArmorKind, string> = {
  light: 'Leve',
  medium: 'Média',
  heavy: 'Pesada',
  shield: 'Escudos',
};

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

function classPack(cls: ClassDef, option: CreationDraft['classEquipment']): EquipmentPack {
  return cls.equipment.find((p) => p.option === option) ?? cls.equipment[cls.equipment.length - 1]!;
}

/** Arma de Monge: corpo a corpo Simples ou Marcial com Leve (Artes Marciais usa Destreza). */
function isMonkWeapon(weapon: WeaponDef): boolean {
  return !weapon.ranged && (weapon.category === 'simple' || weapon.light);
}

function toSheetWeapon(
  cls: ClassDef,
  weapon: WeaponDef,
  quantity: number,
  martialFromOption: boolean,
  usesMastery: boolean,
  newId: () => string,
): Weapon {
  const monk = cls.id === 'monk' && isMonkWeapon(weapon);
  // Só quem tem Maestria em Arma com este tipo de arma usa a propriedade de maestria.
  const properties = usesMastery
    ? weapon.properties.replace(/Maestria: (.+)$/, 'Maestria: $1 (você usa)')
    : weapon.properties;
  return {
    id: newId(),
    name: quantity > 1 ? `${weapon.name} (×${quantity})` : weapon.name,
    ability: weapon.ranged ? 'dex' : weapon.finesse || monk ? 'finesse' : 'str',
    proficient: weaponProficient(cls, weapon, martialFromOption),
    damageDice: weapon.dice,
    damageType: weapon.damageType,
    magicBonus: 0,
    critRange: 20,
    properties,
    ...(knownWeightKg(weapon.name) !== undefined
      ? { weightKg: knownWeightKg(weapon.name)! * quantity }
      : {}),
  };
}

interface ArmorClassResult {
  /** `undefined` = sem armadura: a ficha calcula 10 + Destreza sozinha. */
  value: number | undefined;
  explanation: string;
  /** Força abaixo do exigido pela armadura pesada: −3 m de deslocamento. */
  slowedByArmor: boolean;
  stealthDisadvantage: boolean;
}

function armorClass(
  cls: ClassDef,
  armorIds: readonly (keyof typeof ARMOR)[],
  scores: Record<AbilityKey, number>,
  defenseStyle: boolean,
): ArmorClassResult {
  const mod = (k: AbilityKey) => abilityModifier(scores[k]);
  const pieces = armorIds.map((id) => ARMOR[id] as ArmorDef);
  const body = pieces.find((a) => a.kind !== 'shield');
  const shield = pieces.some((a) => a.kind === 'shield');
  const parts: string[] = [];
  let total: number;

  if (body) {
    const dex = body.dexCap === null ? mod('dex') : Math.min(mod('dex'), body.dexCap);
    total = body.base + dex;
    parts.push(`${body.name} ${body.base}`);
    if (body.dexCap !== 0) parts.push(`Destreza ${dex >= 0 ? '+' : ''}${dex}`);
  } else if (cls.unarmoredDefense) {
    const other = cls.unarmoredDefense;
    total = 10 + mod('dex') + mod(other);
    parts.push(
      `Defesa sem Armadura 10`,
      `Destreza ${mod('dex') >= 0 ? '+' : ''}${mod('dex')}`,
      `${other === 'con' ? 'Constituição' : 'Sabedoria'} ${mod(other) >= 0 ? '+' : ''}${mod(other)}`,
    );
  } else {
    total = 10 + mod('dex');
  }
  if (shield) {
    total += 2;
    parts.push('Escudo +2');
  }
  if (defenseStyle && body) {
    total += 1;
    parts.push('Estilo Defesa +1');
  }
  const custom = Boolean(body || shield || cls.unarmoredDefense);
  return {
    value: custom ? total : undefined,
    explanation: custom ? `CA ${total} = ${parts.join(' + ')}` : '',
    slowedByArmor: Boolean(body?.strength && scores.str < body.strength),
    stealthDisadvantage: Boolean(body?.stealthDisadvantage),
  };
}

/** Monta a ficha. `null` se alguma etapa ainda tem pendência. */
export function buildCharacterSheet(draft: CreationDraft, ctx: BuildContext): LocalSheet | null {
  const pending = firstIncompleteStep(draft);
  if (pending !== null && !(ctx.preview && pending === 'details')) return null;
  const cls = draftClass(draft)!;
  const background = draftBackground(draft)!;
  const species = draftSpecies(draft);
  const classOption = cls.option?.choices.find((c) => c.id === draft.classOptionId);
  const speciesOption = species?.option?.choices.find((c) => c.id === draft.speciesOptionId);
  const feats = draftOriginFeats(draft);

  const scores = finalScores(draft.baseScores, draft.backgroundBonus);

  // Perícias: proficiência 1; Especialização (Ladino) 2.
  const skillProficiencies: Partial<Record<SkillKey, ProficiencyLevel>> = {};
  for (const skill of proficientSkills(draft)) skillProficiencies[skill] = 1;
  for (const skill of draft.expertise) {
    if (skillProficiencies[skill]) skillProficiencies[skill] = 2;
  }

  // Equipamento: pacote da classe + pacote do antecedente.
  const cPack = classPack(cls, draft.classEquipment);
  const bPack =
    background.id === CUSTOM_ID
      ? { option: 'B' as const, items: [], weapons: [], armor: [], gold: CUSTOM_BACKGROUND_GOLD }
      : background.equipment.find((p) => p.option === draft.backgroundEquipment)!;
  const weaponCounts = new Map<WeaponId, number>();
  for (const { id, quantity } of [...cPack.weapons, ...bPack.weapons]) {
    weaponCounts.set(id, (weaponCounts.get(id) ?? 0) + quantity);
  }
  const martialFromOption = Boolean(classOption?.martialWeapons);
  const masteries = new Set(cls.weaponMastery ? draft.weaponMasteries : []);
  const weapons: Weapon[] = [...weaponCounts].map(([id, qty]) =>
    toSheetWeapon(cls, WEAPONS[id], qty, martialFromOption, masteries.has(id), ctx.newId),
  );
  if (cls.id === 'monk') {
    weapons.unshift({
      id: ctx.newId(),
      name: 'Ataque Desarmado (Artes Marciais)',
      ability: 'finesse',
      proficient: true,
      damageDice: '1d6',
      damageType: 'bludgeoning',
      magicBonus: 0,
      critRange: 20,
      properties: 'Socos, chutes e cotoveladas',
    });
  }

  const ac = armorClass(
    cls,
    [...cPack.armor, ...bPack.armor],
    scores,
    draft.fightingStyleId === 'defense',
  );

  let speedFt =
    draft.speciesId === CUSTOM_ID
      ? draft.customSpecies.speedFt
      : (speciesOption?.speedFt ?? species?.speedFt ?? 30);
  if (ac.slowedByArmor) speedFt = Math.max(0, speedFt - 10);

  // ---------- características (o que a ficha local não tem campo próprio) ----------
  const features: Feature[] = [];
  let source: FeatureSource = 'class';
  const add = (name: string, text: string) =>
    features.push({ id: ctx.newId(), name: name.slice(0, 80), text: text.slice(0, 4000), source });

  for (const f of cls.features) {
    if (f.name === 'Maestria em Arma' && masteries.size) {
      const chosen = [...masteries].map((id) => {
        const property = MASTERY_PROPERTIES[WEAPONS[id].mastery];
        return `${WEAPONS[id].name} — ${property.name}: ${property.text}`;
      });
      add(f.name, `${f.text} Escolhidas: ${chosen.join(' ')}`);
    } else add(f.name, f.text);
  }
  if (classOption && cls.option) add(`${cls.option.label}: ${classOption.name}`, classOption.text);
  if (draft.fightingStyleId) {
    const style = FIGHTING_STYLES[draft.fightingStyleId];
    add(`Estilo de Luta: ${style.name}`, style.text);
  }
  source = 'training';
  if (ac.explanation) {
    const notes = [
      ac.explanation,
      ac.slowedByArmor ? 'Força abaixo de 13: −3 m de Deslocamento com esta armadura.' : '',
      ac.stealthDisadvantage ? 'Desvantagem em Destreza (Furtividade) com esta armadura.' : '',
    ].filter(Boolean);
    add('Classe de Armadura', notes.join(' '));
  }

  source = 'species';
  if (species) {
    for (const trait of species.traits) add(trait.name, trait.text);
    if (speciesOption && species.option) {
      add(`${species.option.label}: ${speciesOption.name}`, speciesOption.text);
    }
  } else if (draft.customSpecies.traits.trim()) {
    add(`Traços de ${draft.customSpecies.name.trim()}`, draft.customSpecies.traits.trim());
  }

  source = 'feat';
  const initiates = initiateChoices(draft);
  let initiateIndex = 0;
  for (const [i, featId] of feats.entries()) {
    const feat = ORIGIN_FEATS[featId];
    const source = i === 0 ? `antecedente ${background.name}` : 'Humano (Versátil)';
    // Iniciado em Magia: a lista e o atributo escolhidos (as magias vão para a aba Magias).
    const choice = featId === 'magic-initiate' ? initiates[initiateIndex++] : undefined;
    const list = choice?.list ? INITIATE_LIST_NAMES[choice.list] : background.featNote;
    const note =
      featId === 'magic-initiate' && list
        ? ` Lista de magias: ${list}.${choice?.ability ? ` Atributo de conjuração: ${ABILITY_NAMES[choice.ability]}.` : ''}`
        : '';
    add(`Talento: ${feat.name}`, `${feat.text}${note} (Vem de: ${source}.)`);
  }

  const armorTraining = (['light', 'medium', 'heavy', 'shield'] as const).filter(
    (k) => cls.armorTraining.includes(k) || classOption?.armor === k,
  );
  const languages = ['Comum', ...draft.languages, ...(cls.languages?.fixed ?? [])];
  source = 'training';
  const tools = [cls.toolsText, background.tool].filter((x): x is string => Boolean(x));
  add(
    'Treinamento e idiomas',
    [
      `Armaduras: ${armorTraining.length ? joinList(armorTraining.map((k) => ARMOR_NAMES[k])) : 'nenhuma'}.`,
      `Armas: ${cls.weaponsText}${martialFromOption ? ' + Marciais' : ''}.`,
      tools.length ? `Ferramentas: ${joinList(tools)}.` : '',
      `Idiomas: ${joinList(languages)}.`,
    ]
      .filter(Boolean)
      .join(' '),
  );

  // ---------- inventário: o equipamento inicial e o ouro ----------
  const items = startingItems([...cPack.items, ...bPack.items], weapons, ctx.newId);
  const gold = cPack.gold + bPack.gold;

  // ---------- identidade ----------
  const speciesName =
    draft.speciesId === CUSTOM_ID
      ? draft.customSpecies.name.trim()
      : speciesOption && species?.id !== 'goliath' && species?.id !== 'dragonborn'
        ? `${species?.name} (${speciesOption.name})`
        : (species?.name ?? '');
  const sizeText =
    species?.size === 'medium-or-small'
      ? `Tamanho ${draft.speciesSize === 'small' ? 'Pequeno' : 'Médio'}.`
      : '';
  const description = [
    draft.alignment ? `Alinhamento: ${draft.alignment}.` : '',
    sizeText,
    draft.appearance.trim(),
    draft.backstory.trim(),
  ]
    .filter(Boolean)
    .join('\n\n');

  const record: CreationRecord = {
    version: CREATION_RECORD_VERSION,
    contentVersion: CREATION_CONTENT_VERSION,
    classId: cls.id,
    speciesId: draft.speciesId!,
    ...(draft.speciesOptionId ? { speciesOptionId: draft.speciesOptionId } : {}),
    backgroundId: background.id,
    abilityMethod: draft.abilityMethod,
    baseAbilities: Object.fromEntries(
      ABILITY_KEYS.map((k) => [k, draft.baseScores[k] ?? 8]),
    ) as CreationRecord['baseAbilities'],
    ...(draft.abilityMethod === 'rolled' && draft.rolled ? { rolledScores: draft.rolled } : {}),
    backgroundBonus: draft.backgroundBonus,
    ...(classOption ? { classOptionId: classOption.id } : {}),
    ...(masteries.size ? { weaponMasteries: [...masteries] } : {}),
    classSkills: draft.classSkills,
    extraSkills: [...draft.speciesSkills, ...draft.featSkills],
    originFeatId: feats[0] ?? 'skilled',
    classEquipment: draft.classEquipment,
    backgroundEquipment: background.id === CUSTOM_ID ? 'B' : draft.backgroundEquipment,
    languages,
    ...(draft.alignment ? { alignment: draft.alignment } : {}),
  };

  const sheet = createBlankSheet();
  sheet.identity = {
    name: draft.name.trim().slice(0, 100),
    className: cls.name,
    playerName: draft.playerName.trim().slice(0, 80),
    origin: `${background.name} · ${speciesName}`.slice(0, 120),
    description: description.slice(0, 4000),
  };
  sheet.build = {
    level: 1,
    abilities: scores,
    saveProficiencies: [...cls.saves],
    skillProficiencies,
  };
  sheet.combat = {
    hitDie: cls.hitDie,
    speedFt,
    ...(ac.value === undefined ? {} : { armorClassOverride: ac.value }),
    ...(species?.hpPerLevel ? { hpBonusPerLevel: species.hpPerLevel } : {}),
    ...(feats.includes('alert') ? { initiativeProficiency: true } : {}),
  };
  sheet.weapons = weapons;
  sheet.features = features;
  sheet.inventory = { coins: { cp: 0, sp: 0, ep: 0, gp: gold, pp: 0 }, items };
  sheet.creation = record;
  sheet.progression = { classId: cls.id, levels: [] };
  // Magias da classe, escolhidas na etapa Magias (cap. 3, "Conjuração").
  const unique = (ids: string[]) => [...new Set(ids)];
  sheet.spells.cantrips = unique(draft.cantrips);
  sheet.spells.prepared = unique(draft.preparedSpells);
  if (spellNeeds(draft).spellbook) sheet.spells.spellbook = unique(draft.spellbook);
  const grant = (id: string, extra: Omit<GrantedSpell, 'id'>) => {
    if (sheet.spells.cantrips.includes(id) || sheet.spells.granted.some((g) => g.id === id)) return;
    sheet.spells.granted.push({ id, ...extra });
  };
  // Iniciado em Magia: 2 truques e 1 magia sempre preparados; a magia, 1 vez grátis por
  // Descanso Longo (cap. 5). O atributo de conjuração é o escolhido no talento.
  for (const c of initiates) {
    if (!c.list || !c.ability) continue;
    for (const id of c.cantrips) grant(id, { source: 'feat', ability: c.ability });
    if (c.spell) grant(c.spell, { source: 'feat', ability: c.ability, freePerLongRest: 1 });
  }
  // Magias da espécie (truques e, no Gnomo do Bosque, Falar com Animais): sempre preparadas.
  for (const id of speciesSpellsAt(
    draft.speciesId ?? undefined,
    draft.speciesOptionId ?? undefined,
    1,
  )) {
    grant(id, {
      source: 'species',
      ...(id === 'speak-with-animals' ? { freePerLongRest: 2 } : {}),
    });
  }
  sheet.state.hp.current = deriveSheet(sheet).hpMax.value;

  // Garantia: a ficha montada respeita o formato (se não, é bug do assistente).
  const parsed = LocalSheetSchema.safeParse(sheet);
  return parsed.success ? parsed.data : null;
}
