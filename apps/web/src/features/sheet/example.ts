import { createBlankSheet, type LocalSheet } from '@grimorio/shared';

/**
 * Personagem de exemplo (para quem quer ver a ficha funcionando antes de preencher).
 * Ladina nível 3 montada com o conjunto padrão de atributos (regras de 2024).
 * Os nomes de regras são termos de jogo; as descrições são resumos próprios.
 */
export function exampleSheet(): LocalSheet {
  const s = createBlankSheet();
  s.identity = {
    name: 'Kaela Ventoleve',
    className: 'Ladina',
    playerName: 'Você',
    origin: 'Humana · Criminosa',
    description:
      'Cresceu nos telhados do porto e conhece cada beco da cidade. Fala pouco, observa muito e nunca senta de costas para a porta.',
  };
  s.build = {
    level: 3,
    abilities: { str: 8, dex: 17, con: 15, int: 12, wis: 13, cha: 10 },
    saveProficiencies: ['dex', 'int'],
    skillProficiencies: {
      acrobatics: 1,
      deception: 1,
      investigation: 1,
      perception: 1,
      stealth: 2,
      'sleight-of-hand': 2,
    },
  };
  s.combat = { hitDie: 8, speedFt: 30, armorClassOverride: 15 };
  s.state.hp = { current: 24, temp: 0 };
  s.state.inspiration = 1;
  s.weapons = [
    {
      id: 'ex-rapieira',
      name: 'Rapieira',
      ability: 'finesse',
      proficient: true,
      damageDice: '1d8',
      damageType: 'piercing',
      magicBonus: 0,
      critRange: 20,
      properties: 'Acuidade',
    },
    {
      id: 'ex-adaga',
      name: 'Adaga',
      ability: 'finesse',
      proficient: true,
      damageDice: '1d4',
      damageType: 'piercing',
      magicBonus: 0,
      critRange: 20,
      properties: 'Acuidade, Leve, Arremesso (6/18 m)',
    },
    {
      id: 'ex-arco',
      name: 'Arco Curto',
      ability: 'dex',
      proficient: true,
      damageDice: '1d6',
      damageType: 'piercing',
      magicBonus: 0,
      critRange: 20,
      properties: 'Duas Mãos, Munição (24/96 m)',
    },
  ];
  s.features = [
    {
      id: 'ex-furtivo',
      name: 'Ataque Furtivo (2d6)',
      text: 'Uma vez por turno, some 2d6 ao dano de um ataque com arma de Acuidade ou à distância quando tiver Vantagem, ou quando um aliado estiver a até 1,5 m do alvo.',
    },
    {
      id: 'ex-ardilosa',
      name: 'Ação Ardilosa',
      text: 'Com uma Ação Bônus: Correr, Desengajar ou Esconder.',
    },
    {
      id: 'ex-armadura',
      name: 'CA 15',
      text: 'Couro Batido (12) + Destreza (+3). Ajustada à mão enquanto as armaduras não estão no site.',
    },
  ];
  return s;
}
