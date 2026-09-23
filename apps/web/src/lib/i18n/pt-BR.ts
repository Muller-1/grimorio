import type { AbilityKey, DamageType, SkillKey } from '@grimorio/shared';
import type { DiceErrorCode, SheetNotice } from '@grimorio/rules';

/**
 * TODOS os textos de interface em português ficam aqui (plano de início, Etapa 5).
 * Componentes nunca escrevem texto "solto" — uma regra de lint cobra isso.
 * Termos de regra seguem o Livro do Jogador de 2024 em português (decisão #5, ADR-004).
 */

const signed = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);

export const ptBR = {
  brand: {
    name: 'Grimório',
    tagline: 'Fichas e dados para RPG de mesa',
  },

  nav: {
    home: 'Início',
    sheet: 'Ficha',
    campaign: 'Campanha',
    dice: 'Dados',
    support: 'Apoie',
    profile: 'Perfil',
    comingSoon: 'Em breve',
    campaignSoon: 'Campanhas chegam numa próxima versão',
    profileSoon:
      'Contas chegam numa próxima versão. Por enquanto, tudo fica salvo neste navegador.',
    mainLabel: 'Navegação principal',
    skipToContent: 'Pular para o conteúdo',
  },

  footer: {
    report: 'Relatar problema',
    reportSoon: 'O canal de relatos ainda não foi configurado.',
    credits: 'Créditos',
    terms: 'Termos',
    privacy: 'Privacidade',
    support: 'Apoie o projeto',
    compat: 'Compatível com a 5ª edição. Projeto independente, sem vínculo com a editora do jogo.',
    version: (version: string, commit: string) => `v${version} · ${commit}`,
  },

  home: {
    eyebrow: 'Grátis · sem anúncios · em português',
    title: 'Sua ficha de RPG, com as contas feitas por você.',
    lead: 'Preencha o básico e o Grimório calcula modificadores, proficiência, perícias, salvaguardas e pontos de vida — e rola os dados na hora, com um gerador aleatório criptográfico.',
    ctaSheet: 'Abrir minha ficha',
    ctaDice: 'Rolar dados',
    features: {
      title: 'O que já dá para fazer',
      items: [
        {
          title: 'Contas automáticas',
          text: 'Mudou a Destreza? Iniciativa, CA, perícias e ataques se ajustam sozinhos.',
        },
        {
          title: 'Cada número explicado',
          text: 'Toque em qualquer valor para ver de onde ele vem. Ótimo para quem está começando.',
        },
        {
          title: 'Dados de verdade',
          text: 'Qualquer expressão: 1d20+5, 4d6kh3, vantagem, desvantagem, até 100d2 da magia inventada da mesa.',
        },
        {
          title: 'Vida em jogo',
          text: 'Dano, cura, PV temporários, desfazer, dados de vida e salvaguardas contra morte com as regras certas.',
        },
      ],
    },
    how: {
      title: 'Como funciona',
      steps: [
        { title: 'Preencha', text: 'Nome, classe, nível e os seis atributos.' },
        { title: 'Marque', text: 'As perícias e salvaguardas em que você é proficiente.' },
        { title: 'Jogue', text: 'Role testes, ataques e dano direto da ficha.' },
      ],
    },
    next: {
      title: 'O que vem por aí',
      items: [
        'Criação guiada passo a passo, com as regras abertas do jogo',
        'Magias, inventário e subida de nível',
        'Contas para acessar a ficha de qualquer aparelho',
        'Campanhas com o mestre e o grupo',
      ],
    },
    localNote: 'Nesta versão, a ficha fica salva só neste navegador.',
    supportTitle: 'Mantido por quem joga',
    supportText:
      'O Grimório é e continuará gratuito. Se ele ajudar a sua mesa, considere apoiar o projeto.',
    supportCta: 'Quero apoiar',
  },

  pages: {
    notFound: {
      title: 'Página não encontrada',
      text: 'Essa página se perdeu na masmorra.',
      back: 'Voltar ao início',
    },
    updated: (date: string) => `Atualizado em ${date}`,
    initialVersion: 'Versão inicial, válida enquanto o site não tem contas',
    contactTitle: 'Contato',
    contactEmailLead: 'Escreva para',
    contactReport: 'Use o link "Relatar problema" no rodapé de qualquer página.',
    support: {
      title: 'Apoie o projeto',
      lead: 'O Grimório é gratuito, sem anúncios e sem nenhuma função bloqueada. Ele é mantido por quem joga e pode apoiar.',
      button: (platform: string) => `Apoiar pelo ${platform}`,
      buttonGeneric: 'Apoiar o projeto',
      soon: 'A plataforma de apoio ainda está sendo escolhida. Enquanto isso, a melhor ajuda é usar o site na sua mesa e relatar qualquer problema que encontrar.',
      where: 'Para onde vai o apoio',
      whereText:
        'Domínio, hospedagem e, quando existirem contas, o servidor e o banco de dados. Apoiar nunca libera funções extras.',
    },
    credits: {
      title: 'Licença e créditos',
      lead: 'O Grimório é feito com software livre. Obrigado a quem mantém estes projetos:',
      nameHeader: 'Projeto',
      licenseHeader: 'Licença',
      libs: [
        ['React e React DOM', 'MIT'],
        ['React Router', 'MIT'],
        ['Vite', 'MIT'],
        ['Tailwind CSS', 'MIT'],
        ['Radix UI', 'MIT'],
        ['Zustand', 'MIT'],
        ['Zod', 'MIT'],
        ['clsx e tailwind-merge', 'MIT'],
        ['class-variance-authority', 'Apache-2.0'],
        ['Ícones Lucide', 'ISC'],
        ['Fonte Cinzel (via Fontsource)', 'SIL Open Font License 1.1'],
      ] as [string, string][],
      rulesTitle: 'Regras do jogo',
      rules:
        'O site é compatível com a 5ª edição. Os cálculos seguem as regras; nenhum texto dos livros é reproduzido. Quando o conteúdo de regras abertas (SRD, licença Creative Commons BY 4.0) entrar no site, a atribuição completa aparecerá aqui.',
      trademark:
        'Projeto independente, sem vínculo com a Wizards of the Coast nem com as editoras dos livros no Brasil.',
    },
    terms: {
      title: 'Termos de uso',
      sections: [
        {
          title: 'O que é o Grimório',
          body: [
            'Uma ferramenta gratuita para montar e usar fichas de personagem e rolar dados em RPG de mesa compatível com a 5ª edição. Usar o site significa concordar com estes termos.',
          ],
        },
        {
          title: 'Seus dados ficam com você',
          body: [
            'Nesta versão não existem contas. A ficha, os atalhos de dados e as suas preferências ficam salvos apenas no navegador do seu aparelho.',
            'Limpar os dados do navegador, usar uma aba anônima ou trocar de aparelho faz a ficha sumir. Guarde as informações importantes também em outro lugar.',
          ],
        },
        {
          title: 'Cálculos e rolagens',
          body: [
            'O site faz as contas pelas regras da 5ª edição e mostra de onde vem cada número, mas pode ter erros. Em caso de dúvida, vale a regra do livro e a decisão do mestre da mesa.',
            'As rolagens usam o gerador aleatório criptográfico do seu navegador.',
          ],
        },
        {
          title: 'Conteúdo',
          body: [
            'O que você escreve na ficha (nomes, descrições, armas, características) é seu. Não copie para o site textos protegidos de livros ou de outras pessoas.',
          ],
        },
        {
          title: 'Sem garantia',
          body: [
            'O Grimório é oferecido como está, de graça, sem garantia de funcionamento contínuo. Ele pode mudar, ficar fora do ar ou ganhar e perder funções.',
          ],
        },
        {
          title: 'Mudanças nestes termos',
          body: [
            'Quando o site ganhar contas, estes termos mudam. A data no topo da página mostra a versão em vigor.',
          ],
        },
      ],
    },
    privacy: {
      title: 'Privacidade',
      sections: [
        {
          title: 'Resumo',
          body: [
            'Nesta versão, o Grimório não tem contas, não usa cookies, não mostra anúncios e não usa ferramentas de rastreamento. Não recebemos a sua ficha nem as suas rolagens.',
          ],
        },
        {
          title: 'O que fica no seu aparelho',
          body: [
            'A ficha, os atalhos de dados e a preferência de animação ficam guardados no armazenamento local do seu navegador. Eles nunca saem do seu aparelho e você pode apagá-los a qualquer momento limpando os dados do site nas configurações do navegador.',
          ],
        },
        {
          title: 'Imagem do retrato',
          body: [
            'Se você colocar o link de uma imagem como retrato, o seu navegador busca essa imagem direto no site onde ela está. Esse site recebe os dados técnicos da conexão, como em qualquer página que você visita. Nós não guardamos nem vemos esse link.',
          ],
        },
        {
          title: 'Hospedagem',
          body: [
            'O site é entregue pela Cloudflare. Como qualquer servidor na internet, ela recebe dados técnicos da conexão, como o endereço IP e o tipo de navegador, para entregar as páginas e proteger o site contra ataques. Esses servidores podem ficar fora do Brasil. O tratamento segue a política de privacidade da Cloudflare.',
          ],
        },
        {
          title: 'Relatar problema',
          body: [
            'O link "Relatar problema" abre um serviço externo e envia junto só o endereço da página e a versão do site. O que você escrever lá segue a política daquele serviço.',
          ],
        },
        {
          title: 'Crianças e adolescentes',
          body: [
            'Como o site não coleta dados pessoais nesta versão, qualquer pessoa pode usá-lo. As regras para contas de menores de idade serão definidas, com revisão jurídica, antes de existirem contas.',
          ],
        },
        {
          title: 'Mudanças',
          body: [
            'Esta política muda quando o site ganhar contas. A data no topo da página mostra a versão em vigor.',
          ],
        },
      ],
    },
    draft: 'Página provisória',
  },

  abilities: {
    str: 'Força',
    dex: 'Destreza',
    con: 'Constituição',
    int: 'Inteligência',
    wis: 'Sabedoria',
    cha: 'Carisma',
  } satisfies Record<AbilityKey, string>,

  abilitiesShort: {
    str: 'FOR',
    dex: 'DES',
    con: 'CON',
    int: 'INT',
    wis: 'SAB',
    cha: 'CAR',
  } satisfies Record<AbilityKey, string>,

  skills: {
    acrobatics: 'Acrobacia',
    'animal-handling': 'Lidar com Animais',
    arcana: 'Arcanismo',
    athletics: 'Atletismo',
    deception: 'Enganação',
    history: 'História',
    insight: 'Intuição',
    intimidation: 'Intimidação',
    investigation: 'Investigação',
    medicine: 'Medicina',
    nature: 'Natureza',
    perception: 'Percepção',
    performance: 'Atuação',
    persuasion: 'Persuasão',
    religion: 'Religião',
    'sleight-of-hand': 'Prestidigitação',
    stealth: 'Furtividade',
    survival: 'Sobrevivência',
  } satisfies Record<SkillKey, string>,

  damageTypes: {
    acid: 'Ácido',
    bludgeoning: 'Contundente',
    cold: 'Gélido',
    fire: 'Ígneo',
    force: 'Energético',
    lightning: 'Elétrico',
    necrotic: 'Necrótico',
    piercing: 'Perfurante',
    poison: 'Venenoso',
    psychic: 'Psíquico',
    radiant: 'Radiante',
    slashing: 'Cortante',
    thunder: 'Trovejante',
  } satisfies Record<DamageType, string>,

  sheet: {
    pageTitle: 'Ficha de personagem',
    unnamed: 'Personagem sem nome',
    savedLocally: 'Salvo neste navegador',
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
      combat: 'Combate e perícias',
      actions: 'Armas e características',
    },

    identity: {
      portrait: 'Retrato',
      portraitUrl: 'Link da imagem do retrato',
      portraitPlaceholder: 'https://…',
      portraitHint: 'Cole o endereço de uma imagem (https://…). Deixe vazio para remover.',
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
      decrease: (what: string) => `Diminuir ${what}`,
      increase: (what: string) => `Aumentar ${what}`,
    },

    abilitiesTitle: 'Atributos',
    abilityScore: (name: string) => `Valor de ${name}`,
    abilityMod: 'Modificador',
    rollCheck: (name: string) => `Rolar teste de ${name}`,
    checkLabel: (name: string) => `Teste de ${name}`,

    savesTitle: 'Salvaguardas',
    saveLabel: (name: string) => `Salvaguarda de ${name}`,
    rollSave: (name: string) => `Rolar salvaguarda de ${name}`,

    skillsTitle: 'Perícias',
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
      ac: 'Classe Armd.',
      acLong: 'Classe de Armadura',
      initiative: 'Iniciativa',
      speed: 'Deslocamento',
      rollInitiative: 'Rolar iniciativa',
      acManual: 'CA manual',
      acManualHint: 'Use enquanto armaduras não estão no site. Ex.: Cota de Malha + Escudo = 18.',
      acAuto: 'Voltar ao cálculo (10 + Destreza)',
      speedEdit: 'Deslocamento em metros',
      speedUnit: 'm',
      speedValue: (m: string) => `${m} m`,
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
      longRestHint: 'Recupera todos os PV e todos os Dados de Vida (regras de 2024).',
      maxManual: 'PV máximo manual',
      maxAuto: 'Voltar ao cálculo pela média',
      maxHint: 'Calculado pela média do dado de vida. Se você rolou os PV, ajuste aqui.',
      bar: (pct: number) => `${pct}% dos pontos de vida`,
    },

    hitDice: {
      title: 'Dados de Vida',
      remaining: (remaining: number, total: number, die: number) => `${remaining}/${total}d${die}`,
      roll: 'Rolar',
      rollLabel: 'Gastar um dado de vida e recuperar PV',
      die: 'Tipo de dado de vida',
      rollName: 'Dado de vida',
    },

    deathSaves: {
      title: 'Salvaguardas contra Morte',
      success: 'Sucesso',
      failure: 'Fracasso',
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
    } satisfies Record<SheetNotice, string>,

    actions: {
      tabs: {
        weapons: 'Armas/Utilizáveis',
        spells: 'Magias',
        inventory: 'Inventário',
        features: 'Características',
        add: 'Adicionar',
      },
      search: 'Pesquisar…',
      searchLabel: 'Pesquisar na lista',
      emptyWeapons: 'Nenhuma arma ainda. Use o + para adicionar.',
      emptyFeatures:
        'Nenhuma característica ainda. Use o + para anotar habilidades de classe, talentos e traços.',
      noResults: 'Nada encontrado.',
      comingSoon: 'Chega numa próxima versão. Por enquanto, anote em Características.',
      toHit: (v: string) => `Ataque ${v}`,
      damage: (v: string) => `Dano ${v}`,
      crit: (n: number) => (n >= 20 ? 'Crítico 20' : `Crítico ${n}–20`),
      invalidDamage: 'Dano inválido',
      rollAttack: (name: string) => `Rolar ataque com ${name}`,
      attack: 'Ataque',
      advantage: 'Vantagem',
      disadvantage: 'Desvantagem',
      rollDamage: 'Dano',
      rollCritDamage: 'Dano crítico',
      edit: 'Editar',
      remove: 'Remover',
      expand: (name: string) => `Detalhes de ${name}`,
      attackRollLabel: (name: string) => `Ataque: ${name}`,
      advantageLabel: (name: string) => `Ataque com vantagem: ${name}`,
      disadvantageLabel: (name: string) => `Ataque com desvantagem: ${name}`,
      damageRollLabel: (name: string) => `Dano: ${name}`,
      critDamageLabel: (name: string) => `Dano crítico: ${name}`,
    },

    weaponEditor: {
      titleNew: 'Nova arma',
      titleEdit: 'Editar arma',
      name: 'Nome',
      namePlaceholder: 'Ex.: Espada Longa',
      ability: 'Atributo',
      abilityStr: 'Força',
      abilityDex: 'Destreza',
      abilityFinesse: 'Acuidade (o maior entre Força e Destreza)',
      proficient: 'Tenho proficiência com esta arma',
      damageDice: 'Dados de dano',
      damageDicePlaceholder: 'Ex.: 1d8',
      damageDiceHint: 'Só os dados. O modificador do atributo é somado automaticamente.',
      damageType: 'Tipo de dano',
      noDamageType: '—',
      magicBonus: 'Bônus mágico',
      critRange: 'Crítico a partir de',
      properties: 'Propriedades',
      propertiesPlaceholder: 'Ex.: Acuidade, Leve, Arremesso',
      notes: 'Anotações',
      save: 'Salvar',
      cancel: 'Cancelar',
      nameRequired: 'Dê um nome à arma.',
      invalidDice: 'Expressão de dano inválida.',
      preview: (toHit: string, damage: string) => `Vai ficar: ataque ${toHit}, dano ${damage}`,
    },

    featureEditor: {
      titleNew: 'Nova característica',
      titleEdit: 'Editar característica',
      name: 'Nome',
      namePlaceholder: 'Ex.: Retomar o Fôlego',
      text: 'Descrição',
      textPlaceholder: 'O que ela faz, quantos usos, quando recarrega…',
      save: 'Salvar',
      cancel: 'Cancelar',
      nameRequired: 'Dê um nome à característica.',
    },

    explain: {
      title: 'De onde vem este número',
      base: 'Base',
      level: 'Pelo nível',
      hitDie: (die: number, levels: number) =>
        `Dado de vida d${die} (${levels} ${levels === 1 ? 'nível' : 'níveis'})`,
      magic: 'Bônus mágico',
      override: 'Ajuste manual',
      proficiency: (level: number) =>
        level === 2 ? 'Especialização' : level === 0.5 ? 'Metade da proficiência' : 'Proficiência',
      total: 'Total',
    },
  },

  dice: {
    pageTitle: 'Rolador de dados',
    pageLead:
      'Digite qualquer expressão, use a rolagem rápida ou crie atalhos para as rolagens da sua mesa.',
    expression: 'Expressão de dados',
    roll: 'Rolar',
    resultTitle: 'Última rolagem',
    historyTitle: 'Histórico desta sessão',
    historyEmpty: 'Nenhuma rolagem ainda.',
    clearHistory: 'Limpar histórico',
    total: 'Total',
    dropped: 'descartado',
    natural20: '20 natural!',
    natural1: '1 natural',
    critHit: 'Crítico!',
    showHistory: 'Ver histórico de rolagens',
    close: 'Fechar',
    free: 'Rolagem livre',
    saveAsShortcut: 'Salvar como atalho',
    animation: 'Animação',
    animationHint: 'Desligada automaticamente se o seu sistema pede para reduzir movimento.',
    quick: {
      title: 'Rolagem rápida',
      count: 'Quantidade',
      die: 'Tipo de dado',
      modifier: 'Somador',
      roll: (expr: string) => `Rolar ${expr}`,
      label: 'Rolagem rápida',
      dieOption: (sides: number) => `d${sides}`,
    },
    shortcuts: {
      title: 'Atalhos',
      lead: 'Rolagens que a sua mesa usa sempre, com nome. Ficam salvas neste navegador.',
      empty: 'Nenhum atalho ainda.',
      new: 'Novo atalho',
      edit: 'Editar atalho',
      remove: 'Apagar atalho',
      /** Lido só por leitores de tela, antes do nome e da expressão do atalho. */
      rollPrefix: 'Rolar',
      editLabel: (label: string) => `Editar ${label}`,
      editorTitleNew: 'Novo atalho',
      editorTitleEdit: 'Editar atalho',
      name: 'Nome',
      namePlaceholder: 'Ex.: Chuva de moedas',
      expression: 'Expressão',
      expressionPlaceholder: 'Ex.: 100d2',
      save: 'Salvar',
      cancel: 'Cancelar',
      confirmRemove: 'Apagar',
      labelError: 'Dê um nome de 1 a 40 caracteres.',
      limitError: 'Limite de 100 atalhos atingido. Apague algum para criar outro.',
      preview: (expr: string) => `Vai ser salvo como ${expr}`,
      recovered:
        'Não foi possível ler os atalhos salvos. Uma cópia foi guardada e a lista começou vazia.',
      examples: [
        ['Magia da mesa', '100d2'],
        ['Gerar atributo', '4d6kh3'],
        ['Vantagem', '2d20kh1'],
        ['Bola de fogo', '8d6'],
      ] as [string, string][],
    },
    syntax: {
      title: 'Como escrever',
      items: [
        ['1d20+5', 'um d20 somando 5'],
        ['2d20kh1', 'vantagem: rola 2, fica com o maior'],
        ['2d20kl1', 'desvantagem: fica com o menor'],
        ['4d6kh3', '4d6 descartando o menor'],
        ['(1+2)d6', 'quantidade calculada'],
        ['max(1, 1d4-2)', 'funções: min, max, floor, ceil, abs'],
      ] as [string, string][],
    },
    errors: {
      empty: 'Digite uma expressão.',
      'too-long': 'A expressão passou de 200 caracteres.',
      'unexpected-char': 'Caractere não reconhecido.',
      'unexpected-token': 'Isto não era esperado aqui.',
      'unexpected-end': 'A expressão terminou antes da hora.',
      'expected-number': 'Esperava um número aqui.',
      'expected-sides': "Esperava um número depois de 'd'.",
      'expected-close-paren': 'Faltou fechar um parêntese.',
      'unknown-word': 'Palavra desconhecida. Funções aceitas: min, max, floor, ceil, abs.',
      'wrong-arg-count': 'Número errado de valores dentro da função.',
      'too-many-terms': 'Termos demais (máximo 30).',
      'too-deep': 'Parênteses demais, um dentro do outro (máximo 8).',
      'number-too-large': 'Número grande demais.',
      'too-many-dice': 'Dados demais numa rolagem (máximo 1.000).',
      'too-many-sides': 'Dado com lados demais (máximo 10.000).',
      'too-few-sides': 'Um dado precisa ter pelo menos 2 lados.',
      'negative-count': 'A quantidade de dados não pode ser negativa.',
      'division-by-zero': 'Divisão por zero.',
      'dice-not-allowed': 'Dados não são permitidos aqui.',
      'variable-unavailable': 'Variáveis da ficha (@for, @prof…) chegam numa próxima versão.',
    } satisfies Record<DiceErrorCode, string>,
    errorAt: (message: string, position: number) => `${message} (posição ${position + 1})`,
  },

  common: {
    close: 'Fechar',
    signed,
    loading: 'Carregando…',
    panelError:
      'Este painel teve um problema e foi desligado. O resto da ficha continua funcionando.',
    retry: 'Tentar de novo',
  },
} as const;

export type Messages = typeof ptBR;
