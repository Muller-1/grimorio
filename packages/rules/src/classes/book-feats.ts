import type { AbilityKey } from '@grimorio/shared';
import type { LevelFeatDef } from './feats';

/**
 * Talentos Gerais e Dádivas Épicas do Livro do Jogador 2024 que o SRD não traz. As regras
 * (pré-requisitos, aumentos de atributo, benefícios) seguem o livro; os textos são nossos,
 * resumidos com palavras próprias. Fica num arquivo à parte, de propósito: para tirar este
 * conteúdo do site basta apagar este arquivo e a linha que o junta em `./feats.ts`.
 */

const ALL: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const MENTAL: AbilityKey[] = ['int', 'wis', 'cha'];
const PHYSICAL: AbilityKey[] = ['str', 'dex'];

const SPELLCASTING = 'Conjurar magias (Conjuração ou Magia de Pacto)';

/** Um talento Geral: nível 4+, com o aumento de atributo que quase todos trazem. */
const general = (
  def: Omit<LevelFeatDef, 'category' | 'minLevel' | 'source'> & { id: string },
): LevelFeatDef => ({ ...def, category: 'general', minLevel: 4, source: 'book' });

/** Uma Dádiva Épica: nível 19+, com +1 num atributo (máximo 30). */
const boon = (
  def: Omit<LevelFeatDef, 'category' | 'minLevel' | 'source' | 'abilityIncrease'> & {
    id: string;
    from?: AbilityKey[];
  },
): LevelFeatDef => {
  const { from, ...rest } = def;
  return {
    ...rest,
    category: 'epic-boon',
    minLevel: 19,
    abilityIncrease: { from: from ?? ALL, max: 30 },
    source: 'book',
  };
};

export const BOOK_LEVEL_FEATS: LevelFeatDef[] = [
  general({
    id: 'elemental-adept',
    name: 'Adepto Elemental',
    requiresSpellcasting: true,
    prerequisite: SPELLCASTING,
    repeatable: true,
    abilityIncrease: { from: MENTAL, max: 20 },
    text: '+1 em Inteligência, Sabedoria ou Carisma (máximo 20). Escolha um tipo de dano: Ácido, Elétrico, Gélido, Ígneo ou Trovejante. Suas magias ignoram a Resistência a esse tipo, e nos dados de dano dele você trata cada 1 como 2. Pode ser pego de novo, com outro tipo de dano.',
  }),
  general({
    id: 'aggressor',
    name: 'Agressor',
    requiresAbility: PHYSICAL,
    abilityIncrease: { from: PHYSICAL, max: 20 },
    text: '+1 em Força ou Destreza (máximo 20). Ao usar Correr, ganha +3 m de Deslocamento nessa ação. Uma vez por turno, se andar pelo menos 3 m em linha reta rumo a um alvo e logo atacá-lo corpo a corpo na ação Atacar, escolha: +1d8 de dano, ou empurrar o alvo até 3 m (se ele não for maior que você).',
  }),
  general({
    id: 'observant',
    name: 'Analítico',
    requiresAbility: ['int', 'wis'],
    abilityIncrease: { from: ['int', 'wis'], max: 20 },
    text: '+1 em Inteligência ou Sabedoria (máximo 20). Escolha Intuição, Investigação ou Percepção: ganhe proficiência nela ou, se já tiver, Especialização. Você pode usar a ação Procurar como Ação Bônus.',
  }),
  general({
    id: 'spell-sniper',
    name: 'Atirador Arcano',
    requiresSpellcasting: true,
    prerequisite: SPELLCASTING,
    abilityIncrease: { from: MENTAL, max: 20 },
    text: '+1 em Inteligência, Sabedoria ou Carisma (máximo 20). Seus ataques de magia ignoram Cobertura Parcial e de Três Quartos, e estar a 1,5 m de um inimigo não lhes dá Desvantagem. Magias com jogada de ataque e alcance de 3 m ou mais ganham +18 m de alcance.',
  }),
  general({
    id: 'athlete',
    name: 'Atleta',
    requiresAbility: PHYSICAL,
    abilityIncrease: { from: PHYSICAL, max: 20 },
    text: '+1 em Força ou Destreza (máximo 20). Deslocamento de Escalada igual ao seu Deslocamento. Levantar-se da condição Caído custa só 1,5 m de movimento, e o Salto em Distância ou em Altura com corrida exige apenas 1,5 m de arrancada.',
  }),
  general({
    id: 'actor',
    name: 'Ator',
    requiresAbility: ['cha'],
    abilityIncrease: { from: ['cha'], max: 20 },
    text: '+1 em Carisma (máximo 20). Disfarçado de uma pessoa, você tem Vantagem em testes de Carisma (Atuação ou Enganação) para se passar por ela. Imita sons e vozes de outras criaturas; quem ouve faz um teste de Sabedoria (Intuição) contra CD 8 + seu mod. de Carisma + Proficiência para notar a farsa.',
  }),
  general({
    id: 'chef',
    name: 'Chef',
    abilityIncrease: { from: ['con', 'wis'], max: 20 },
    text: '+1 em Constituição ou Sabedoria (máximo 20). Proficiência com Utensílios de Cozinheiro. Num Descanso Curto, prepare comida para 4 + Proficiência criaturas: quem comer e gastar Dados de Vida recupera 1d8 PV a mais. Com 1 hora de trabalho ou num Descanso Longo, faça guloseimas em número igual à Proficiência (duram 8 horas); comer uma, com Ação Bônus, dá PV temporários iguais à Proficiência.',
  }),
  general({
    id: 'mounted-combatant',
    name: 'Combatente Montado',
    abilityIncrease: { from: ['str', 'dex', 'wis'], max: 20 },
    text: '+1 em Força, Destreza ou Sabedoria (máximo 20). Montado, você tem Vantagem em ataques contra criaturas desmontadas a até 1,5 m da montaria e menores que ela. Se um efeito permitir salvaguarda de Destreza para metade do dano, a montaria não sofre nada ao passar e só metade ao falhar. Você pode desviar para si um ataque que acertaria a montaria. (Nenhum dos dois pode estar Incapacitado.)',
  }),
  general({
    id: 'war-caster',
    name: 'Conjurador Bélico',
    requiresSpellcasting: true,
    prerequisite: SPELLCASTING,
    abilityIncrease: { from: MENTAL, max: 20 },
    text: '+1 em Inteligência, Sabedoria ou Carisma (máximo 20). Vantagem em salvaguardas de Constituição para manter Concentração. Em vez de um Ataque de Oportunidade, você pode usar a Reação para lançar uma magia de 1 ação que tenha só aquela criatura como alvo. Faz componentes Somáticos com armas ou Escudo nas mãos.',
  }),
  general({
    id: 'ritual-caster',
    name: 'Conjurador Ritualista',
    requiresAbility: MENTAL,
    abilityIncrease: { from: MENTAL, max: 20 },
    text: '+1 em Inteligência, Sabedoria ou Carisma (máximo 20). Escolha magias de 1º círculo com o marcador Ritual, em número igual à sua Proficiência: ficam sempre preparadas e podem ser lançadas com qualquer espaço (o atributo é o que você aumentou aqui). Quando a Proficiência sobe, adicione mais uma. Ritual Rápido: lance uma delas no tempo normal, sem gastar espaço, uma vez por Descanso Longo.',
  }),
  general({
    id: 'defensive-duelist',
    name: 'Duelista Defensivo',
    requiresAbility: ['dex'],
    abilityIncrease: { from: ['dex'], max: 20 },
    text: '+1 em Destreza (máximo 20). Segurando uma arma de Acuidade e sendo acertado por um ataque corpo a corpo, use a Reação para somar sua Proficiência à CA, o que pode fazer o ataque errar. O bônus vale contra os ataques corpo a corpo até o início do seu próximo turno.',
  }),
  general({
    id: 'poisoner',
    name: 'Envenenador',
    abilityIncrease: { from: ['dex', 'int'], max: 20 },
    text: '+1 em Destreza ou Inteligência (máximo 20). Seu dano Venenoso ignora Resistência. Proficiência com o Kit de Veneno: com 1 hora e 50 PO de materiais, faça doses em número igual à Proficiência. Aplique uma dose (Ação Bônus) numa arma ou munição por até 1 minuto ou até causar dano com ela; a vítima faz salvaguarda de Constituição (CD 8 + mod. do atributo aumentado + Proficiência) ou sofre 2d8 de dano Venenoso e fica Envenenada até o fim do seu próximo turno.',
  }),
  general({
    id: 'crusher',
    name: 'Esmagador',
    abilityIncrease: { from: ['str', 'con'], max: 20 },
    text: '+1 em Força ou Constituição (máximo 20). Uma vez por turno, ao acertar um ataque de dano Contundente, mova o alvo 1,5 m para um espaço livre (se ele não for maior que você). Num Acerto Crítico Contundente, os ataques contra o alvo têm Vantagem até o início do seu próximo turno.',
  }),
  general({
    id: 'dual-wielder',
    name: 'Especialista Ambidestro',
    requiresAbility: PHYSICAL,
    abilityIncrease: { from: PHYSICAL, max: 20 },
    text: '+1 em Força ou Destreza (máximo 20). Ao usar Atacar com uma arma Leve, faça um ataque extra como Ação Bônus com outra arma corpo a corpo sem a propriedade Duas Mãos (não precisa ser Leve); o modificador de atributo não entra no dano dele, a menos que seja negativo. Você saca ou guarda duas armas (sem Duas Mãos) de uma vez.',
  }),
  general({
    id: 'lightly-armored',
    name: 'Especialista em Armaduras Leves',
    abilityIncrease: { from: PHYSICAL, max: 20 },
    text: '+1 em Força ou Destreza (máximo 20). Treinamento com Armadura Leve e Escudos.',
  }),
  general({
    id: 'moderately-armored',
    name: 'Especialista em Armaduras Médias',
    prerequisite: 'Treinamento com Armadura Leve',
    abilityIncrease: { from: PHYSICAL, max: 20 },
    text: '+1 em Força ou Destreza (máximo 20). Treinamento com Armadura Média.',
  }),
  general({
    id: 'heavily-armored',
    name: 'Especialista em Armaduras Pesadas',
    prerequisite: 'Treinamento com Armadura Média',
    abilityIncrease: { from: ['con', 'str'], max: 20 },
    text: '+1 em Constituição ou Força (máximo 20). Treinamento com Armadura Pesada.',
  }),
  general({
    id: 'crossbow-expert',
    name: 'Especialista em Besta',
    requiresAbility: ['dex'],
    abilityIncrease: { from: ['dex'], max: 20 },
    text: '+1 em Destreza (máximo 20). Ignora a propriedade Recarga das Bestas de Mão, Leve e Pesada, e carrega munição mesmo sem mão livre. Estar a 1,5 m de um inimigo não dá Desvantagem aos seus ataques com bestas. No ataque extra da propriedade Leve com uma besta Leve, soma o modificador de atributo ao dano se ainda não somava.',
  }),
  general({
    id: 'skill-expert',
    name: 'Especialista em Perícia',
    abilityIncrease: { from: ALL, max: 20 },
    text: '+1 num atributo à escolha (máximo 20). Ganhe proficiência em uma perícia e Especialização em outra perícia em que já seja proficiente (sem Especialização).',
  }),
  general({
    id: 'mage-slayer',
    name: 'Exterminador de Conjuradores',
    abilityIncrease: { from: PHYSICAL, max: 20 },
    text: '+1 em Força ou Destreza (máximo 20). Quem você fere enquanto se concentra tem Desvantagem na salvaguarda para manter a Concentração. Ao falhar numa salvaguarda de Inteligência, Sabedoria ou Carisma, você pode passar nela em vez disso; volta num Descanso Curto ou Longo.',
  }),
  general({
    id: 'inspiring-leader',
    name: 'Líder Inspirador',
    requiresAbility: ['wis', 'cha'],
    abilityIncrease: { from: ['wis', 'cha'], max: 20 },
    text: '+1 em Sabedoria ou Carisma (máximo 20). Ao terminar um Descanso Curto ou Longo, faça um discurso, música ou dança: até seis aliados (você inclusive) a até 9 m que assistiram ganham PV temporários iguais ao seu nível + o modificador do atributo aumentado.',
  }),
  general({
    id: 'keen-mind',
    name: 'Mente Aguçada',
    requiresAbility: ['int'],
    abilityIncrease: { from: ['int'], max: 20 },
    text: '+1 em Inteligência (máximo 20). Escolha Arcanismo, História, Investigação, Natureza ou Religião: ganhe proficiência nela ou, se já tiver, Especialização. Você pode usar a ação Analisar como Ação Bônus.',
  }),
  general({
    id: 'weapon-master',
    name: 'Mestre das Armas',
    abilityIncrease: { from: PHYSICAL, max: 20 },
    text: '+1 em Força ou Destreza (máximo 20). Use a propriedade de maestria de mais um tipo de arma Simples ou Marcial em que tenha proficiência. Troque o tipo a cada Descanso Longo.',
  }),
  general({
    id: 'medium-armor-master',
    name: 'Mestre em Armaduras Médias',
    prerequisite: 'Treinamento com Armadura Média',
    abilityIncrease: { from: PHYSICAL, max: 20 },
    text: '+1 em Força ou Destreza (máximo 20). Com armadura Média e Destreza 16 ou mais, você soma 3 (em vez de 2) à CA.',
  }),
  general({
    id: 'heavy-armor-master',
    name: 'Mestre em Armaduras Pesadas',
    prerequisite: 'Treinamento com Armadura Pesada',
    abilityIncrease: { from: ['str', 'con'], max: 20 },
    text: '+1 em Força ou Constituição (máximo 20). Com armadura Pesada, o dano Contundente, Cortante e Perfurante que um ataque causa a você diminui em um valor igual à sua Proficiência.',
  }),
  general({
    id: 'polearm-master',
    name: 'Mestre em Armas de Haste',
    requiresAbility: PHYSICAL,
    abilityIncrease: { from: PHYSICAL, max: 20 },
    text: '+1 em Força ou Destreza (máximo 20). Depois de atacar com Cajado, Lança ou arma Pesada com Extensão, use uma Ação Bônus para atacar com a ponta oposta (dano Contundente, dado d4). Com essas armas, use a Reação para atacar quem entrar no seu alcance.',
  }),
  general({
    id: 'great-weapon-master',
    name: 'Mestre em Armas Grandes',
    requiresAbility: ['str'],
    abilityIncrease: { from: ['str'], max: 20 },
    text: '+1 em Força (máximo 20). Ao acertar com arma Pesada na ação Atacar, cause dano extra igual à sua Proficiência. Num Acerto Crítico ou ao levar uma criatura a 0 PV com arma corpo a corpo, faça um ataque com a mesma arma como Ação Bônus.',
  }),
  general({
    id: 'shield-master',
    name: 'Mestre em Escudos',
    prerequisite: 'Treinamento com Escudo',
    abilityIncrease: { from: ['str'], max: 20 },
    text: '+1 em Força (máximo 20). Depois de acertar um ataque corpo a corpo na ação Atacar contra alguém a 1,5 m, ataque com o Escudo: o alvo faz salvaguarda de Força (CD 8 + mod. de Força + Proficiência) e, ao falhar, é empurrado 1,5 m ou fica Caído (uma vez por turno). Se uma salvaguarda de Destreza permitir metade do dano, use a Reação com o Escudo para não sofrer nada ao passar.',
  }),
  general({
    id: 'sharpshooter',
    name: 'Mestre-Atirador',
    requiresAbility: ['dex'],
    abilityIncrease: { from: ['dex'], max: 20 },
    text: '+1 em Destreza (máximo 20). Seus ataques à distância com armas ignoram Cobertura Parcial e de Três Quartos. Estar a 1,5 m de um inimigo ou atacar no alcance máximo não dá Desvantagem a eles.',
  }),
  general({
    id: 'piercer',
    name: 'Perfurador',
    abilityIncrease: { from: PHYSICAL, max: 20 },
    text: '+1 em Força ou Destreza (máximo 20). Uma vez por turno, ao acertar dano Perfurante, jogue de novo um dos dados de dano e fique com o novo resultado. Num Acerto Crítico Perfurante, jogue mais um dado de dano.',
  }),
  general({
    id: 'resilient',
    name: 'Resiliente',
    abilityIncrease: { from: ALL, max: 20 },
    text: 'Escolha um atributo em que você ainda não tenha proficiência em salvaguarda: +1 nele (máximo 20) e proficiência nas salvaguardas dele.',
  }),
  general({
    id: 'durable',
    name: 'Resistente',
    abilityIncrease: { from: ['con'], max: 20 },
    text: '+1 em Constituição (máximo 20). Vantagem em Salvaguardas Contra Morte. Com uma Ação Bônus, gaste um Dado de Vida e recupere PV iguais ao resultado.',
  }),
  general({
    id: 'sentinel',
    name: 'Sentinela',
    requiresAbility: PHYSICAL,
    abilityIncrease: { from: PHYSICAL, max: 20 },
    text: '+1 em Força ou Destreza (máximo 20). Logo depois de uma criatura a 1,5 m usar Desengajar ou atacar outro alvo que não seja você, faça um Ataque de Oportunidade contra ela. Ao acertar um Ataque de Oportunidade, o Deslocamento do alvo cai a 0 pelo resto do turno.',
  }),
  general({
    id: 'skulker',
    name: 'Sorrateiro',
    requiresAbility: ['dex'],
    abilityIncrease: { from: ['dex'], max: 20 },
    text: '+1 em Destreza (máximo 20). Visão às Cegas de 3 m. Em combate, tem Vantagem em testes de Destreza (Furtividade) para Esconder-se. Errar um ataque enquanto escondido não revela sua posição.',
  }),
  general({
    id: 'slasher',
    name: 'Talhador',
    abilityIncrease: { from: PHYSICAL, max: 20 },
    text: '+1 em Força ou Destreza (máximo 20). Uma vez por turno, ao acertar dano Cortante, reduza o Deslocamento do alvo em 3 m até o início do seu próximo turno. Num Acerto Crítico Cortante, o alvo tem Desvantagem nos ataques até o início do seu próximo turno.',
  }),
  general({
    id: 'telekinetic',
    name: 'Telecinético',
    abilityIncrease: { from: MENTAL, max: 20 },
    text: '+1 em Inteligência, Sabedoria ou Carisma (máximo 20). Você aprende Mãos Mágicas (sem componentes Verbal e Somático; a mão fica Invisível e ganha +9 m de alcance e de distância). Com uma Ação Bônus, empurre uma criatura que veja a até 9 m: salvaguarda de Força (CD 8 + mod. do atributo aumentado + Proficiência) ou ela se move 1,5 m para perto ou para longe de você.',
  }),
  general({
    id: 'telepathic',
    name: 'Telepático',
    abilityIncrease: { from: MENTAL, max: 20 },
    text: '+1 em Inteligência, Sabedoria ou Carisma (máximo 20). Fale telepaticamente com criaturas que vê a até 18 m (num idioma que você conheça; elas não podem responder do mesmo modo). Detectar Pensamentos sempre preparada: lance-a uma vez sem espaço nem componentes por Descanso Longo, ou com espaços normalmente.',
  }),
  general({
    id: 'shadow-touched',
    name: 'Tocado pela Sombra',
    abilityIncrease: { from: MENTAL, max: 20 },
    text: '+1 em Inteligência, Sabedoria ou Carisma (máximo 20). Invisibilidade e uma magia de 1º círculo de Ilusão ou Necromancia à sua escolha ficam sempre preparadas. Lance cada uma uma vez sem espaço por Descanso Longo, ou com espaços normalmente.',
  }),
  general({
    id: 'fey-touched',
    name: 'Tocado pelas Fadas',
    abilityIncrease: { from: MENTAL, max: 20 },
    text: '+1 em Inteligência, Sabedoria ou Carisma (máximo 20). Passo Nebuloso e uma magia de 1º círculo de Adivinhação ou Encantamento à sua escolha ficam sempre preparadas. Lance cada uma uma vez sem espaço por Descanso Longo, ou com espaços normalmente.',
  }),
  general({
    id: 'martial-weapon-training',
    name: 'Treinamento com Armas Marciais',
    abilityIncrease: { from: PHYSICAL, max: 20 },
    text: '+1 em Força ou Destreza (máximo 20). Proficiência com armas Marciais.',
  }),
  general({
    id: 'speedy',
    name: 'Velocista',
    requiresAbility: ['dex', 'con'],
    abilityIncrease: { from: ['dex', 'con'], max: 20 },
    text: '+1 em Destreza ou Constituição (máximo 20). Deslocamento +3 m. Ao usar Correr, Terreno Difícil não custa movimento extra no resto do turno. Ataques de Oportunidade contra você têm Desvantagem.',
  }),

  // ------------------------------------------------------------------ Dádivas Épicas
  boon({
    id: 'boon-of-fortitude',
    name: 'Dádiva da Fortitude',
    text: '+1 num atributo (máximo 30). Seus PV máximos aumentam em 40. Quando recuperar PV, pode recuperar também PV extras iguais ao seu modificador de Constituição (uma vez até o início do seu próximo turno).',
  }),
  boon({
    id: 'boon-of-skill-proficiency',
    name: 'Dádiva da Proficiência em Perícia',
    text: '+1 num atributo (máximo 30). Proficiência em todas as perícias, e Especialização em uma perícia em que seja proficiente e ainda não tenha Especialização.',
  }),
  boon({
    id: 'boon-of-recovery',
    name: 'Dádiva da Recuperação',
    text: '+1 num atributo (máximo 30). Ao cair a 0 PV, pode ficar com 1 PV e recuperar metade dos seus PV máximos (uma vez por Descanso Longo). Tem uma reserva de dez d10: com uma Ação Bônus, gaste dados dela e recupere PV iguais ao total; ela volta cheia num Descanso Longo.',
  }),
  boon({
    id: 'boon-of-energy-resistance',
    name: 'Dádiva da Resistência à Energia',
    text: '+1 num atributo (máximo 30). Resistência a dois tipos de dano à escolha (Ácido, Elétrico, Gélido, Ígneo, Necrótico, Psíquico, Radiante, Trovejante ou Venenoso), que você pode trocar a cada Descanso Longo. Ao sofrer esse dano, use a Reação para redirecioná-lo a uma criatura a até 18 m: salvaguarda de Destreza (CD 8 + mod. de Constituição + Proficiência) ou ela sofre 2d12 + mod. de Constituição do mesmo tipo.',
  }),
  boon({
    id: 'boon-of-speed',
    name: 'Dádiva da Velocidade',
    text: '+1 num atributo (máximo 30). Deslocamento +9 m. Com uma Ação Bônus, use Desengajar, que também encerra a condição Imobilizado em você.',
  }),
];
