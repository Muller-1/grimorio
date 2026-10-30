import type { AbilityKey, DamageType, SkillKey } from '@grimorio/shared';
import type { DiceErrorCode } from '@grimorio/rules';

/**
 * TODOS os textos de interface em português ficam aqui (plano de início, Etapa 5), menos os do
 * assistente (wizard.pt-BR.ts) e os da ficha (sheet.pt-BR.ts), que só as páginas deles usam.
 * Componentes nunca escrevem texto "solto" — uma regra de lint cobra isso.
 * Termos de regra seguem o Livro do Jogador de 2024 em português (decisão #5, ADR-004).
 */

const signed = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);

export const ptBR = {
  brand: {
    name: 'Grimório',
    tagline: 'Fichas e dados para RPG de mesa',
  },

  /**
   * Título e descrição de cada página (ADR-012): cada uma com o seu, no HTML gerado no
   * build e ao navegar. A descrição aparece na busca e na prévia do link no WhatsApp.
   */
  meta: {
    default: {
      title: 'Grimório — fichas e dados para RPG',
      description:
        'Ficha de personagem e rolador de dados gratuitos para RPG compatível com a 5ª edição. O site faz as contas por você.',
    },
    pages: {
      '/': {
        title: 'Grimório — fichas e dados para RPG',
        description:
          'Crie seu personagem de RPG compatível com a 5ª edição em 4 passos guiados. Grátis, sem anúncios e em português: a ficha faz as contas e rola os dados.',
      },
      '/comecar': {
        title: 'Primeiros passos · Grimório',
        description:
          'Nunca jogou RPG de mesa? O básico em dois minutos: o que é, do que precisa, a ficha, os dados e um glossário das palavras que você vai ouvir.',
      },
      '/ficha': {
        title: 'Ficha de personagem · Grimório',
        description:
          'Ficha de personagem que calcula sozinha atributos, perícias, ataques, magias e inventário, e rola os dados com um toque.',
      },
      '/dados': {
        title: 'Rolador de dados · Grimório',
        description:
          'Rolador de dados para RPG: 1d20+5, vantagem, desvantagem, 4d6 descartando o menor e atalhos com nome para as rolagens da sua mesa.',
      },
      '/criar': {
        title: 'Criar personagem · Grimório',
        description:
          'Assistente de criação de personagem passo a passo: classe, origem, atributos e toques finais, com as regras abertas da 5ª edição explicadas.',
      },
      '/personagens': {
        title: 'Meus personagens · Grimório',
        description: 'Suas fichas de personagem, neste navegador ou na sua conta.',
      },
      '/campanhas': {
        title: 'Campanhas · Grimório',
        description:
          'Junte a mestre e os jogadores da mesa: dano, cura e condições nas fichas de todos.',
      },
      '/apoie': {
        title: 'Apoie o projeto · Grimório',
        description: 'O Grimório é gratuito e mantido por quem joga. Veja como ajudar.',
      },
      '/creditos': {
        title: 'Créditos · Grimório',
        description: 'Licenças e créditos: SRD 5.2 (CC BY 4.0), fontes, ícones e bibliotecas.',
      },
      '/termos': {
        title: 'Termos de uso · Grimório',
        description: 'Termos de uso do Grimório.',
      },
      '/privacidade': {
        title: 'Privacidade · Grimório',
        description: 'O que o Grimório guarda, onde e por quanto tempo.',
      },
    } as Record<string, { title: string; description: string }>,
  },

  nav: {
    home: 'Início',
    homeLabel: 'Grimório, página inicial',
    menu: 'Abrir menu',
    menuClose: 'Fechar menu',
    sheet: 'Fichas',
    campaign: 'Campanhas',
    dice: 'Dados',
    support: 'Apoie',
    profile: 'Perfil',
    comingSoon: 'Em breve',
    campaignSoon: 'Campanhas chegam numa próxima versão',
    profileSoon:
      'Contas chegam numa próxima versão. Por enquanto, tudo fica salvo neste navegador.',
    accountsUnavailable:
      'O servidor de contas não respondeu. A ficha deste navegador e os dados continuam funcionando.',
    help: 'Primeiros passos: como jogar e criar o personagem',
    mainLabel: 'Navegação principal',
    skipToContent: 'Pular para o conteúdo',
    footerLabel: 'Links do site',
  },

  theme: {
    trigger: 'Tema de cores',
    title: 'Tema de cores',
    hint: 'Fica salvo neste navegador.',
    options: {
      auto: { name: 'Automático', text: 'Claro ou escuro, igual ao seu aparelho.' },
      light: { name: 'Pergaminho', text: 'Claro, papel antigo com detalhes em ouro.' },
      dark: { name: 'Obsidiana', text: 'Escuro, para a mesa à noite, com detalhes em prata.' },
    },
  },
  footer: {
    start: 'Primeiros passos',
    report: 'Relatar problema',
    reportSoon: 'O canal de relatos ainda não foi configurado.',
    credits: 'Créditos',
    terms: 'Termos',
    privacy: 'Privacidade',
    support: 'Apoie o projeto',
    compat: 'Compatível com a 5ª edição. Projeto independente, sem vínculo com a editora do jogo.',
    version: (version: string) => `v${version}`,
    build: (commit: string) => `Código ${commit}`,
  },

  home: {
    title: 'Crie seu personagem de RPG sem complicação.',
    lead: 'Um assistente guia você passo a passo pela criação, com as regras de 2024 da 5ª edição. Depois, a ficha faz as contas sozinha e rola os dados na hora.',
    ctaCreate: 'Criar personagem',
    ctaDice: 'Rolar dados',
    startLink: 'Nunca jogou? Veja os primeiros passos',
    blankLink: 'Já sabe preencher? Abrir uma ficha em branco',
    badges: ['Grátis', 'sem anúncios', 'em português'],
    localNote: 'Nesta versão, a ficha fica salva só neste navegador.',
    accountsNote:
      'Sem conta, tudo fica salvo neste navegador. Entrando com o Google, suas fichas abrem em qualquer aparelho.',
    how: {
      title: 'Novo por aqui? Seu personagem em 4 passos',
      lead: 'Não precisa saber as regras: em cada passo o assistente explica o que cada opção faz e marca as sugestões do livro. Quem conjura magia ganha um passo a mais, para escolher as magias.',
      steps: [
        {
          title: 'Classe',
          text: 'O que o personagem faz de melhor: lutar, conjurar magia, se esconder, curar…',
        },
        {
          title: 'Origem',
          text: 'De onde ele vem: o antecedente (o que fazia antes) e a espécie (anão, elfo, humano…).',
        },
        {
          title: 'Atributos',
          text: 'Força, Destreza, Constituição, Inteligência, Sabedoria e Carisma. O assistente sugere os valores.',
        },
        {
          title: 'Toques finais',
          text: 'Nome, aparência e história. Pronto: a ficha está montada e faz as contas sozinha.',
        },
      ],
      cta: 'Começar pelo passo 1',
      basics: 'Prefiro entender o básico antes (2 minutos)',
    },
    features: {
      title: 'O que já dá para fazer',
      /** Agrupado pelo momento do jogo (menos caixas iguais lado a lado). */
      groups: [
        {
          title: 'Criar e evoluir',
          items: [
            {
              title: 'Criação guiada',
              text: 'Classe, origem e atributos em passos curtos, com as regras abertas do jogo e explicações para iniciantes.',
            },
            {
              title: 'Subida de nível guiada',
              text: 'Diga quantos níveis subiu e veja, em telas curtas, o que ganhou e o que escolher, do 1 ao 20.',
            },
            {
              title: 'Magias',
              text: 'As 391 magias (339 das regras abertas e 52 do livro) em português: CD, espaços para marcar, conjurar rolando o dano e Concentração.',
            },
          ],
        },
        {
          title: 'Durante a sessão',
          items: [
            {
              title: 'Dados de verdade',
              text: 'Qualquer expressão: 1d20+5, 4d6kh3, vantagem, desvantagem, até 100d2 da magia inventada da mesa.',
            },
            {
              title: 'Vida em jogo',
              text: 'Dano, cura, PV temporários, desfazer, dados de vida e salvaguardas contra morte com as regras certas.',
            },
            {
              title: 'Habilidades que fazem as contas',
              text: 'Ligou a Fúria? Ficou Envenenado? A ficha muda o dano, a CA, a Vantagem e a Desvantagem sozinha.',
            },
          ],
        },
        {
          title: 'Na ficha',
          items: [
            {
              title: 'Contas explicadas',
              text: 'Mudou a Destreza? Iniciativa, CA, perícias e ataques se ajustam sozinhos. Toque num número para ver de onde ele vem.',
            },
            {
              title: 'Inventário',
              text: 'Ouro e moedas, itens com peso e a Capacidade de Carga calculada. Arma equipada ataca; a guardada fica na mochila.',
            },
          ],
        },
      ],
      accounts: {
        title: 'Na conta ou no navegador',
        text: 'Sem cadastro, a ficha fica neste aparelho. Com uma conta Google, ela abre no celular e no computador.',
      },
    },
    next: {
      title: 'O que vem por aí',
      items: [
        'Comprar equipamento com o ouro, pela tabela do capítulo 6',
        'Multiclasse',
        '"Regras da mesa": ajustes opcionais para quem joga diferente',
        'Campanhas com o mestre e o grupo',
      ],
    },
    supportTitle: 'Mantido por quem joga',
    supportText:
      'O Grimório é e continuará gratuito. Se ele ajudar a sua mesa, considere apoiar o projeto.',
    supportCta: 'Quero apoiar',
    /** Cartões ilustrativos ao lado dos textos (só desenho: o leitor de tela pula). */
    preview: {
      wizard: {
        label: 'Criar personagem',
        step: 'Passo 1 de 4',
        title: 'Escolha a classe',
        hint: 'Na dúvida, escolha Guerreiro ou Ladino: são as classes mais simples para começar.',
        classes: [
          { name: 'Bárbaro', text: 'Luta na linha de frente com a Fúria', simple: false },
          { name: 'Guerreiro', text: 'Domina armas, armaduras e estilos de luta', simple: true },
          { name: 'Ladino', text: 'Furtividade, perícias e Ataque Furtivo', simple: true },
          { name: 'Mago', text: 'Aprende magias e guarda num grimório', simple: false },
        ],
        selected: 'Ladino',
        simple: 'Simples para começar',
        simpleShort: 'Simples',
        back: 'Voltar',
        next: 'Próximo: Origem',
      },
      levelUp: {
        label: 'Subir de nível',
        who: 'Kaela · Ladina',
        level: 'Nível',
        text: 'O que você ganhou e o que precisa escolher.',
        hp: 'Pontos de Vida máximos',
        hpValue: '24 → 31',
        hitDice: 'Dados de Vida',
        hitDiceValue: '3d8 → 4d8',
        feat: 'Talento de Aumento no Valor de Atributo',
        choose: 'Escolher',
      },
      dice: {
        label: 'Dados',
        history: 'Histórico da sessão',
        expression: '2d20kh1+5',
        roll: 'Rolar',
        advantage: 'Vantagem: fica o maior',
        rows: [
          ['4d6kh3', '14'],
          ['1d8+3 · Rapieira', '9'],
          ['100d2', '153'],
        ],
      },
      explain: {
        label: 'De onde vem este número',
        skill: 'Furtividade',
        rows: [
          ['Modificador de Destreza', '+3'],
          ['Bônus de Proficiência', '+2'],
        ],
        total: 'Total',
        tipBefore: 'Mudou a Destreza para 18? Vira',
        tipAfter: 'sozinho.',
      },
    },
  },

  start: {
    pageTitle: 'Primeiros passos',
    lead: 'Nunca jogou RPG de mesa? Em dois minutos de leitura você entende o básico para criar o seu personagem e participar da primeira sessão.',
    sections: [
      {
        title: 'O que é um RPG de mesa',
        body: [
          'É um jogo de contar histórias em grupo. Uma pessoa, o Mestre, descreve o mundo, os personagens que vocês encontram e os desafios. Cada jogador interpreta um herói e diz o que ele faz.',
          'Quando uma ação é difícil (escalar um muro, convencer um guarda, acertar um golpe), os dados decidem se dá certo. Não existe ganhar ou perder: o objetivo é a história ficar boa para todo mundo.',
        ],
      },
      {
        title: 'Do que você precisa',
        body: [
          'Um grupo (de 3 a 6 pessoas é comum), alguém para ser o Mestre, uma ficha de personagem para cada jogador e dados. O Grimório monta a ficha, faz as contas e tem um rolador de dados, então o celular já resolve.',
        ],
      },
      {
        title: 'A ficha do personagem',
        body: [
          'É o "documento" do seu herói: quem ele é, o que sabe fazer e quanto aguenta. Os números mais usados são os atributos, os Pontos de Vida, a Classe de Armadura e os bônus das perícias. No Grimório, toque em qualquer número para ver de onde ele vem.',
          'Quando o Mestre disser que o grupo subiu de nível, toque em "Subir de nível" na ficha: o site mostra, nível por nível, o que você ganhou e o que precisa escolher. Habilidades como a Fúria e as magias ficam na ficha e fazem as contas sozinhas.',
        ],
      },
      {
        title: 'Os dados',
        body: [
          'O jogo usa dados de 4, 6, 8, 10, 12 e 20 lados: d4, d6, d8, d10, d12 e d20. "1d8+3" quer dizer: role um dado de 8 lados e some 3.',
          'O mais importante é o d20. Para saber se algo dá certo, você rola 1d20, soma o seu bônus e compara com um número que o Mestre define (a Classe de Dificuldade). Igualou ou passou, deu certo.',
          'Com Vantagem, role dois d20 e fique com o maior; com Desvantagem, fique com o menor.',
        ],
      },
      {
        title: 'Criando o personagem no Grimório',
        body: [
          'O assistente tem 4 passos: Classe (o que ele faz de melhor), Origem (antecedente e espécie), Atributos (os seis números básicos) e Toques Finais (nome e história). Em cada passo, escolha as opções e clique em Avançar. O que falta aparece no rodapé, e o rascunho fica salvo se você sair.',
          'Na dúvida, escolha Guerreiro ou Ladino: são as classes mais simples para começar. Os botões de sugestão usam os valores recomendados pelo livro.',
        ],
      },
      {
        title: 'Na primeira sessão',
        body: [
          'Combine com o grupo o dia, o horário e o tipo de história. Leve a ficha (no celular serve) e pergunte ao Mestre sempre que tiver dúvida: errar regra faz parte, e ninguém sabe tudo de cabeça.',
        ],
      },
    ],
    tapToOpen: 'Toque num assunto para abrir.',
    glossaryTitle: 'Palavras que você vai ouvir',
    glossaryHint: 'Toque numa palavra para ver o que ela quer dizer.',
    ctaCreate: 'Criar meu personagem',
    ctaDice: 'Testar o rolador de dados',
  },

  /** Termos de regra explicados em linguagem simples (página Primeiros passos e assistente). */
  glossary: {
    attribute: {
      term: 'Atributo',
      text: 'Os seis números básicos do personagem: Força, Destreza, Constituição, Inteligência, Sabedoria e Carisma. Vão de 1 a 20 para heróis comuns.',
    },
    modifier: {
      term: 'Modificador',
      text: 'O número que você soma de verdade nas rolagens. Sai do atributo: 10 ou 11 é +0, e cada 2 pontos acima soma +1 (12 é +1, 14 é +2…).',
    },
    proficiency: {
      term: 'Bônus de Proficiência',
      text: 'Um bônus que cresce com o nível (+2 no nível 1). Você soma nas coisas em que é treinado: certas perícias, salvaguardas, armas e magias.',
    },
    skill: {
      term: 'Perícia',
      text: 'Algo que o personagem sabe fazer, como Furtividade, Percepção ou Persuasão. Se for treinado nela, soma o Bônus de Proficiência no teste.',
    },
    expertise: {
      term: 'Especialização',
      text: 'Treino acima do normal numa perícia: o Bônus de Proficiência conta em dobro nela. No nível 1, só o Ladino tem (em 2 perícias à escolha).',
    },
    save: {
      term: 'Salvaguarda',
      text: 'Uma rolagem para resistir a algo ruim, como veneno, uma explosão ou uma magia. Cada classe é treinada em duas.',
    },
    armorClass: {
      term: 'Classe de Armadura (CA)',
      text: 'O quanto é difícil acertar o personagem. Um ataque acerta se a rolagem do inimigo igualar ou passar a CA.',
    },
    hitPoints: {
      term: 'Pontos de Vida (PV)',
      text: 'O quanto o personagem aguenta. O dano tira PV; com 0, ele cai e começa a fazer salvaguardas contra a morte.',
    },
    hitDie: {
      term: 'Dado de Vida',
      text: 'O dado da classe que define os Pontos de Vida (d6 a d12). Também serve para recuperar PV num Descanso Curto.',
    },
    weaponMastery: {
      term: 'Maestria em Arma',
      text: 'Um efeito extra de cada tipo de arma, que só personagens treinados usam. Ex.: a Adaga tem Ágil (ataque extra mais fácil) e o Machado Grande tem Trespassar (acerta um segundo inimigo).',
    },
    cantrip: {
      term: 'Truque',
      text: 'Magia simples que pode ser usada à vontade, sem gastar nada.',
    },
    spellSlot: {
      term: 'Espaço de Magia',
      text: 'Uma "carga" para conjurar magias mais fortes que truques. Gasta ao conjurar e volta com o descanso.',
    },
    rest: {
      term: 'Descanso Curto e Longo',
      text: 'Curto: uma pausa de cerca de 1 hora para recuperar um pouco. Longo: uma noite de sono, que recupera quase tudo.',
    },
    initiative: {
      term: 'Iniciativa',
      text: 'A rolagem no começo de um combate que define a ordem dos turnos.',
    },
    advantage: {
      term: 'Vantagem e Desvantagem',
      text: 'Com Vantagem, role dois d20 e fique com o maior; com Desvantagem, com o menor.',
    },
    background: {
      term: 'Antecedente',
      text: 'O que o personagem fazia antes da aventura (Acólito, Criminoso, Sábio, Soldado…). Dá perícias, um talento e aumentos de atributo.',
    },
    species: {
      term: 'Espécie',
      text: 'De que povo o personagem é (Anão, Elfo, Humano…). Define tamanho, deslocamento e traços especiais.',
    },
    feat: {
      term: 'Talento',
      text: 'Uma habilidade especial extra. Todo personagem ganha um talento de Origem pelo antecedente.',
    },
  },

  auth: {
    signIn: 'Entrar',
    signOut: 'Sair',
    signingOut: 'Saindo…',
    account: 'Conta',
    accountMenu: (name: string) => `Conta de ${name}`,
    myCharacters: 'Meus personagens',
    signOutFailed: 'Não foi possível sair agora. Tente de novo.',
    server: {
      waking:
        'Acordando o servidor… Na versão gratuita ele dorme quando ninguém usa e leva até 1 minuto para voltar.',
      wakingShort: 'Acordando o servidor…',
      down: 'O servidor de contas não respondeu.',
      localOk: 'A ficha deste navegador e os dados continuam funcionando.',
      retryIn: (seconds: number) => `Tentando de novo em ${seconds} s.`,
      gaveUp: 'Tente de novo daqui a pouco.',
      retryNow: 'Tentar agora',
    },
    page: {
      title: 'Entrar no Grimório',
      lead: 'Com uma conta, suas fichas ficam salvas no servidor e abrem em qualquer aparelho: no celular durante a sessão e no computador na hora de subir de nível.',
      google: 'Entrar com Google',
      redirecting: 'Abrindo o Google…',
      googleOff:
        'O login com Google ainda não foi configurado neste servidor (faltam as credenciais do Google Cloud).',
      what: 'O que guardamos',
      whatItems: [
        'Seu e-mail, nome e foto, como vêm do Google.',
        'Suas fichas de personagem.',
        'Nada de senha: quem confere quem é você é o Google.',
      ],
      terms: 'Ao entrar, você concorda com os Termos de uso e a Política de privacidade.',
      noAccount: 'Prefere não criar conta?',
      noAccountText: 'Tudo continua funcionando neste navegador, sem login.',
      openLocalSheet: 'Usar a ficha deste navegador',
      alreadyIn: (name: string) => `Você já entrou como ${name}.`,
      goToCharacters: 'Ver meus personagens',
      disabled: 'Contas ainda não estão disponíveis nesta versão do site.',
      failed: 'Não foi possível falar com o Google agora. Tente de novo.',
      errors: {
        access_denied: 'Você cancelou o login no Google.',
        generic: 'O login não foi concluído. Tente de novo.',
      } as Record<string, string>,
    },
  },

  characters: {
    pageTitle: 'Meus personagens',
    lead: 'Fichas salvas na sua conta. Abra em qualquer aparelho.',
    create: 'Criar personagem',
    empty: 'Você ainda não tem personagens na conta.',
    emptyHint:
      'O assistente monta a ficha de nível 1 passo a passo, seguindo o Livro do Jogador (2024).',
    emptyCta: 'Criar o primeiro personagem',
    level: (n: number) => `Nível ${n}`,
    unnamed: 'Sem nome',
    noClass: 'Sem classe',
    updated: (when: string) => `Editado em ${when}`,
    open: (name: string) => `Abrir ${name}`,
    remove: (name: string) => `Excluir ${name}`,
    removeTitle: 'Excluir este personagem?',
    removeText: (name: string) => `"${name}" vai para a lixeira e some da lista.`,
    removeConfirm: 'Excluir',
    removeFailed: 'Não foi possível excluir agora. Tente de novo.',
    cancel: 'Cancelar',
    pendingBadge: 'Alterações deste aparelho ainda não enviadas',
    localTitle: 'Ficha deste navegador',
    localText: 'A ficha avulsa, salva só aqui, continua disponível — com ou sem conta.',
    localOpen: 'Abrir ficha do navegador',
    signedOutTitle: 'Entre para guardar fichas na conta',
    signedOutText:
      'Sem conta, você ainda pode criar um personagem com o assistente: ele fica salvo neste navegador.',
    loadFailed: 'Não foi possível carregar a lista agora.',
    retry: 'Tentar de novo',
    loading: 'Carregando personagens…',
    limit: 'Você chegou ao limite de 50 personagens nesta conta. Exclua algum para criar outro.',
  },

  sync: {
    saved: 'Salvo na conta',
    pending: 'Alterações a salvar…',
    saving: 'Salvando…',
    offline: 'Sem internet: salvo neste aparelho, enviaremos depois',
    error: 'Não foi possível salvar agora; tentaremos de novo',
    conflict: 'Esta ficha mudou em outro aparelho',
    problems: {
      'signed-out': 'Sua sessão terminou. Entre de novo para salvar na conta.',
      gone: 'Esta ficha foi excluída em outro aparelho.',
      invalid: 'O servidor recusou esta ficha. Relate o problema, por favor.',
    },
    conflictTitle: 'Esta ficha mudou em outro aparelho',
    conflictText:
      'As partes abaixo foram alteradas em outro lugar enquanto você editava aqui. Qual versão fica?',
    keepMine: 'Manter a deste aparelho',
    useTheirs: 'Usar a versão salva na conta',
    sections: {
      identity: 'Identidade e descrição',
      build: 'Nível, atributos e proficiências',
      combat: 'Combate (CA, deslocamento, PV máximo)',
      state: 'Pontos de vida e recursos',
      weapons: 'Armas',
      features: 'Características',
      creation: 'Escolhas da criação',
    } as Record<string, string>,
    loadingSheet: 'Abrindo a ficha…',
    notFound: 'Esta ficha não existe ou não é da sua conta.',
    needSignIn: 'Entre na sua conta para abrir esta ficha.',
    unavailable: 'O servidor não respondeu e esta ficha não está guardada neste aparelho.',
    backToList: 'Voltar para a lista',
    openedOffline: 'Servidor fora do ar: abrimos a cópia deste aparelho.',
  },

  /** Tela inicial de quem entrou na conta (docs/design.md). */
  dashboard: {
    greeting: (hour: number, name: string) =>
      `${hour >= 5 && hour < 12 ? 'Bom dia' : hour >= 12 && hour < 18 ? 'Boa tarde' : 'Boa noite'}, ${name}`,
    saved: 'Suas fichas e campanhas estão salvas na conta.',
    create: 'Criar personagem',
    opening: 'Abrindo a sua mesa…',
    failed: 'Não foi possível carregar agora.',
    retry: 'Tentar de novo',
    continueTitle: 'Continuar de onde parou',
    editedToday: (time: string) => `Editada hoje, ${time}`,
    editedOn: (date: string) => `Editada em ${date}`,
    atTable: (name: string) => `Na mesa: ${name}`,
    open: 'Abrir ficha',
    level: (n: number) => `Nível ${n}`,
    ac: 'Classe de Armadura',
    hp: 'Pontos de Vida',
    hpLabel: (current: number, max: number) =>
      current >= max ? 'Pontos de Vida cheios' : `${current} de ${max} Pontos de Vida`,
    initiative: 'Iniciativa',
    rollInitiative: (mod: string) => `Rolar Iniciativa: ${mod}`,
    initiativeRoll: (name: string) => `Iniciativa · ${name}`,
    inspiration: 'Inspiração Heroica',
    inspirationOn: 'Disponível',
    inspirationOff: 'Sem inspiração agora',
    noConditions: 'Sem condições',
    hitDice: (left: number, total: number) => `Dados de Vida ${left} de ${total}`,
    noCharacter: 'Você ainda não tem personagens na conta.',
    noCharacterHint: 'O assistente monta a ficha passo a passo, com as regras explicadas.',
    quickTitle: 'Rolagem rápida',
    openDice: 'Abrir Dados',
    advantage: 'Vantagem',
    rollDie: (name: string) => `Rolar ${name}`,
    quickEmpty: 'Toque num dado ou escreva uma expressão.',
    charactersTitle: 'Meus personagens',
    count: (n: number, max: number) => `${n} de ${max}`,
    status: (ac: number, hp: number, max: number) => `CA ${ac} · PV ${hp}/${max}`,
    updatedToday: (time: string) => `Hoje, ${time}`,
    updatedOn: (date: string) => `Editado em ${date}`,
    seeAllCharacters: 'Ver todos',
    campaignsTitle: 'Campanhas',
    seeAll: 'Ver todas',
    roleDm: 'Mestre',
    rolePlayer: 'Jogador',
    counts: (people: number, sheets: number) =>
      `${people} ${people === 1 ? 'pessoa' : 'pessoas'} · ${sheets} ${sheets === 1 ? 'ficha' : 'fichas'}`,
    hereAtTable: (name: string) => `${name} está na mesa`,
    noCampaigns:
      'Nenhuma campanha ainda. Crie uma para a sua mesa ou entre com o convite da mestre.',
    createCampaign: 'Criar campanha',
    useInvite: 'Usar convite',
  },

  /** Tela de carregamento e telas de erro (docs/design.md). */
  screens: {
    loading: {
      title: 'Carregando o Grimório',
      status: 'Carregando…',
      phrases: [
        'Consultando o oráculo…',
        'Desenrolando o pergaminho…',
        'Afiando as espadas…',
        'Preparando os espaços de magia…',
        'Rolando iniciativa…',
        'Acendendo as tochas…',
      ],
      rolling: 'Rolando…',
    },
    tipLabel: 'Dica',
    tips: [
      'Com Inspiração Heroica, você pode rolar de novo qualquer dado logo depois da rolagem — e fica com o novo resultado.',
      'Toque num número da ficha para ver de onde ele vem: atributo, proficiência e bônus, um por um.',
      'Vantagem é rolar dois d20 e ficar com o maior; Desvantagem, com o menor. A ficha marca quando cada uma vale.',
      'Num Descanso Longo você recupera todos os Pontos de Vida e os espaços de magia.',
    ],
    nav: { sheets: 'Fichas', campaigns: 'Campanhas', dice: 'Rolador' },
    home: 'Voltar ao início',
    notFound: {
      eyebrow: 'Erro 404 · falha crítica',
      title: 'Esta página não está no mapa',
      text: 'Você rolou um 1 natural em Sabedoria (Sobrevivência). O caminho que procurava não existe ou mudou de lugar.',
      art: 'Mapa rasgado: a trilha pontilhada termina na borda rasgada. Ao lado, um d20 mostra o resultado.',
      reroll: 'Rolar de novo',
      rolling: 'Rolando…',
      mySheets: 'Ver minhas fichas',
      result: (n: number) => `Resultado: ${n}`,
      outcome: (n: number) =>
        n === 20
          ? 'Acerto crítico! Mas nem um 20 natural faz esta página existir.'
          : n === 1
            ? 'Outro 1. A trilha continua perdida.'
            : n >= 10
              ? 'Você acha pegadas… e elas levam de volta ao início.'
              : 'Não foi o bastante para reencontrar a trilha.',
    },
    server: {
      eyebrow: 'Erro 500 · o ritual falhou',
      title: 'A magia saiu pela culatra',
      text: 'Algo deu errado e a página não pôde ser montada. Tente de novo em alguns instantes; se o problema continuar, avise a gente.',
      art: 'Um círculo mágico partido ao meio por uma rachadura, soltando fumaça e faíscas.',
      retry: 'Tentar de novo',
      retrying: 'Tentando…',
      code: 'Código do erro:',
      report: 'Avisar sobre o problema',
    },
    forbidden: {
      eyebrow: 'Erro 403 · acesso restrito',
      title: 'Esta parte é só do Mestre',
      text: 'Nesta campanha, os jogadores veem apenas o resumo das fichas dos outros. A ficha completa fica com quem a criou e com o Mestre.',
      art: 'Um pergaminho enrolado, amarrado com fita e fechado por um selo de cera com um cadeado.',
      summary: 'Ver resumo da ficha',
      back: 'Voltar à campanha',
      note: 'Precisa de alguma informação da ficha? Peça ao Mestre ou a quem a criou.',
    },
  },

  pages: {
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
        ['Better Auth (login)', 'MIT'],
        ['clsx e tailwind-merge', 'MIT'],
        ['class-variance-authority', 'Apache-2.0'],
        ['Ícones Lucide', 'ISC'],
        ['Fonte Cinzel (The Cinzel Project Authors)', 'SIL Open Font License 1.1'],
        ['Fonte Alegreya Sans (The Alegreya Sans Project Authors)', 'SIL Open Font License 1.1'],
      ] as [string, string][],
      rulesTitle: 'Regras do jogo',
      rules:
        'O site é compatível com a 5ª edição (regras de 2024). O assistente de criação, a progressão das classes do nível 1 ao 20, a subida de nível e 339 das magias usam o conteúdo das regras abertas, o System Reference Document 5.2, publicado sob a licença Creative Commons Atribuição 4.0:',
      srdAttribution:
        'This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.',
      srdNote:
        'Os nomes de regras seguem a edição brasileira do Livro do Jogador; as descrições, resumos e textos das magias foram escritos para o site a partir do SRD 5.2 e foram adaptados (resumidos, traduzidos e com as medidas em metros). Além do SRD, o site traz do Livro do Jogador, marcados "Do livro", magias, talentos (Origem, Gerais, Estilo de Luta e Dádivas Épicas) e antecedentes que ele não inclui: as regras — círculos, alcances, dados, salvaguardas, pré-requisitos, atributos — seguem o livro, mas cada texto foi escrito com palavras próprias, e nenhum texto dos livros é reproduzido. O que o site ainda não traz entra como "Outro (do livro)", preenchido pelo jogador.',
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
            'Sem conta, a ficha, os atalhos de dados e as suas preferências ficam salvos apenas no navegador do seu aparelho.',
            'Sem conta, limpar os dados do navegador, usar uma aba anônima ou trocar de aparelho faz a ficha sumir. Guarde as informações importantes também em outro lugar.',
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
          title: 'Contas',
          body: [
            'Entrar com o Google é opcional e serve para guardar as fichas no servidor. Você é responsável pelo que salva na sua conta. Contas usadas para abusar do serviço podem ser suspensas.',
          ],
          accountsOnly: true,
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
            'A ficha, os atalhos de dados e as preferências de animação e de tema de cores ficam guardados no armazenamento local do seu navegador. Eles nunca saem do seu aparelho e você pode apagá-los a qualquer momento limpando os dados do site nas configurações do navegador.',
          ],
        },
        {
          title: 'Imagem do retrato',
          body: [
            'Se você colocar o link de uma imagem como retrato, o seu navegador busca essa imagem direto no site onde ela está. Esse site recebe os dados técnicos da conexão, como em qualquer página que você visita.',
            'Se você enviar uma foto do computador, ela é reduzida no seu próprio navegador e guardada dentro da ficha, como o resto dela: neste navegador ou, se a ficha estiver na sua conta, junto com a conta. Use imagens que você tem o direito de usar e evite fotos pessoais de outras pessoas.',
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
      /** Versão usada quando o site tem contas (VITE_ACCOUNTS). Rascunho até a revisão jurídica. */
      accountSections: [
        {
          title: 'Resumo',
          body: [
            'Sem conta, nada muda: a ficha fica só no seu navegador e não recebemos nada. Se você entrar com o Google, guardamos o mínimo para a conta funcionar, como descrito abaixo. Não há anúncios nem ferramentas de rastreamento.',
          ],
        },
        {
          title: 'Conta: o que guardamos e por quê',
          body: [
            'Do Google recebemos e guardamos o seu e-mail, nome, foto e o identificador da sua conta Google. Eles servem para você entrar e para mostrar o seu nome no site. Não guardamos senha nem os acessos (tokens) do Google, e não lemos nada da sua conta Google.',
            'As suas fichas ficam no nosso banco de dados para abrir em qualquer aparelho. Uma cópia fica no navegador para a ficha funcionar sem internet; ela é apagada quando você sai da conta.',
          ],
        },
        {
          title: 'Campanhas',
          body: [
            'Numa campanha, quem está na mesa vê o seu nome. A mestre vê a ficha inteira dos personagens que você puser na mesa e pode mudar o estado de jogo deles (dano, cura, condições); os outros jogadores veem só o resumo: nome, classe, nível, CA, PV e condições. O site guarda quem fez cada mudança (histórico da ficha).',
            'Você tira a ficha da mesa ou sai da campanha quando quiser; a ficha continua sua.',
          ],
        },
        {
          title: 'Cookie de sessão',
          body: [
            'Ao entrar, o site grava um cookie de sessão, necessário para manter você conectado (dura até 30 dias ou até você sair). Não usamos cookies de publicidade nem de análise.',
          ],
        },
        {
          title: 'Onde ficam os dados',
          body: [
            'Os dados da conta ficam no servidor e no banco de dados do site, que podem estar fora do Brasil. O login é feito pelo Google, que segue a própria política de privacidade.',
          ],
        },
        {
          title: 'Seus direitos',
          body: [
            'Você pode pedir a qualquer momento uma cópia dos seus dados ou a exclusão da conta e de todas as fichas pelo contato abaixo. Fichas excluídas vão para a lixeira e são apagadas de vez depois de 30 dias.',
          ],
        },
        {
          title: 'O que fica no seu aparelho',
          body: [
            'A ficha avulsa, os atalhos de dados, as preferências de animação e de tema de cores e o rascunho do assistente de criação ficam no armazenamento local do seu navegador. Você pode apagá-los limpando os dados do site nas configurações do navegador.',
          ],
        },
        {
          title: 'Hospedagem',
          body: [
            'O site é entregue pela Cloudflare. Como qualquer servidor na internet, ela recebe dados técnicos da conexão, como o endereço IP e o tipo de navegador, para entregar as páginas e proteger o site contra ataques. Esses servidores podem ficar fora do Brasil.',
          ],
        },
        {
          title: 'Crianças e adolescentes',
          body: [
            'As contas estão em fase de testes. As regras para contas de menores de idade serão definidas, com revisão jurídica, antes de as contas serem abertas ao público.',
          ],
        },
      ],
    },
    accountsDraft:
      'Contas em fase de testes: este texto ainda passa por revisão jurídica (LGPD e ECA Digital) antes de as contas serem abertas ao público.',
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
    hideResult: 'Esconder o resultado',
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
    decrease: (what: string) => `Diminuir ${what}`,
    increase: (what: string) => `Aumentar ${what}`,
    signed,
    loading: 'Carregando…',
    panelError:
      'Este painel teve um problema e foi desligado. O resto da ficha continua funcionando.',
    retry: 'Tentar de novo',
  },
} as const;

export type Messages = typeof ptBR;
