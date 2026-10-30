import type { SheetNotice, WeaponTraits } from '@grimorio/rules';

/**
 * Textos da ficha (`ts.identity`, `ts.actions`...): a ficha deste navegador, a da conta, as
 * abas de magias e de inventário. Ficam fora do pt-BR.ts principal porque só essas páginas
 * (carregadas sob demanda) usam: assim não pesam no carregamento do resto do site.
 */

export const sheetPtBR = {
  pageTitle: 'Ficha de personagem',
  unnamed: 'Personagem sem nome',
  savedLocally: 'Salvo neste navegador',
  wizardHint: {
    title: 'Primeira vez? Deixe o assistente montar a ficha',
    text: 'Em 4 passos você escolhe classe, origem e atributos, e a ficha sai pronta, com as contas feitas. Esta ficha em branco é para quem já sabe preencher à mão.',
    cta: 'Criar com o assistente',
    dismiss: 'Prefiro preencher à mão',
  },
  newSheet: 'Nova ficha',
  loadExample: 'Carregar exemplo',
  newSheetConfirmTitle: 'Começar uma ficha nova?',
  newSheetConfirmText: 'A ficha atual será apagada deste navegador. Isso não pode ser desfeito.',
  exampleConfirmTitle: 'Carregar o personagem de exemplo?',
  exampleConfirmText: 'A ficha atual será substituída pela ficha de exemplo.',
  confirm: 'Sim, continuar',
  cancel: 'Cancelar',
  restoredBackup:
    'Não foi possível ler a ficha salva. Uma cópia foi guardada e começamos uma ficha nova.',
  mobileTabs: { character: 'Personagem', combat: 'Combate', actions: 'Ações' },
  columns: {
    character: 'Personagem',
    combat: 'Combate e habilidades',
    actions: 'Perícias, armas, magias e inventário',
  },

  identity: {
    sectionLabel: 'Identidade',
    species: 'Espécie',
    background: 'Antecedente',
    you: 'Você',
    menu: 'Mais opções da ficha',
    edit: 'Editar nome, classe e descrição',
    editTitle: 'Dados do personagem',
    done: 'Pronto',
    portrait: 'Retrato',
    portraitUrl: 'Link da imagem do retrato',
    portraitPlaceholder: 'https://…',
    portraitHint: 'Ou cole o endereço de uma imagem (https://…). Deixe vazio para remover.',
    portraitUpload: 'Enviar foto do computador',
    portraitBusy: 'Preparando a foto…',
    portraitUploadHint:
      'A foto é reduzida no seu navegador (cerca de 30 kB) e salva junto com a ficha.',
    portraitRemove: 'Remover foto',
    portraitErrors: {
      'not-image': 'Esse arquivo não é uma imagem.',
      'too-big': 'A imagem é grande demais (máximo 20 MB).',
      unreadable: 'Não foi possível abrir essa imagem. Tente outra (JPG, PNG ou WebP).',
    },
    name: 'Nome',
    className: 'Classe',
    player: 'Jogador',
    origin: 'Origem',
    description: 'Descrição',
    descriptionPlaceholder: 'Aparência, personalidade, história…',
    level: 'Nível',
    proficiency: 'Proficiência',
    inspiration: 'Inspiração Heroica',
    inspirationMax: 'Máximo',
    inspirationOn: 'Inspiração Heroica: você tem (toque para usar)',
    inspirationOff: 'Inspiração Heroica: você não tem (toque para ganhar)',
  },

  abilitiesTitle: 'Atributos, salvaguardas e perícias',
  abilitiesHint: 'Toque no nome para rolar · no número para ver de onde vem',
  abilityValue: 'Valor',
  saveRow: 'Salvaguarda',
  autoFail: 'Falha',
  autoFailToast: (ability: string) => `Falha automática na salvaguarda de ${ability}.`,
  noSkills: (name: string) => `Nenhuma perícia usa ${name}.`,
  legend: { none: 'sem proficiência', prof: 'proficiente', expert: 'especialista' },
  abilityScore: (name: string) => `Valor de ${name}`,
  abilityMod: 'Modificador',
  rollCheck: (name: string) => `Rolar teste de ${name}`,
  checkLabel: (name: string) => `Teste de ${name}`,

  saveLabel: (name: string) => `Salvaguarda de ${name}`,
  rollSave: (name: string) => `Rolar salvaguarda de ${name}`,

  skillLabel: (name: string) => name,
  rollSkill: (name: string) => `Rolar ${name}`,
  passivePerception: 'Percepção passiva',

  proficiency: {
    0: 'Sem proficiência',
    0.5: 'Metade da proficiência',
    1: 'Proficiente',
    2: 'Especialização (dobro)',
  } as Record<number, string>,
  proficiencyToggle: (name: string, state: string) => `${name}: ${state}. Clique para trocar.`,

  combat: {
    title: 'Combate',
    ac: 'Classe Armd.',
    acLong: 'Classe de Armadura',
    initiative: 'Iniciativa',
    speed: 'Deslocamento',
    rollInitiative: 'Rolar iniciativa',
    acManual: 'CA manual',
    acManualHint:
      'A ficha calcula pela armadura vestida no Inventário. O número manual vale no lugar dela e do Escudo.',
    acAuto: 'Voltar ao cálculo (10 + Destreza)',
    speedEdit: 'Deslocamento em metros',
    speedValue: (m: string) => `${m} m`,
    speedNow: (m: string) =>
      `Agora: ${m} m (magias ou condições). O campo acima é o seu deslocamento normal.`,
    speedLoaded: (m: string) =>
      `Agora: ${m} m. Você está carregando mais do que a sua Capacidade de Carga (veja o Inventário).`,
  },

  hp: {
    title: 'Pontos de Vida',
    summary: (current: number, max: number, pct: number) => `${current}/${max} | ${pct}%`,
    temp: 'Temporários',
    tempLong: 'PV temporários',
    healed: 'Curados',
    received: 'Recebidos',
    max: 'Máximos',
    amount: 'Quantidade',
    amountShort: 'Qtd.',
    ofMax: (max: number) => `/ ${max}`,
    totals: (healed: number, received: number) =>
      `Desde o último descanso longo: ${healed} curados, ${received} recebidos.`,
    damage: 'Dano',
    heal: 'Cura',
    addTemp: 'Temp.',
    critical: 'Crítico',
    undo: 'Desfazer último',
    undoNothing: 'Nada para desfazer',
    history: 'Histórico de PV',
    historyEmpty: 'Nada por aqui desde o último descanso longo.',
    historyItem: {
      damage: (n: number) => `Dano de ${n}`,
      heal: (n: number) => `Cura de ${n}`,
      temp: (n: number) => `${n} PV temporários`,
      hitDie: (n: number) => `Dado de vida: +${n}`,
      undone: 'desfeito',
    },
    longRest: 'Descanso longo',
    longRestHint:
      'Recupera todos os PV, os Dados de Vida, os espaços de magia e os usos das habilidades (regras de 2024).',
    shortRest: 'Descanso curto',
    shortRestHint:
      'Devolve os usos de descanso curto e a Magia de Pacto. Para curar, gaste Dados de Vida.',
    maxManual: 'PV máximo manual',
    maxAuto: 'Voltar ao cálculo pela média',
    maxHint: 'Calculado pela média do dado de vida. Se você rolou os PV, ajuste aqui.',
    bar: (pct: number) => `${pct}% dos pontos de vida`,
  },

  hitDice: {
    title: 'Dados de Vida',
    remaining: (remaining: number, total: number) => `${remaining} / ${total}`,
    roll: 'Rolar',
    spend: (die: number) => `Gastar 1d${die}`,
    rollLabel: 'Gastar um dado de vida e recuperar PV',
    die: 'Tipo de dado de vida',
    rollName: 'Dado de vida',
  },

  deathSaves: {
    title: 'Salvaguardas contra Morte',
    success: 'Sucessos',
    failure: 'Fracassos',
    count: (n: number) => `${n} de 3`,
    rollShort: 'Rolar',
    roll: 'Rolar salvaguarda contra morte',
    rollName: 'Salvaguarda contra morte',
    pip: (kind: string, n: number) => `${kind} ${n}`,
    onlyAtZero: 'Só quando estiver com 0 PV',
  },

  notices: {
    'instant-death': 'Morte instantânea: o dano restante foi maior ou igual aos PV máximos.',
    dead: 'Três fracassos: o personagem morreu.',
    stable: 'Três sucessos: o personagem está estável.',
    revived: '20 natural! O personagem volta com 1 PV.',
    'not-dying': 'Salvaguardas contra morte só são feitas com 0 PV.',
    'no-hit-dice': 'Não há dados de vida disponíveis. Eles voltam no descanso longo.',
    'needs-1-hp': 'É preciso ter pelo menos 1 PV para descansar.',
    'nothing-to-undo': 'Nada para desfazer.',
    'no-uses': 'Sem usos sobrando. Eles voltam no descanso.',
    'requires-active': 'Ligue antes a habilidade de que esta depende.',
    'no-slot': 'Sem espaço de magia desse círculo.',
    'unknown-ability': 'Essa habilidade não está disponível nesta ficha.',
    'concentration-ended': 'A Fúria encerrou a Concentração.',
  } satisfies Record<SheetNotice, string>,

  actions: {
    tabs: {
      weapons: 'Armas',
      spells: 'Magias',
      inventory: 'Inventário',
      features: 'Características',
      add: 'Adicionar',
    },
    search: 'Pesquisar…',
    searchIn: (tab: string) => `Pesquisar ${tab.toLowerCase()}…`,
    columns: {
      weapon: 'Arma',
      properties: 'Propriedades',
      crit: 'Crítico',
      toHit: 'Acerto',
      damage: 'Dano',
    },
    critShort: (n: number) => (n >= 20 ? '20' : `${n}–20`),
    critLabel: (n: number) => (n >= 20 ? 'Crítico em 20' : `Crítico de ${n} a 20`),
    rollDamageOf: (name: string, expr: string) => `Rolar dano de ${name}: ${expr}`,
    searchLabel: 'Pesquisar na lista',
    emptyWeapons: 'Nenhuma arma ainda. Use o + para adicionar.',
    emptyFeatures:
      'Nenhuma característica ainda. Use o + para anotar habilidades de classe, talentos e traços.',
    noResults: 'Nada encontrado.',
    storedWeapons: (n: number) =>
      n === 1
        ? '1 arma guardada (não equipada) não aparece aqui.'
        : `${n} armas guardadas (não equipadas) não aparecem aqui.`,
    seeInventory: 'Ver no Inventário',
    /** As características separadas pela origem. */
    featureGroups: {
      class: 'Classe',
      subclass: 'Subclasse',
      species: 'Espécie (raça)',
      background: 'Antecedente',
      feat: 'Talentos',
      training: 'Treinamentos, idiomas e armadura',
      other: 'Outras',
    },
    toHit: (v: string) => `Ataque ${v}`,
    damage: (v: string) => `Dano ${v}`,
    crit: (n: number) => (n >= 20 ? 'Crítico 20' : `Crítico ${n}–20`),
    invalidDamage: 'Dano inválido',
    rollAttack: (name: string) => `Rolar ataque com ${name}`,
    attack: 'Ataque',
    advantage: 'Vantagem',
    disadvantage: 'Desvantagem',
    rollDamage: 'Dano',
    weaponKind: 'Tipo',
    cannotAct: (sources: string) => `Sem ações agora (${sources}): ataques e magias esperam.`,
    properties: 'Propriedades',
    traits: (t: WeaponTraits) => {
      const m = (n: number) => String(n).replace('.', ',');
      const distance = t.rangeM ? ` (${m(t.rangeM.normal)}/${m(t.rangeM.long)} m)` : '';
      const list = [
        t.finesse && 'Acuidade',
        t.thrown && `Arremesso${t.range === 'melee' ? distance : ''}`,
        t.twoHanded && 'Duas Mãos',
        t.light && 'Leve',
        t.reach && 'Extensão (3 m)',
      ].filter(Boolean);
      const kind = t.range === 'ranged' ? `À distância${distance}` : 'Corpo a corpo';
      return [kind, ...list].join(' · ');
    },
    rollCritDamage: 'Dano crítico',
    firstHit: 'Dano + 1º acerto',
    firstHitLabel: (name: string, extras: string) =>
      `Dano no 1º acerto do turno (${extras}): ${name}`,
    firstHitCrit: 'Crítico + 1º acerto',
    firstHitCritLabel: (name: string, extras: string) =>
      `Dano crítico no 1º acerto do turno (${extras}): ${name}`,
    extraDamage: (list: string) => `Extras: ${list}`,
    oncePerTurn: '1×/turno',
    edit: 'Editar',
    remove: 'Remover',
    expand: (name: string) => `Detalhes de ${name}`,
    attackRollLabel: (name: string) => `Ataque: ${name}`,
    advantageLabel: (name: string) => `Ataque com vantagem: ${name}`,
    disadvantageLabel: (name: string) => `Ataque com desvantagem: ${name}`,
    damageRollLabel: (name: string) => `Dano: ${name}`,
    critDamageLabel: (name: string) => `Dano crítico: ${name}`,
  },

  levelUp: {
    button: 'Subir de nível',
    hint: 'Escolha quantos níveis subiu e o site mostra o que você ganha em cada um.',
    max: 'Nível 20: o máximo.',
  },

  powers: {
    title: 'Habilidades e efeitos',
    empty:
      'Sem habilidades de classe com usos ou para ligar. Fichas do assistente mostram aqui Fúria, Canalizar Divindade e afins.',
    uses: (remaining: number, max: number) => `${remaining}/${max}`,
    usesLabel: (name: string, remaining: number, max: number) =>
      `${name}: ${remaining} de ${max} usos`,
    spend: (name: string) => `Gastar um uso de ${name}`,
    restore: (name: string) => `Devolver um uso de ${name}`,
    die: (n: number) => `d${n}`,
    recharge: {
      all: 'volta no descanso curto',
      one: '1 volta no descanso curto',
      none: 'volta no descanso longo',
    },
    use: 'Usar',
    on: 'Ligada',
    toggleLabel: (name: string, on: boolean) => `${name}: ${on ? 'ligada' : 'desligada'}`,
    costs: (n: number, resource: string) => `gasta ${n} ${resource}`,
    requires: (names: string) => `precisa de: ${names}`,
    noUses: 'sem usos',
    heals: (expr: string) => `cura ${expr}`,
    tempHp: (expr: string) => `${expr} PV temporários`,
    healRoll: (name: string) => `Cura: ${name}`,
    tempRoll: (name: string) => `PV temporários: ${name}`,
    activeTitle: 'Valendo agora',
    resistances: (types: string) => `Resistência: ${types}`,
    autoFail: (abilities: string) => `Falha automática nas salvaguardas de ${abilities}`,
    restrictions: (r: { actions: boolean; bonusActions: boolean; reactions: boolean }) =>
      r.actions && r.bonusActions && r.reactions
        ? 'Sem ações, Ações Bônus nem Reações'
        : [
            r.actions && 'Sem ações',
            r.bonusActions && 'Sem Ações Bônus',
            r.reactions && 'Sem Reações',
          ]
            .filter(Boolean)
            .join(', '),
    decisionsTitle: 'Depende da situação (você e o Mestre decidem)',
    onYou: {
      title: 'Efeitos em você',
      hint: 'Magias de aliados ou de inimigos e condições (Envenenado, Caído…). A ficha soma sozinha.',
      none: 'Nada afetando você agora.',
      add: 'Adicionar efeito',
      dialogHint:
        'Toque para ligar ou desligar. Fica valendo até você tirar: as condições continuam depois do Descanso Longo e a Exaustão perde 1 nível.',
      buffs: 'Magias que ajudam',
      debuffs: 'Magias que atrapalham',
      conditions: 'Condições',
      exhaustion: 'Exaustão',
      exhaustionLevel: (n: number) => (n === 0 ? 'Sem Exaustão' : `Nível ${n}`),
      exhaustionHint:
        '−2 por nível nos Testes de D20 e −1,5 m de Deslocamento por nível. No nível 6, o personagem morre.',
      exhaustionChip: (n: number) => `Exaustão ${n}`,
      remove: (name: string) => `Tirar ${name}`,
      toggle: (name: string, on: boolean) => `${name}: ${on ? 'valendo' : 'desligado'}`,
      done: 'Pronto',
      on: { attack: 'ataques', save: 'salvaguardas', damage: 'dano' } as Record<string, string>,
      bonusDice: (dice: string, on: string) => `+${dice} em ${on}`,
      ac: (v: string) => `${v} na CA`,
      acFormula: (base: number) => `CA ${base} + Destreza`,
      acMinimum: (v: number) => `CA mínima ${v}`,
      speed: (m: string) => `${m} m de Deslocamento`,
      extraDamage: (dice: string) => `+${dice} de dano`,
      attackBonus: (v: string) => `${v} no ataque`,
      damageBonus: (v: string) => `${v} no dano`,
      advantage: 'Vantagem em algumas jogadas',
      resistance: 'Resistência a dano',
      hpMax: (v: string) => `${v} PV máximo`,
      saveBonus: (v: string) => `${v} nas salvaguardas`,
    },
    concentration: (name: string) => `Concentrado em: ${name}`,
    endConcentration: 'Encerrar',
    advantageShort: 'V',
    advantage: 'Vantagem por habilidade, magia ou condição',
    disadvantageShort: 'D',
    disadvantage: 'Desvantagem por magia ou condição',
  },

  explain: {
    title: 'De onde vem este número',
    base: 'Base',
    level: 'Pelo nível',
    hitDie: (die: number, levels: number, rolled = 0) =>
      `Dado de vida d${die} (${levels} ${levels === 1 ? 'nível' : 'níveis'}${
        rolled > 0 ? `, ${rolled} rolado${rolled === 1 ? '' : 's'}` : ''
      })`,
    magic: 'Bônus mágico',
    trait: 'Traço ou talento',
    override: 'Ajuste manual',
    proficiency: (level: number) =>
      level === 2 ? 'Especialização' : level === 0.5 ? 'Metade da proficiência' : 'Proficiência',
    total: 'Total',
  },
} as const;
