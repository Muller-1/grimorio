import { createBlankSheet, type AbilityScores, type LocalSheet } from '@grimorio/shared';

/** Construtor legível de fichas locais para testes. */
export function aSheet() {
  const sheet: LocalSheet = createBlankSheet();
  const builder = {
    named(name: string) {
      sheet.identity.name = name;
      return builder;
    },
    level(level: number) {
      sheet.build.level = level;
      return builder;
    },
    abilities(scores: AbilityScores) {
      sheet.build.abilities = { ...scores };
      return builder;
    },
    hitDie(die: LocalSheet['combat']['hitDie']) {
      sheet.combat.hitDie = die;
      return builder;
    },
    build(): LocalSheet {
      return JSON.parse(JSON.stringify(sheet)) as LocalSheet;
    },
  };
  return builder;
}
