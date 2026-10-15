/**
 * Textos da subida de nível (ADR-010). Fora do pt-BR.ts principal: só o diálogo de subir de
 * nível, carregado sob demanda, usa.
 */
const signed = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);

export const levelUpPtBR = {
  title: 'Subir de nível',
  // ---------- quantos níveis ----------
  howMany: 'Quantos níveis você subiu?',
  howManyHint:
    'Depois de confirmar, você passa por uma tela para cada nível novo, com o que ganhou e o que escolher.',
  levels: (n: number) => `+${n} ${n === 1 ? 'nível' : 'níveis'}`,
  fromTo: (from: number, to: number) => `Nível ${from} → ${to}`,
  chooseClass: 'Classe do personagem',
  chooseClassHint:
    'Esta ficha foi feita à mão. Escolha a classe para o site saber o que você ganha a cada nível.',
  chooseClassNone: 'Escolha a classe',
  confirm: 'Confirmar',
  cancel: 'Cancelar',
  // ---------- um nível ----------
  levelTitle: (n: number) => `Nível ${n}`,
  stepOf: (i: number, total: number) => `${i} de ${total}`,
  gainsTitle: 'O que você ganhou',
  choicesTitle: 'O que escolher',
  nothingToChoose: 'Nada para escolher neste nível. Confira o que você ganhou e avance.',
  hp: 'Pontos de Vida',
  hpAverage: (avg: number, con: number) =>
    `Usar a média: ${avg} ${signed(con)} (Constituição) = ${Math.max(1, avg + con)}`,
  hpRoll: (die: number) => `Rolar 1d${die}`,
  hpRolled: (roll: number, con: number) =>
    `Rolou ${roll} ${signed(con)} (Constituição) = ${Math.max(1, roll + con)}`,
  hpRollLabel: (level: number) => `PV do nível ${level}`,
  hpUseAverage: 'Voltar para a média',
  proficiency: (from: number, to: number) =>
    `Bônus de Proficiência: ${signed(from)} → ${signed(to)}`,
  column: (name: string, from: string, to: string) => `${name}: ${from} → ${to}`,
  slots: 'Espaços de magia',
  slot: (circle: number, from: number, to: number) => `${circle}º círculo: ${from} → ${to}`,
  pact: (from: string, to: string) => `Magia de Pacto: ${from} → ${to}`,
  pactValue: (count: number, circle: number) => `${count} de ${circle}º círculo`,
  cantrips: (from: number, to: number) => `Truques conhecidos: ${from} → ${to}`,
  prepared: (from: number, to: number) => `Magias preparadas: ${from} → ${to}`,
  granted: 'Magias sempre preparadas',
  grantedSource: { class: 'classe', subclass: 'subclasse', species: 'espécie' } as Record<
    string,
    string
  >,
  featureFrom: { class: 'Classe', subclass: 'Subclasse' } as Record<string, string>,
  required: 'obrigatório',
  optional: 'opcional — dá para fazer depois na ficha',
  pending: (n: number) =>
    n === 1 ? 'Falta 1 escolha obrigatória.' : `Faltam ${n} escolhas obrigatórias.`,
  back: 'Voltar',
  next: 'Próximo nível',
  toSummary: 'Ver resumo',
  // ---------- escolhas ----------
  pickCount: (picked: number, count: number) => `${picked}/${count} escolhidas`,
  subclassOther: 'Outra subclasse (do livro)',
  subclassOtherName: 'Nome da subclasse',
  subclassOtherHint:
    'As características dela não estão nas regras abertas: anote-as na ficha, em Características.',
  asiModes: {
    two: '+2 em um atributo',
    split: '+1 em dois atributos',
    feat: 'Um talento',
  },
  asiAbility: 'Atributo',
  asiFirst: 'Primeiro atributo',
  asiSecond: 'Segundo atributo',
  asiMax: 'máx. 20',
  abilityOption: (name: string, score: number) => `${name} (${score})`,
  feat: 'Talento',
  featNone: 'Escolha o talento',
  featOther: 'Outro talento (do livro)',
  featOtherName: 'Nome do talento',
  featAbility: 'Atributo que o talento aumenta (+1)',
  featAbilityNone: 'Nenhum',
  featRequires: (names: string) => `Exige ${names} 13 ou mais`,
  boon: 'Dádiva Épica',
  noOptions: 'Nenhuma opção disponível.',
  styleTitle: 'Estilo de Luta',
  blessedCantrips: (list: string) => `Escolha 2 truques de ${list}`,
  replaceOld: 'Trocar qual',
  replaceNone: 'Não trocar',
  replaceNew: 'Pela magia',
  language: (n: number) => `Idioma ${n}`,
  invocationRequires: (name: string) => `exige ${name}`,
  invocationLevel: (n: number) => `nível ${n}+`,
  fromSpellbook: 'Do seu grimório (inclui as que você acabou de acrescentar)',
  // ---------- resumo ----------
  summaryTitle: 'Resumo',
  summaryHint: 'Confira antes de aplicar. Logo depois, dá para desfazer.',
  before: 'Antes',
  after: 'Depois',
  rowLevel: 'Nível',
  rowHp: 'PV máximo',
  rowProf: 'Proficiência',
  rowAbility: (name: string) => name,
  newFeatures: 'Características novas',
  newSpells: 'Magias novas',
  apply: 'Aplicar',
  applyError: 'Não foi possível aplicar a subida de nível. Nada foi mudado na ficha.',
  done: (level: number) => `Subiu para o nível ${level}!`,
  undo: 'Desfazer',
  undone: 'Subida de nível desfeita.',
  maxLevel: 'O personagem já está no nível 20.',
  signed,
} as const;
