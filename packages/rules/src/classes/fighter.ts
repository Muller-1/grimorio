import { asiFeatures, byLevel, epicBoon, extraAttack, subclassFeature } from './common';
import type { ClassProgression } from './types';

export const FIGHTER: ClassProgression = {
  classId: 'fighter',
  columns: {
    secondWind: byLevel([
      [1, 2],
      [4, 3],
      [10, 4],
    ]),
    weaponMastery: byLevel([
      [1, 3],
      [4, 4],
      [10, 5],
      [16, 6],
    ]),
    actionSurge: byLevel([
      [1, 0],
      [2, 1],
      [17, 2],
    ]),
    indomitable: byLevel([
      [1, 0],
      [9, 1],
      [13, 2],
      [17, 3],
    ]),
  },
  columnNames: {
    secondWind: 'Retomar o Fôlego',
    weaponMastery: 'Maestria em Arma',
    actionSurge: 'Surto de Ação',
    indomitable: 'Indomável',
  },
  subclassLevels: [3, 7, 10, 15, 18],
  features: [
    {
      id: 'fighting-style',
      level: 1,
      name: 'Estilo de Luta',
      text: 'Um talento de Estilo de Luta à sua escolha (Defesa é o recomendado). A cada nível de Guerreiro, pode trocá-lo por outro.',
    },
    {
      id: 'second-wind',
      level: 1,
      name: 'Recuperar Fôlego',
      text: 'Ação Bônus: recupere 1d10 + seu nível de Guerreiro em PV. Descanso Curto devolve 1 uso; Longo, todos.',
      resource: {
        id: 'second-wind',
        name: 'Recuperar Fôlego',
        max: { column: 'secondWind' },
        recharge: 'short-one',
      },
      activation: [
        {
          id: 'second-wind',
          name: 'Recuperar Fôlego',
          mode: 'use',
          cost: { resource: 'second-wind', amount: 1 },
          effects: [],
          heal: { dice: '1d10', plus: { classLevel: true } },
        },
      ],
    },
    {
      id: 'weapon-mastery',
      level: 1,
      name: 'Maestria em Arma',
      text: 'Use as propriedades de maestria de tipos de arma à sua escolha (a quantidade cresce com o nível). A cada Descanso Longo, pode trocar uma escolha.',
    },
    {
      id: 'action-surge',
      level: 2,
      name: 'Surto de Ação',
      text: 'No seu turno, faça uma ação a mais (menos Usar Magia). Volta num Descanso Curto ou Longo. A partir do nível 17, dois usos por descanso (só um por turno).',
      resource: {
        id: 'action-surge',
        name: 'Surto de Ação',
        max: { column: 'actionSurge' },
        recharge: 'short',
      },
      activation: [
        {
          id: 'action-surge',
          name: 'Surto de Ação',
          mode: 'use',
          cost: { resource: 'action-surge', amount: 1 },
          effects: [],
        },
      ],
    },
    {
      id: 'tactical-mind',
      level: 2,
      name: 'Mente Tática',
      text: 'Ao falhar num teste de atributo, gaste um uso de Recuperar Fôlego para somar 1d10 ao teste. Se ainda falhar, o uso não é gasto.',
    },
    subclassFeature(3, 'Guerreiro'),
    ...asiFeatures([4, 6, 8, 12, 14, 16]),
    extraAttack(5),
    {
      id: 'tactical-shift',
      level: 5,
      name: 'Ajuste Tático',
      text: 'Ao usar Recuperar Fôlego como Ação Bônus, mova-se até metade do Deslocamento sem provocar Ataques de Oportunidade.',
    },
    {
      id: 'indomitable',
      level: 9,
      name: 'Indomável',
      text: 'Ao falhar numa salvaguarda, role de novo com bônus igual ao seu nível de Guerreiro (use o novo resultado). Usos por Descanso Longo: 1 (2 no nível 13, 3 no 17).',
      resource: {
        id: 'indomitable',
        name: 'Indomável',
        max: { column: 'indomitable' },
        recharge: 'long',
      },
    },
    {
      id: 'tactical-master',
      level: 9,
      name: 'Mestre Tático',
      text: 'Ao atacar com uma arma cuja maestria você usa, pode trocar a propriedade por Empurrar, Drenar ou Lentidão nesse ataque.',
    },
    {
      id: 'two-extra-attacks',
      level: 11,
      name: 'Dois Ataques Extras',
      text: 'Você ataca três vezes quando usa a ação Atacar.',
    },
    {
      id: 'studied-attacks',
      level: 13,
      name: 'Ataques Estudados',
      text: 'Se errar um ataque contra uma criatura, tem Vantagem no próximo ataque contra ela até o fim do seu próximo turno.',
    },
    epicBoon('Dádiva da Proeza em Combate'),
    {
      id: 'three-extra-attacks',
      level: 20,
      name: 'Três Ataques Extras',
      text: 'Você ataca quatro vezes quando usa a ação Atacar.',
    },
  ],
  subclasses: [
    {
      id: 'champion',
      name: 'Campeão',
      tagline: 'Busca a excelência física e golpes devastadores.',
      features: [
        {
          id: 'improved-critical',
          level: 3,
          name: 'Crítico Aprimorado',
          text: 'Seus ataques com armas e Ataques Desarmados são Acertos Críticos com 19 ou 20 no d20.',
          passive: [{ type: 'crit-range', min: 19 }],
        },
        {
          id: 'remarkable-athlete',
          level: 3,
          name: 'Atleta Extraordinário',
          text: 'Vantagem em Iniciativa e em testes de Força (Atletismo). Logo depois de um Acerto Crítico, mova-se até metade do Deslocamento sem provocar Ataques de Oportunidade.',
          passive: [{ type: 'advantage', on: ['initiative'] }],
        },
        {
          id: 'additional-fighting-style',
          level: 7,
          name: 'Estilo de Luta Adicional',
          text: 'Mais um talento de Estilo de Luta à sua escolha.',
          choice: { kind: 'fighting-style' },
        },
        {
          id: 'heroic-warrior',
          level: 10,
          name: 'Combatente Heroico',
          text: 'Em combate, ganhe Inspiração Heroica ao começar o turno sem ela.',
        },
        {
          id: 'superior-critical',
          level: 15,
          name: 'Crítico Superior',
          text: 'Acertos Críticos com 18 a 20 no d20.',
          passive: [{ type: 'crit-range', min: 18 }],
        },
        {
          id: 'survivor',
          level: 18,
          name: 'Sobrevivente',
          text: 'Vantagem em Salvaguardas contra Morte, e 18 a 20 contam como 20. Sangrando e com pelo menos 1 PV, recupere 5 + Constituição em PV no início de cada turno.',
        },
      ],
    },
  ],
};
