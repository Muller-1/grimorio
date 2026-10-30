import { z } from '../zod';
import {
  ABILITY_KEYS,
  DAMAGE_TYPES,
  HIT_DIE_SIDES,
  PROFICIENCY_LEVELS,
  SKILL_KEYS,
  type AbilityKey,
} from '../character/keys';
import { CreationRecordSchema } from './creation';

/**
 * Ficha do personagem (a mesma no navegador e na conta). Começou como formato provisório
 * (ADR-002); a versão 2 (ADR-010) acrescenta a progressão de classe, as magias e o estado das
 * habilidades (usos gastos, o que está ativo); a versão 3 (ADR-011) acrescenta o
 * inventário (moedas e itens), arma equipada ou guardada, peso e a origem das características.
 *
 * - Guarda ESCOLHAS e o estado de jogo; os números derivados são recalculados (plano v2, 9.1).
 * - Fichas de versões antigas são migradas ao abrir (`migrateSheet`, em ./migrations): no
 *   navegador, no cache da conta e na API. Nada salvo antes deixa de abrir.
 */

export const LOCAL_SHEET_SCHEMA_VERSION = 3;

/** Tamanho máximo da foto guardada na ficha (caracteres do data URL, ≈ 110 kB de imagem). */
export const PORTRAIT_DATA_MAX = 150_000;

const int = () => z.number().int();

const abilityScore = int().min(1).max(30);

export const AbilityScoresSchema = z.object({
  str: abilityScore,
  dex: abilityScore,
  con: abilityScore,
  int: abilityScore,
  wis: abilityScore,
  cha: abilityScore,
});

export const ProficiencyLevelSchema = z.literal(PROFICIENCY_LEVELS);

export const HpEventSchema = z.object({
  actionId: z.string().min(1),
  at: z.iso.datetime(),
  kind: z.enum(['damage', 'heal', 'temp']),
  /** Valor pedido pelo jogador (ex.: "5 de dano"). */
  amount: int().min(0),
  /**
   * O que realmente mudou: PV atual, temporário e, quando mexeu, os testes contra a morte
   * (dano caído soma falhas; cura que levanta zera os testes). É o que o "desfazer" inverte.
   */
  effect: z.object({
    current: int(),
    temp: int(),
    deathSaves: z.object({ successes: int(), failures: int() }).optional(),
  }),
  /** Marcado quando o evento foi desfeito; deixa de contar em Curados/Recebidos. */
  undone: z.boolean().optional(),
  /** Origem especial: cura de Dado de Vida (desfazer devolve o dado). */
  source: z.enum(['hit-die']).optional(),
});

export const WeaponSchema = z.object({
  id: z.string().min(1),
  name: z.string().max(60),
  /** 'finesse' usa o maior entre Força e Destreza. */
  ability: z.enum(['str', 'dex', 'finesse']),
  proficient: z.boolean(),
  /** Dados de dano, sem o modificador (ex.: "1d8"). O modificador é somado automaticamente. */
  damageDice: z.string().max(40),
  damageType: z.enum(DAMAGE_TYPES).optional(),
  /** Bônus mágico (+1, +2...), somado no ataque e no dano. */
  magicBonus: int().min(-10).max(10),
  /** Menor resultado natural que conta como crítico: 20 (padrão) ou 19 (19–20)... */
  critRange: int().min(2).max(20),
  properties: z.string().max(120).optional(),
  notes: z.string().max(2000).optional(),
  /** Equipada = carregada pelo personagem (conta no peso e aparece nos ataques). Ausente = sim. */
  equipped: z.boolean().optional(),
  /** Peso em kg. Ausente: o site usa o peso do livro, se conhecer a arma pelo nome. */
  weightKg: z.number().min(0).max(1000).optional(),
});

/** De onde vem cada característica (a aba Características agrupa por isso). */
export const FEATURE_SOURCES = [
  'class',
  'subclass',
  'species',
  'background',
  'feat',
  'training',
  'other',
] as const;
export type FeatureSource = (typeof FEATURE_SOURCES)[number];

export const FeatureSchema = z.object({
  id: z.string().min(1),
  name: z.string().max(80),
  text: z.string().max(4000),
  /** Ausente nas fichas antigas: o site descobre pela regra e grava (ver rules/inventory). */
  source: z.enum(FEATURE_SOURCES).optional(),
});

/** Moedas (cap. 6): Peça de Cobre, Prata, Electro, Ouro e Platina. */
export const COIN_KEYS = ['cp', 'sp', 'ep', 'gp', 'pp'] as const;
export type CoinKey = (typeof COIN_KEYS)[number];

export const ItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().max(80),
  quantity: int().min(0).max(9999),
  /** Peso de UMA unidade, em kg. Ausente: o site usa o do livro, se conhecer o item pelo nome. */
  weightKg: z.number().min(0).max(1000).optional(),
  /** Com o personagem (conta no peso). Ausente = sim. Armadura e escudo: vestidos. */
  equipped: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

export const InventorySchema = z.object({
  coins: z.object(
    Object.fromEntries(COIN_KEYS.map((k) => [k, int().min(0).max(9_999_999)])) as Record<
      CoinKey,
      z.ZodNumber
    >,
  ),
  items: z.array(ItemSchema).max(200),
});

/** Id de conteúdo das regras (classe, subclasse, magia, talento…), ex.: "fireball". */
const contentId = z
  .string()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9-]+$/);

/** Uma escolha feita ao subir de nível (para o histórico). O motor de regras dá o sentido. */
export const LevelChoiceSchema = z.object({
  /** Ex.: "subclass", "asi", "feat", "spell", "cantrip", "expertise", "invocation"… */
  kind: z.string().min(1).max(40),
  id: z.string().max(80).optional(),
  /** Texto para escolhas "do livro" (fora do SRD) ou detalhes. */
  text: z.string().max(200).optional(),
  ability: z.enum(ABILITY_KEYS).optional(),
  amount: int().min(-5).max(5).optional(),
});

export const LevelRecordSchema = z.object({
  level: int().min(2).max(20),
  /** Resultado do Dado de Vida (sem Constituição). Sem valor = usou a média do livro. */
  hpRolled: int().min(1).max(12).optional(),
  choices: z.array(LevelChoiceSchema).max(30),
});

/** Classe do personagem e o que foi escolhido em cada nível (ADR-010). Multiclasse: depois. */
export const ProgressionSchema = z.object({
  classId: contentId,
  /** Subclasse do SRD, ou "custom" (do livro, com `subclassName`). */
  subclassId: contentId.optional(),
  subclassName: z.string().max(80).optional(),
  levels: z.array(LevelRecordSchema).max(19),
});

/** Magia que o jogador digitou ("Outra magia (do livro)"), fora do SRD. */
export const CustomSpellSchema = z.object({
  id: z.string().min(1).max(60),
  name: z.string().max(80),
  /** 0 = truque. */
  level: int().min(0).max(9),
  prepared: z.boolean(),
  concentration: z.boolean().optional(),
  ritual: z.boolean().optional(),
  castingTime: z.string().max(80).optional(),
  range: z.string().max(80).optional(),
  duration: z.string().max(80).optional(),
  /** Automação opcional: jogada de ataque ou salvaguarda e dano/cura. */
  attack: z.boolean().optional(),
  save: z.enum(ABILITY_KEYS).optional(),
  damageDice: z.string().max(40).optional(),
  damageType: z.enum(DAMAGE_TYPES).optional(),
  text: z.string().max(4000),
});

/** De onde vem uma magia concedida (sempre preparada, não conta no limite). */
export const GRANTED_SPELL_SOURCES = ['subclass', 'feat', 'species', 'class', 'other'] as const;

export const GrantedSpellSchema = z.object({
  id: contentId,
  source: z.enum(GRANTED_SPELL_SOURCES),
  /** Atributo de conjuração dessa fonte (ex.: talento Iniciado em Magia). */
  ability: z.enum(ABILITY_KEYS).optional(),
  /** Conjurações sem espaço por descanso longo (ex.: magias de espécie, 1 vez). */
  freePerLongRest: int().min(0).max(9).optional(),
});

/** Magias do personagem: só os ids (os textos ficam no conteúdo das regras). */
export const SpellsSchema = z.object({
  /** Atributo de conjuração escolhido à mão (fichas sem classe do assistente). */
  ability: z.enum(ABILITY_KEYS).optional(),
  cantrips: z.array(contentId).max(30),
  prepared: z.array(contentId).max(60),
  /** Grimório do Mago. */
  spellbook: z.array(contentId).max(200),
  granted: z.array(GrantedSpellSchema).max(60),
  custom: z.array(CustomSpellSchema).max(60),
});

export const LocalSheetSchema = z.object({
  schemaVersion: z.literal(LOCAL_SHEET_SCHEMA_VERSION),
  kind: z.literal('local-sheet'),
  rulesEdition: z.enum(['2014', '2024']),
  identity: z.object({
    name: z.string().max(100),
    className: z.string().max(80),
    playerName: z.string().max(80),
    origin: z.string().max(120),
    description: z.string().max(4000),
    portraitUrl: z.url().max(2000).optional(),
    /** Foto enviada do computador, já reduzida no navegador (data URL; vale mais que o link). */
    portraitData: z
      .string()
      .max(PORTRAIT_DATA_MAX)
      .regex(/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$/)
      .optional(),
  }),
  build: z.object({
    level: int().min(1).max(20),
    abilities: AbilityScoresSchema,
    saveProficiencies: z.array(z.enum(ABILITY_KEYS)).max(6),
    skillProficiencies: z.partialRecord(z.enum(SKILL_KEYS), ProficiencyLevelSchema),
  }),
  combat: z.object({
    hitDie: z.literal(HIT_DIE_SIDES),
    /** Deslocamento em pés (a interface mostra em metros: 30 pés = 9 m). */
    speedFt: int().min(0).max(300),
    /** Ajuste manual da CA; sem ele, CA = 10 + Destreza (sem armadura). */
    armorClassOverride: int().min(0).max(50).optional(),
    /** Ajuste manual do PV máximo; sem ele, usa a média do dado de vida. */
    hpMaxOverride: int().min(1).max(999).optional(),
    /** PV máximo extra a cada nível (ex.: Tenacidade Anã = 1). */
    hpBonusPerLevel: int().min(0).max(5).optional(),
    /** Soma o Bônus de Proficiência à Iniciativa (ex.: talento Alerta). */
    initiativeProficiency: z.boolean().optional(),
  }),
  state: z.object({
    hp: z.object({ current: int().min(0).max(9999), temp: int().min(0).max(9999) }),
    deathSaves: z.object({ successes: int().min(0).max(3), failures: int().min(0).max(3) }),
    hitDiceSpent: int().min(0).max(20),
    inspiration: int().min(0).max(99),
    hpLog: z.array(HpEventSchema).max(50),
    /** Espaços de magia gastos por círculo (índice 0 = 1º círculo). */
    slotsSpent: z.array(int().min(0).max(9)).length(9),
    /** Espaços de Magia de Pacto gastos (Bruxo). */
    pactSlotsSpent: int().min(0).max(9),
    /** Usos gastos de cada recurso (ex.: { rage: 1 }). O máximo vem das regras. */
    resources: z.record(z.string().min(1).max(60), int().min(0).max(99)),
    /**
     * Habilidades ligadas agora (ex.: ["rage", "reckless-attack"]). Cada id aparece uma vez:
     * uma ficha importada ou editada à mão com repetição é corrigida ao abrir.
     */
    active: z
      .array(z.string().min(1).max(60))
      .max(30)
      .transform((ids) => [...new Set(ids)]),
    /** Magia em que o personagem está concentrado. */
    concentration: z.string().max(60).optional(),
  }),
  weapons: z.array(WeaponSchema).max(50),
  features: z.array(FeatureSchema).max(100),
  inventory: InventorySchema,
  /** Escolhas do assistente de criação, quando a ficha nasceu nele (opcional). */
  creation: CreationRecordSchema.optional(),
  /** Classe e histórico de níveis. Fichas feitas à mão podem não ter. */
  progression: ProgressionSchema.optional(),
  spells: SpellsSchema,
});

export type LocalSheet = z.infer<typeof LocalSheetSchema>;
export type Progression = z.infer<typeof ProgressionSchema>;
export type LevelRecord = z.infer<typeof LevelRecordSchema>;
export type LevelChoice = z.infer<typeof LevelChoiceSchema>;
export type SheetSpells = z.infer<typeof SpellsSchema>;
export type CustomSpell = z.infer<typeof CustomSpellSchema>;
export type GrantedSpell = z.infer<typeof GrantedSpellSchema>;
export type HpEvent = z.infer<typeof HpEventSchema>;
export type Weapon = z.infer<typeof WeaponSchema>;
export type Feature = z.infer<typeof FeatureSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type Inventory = z.infer<typeof InventorySchema>;
export type AbilityScores = Record<AbilityKey, number>;

/** Magias vazias (personagem que não conjura, ou ainda sem escolhas). */
export function emptySpells(): SheetSpells {
  return { cantrips: [], prepared: [], spellbook: [], granted: [], custom: [] };
}

/** Inventário vazio: sem moedas e sem itens. */
export function emptyInventory(): Inventory {
  return { coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }, items: [] };
}

/** Estado de jogo das habilidades e magias zerado (descanso longo, ficha nova). */
export function freshAbilityState(): Pick<
  LocalSheet['state'],
  'slotsSpent' | 'pactSlotsSpent' | 'resources' | 'active'
> {
  return { slotsSpent: [0, 0, 0, 0, 0, 0, 0, 0, 0], pactSlotsSpent: 0, resources: {}, active: [] };
}

/** Ficha em branco: nível 1, atributos 10, dado de vida d8, 9 m de deslocamento. */
export function createBlankSheet(): LocalSheet {
  return {
    schemaVersion: LOCAL_SHEET_SCHEMA_VERSION,
    kind: 'local-sheet',
    rulesEdition: '2024',
    identity: { name: '', className: '', playerName: '', origin: '', description: '' },
    build: {
      level: 1,
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      saveProficiencies: [],
      skillProficiencies: {},
    },
    combat: { hitDie: 8, speedFt: 30 },
    state: {
      hp: { current: 8, temp: 0 },
      deathSaves: { successes: 0, failures: 0 },
      hitDiceSpent: 0,
      inspiration: 0,
      hpLog: [],
      ...freshAbilityState(),
    },
    weapons: [],
    features: [],
    inventory: emptyInventory(),
    spells: emptySpells(),
  };
}
