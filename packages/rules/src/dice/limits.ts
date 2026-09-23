/** Limites do motor de dados (plano v2, 12.4). Valem também para fórmulas escritas por usuários. */
export const DICE_LIMITS = {
  /** Total de dados rolados numa expressão, depois de avaliar quantidades variáveis. */
  maxDice: 1000,
  maxSides: 10_000,
  maxLength: 200,
  /** Termos = números, dados e variáveis. */
  maxTerms: 30,
  /** Parênteses e chamadas de função aninhados. */
  maxDepth: 8,
  /** Maior número que pode ser digitado. */
  maxLiteral: 1_000_000,
} as const;
