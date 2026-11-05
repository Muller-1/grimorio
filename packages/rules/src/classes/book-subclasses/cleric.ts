import type { SubclassDef } from '../types';

/** Subclasses do Livro do Jogador 2024 que o SRD não traz (texto nosso). */
export const BOOK_SUBCLASSES: SubclassDef[] = [
  {
    id: 'war',
    source: 'book',
    name: 'Domínio da Guerra',
    tagline: 'Inspira bravura, guia golpes aliados e luta na linha de frente.',
    spells: {
      3: ['spiritual-weapon', 'magic-weapon', 'shield-of-faith', 'guiding-bolt'],
      5: ['spirit-guardians', 'crusaders-mantle'],
      7: ['fire-shield', 'freedom-of-movement'],
      9: ['steel-wind-strike', 'hold-monster'],
    },
    features: [
      {
        id: 'war-domain-spells',
        level: 3,
        name: 'Magias de Domínio da Guerra',
        text: 'Sempre preparadas: Arma Espiritual, Arma Mágica, Escudo da Fé e Raio Guia (nível 3); Guardiões Espirituais e Manto do Cruzado (5); Escudo Ardente e Movimentação Livre (7); Golpe de Aço e Paralisar Monstro (9).',
      },
      {
        id: 'guided-strike',
        level: 3,
        name: 'Ataque Direcionado',
        text: 'Quando você ou criatura a até 9 m erra um ataque, use a Reação e gaste um Canalizar Divindade para dar +10 à jogada, podendo transformá-la em acerto.',
      },
      {
        id: 'war-priest',
        level: 3,
        name: 'Sacerdote da Guerra',
        text: 'Com uma Ação Bônus, faça um ataque com arma ou Ataque Desarmado. Usos: modificador de Sabedoria (mínimo 1) por Descanso Curto ou Longo.',
        resource: {
          id: 'war-priest',
          name: 'Sacerdote da Guerra',
          max: { ability: 'wis', min: 1 },
          recharge: 'short',
        },
      },
      {
        id: 'war-gods-blessing',
        level: 6,
        name: 'Bênção do Deus da Guerra',
        text: 'Gaste um Canalizar Divindade para conjurar Arma Espiritual ou Escudo da Fé sem espaço de magia. Sem Concentração: dura 1 minuto e acaba se você conjurá-la de novo, ficar Incapacitado ou morrer.',
      },
      {
        id: 'avatar-of-war',
        level: 17,
        name: 'Avatar da Guerra',
        text: 'Você tem Resistência a dano Contundente, Cortante e Perfurante.',
        passive: [{ type: 'resistance', damage: ['bludgeoning', 'slashing', 'piercing'] }],
      },
    ],
  },
  {
    id: 'light',
    source: 'book',
    name: 'Domínio da Luz',
    tagline: 'Gera labaredas e revelação para banir mentiras e trevas.',
    spells: {
      3: ['faerie-fire', 'burning-hands', 'scorching-ray', 'see-invisibility'],
      5: ['fireball', 'daylight'],
      7: ['wall-of-fire', 'arcane-eye'],
      9: ['flame-strike', 'scrying'],
    },
    features: [
      {
        id: 'radiance-of-the-dawn',
        level: 3,
        name: 'Brilho do Amanhecer',
        text: 'Com a ação Usar Magia e um Canalizar Divindade, emita luz numa Emanação de 9 m: dissipa Escuridão mágica e criaturas à sua escolha fazem salvaguarda de Constituição, sofrendo 2d10 + nível de Clérigo de dano Radiante (metade no sucesso).',
      },
      {
        id: 'warding-flare',
        level: 3,
        name: 'Labareda Protetora',
        text: 'Quando criatura à vista a até 9 m faz um ataque, use a Reação para impor Desvantagem à jogada. Usos: modificador de Sabedoria (mínimo 1) por Descanso Longo; no nível 6 voltam também no Descanso Curto.',
        resource: {
          id: 'warding-flare',
          name: 'Labareda Protetora',
          max: { ability: 'wis', min: 1 },
          recharge: 'long',
          shortRestFrom: 6,
        },
      },
      {
        id: 'light-domain-spells',
        level: 3,
        name: 'Magias de Domínio da Luz',
        text: 'Sempre preparadas: Fogo das Fadas, Mãos Ardentes, Raio Ardente e Ver o Invisível (nível 3); Bola de Fogo e Luz do Dia (5); Muralha de Fogo e Olho Arcano (7); Coluna de Chamas e Vidência (9).',
      },
      {
        id: 'improved-warding-flare',
        level: 6,
        name: 'Labareda Protetora Aprimorada',
        text: 'A Labareda Protetora volta também no Descanso Curto. Ao usá-la, pode dar ao alvo do ataque 2d6 + modificador de Sabedoria PV temporários.',
      },
      {
        id: 'corona-of-light',
        level: 17,
        name: 'Coroa de Luz',
        text: 'Com a ação Usar Magia, emita luz solar por 1 minuto (ou até encerrar): Luz Plena a 18 m e Meia-luz por mais 9 m. Inimigos na Luz Plena têm Desvantagem em salvaguardas contra Brilho do Amanhecer e magias de dano Ígneo ou Radiante. Usos: Sabedoria (mínimo 1) por Descanso Longo.',
        resource: {
          id: 'corona-of-light',
          name: 'Coroa de Luz',
          max: { ability: 'wis', min: 1 },
          recharge: 'long',
        },
      },
    ],
  },
  {
    id: 'trickery',
    source: 'book',
    name: 'Domínio da Trapaça',
    tagline: 'Engana, ilude e desafia autoridades com estratagemas e brincadeiras.',
    spells: {
      3: ['disguise-self', 'charm-person', 'invisibility', 'pass-without-trace'],
      5: ['nondetection', 'hypnotic-pattern'],
      7: ['confusion', 'dimension-door'],
      9: ['dominate-person', 'modify-memory'],
    },
    features: [
      {
        id: 'trickery-domain-spells',
        level: 3,
        name: 'Magias de Domínio da Trapaça',
        text: 'Sempre preparadas: Disfarçar-se, Enfeitiçar Pessoa, Invisibilidade e Passo Sem Rastro (nível 3); Indetectável e Padrão Hipnótico (5); Confusão e Porta Dimensional (7); Dominar Pessoa e Modificar Memória (9).',
      },
      {
        id: 'blessing-of-the-trickster',
        level: 3,
        name: 'Bênção do Trapaceiro',
        text: 'Com a ação Usar Magia, dê a você ou a uma criatura voluntária a até 9 m Vantagem em testes de Destreza (Furtividade). Dura até um Descanso Longo ou até você usar a característica de novo.',
      },
      {
        id: 'invoke-duplicity',
        level: 3,
        name: 'Invocar Duplicidade',
        text: 'Com uma Ação Bônus e um Canalizar Divindade, crie uma ilusão intangível sua a até 9 m, por 1 minuto (acaba se você ficar Incapacitado). Você conjura magias como se estivesse nela (com seus sentidos); tem Vantagem em ataques contra criatura que veja a ilusão se ambos estiverem a até 1,5 m dela; e move a ilusão 9 m com Ação Bônus, até 36 m de você.',
      },
      {
        id: 'tricksters-transposition',
        level: 6,
        name: 'Transposição do Trapaceiro',
        text: 'Ao criar ou mover a ilusão de Invocar Duplicidade com a Ação Bônus, você pode se teleportar, trocando de lugar com ela.',
      },
      {
        id: 'improved-duplicity',
        level: 17,
        name: 'Duplicidade Aprimorada',
        text: 'Distração Compartilhada: você e aliados têm Vantagem em ataques contra criatura a até 1,5 m da ilusão. Ilusão de Cura: quando a ilusão termina, você ou criatura à sua escolha a até 1,5 m dela recupera PV iguais ao seu nível de Clérigo.',
      },
    ],
  },
];
