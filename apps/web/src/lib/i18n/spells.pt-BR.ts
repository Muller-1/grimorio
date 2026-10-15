import type { SpellSchool } from '@grimorio/rules';

const circle = (n: number) => (n === 0 ? 'Truque' : `${n}º círculo`);

/**
 * Textos da parte de magias da ficha e da subida de nível. Ficam fora do pt-BR.ts principal:
 * só os pedaços carregados sob demanda (aba Magias, subida de nível) usam.
 */
export const spellsPtBR = {
  loading: 'Carregando as magias…',
  loadError: 'Não foi possível carregar a lista de magias. Verifique a conexão e tente de novo.',
  circle,
  circleShort: (n: number) => (n === 0 ? 'T' : `${n}º`),
  schools: {
    abjuration: 'Abjuração',
    conjuration: 'Conjuração',
    divination: 'Adivinhação',
    enchantment: 'Encantamento',
    evocation: 'Evocação',
    illusion: 'Ilusão',
    necromancy: 'Necromancia',
    transmutation: 'Transmutação',
  } satisfies Record<SpellSchool, string>,
  classes: {
    bard: 'Bardo',
    cleric: 'Clérigo',
    druid: 'Druida',
    paladin: 'Paladino',
    ranger: 'Guardião',
    sorcerer: 'Feiticeiro',
    warlock: 'Bruxo',
    wizard: 'Mago',
  } as Record<string, string>,

  // ---------- cabeçalho ----------
  ability: 'Atributo de conjuração',
  abilityNone: 'Escolha o atributo',
  abilityHint:
    'Esta ficha não tem classe conjuradora do assistente. Escolha o atributo para calcular a CD e o ataque.',
  dc: 'CD das magias',
  attack: 'Ataque de magia',
  rollAttack: 'Rolar ataque de magia',
  attackLabel: (name: string) => `Ataque de magia: ${name}`,
  slots: 'Espaços de magia',
  pact: 'Magia de Pacto',
  pactHint: 'Voltam no descanso curto.',
  slotPip: (c: number, i: number, max: number, spent: boolean) =>
    `${circle(c)}, espaço ${i} de ${max}: ${spent ? 'gasto' : 'disponível'}`,
  noSlots: 'Sem espaços de magia.',
  counts: {
    cantrips: (n: number, max?: number) => `Truques: ${n}${max !== undefined ? `/${max}` : ''}`,
    prepared: (n: number, max?: number) => `Preparadas: ${n}${max !== undefined ? `/${max}` : ''}`,
    spellbook: (n: number, min?: number) =>
      `Grimório: ${n}${min !== undefined ? ` (mínimo ${min} neste nível)` : ''}`,
    over: 'acima do limite da classe',
  },
  concentration: (name: string) => `Concentrado em: ${name}`,
  endConcentration: 'Encerrar Concentração',

  // ---------- listas ----------
  sections: {
    cantrips: 'Truques',
    prepared: 'Magias preparadas',
    granted: 'Sempre preparadas',
    spellbook: 'Grimório (não preparadas)',
    custom: 'Outras magias (do livro)',
  },
  grantedFrom: {
    subclass: 'subclasse',
    feat: 'talento',
    species: 'espécie',
    class: 'classe',
    other: 'outra fonte',
  } as Record<string, string>,
  empty: 'Nenhuma magia ainda. Use "Adicionar magia".',
  notCaster:
    'Esta ficha ainda não conjura magias. Se o personagem conjura (por talento ou espécie), escolha o atributo acima e adicione as magias.',
  add: 'Adicionar magia',
  addCustom: 'Outra magia (do livro)',

  // ---------- cartão ----------
  meta: (level: number, school: string) =>
    level === 0 ? `Truque de ${school}` : `${circle(level)} · ${school}`,
  castingTime: 'Conjuração',
  range: 'Alcance',
  components: 'Componentes',
  duration: 'Duração',
  concentrationTag: 'Concentração',
  ritualTag: 'Ritual',
  higher: 'Em círculos maiores',
  cantripUpgrade: 'Aprimoramento de truque',
  save: (ability: string, dc: number) => `Salvaguarda de ${ability} CD ${dc}`,
  castWith: 'Espaço',
  castWithLabel: (name: string) => `Círculo para conjurar ${name}`,
  cast: 'Conjurar',
  castLabel: (name: string, slot: number) =>
    slot === 0 ? `Conjurar ${name}` : `Conjurar ${name} com espaço de ${circle(slot)}`,
  castFree: 'Sem espaço',
  castFreeLabel: (name: string) => `Conjurar ${name} sem gastar espaço (uso grátis)`,
  freeUses: (left: number, max: number) => `${left}/${max} grátis por descanso longo`,
  noSlotLeft: 'Sem espaço disponível',
  slotOption: (c: number, left: number, max: number) => `${circle(c)} (${left}/${max})`,
  pactOption: (c: number, left: number, max: number) => `Pacto, ${circle(c)} (${left}/${max})`,
  freeOption: 'Grátis (sem espaço)',
  castDone: (name: string, c: number) =>
    c === 0 ? `${name} conjurado.` : `${name} conjurado com espaço de ${circle(c)}.`,
  castNoSlot: 'Não sobrou espaço desse tipo. Escolha outro ou descanse.',
  damage: (type: string) => `Dano ${type}`,
  damageLabel: (name: string, type: string) => `Dano de ${name} (${type})`,
  heal: 'Cura',
  healLabel: (name: string) => `Cura de ${name}`,
  beams: (n: number) => `${n} raio${n === 1 ? '' : 's'}: role o ataque e o dano de cada um`,
  onMe: 'Valendo em mim',
  onMeLabel: (name: string, on: boolean) => `${name} ${on ? 'está' : 'não está'} valendo em você`,
  prepare: 'Preparar',
  unprepare: 'Despreparar',
  remove: 'Tirar da ficha',
  expand: (name: string) => `Detalhes de ${name}`,
  material: (m: string) => `M (${m})`,

  // ---------- escolher ----------
  pickerTitle: 'Adicionar magia',
  search: 'Buscar pelo nome',
  filterCircle: 'Círculo',
  anyCircle: 'Todos os que você conjura',
  allLists: 'Mostrar magias de todas as classes',
  addTo: 'Adicionar como',
  addAs: { cantrip: 'Truque', prepared: 'Preparada', spellbook: 'No grimório' },
  added: 'Na ficha',
  addButton: (name: string) => `Adicionar ${name}`,
  noResults: 'Nenhuma magia encontrada.',
  more: (n: number) => `Mostrando as primeiras ${n}. Busque pelo nome para achar outras.`,

  // ---------- outra magia ----------
  customTitle: 'Outra magia (do livro)',
  customHint:
    'Para magias que não estão nas regras abertas (SRD). Escreva com as suas palavras o que ela faz.',
  customName: 'Nome',
  customLevel: 'Círculo',
  customText: 'O que ela faz',
  customDamage: 'Dados de dano (opcional)',
  customSave: 'Salvaguarda (opcional)',
  customAttack: 'Tem jogada de ataque',
  customConcentration: 'Concentração',
  customRitual: 'Ritual',
  customPrepared: 'Preparada',
  customNoSave: '—',
  customSaveBtn: 'Salvar',
  customCancel: 'Cancelar',
  customNameRequired: 'Dê um nome à magia.',
  customInvalidDice: 'Dados de dano inválidos.',

  credits: 'Magias: SRD 5.2 (CC BY 4.0), com textos escritos para o site.',
} as const;
