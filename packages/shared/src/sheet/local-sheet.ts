import { z } from 'zod';
import {
  ABILITY_KEYS,
  DAMAGE_TYPES,
  HIT_DIE_SIDES,
  PROFICIENCY_LEVELS,
  SKILL_KEYS,
  type AbilityKey,
} from '../character/keys';

/**
 * Ficha local — formato PROVISÓRIO (ver docs/adr/002-ficha-antecipada.md).
 *
 * Existe para a ficha editável funcionar antes do R2 (contas, conteúdo do SRD e o
 * `CharacterData` v2 do plano). Tudo é digitado pelo jogador e fica no navegador.
 * Os nomes seguem os do `CharacterData` v2 (identity, state.hp, hpLog...) para que a
 * migração no R2 seja uma função simples `localSheetToCharacterData`.
 */

export const LOCAL_SHEET_SCHEMA_VERSION = 1;

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
  /** O que realmente mudou (PV atual e temporário). É o que o "desfazer" inverte. */
  effect: z.object({ current: int(), temp: int() }),
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
});

export const FeatureSchema = z.object({
  id: z.string().min(1),
  name: z.string().max(80),
  text: z.string().max(4000),
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
  }),
  state: z.object({
    hp: z.object({ current: int().min(0).max(9999), temp: int().min(0).max(9999) }),
    deathSaves: z.object({ successes: int().min(0).max(3), failures: int().min(0).max(3) }),
    hitDiceSpent: int().min(0).max(20),
    inspiration: int().min(0).max(99),
    hpLog: z.array(HpEventSchema).max(50),
  }),
  weapons: z.array(WeaponSchema).max(50),
  features: z.array(FeatureSchema).max(100),
});

export type LocalSheet = z.infer<typeof LocalSheetSchema>;
export type HpEvent = z.infer<typeof HpEventSchema>;
export type Weapon = z.infer<typeof WeaponSchema>;
export type Feature = z.infer<typeof FeatureSchema>;
export type AbilityScores = Record<AbilityKey, number>;

/** Lê dados salvos de forma segura: devolve `null` se o formato não for reconhecido. */
export function parseLocalSheet(raw: unknown): LocalSheet | null {
  const result = LocalSheetSchema.safeParse(raw);
  return result.success ? result.data : null;
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
    },
    weapons: [],
    features: [],
  };
}
