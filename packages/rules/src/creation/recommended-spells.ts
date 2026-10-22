import type { ClassId } from './content';

/**
 * Magias que o Livro do Jogador recomenda no nível 1 de cada classe (cap. 3, "Conjuração").
 * Só os ids (os nomes vêm do pacote de magias). O Mago não tem recomendação de preparadas:
 * o site sugere as quatro primeiras do grimório recomendado.
 */
export const RECOMMENDED_SPELLS: Partial<
  Record<ClassId, { cantrips: string[]; prepared: string[]; spellbook?: string[] }>
> = {
  bard: {
    cantrips: ['dancing-lights', 'vicious-mockery'],
    prepared: ['charm-person', 'color-spray', 'healing-word', 'dissonant-whispers'],
  },
  cleric: {
    cantrips: ['sacred-flame', 'guidance', 'thaumaturgy'],
    prepared: ['bless', 'cure-wounds', 'shield-of-faith', 'guiding-bolt'],
  },
  druid: {
    cantrips: ['druidcraft', 'produce-flame'],
    prepared: ['animal-friendship', 'cure-wounds', 'faerie-fire', 'thunderwave'],
  },
  paladin: { cantrips: [], prepared: ['searing-smite', 'heroism'] },
  ranger: { cantrips: [], prepared: ['cure-wounds', 'ensnaring-strike'] },
  sorcerer: {
    cantrips: ['sorcerous-burst', 'light', 'prestidigitation', 'shocking-grasp'],
    prepared: ['detect-magic', 'burning-hands'],
  },
  warlock: {
    cantrips: ['prestidigitation', 'eldritch-blast'],
    prepared: ['hex', 'charm-person'],
  },
  wizard: {
    cantrips: ['light', 'mage-hand', 'ray-of-frost'],
    spellbook: [
      'mage-armor',
      'detect-magic',
      'magic-missile',
      'thunderwave',
      'feather-fall',
      'sleep',
    ],
    prepared: ['mage-armor', 'detect-magic', 'magic-missile', 'thunderwave'],
  },
};
