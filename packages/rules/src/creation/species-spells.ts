/**
 * Magias que vêm da espécie (Livro do Jogador 2024, cap. 4), pelo id da espécie ou da linhagem
 * escolhida no assistente. Nível 1 = truques/magias desde a criação; 3 e 5 = ganhos ao subir.
 * As magias de 1º círculo ou mais podem ser conjuradas uma vez sem espaço por Descanso Longo.
 * O atributo de conjuração é Inteligência, Sabedoria ou Carisma (o jogador escolhe).
 */
export const SPECIES_SPELLS: Record<string, Partial<Record<1 | 3 | 5, string[]>>> = {
  'high-elf': { 1: ['prestidigitation'], 3: ['detect-magic'], 5: ['misty-step'] },
  drow: { 1: ['dancing-lights'], 3: ['faerie-fire'], 5: ['darkness'] },
  'wood-elf': { 1: ['druidcraft'], 3: ['longstrider'], 5: ['pass-without-trace'] },
  'rock-gnome': { 1: ['mending', 'prestidigitation'] },
  'forest-gnome': { 1: ['minor-illusion', 'speak-with-animals'] },
  abyssal: { 1: ['poison-spray'], 3: ['ray-of-sickness'], 5: ['hold-person'] },
  chthonic: { 1: ['chill-touch'], 3: ['false-life'], 5: ['ray-of-enfeeblement'] },
  infernal: { 1: ['fire-bolt'], 3: ['hellish-rebuke'], 5: ['darkness'] },
  /** Presença Sobrenatural (todo Tiferino). */
  tiefling: { 1: ['thaumaturgy'] },
};

/** Magias de espécie ganhas exatamente neste nível do personagem. */
export function speciesSpellsAt(
  speciesId: string | undefined,
  optionId: string | undefined,
  level: 1 | 3 | 5,
): string[] {
  return [
    ...(speciesId ? (SPECIES_SPELLS[speciesId]?.[level] ?? []) : []),
    ...(optionId ? (SPECIES_SPELLS[optionId]?.[level] ?? []) : []),
  ];
}
