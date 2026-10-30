import { ABILITY_KEYS, SKILL_KEYS } from '../character/keys';
import { z } from '../zod';

/**
 * Registro do assistente de criação (RF-20): as ESCOLHAS feitas em cada etapa, guardadas junto
 * da ficha. A ficha em si continua no formato local (números já aplicados); este registro serve
 * para mostrar "de onde veio" cada coisa e para, no futuro, refazer a ficha a partir das regras
 * (plano v2, 9.1: "guarde as escolhas, calcule o resto").
 *
 * Os ids são os do conteúdo do Livro do Jogador 2024 em `packages/rules/src/content` (ex.:
 * classe "fighter", antecedente "soldier"). "custom" = digitado pelo jogador (RF-24).
 */
export const CREATION_RECORD_VERSION = 1;

const contentId = z.string().min(1).max(80);
const abilityScore = z.number().int().min(1).max(30);
const ability = z.enum(ABILITY_KEYS);
const skill = z.enum(SKILL_KEYS);

export const ABILITY_METHODS = ['standard-array', 'point-buy', 'rolled', 'manual'] as const;
export type AbilityMethod = (typeof ABILITY_METHODS)[number];

export const CreationRecordSchema = z.object({
  version: z.literal(CREATION_RECORD_VERSION),
  /** Versão do conteúdo usado (errata e correções mudam a versão). */
  contentVersion: z.string().max(40),
  classId: contentId,
  speciesId: contentId,
  /** Linhagem, ancestral ou legado (elfo, draconato, golias, tiferino, gnomo). */
  speciesOptionId: contentId.optional(),
  backgroundId: contentId,
  /** Escolha obrigatória da classe no nível 1 (Ordem Divina/Primal, Invocação do Bruxo). */
  classOptionId: contentId.optional(),
  /** Estilo de Luta escolhido no nível 1 (Guerreiro). Fichas antigas não têm. */
  fightingStyleId: contentId.optional(),
  /** Maestria em Arma: tipos de arma escolhidos (ids do conteúdo, ex.: "greataxe"). */
  weaponMasteries: z.array(contentId).max(6).optional(),
  /** Atributos ANTES do bônus do antecedente. */
  abilityMethod: z.enum(ABILITY_METHODS),
  baseAbilities: z.object({
    str: abilityScore,
    dex: abilityScore,
    con: abilityScore,
    int: abilityScore,
    wis: abilityScore,
    cha: abilityScore,
  }),
  /** Os 6 resultados de 4d6 (já sem o menor dado), na ordem em que foram rolados. */
  rolledScores: z.array(z.number().int().min(3).max(18)).length(6).optional(),
  /** +2/+1 ou +1/+1/+1 nos atributos que o antecedente permite. */
  backgroundBonus: z.partialRecord(ability, z.number().int().min(1).max(2)),
  /** Perícias escolhidas na classe (as do antecedente são fixas). */
  classSkills: z.array(skill).max(6),
  /** Perícias extras de espécie/talento (ex.: Humano Habilidoso, talento Habilidoso). */
  extraSkills: z.array(skill).max(6),
  originFeatId: contentId,
  /** Escolhas do equipamento inicial: pacote A (itens) ou B (só ouro). */
  classEquipment: z.enum(['A', 'B', 'C']),
  backgroundEquipment: z.enum(['A', 'B']),
  languages: z.array(z.string().min(1).max(40)).max(10),
  alignment: z.string().max(40).optional(),
});

export type CreationRecord = z.infer<typeof CreationRecordSchema>;
