/**
 * Fichas de verdade para a carga: uma ficha em branco pesa pouco e esconde o custo real de
 * validar e salvar (armas, características, inventário). Parte dos personagens tem foto, que é
 * o que mais engorda a ficha e a resposta.
 */
import { createBlankSheet, type LocalSheet } from '@grimorio/shared';
import type { Rng } from './rng';

const CLASSES = ['Ladina', 'Guerreiro', 'Clériga', 'Mago', 'Bardo', 'Patrulheira'] as const;

/** Data URL de "foto" com ~`kb` kB (bytes aleatórios: não comprime, como uma foto de verdade). */
export function fakePortrait(rng: Rng, kb: number): string {
  const bytes = Buffer.alloc(kb * 1024);
  for (let i = 0; i < bytes.length; i++) bytes[i] = rng.int(0, 255);
  return `data:image/jpeg;base64,${bytes.toString('base64')}`;
}

export function characterSheet(rng: Rng, name: string, withPortrait: boolean): LocalSheet {
  const s = createBlankSheet();
  s.identity = {
    name,
    className: rng.pick(CLASSES),
    playerName: name,
    origin: 'Criminosa · Humana',
    description:
      'Cresceu nos telhados do porto e conhece cada beco da cidade. Fala pouco, observa muito e ' +
      'nunca senta de costas para a porta.',
    ...(withPortrait ? { portraitData: fakePortrait(rng, 45) } : {}),
  };
  s.build = {
    level: rng.int(1, 5),
    abilities: { str: 8, dex: 17, con: 15, int: 12, wis: 13, cha: 10 },
    saveProficiencies: ['dex', 'int'],
    skillProficiencies: { acrobatics: 1, perception: 1, stealth: 2, 'sleight-of-hand': 2 },
  };
  s.combat = { hitDie: 8, speedFt: 30, hpMaxOverride: 40 };
  s.state.hp = { current: 30, temp: 0 };
  s.weapons = [
    {
      id: 'rapieira',
      name: 'Rapieira',
      ability: 'finesse',
      proficient: true,
      damageDice: '1d8',
      damageType: 'piercing',
      magicBonus: 0,
      critRange: 20,
      properties: 'Acuidade',
      range: 'melee',
      finesse: true,
    },
    {
      id: 'arco',
      name: 'Arco Curto',
      ability: 'dex',
      proficient: true,
      damageDice: '1d6',
      damageType: 'piercing',
      magicBonus: 0,
      critRange: 20,
      properties: 'Duas Mãos, Munição (24/96 m)',
      range: 'ranged',
      finesse: false,
      twoHanded: true,
      rangeM: { normal: 24, long: 96 },
    },
  ];
  s.features = [
    {
      id: 'furtivo',
      name: 'Ataque Furtivo (2d6)',
      text: 'Uma vez por turno, some 2d6 ao dano de um ataque com arma de Acuidade ou à distância.',
      source: 'class',
    },
    {
      id: 'ardilosa',
      name: 'Ação Ardilosa',
      text: 'Com uma Ação Bônus: Correr, Desengajar ou Esconder.',
      source: 'class',
    },
  ];
  s.inventory = {
    coins: { cp: 8, sp: 12, ep: 0, gp: 15, pp: 0 },
    items: [
      {
        id: 'armadura',
        name: 'Armadura de Couro Batido',
        quantity: 1,
        weightKg: 6.5,
        armor: { kind: 'light', base: 12 },
      },
      { id: 'flechas', name: 'Flechas', quantity: 20, weightKg: 0.025 },
      { id: 'aljava', name: 'Aljava', quantity: 1, weightKg: 0.5 },
      { id: 'kit', name: 'Kit de Aventureiro', quantity: 1, weightKg: 21 },
    ],
  };
  return s;
}
