// Gerado por packages/rules/scripts/spells/gen.py — SRD 5.2 (CC BY 4.0).
// Não edite aqui: mude tr/*.json e rode o gerador de novo (ADR-010).
import type { Effect } from '../classes/types';

export interface SpellEffectsDef {
  name: string;
  level: number;
  concentration: boolean;
  effects: Effect[];
}

/** Magias com efeito que a ficha calcula quando estão ativas em você. */
export const SPELL_EFFECTS: Record<string, SpellEffectsDef> = {
  aid: {
    name: 'Auxílio',
    level: 2,
    concentration: false,
    effects: [
      {
        type: 'hp-max-bonus',
        value: 5,
      },
      {
        type: 'note',
        text: 'Auxílio: +5 PV máximo e atual (+5 a mais por círculo acima do 2º).',
      },
    ],
  },
  barkskin: {
    name: 'Pele-Casca',
    level: 2,
    concentration: false,
    effects: [
      {
        type: 'ac-minimum',
        value: 17,
      },
    ],
  },
  'beacon-of-hope': {
    name: 'Sinal de Esperança',
    level: 3,
    concentration: true,
    effects: [
      {
        type: 'advantage',
        on: ['save:wis'],
      },
      {
        type: 'note',
        text: 'Sinal de Esperança: Vantagem em salvaguardas de Sabedoria e contra a morte; curas recuperam o máximo possível.',
      },
    ],
  },
  bless: {
    name: 'Bênção',
    level: 1,
    concentration: true,
    effects: [
      {
        type: 'roll-bonus-dice',
        dice: '1d4',
        on: ['attack', 'save'],
      },
    ],
  },
  blur: {
    name: 'Turvar',
    level: 2,
    concentration: true,
    effects: [
      {
        type: 'note',
        text: 'Nublar: ataques contra você têm Desvantagem (menos de quem enxerga com Visão Verdadeira ou Percepção às Cegas).',
      },
    ],
  },
  'death-ward': {
    name: 'Proteção Contra a Morte',
    level: 4,
    concentration: false,
    effects: [
      {
        type: 'note',
        text: 'Proteção contra a Morte: na primeira vez que cairia a 0 PV, fica com 1 PV.',
      },
    ],
  },
  'divine-favor': {
    name: 'Favor Divino',
    level: 1,
    concentration: false,
    effects: [
      {
        type: 'extra-damage',
        dice: '1d4',
        filter: {
          weapon: true,
        },
        damageType: 'radiant',
      },
    ],
  },
  'enlarge-reduce': {
    name: 'Aumentar/Reduzir',
    level: 2,
    concentration: true,
    effects: [
      {
        type: 'extra-damage',
        dice: '1d4',
        filter: {
          weapon: true,
        },
      },
      {
        type: 'advantage',
        on: ['check:str', 'save:str'],
      },
      {
        type: 'note',
        text: 'Aumentar: um tamanho maior; +1d4 no dano das armas, Vantagem em testes e salvaguardas de Força.',
      },
    ],
  },
  fly: {
    name: 'Voo',
    level: 3,
    concentration: true,
    effects: [
      {
        type: 'note',
        text: 'Voo: Deslocamento de Voo de 18 m.',
      },
    ],
  },
  foresight: {
    name: 'Sexto Sentido',
    level: 9,
    concentration: false,
    effects: [
      {
        type: 'advantage',
        on: [
          'attack',
          'initiative',
          'save:str',
          'save:dex',
          'save:con',
          'save:int',
          'save:wis',
          'save:cha',
          'check:str',
          'check:dex',
          'check:con',
          'check:int',
          'check:wis',
          'check:cha',
        ],
      },
      {
        type: 'note',
        text: 'Sexto Sentido: Vantagem nos Testes de D20; ataques contra você têm Desvantagem.',
      },
    ],
  },
  'freedom-of-movement': {
    name: 'Movimentação Livre',
    level: 4,
    concentration: false,
    effects: [
      {
        type: 'note',
        text: 'Movimentação Livre: terreno difícil não reduz seu movimento; magias não reduzem seu Deslocamento nem deixam você Paralisado ou Contido.',
      },
    ],
  },
  'greater-invisibility': {
    name: 'Invisibilidade Maior',
    level: 4,
    concentration: true,
    effects: [
      {
        type: 'advantage',
        on: ['attack'],
      },
      {
        type: 'note',
        text: 'Invisibilidade Maior: Invisível; ataques contra você têm Desvantagem.',
      },
    ],
  },
  haste: {
    name: 'Celeridade',
    level: 3,
    concentration: true,
    effects: [
      {
        type: 'ac-bonus',
        value: 2,
      },
      {
        type: 'advantage',
        on: ['save:dex'],
      },
      {
        type: 'note',
        text: 'Deslocamento dobrado e uma ação a mais por turno (Atacar com um ataque, Disparada, Desengajar, Esconder ou Usar Objeto).',
      },
    ],
  },
  heroism: {
    name: 'Heroísmo',
    level: 1,
    concentration: true,
    effects: [
      {
        type: 'note',
        text: 'Heroísmo: imune a Amedrontado e ganha PV temporários iguais ao modificador de conjuração no início de cada turno.',
      },
    ],
  },
  hex: {
    name: 'Danação',
    level: 1,
    concentration: true,
    effects: [
      {
        type: 'extra-damage',
        dice: '1d6',
        damageType: 'necrotic',
      },
    ],
  },
  'holy-aura': {
    name: 'Aura Sagrada',
    level: 8,
    concentration: true,
    effects: [
      {
        type: 'advantage',
        on: ['save:str', 'save:dex', 'save:con', 'save:int', 'save:wis', 'save:cha'],
      },
      {
        type: 'note',
        text: 'Aura Sagrada: ataques contra você têm Desvantagem.',
      },
    ],
  },
  'hunters-mark': {
    name: 'Marca do Predador',
    level: 1,
    concentration: true,
    effects: [
      {
        type: 'extra-damage',
        dice: '1d6',
        damageType: 'force',
      },
    ],
  },
  longstrider: {
    name: 'Passos Largos',
    level: 1,
    concentration: false,
    effects: [
      {
        type: 'speed-bonus',
        ft: 10,
      },
    ],
  },
  'mage-armor': {
    name: 'Armadura Arcana',
    level: 1,
    concentration: false,
    effects: [
      {
        type: 'ac-formula',
        base: 13,
        abilities: [],
        shield: true,
      },
    ],
  },
  'magic-weapon': {
    name: 'Arma Mágica',
    level: 2,
    concentration: false,
    effects: [
      {
        type: 'attack-bonus',
        value: 1,
        filter: {
          weapon: true,
        },
      },
      {
        type: 'damage-bonus',
        value: 1,
        filter: {
          weapon: true,
        },
      },
      {
        type: 'note',
        text: 'Arma Mágica: +1 numa arma (+2 com espaço de 3º círculo, +3 com 6º).',
      },
    ],
  },
  'protection-from-evil-and-good': {
    name: 'Proteção Contra o Bem e o Mal',
    level: 1,
    concentration: true,
    effects: [
      {
        type: 'note',
        text: 'Proteção: Aberrações, Celestiais, Elementais, Fadas, Ínferos e Mortos-Vivos têm Desvantagem nos ataques contra você.',
      },
    ],
  },
  shield: {
    name: 'Escudo Arcano',
    level: 1,
    concentration: false,
    effects: [
      {
        type: 'ac-bonus',
        value: 5,
      },
    ],
  },
  'shield-of-faith': {
    name: 'Escudo da Fé',
    level: 1,
    concentration: true,
    effects: [
      {
        type: 'ac-bonus',
        value: 2,
      },
    ],
  },
  stoneskin: {
    name: 'Pele-Rocha',
    level: 4,
    concentration: true,
    effects: [
      {
        type: 'resistance',
        damage: ['bludgeoning', 'piercing', 'slashing'],
      },
    ],
  },
  'warding-bond': {
    name: 'Vínculo de Proteção',
    level: 2,
    concentration: false,
    effects: [
      {
        type: 'ac-bonus',
        value: 1,
      },
      {
        type: 'save-bonus',
        value: 1,
      },
      {
        type: 'note',
        text: 'Égide: Resistência a todo dano; quem conjurou sofre o mesmo dano que você.',
      },
    ],
  },
};
