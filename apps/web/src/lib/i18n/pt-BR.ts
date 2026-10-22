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
    sheet: 'Fichas',
    campaign: 'Campanha',
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
      light: { name: 'Pergaminho', text: 'Claro, cor de papel antigo.' },
      dark: { name: 'Taverna', text: 'Escuro, à luz de vela.' },
      arcane: { name: 'Arcano', text: 'Escuro, azul-noite e violeta.' },
      forest: { name: 'Floresta', text: 'Claro, verde-musgo.' },
      contrast: { name: 'Alto contraste', text: 'Preto no branco, para ler melhor.' },
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
    version: (version: string, commit: string) => `v${version} · ${commit}`,
  },

  home: {
    title: 'Crie seu personagem de RPG sem complicação.',
    lead: 'Um assistente guia você passo a passo pela criação, com as regras de 2024 da 5ª edição. Depois, a ficha faz as contas sozinha e rola os dados na hora.',
    ctaCreate: 'Criar personagem',
    ctaDice: 'Rolar dados',
    startLink: 'Nunca jogou? Veja os primeiros passos',
    blankLink: 'Já sabe preencher? Abrir uma ficha em branco',
    freeNote: 'Grátis, sem anúncios e em português.',
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
              text: 'As 339 magias das regras abertas em português: CD, espaços para marcar, conjurar rolando o dano e Concentração.',
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
        ['Better Auth (login)', 'MIT'],
        ['clsx e tailwind-merge', 'MIT'],
        ['class-variance-authority', 'Apache-2.0'],
        ['Ícones Lucide', 'ISC'],
        ['Fonte Cinzel (via Fontsource)', 'SIL Open Font License 1.1'],
      ] as [string, string][],
      rulesTitle: 'Regras do jogo',
      rules:
        'O site é compatível com a 5ª edição (regras de 2024). O assistente de criação, a progressão das classes do nível 1 ao 20, a subida de nível e as 339 magias usam o conteúdo das regras abertas, o System Reference Document 5.2, publicado sob a licença Creative Commons Atribuição 4.0:',
      srdAttribution:
        'This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.',
      srdNote:
        'Os nomes de regras seguem a edição brasileira do Livro do Jogador; as descrições, resumos e textos das magias foram escritos para o site a partir do SRD 5.2 e foram adaptados (resumidos, traduzidos e com as medidas em metros). Nenhum texto dos livros é reproduzido. O que não está no SRD entra como "Outro (do livro)", preenchido pelo jogador.',
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

  sheet: {
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
      'no-uses': 'Sem usos sobrando. Eles voltam no descanso.',
      'requires-active': 'Ligue antes a habilidade de que esta depende.',
      'no-slot': 'Sem espaço de magia desse círculo.',
      'unknown-ability': 'Essa habilidade não está disponível nesta ficha.',
      'concentration-ended': 'A Fúria encerrou a Concentração.',
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
      rollCritDamage: 'Dano crítico',
      firstHit: 'Dano + 1º acerto',
      firstHitLabel: (name: string, extras: string) =>
        `Dano no 1º acerto do turno (${extras}): ${name}`,
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
      equipped: 'Equipada (o personagem está carregando)',
      equippedHint: 'Arma guardada não aparece nos ataques e não conta no peso.',
      weight: 'Peso (kg)',
      weightAuto: (kg: string) => `Vazio: usa o peso do livro (${kg} kg).`,
      weightNone: 'Vazio: sem peso.',
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
      source: 'De onde vem',
      save: 'Salvar',
      cancel: 'Cancelar',
      nameRequired: 'Dê um nome à característica.',
    },

    /** Aba Inventário: moedas, peso e itens. */
    inventory: {
      gold: 'Peças de Ouro',
      goldEdit: 'Peças de Ouro (PO)',
      coins: {
        cp: 'Cobre (PC)',
        sp: 'Prata (PP)',
        ep: 'Electro (PE)',
        gp: 'Ouro (PO)',
        pp: 'Platina (PL)',
      },
      otherCoins: 'Outras moedas',
      coinsHint: '1 PO = 10 PP = 100 PC · 1 PE = 5 PP · 1 PL = 10 PO · 50 moedas pesam 0,5 kg.',
      load: 'Peso carregado',
      loadValue: (carried: string, capacity: string) => `${carried} / ${capacity}`,
      kg: 'kg',
      loadHint: (mult: string) =>
        `Capacidade de Carga: Força × ${mult} kg. Arrastar, levantar ou empurrar: até o dobro.`,
      loadOver:
        'Acima da Capacidade de Carga: você só consegue arrastar ou empurrar, com Deslocamento de até 1,5 m.',
      loadOverDrag: 'Acima do dobro da Capacidade de Carga: você não consegue sair do lugar.',
      unknownWeights: (n: number) =>
        n === 1
          ? '1 coisa sem peso: edite para incluir na conta.'
          : `${n} coisas sem peso: edite para incluir na conta.`,
      weapons: 'Armas',
      weaponsHint: 'Equipada = carregando. A guardada sai dos ataques e do peso.',
      items: 'Itens',
      equipped: 'Equipada',
      stored: 'Guardada',
      carried: 'Com você',
      storedItem: 'Guardado',
      toggleWeapon: (name: string, on: boolean) =>
        on ? `${name}: equipada (toque para guardar)` : `${name}: guardada (toque para equipar)`,
      toggleItem: (name: string, on: boolean) =>
        on ? `${name}: com você (toque para guardar)` : `${name}: guardado (toque para levar)`,
      each: (kg: string) => `${kg} kg cada`,
      total: (kg: string) => `${kg} kg`,
      noWeight: 'sem peso',
      qty: (name: string) => `Quantidade de ${name}`,
      more: (name: string) => `Mais um: ${name}`,
      less: (name: string) => `Menos um: ${name}`,
      editItem: (name: string) => `Editar ${name}`,
      add: 'Adicionar item',
      empty: 'Nenhum item ainda. Use “Adicionar item”.',
      emptyWeapons: 'Nenhuma arma. Adicione na aba Armas.',
      editor: {
        titleNew: 'Novo item',
        titleEdit: 'Editar item',
        name: 'Item',
        namePlaceholder: 'Ex.: Corda, Tocha, Poção de Cura',
        quantity: 'Quantidade',
        weight: 'Peso de cada um (kg)',
        weightAuto: (kg: string) => `Vazio: usa o peso do livro (${kg} kg).`,
        weightNone: 'Vazio: sem peso (não entra na conta).',
        carried: 'Com você (conta no peso)',
        notes: 'Anotações',
        save: 'Salvar',
        cancel: 'Cancelar',
        remove: 'Remover',
        nameRequired: 'Dê um nome ao item.',
      },
      moved: 'O equipamento inicial agora fica no Inventário, com o ouro nas moedas.',
    },

    levelUp: {
      button: 'Subir de nível',
      hint: 'Escolha quantos níveis subiu e o site mostra o que você ganha em cada um.',
      max: 'Nível 20: o máximo.',
    },

    powers: {
      title: 'Habilidades',
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
      turnOn: 'Ligar',
      turnOff: 'Desligar',
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
    signed,
    loading: 'Carregando…',
    panelError:
      'Este painel teve um problema e foi desligado. O resto da ficha continua funcionando.',
    retry: 'Tentar de novo',
  },
} as const;

export type Messages = typeof ptBR;
