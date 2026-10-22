import { SPELL_EFFECTS } from '../effects';
import type { SpellDef } from '../types';

/**
 * Quem recebe a magia, para a ficha saber se oferece "Em mim" ao conjurar.
 * - `self`: sempre o conjurador (alcance Pessoal, ou o efeito é do conjurador mesmo com o alvo
 *   sendo um inimigo, como o dano extra da Marca do Predador);
 * - `ally`: magia que ajuda ou cura e pode ser lançada em você ou em outra criatura;
 * - `other`: ataques, magias contra inimigos e as que só servem para outra criatura.
 */
export type SpellTarget = 'self' | 'ally' | 'other';

const CASTER_BENEFIT = new Set(['hex', 'hunters-mark']);
/** "Outra criatura": Vínculo de Proteção. A luz do Celestial cura quem está nela, não você. */
const OTHERS_ONLY = new Set(['warding-bond', 'conjure-celestial']);
/** Sem jogada de ataque nem salvaguarda, mas o dano sai no momento em que conjura. */
const DAMAGE_ON_CAST = new Set(['magic-missile', 'divine-smite', 'shining-smite']);

export function spellTarget(spell: SpellDef): SpellTarget {
  if (spell.range.startsWith('Pessoal') || CASTER_BENEFIT.has(spell.id)) return 'self';
  if (spell.attack || OTHERS_ONLY.has(spell.id)) return 'other';
  return SPELL_EFFECTS[spell.id] || spell.heal || spell.tempHp ? 'ally' : 'other';
}

/**
 * O dado que o botão Conjurar já rola: o ataque (o dano fica para depois do acerto); o dano das
 * magias com salvaguarda (o alvo resiste à metade) e das que acertam sempre; a cura; os PV
 * temporários. Magias de efeito contínuo (Danação, Crescer Espinhos) não rolam nada ao conjurar.
 */
export type CastRoll = 'attack' | 'damage' | 'heal' | 'temp-hp' | null;

export function castRoll(spell: SpellDef): CastRoll {
  if (spell.attack) return 'attack';
  if (spell.tempHp) return 'temp-hp';
  if (spell.heal && !spell.save) return 'heal';
  if (spell.damage?.length && (spell.save || DAMAGE_ON_CAST.has(spell.id))) return 'damage';
  return null;
}
