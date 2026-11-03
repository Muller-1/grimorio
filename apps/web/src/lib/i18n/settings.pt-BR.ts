/** Textos da página Configurações. Só no pedaço carregado sob demanda. */
export const settingsPtBR = {
  title: 'Configurações',
  lead: 'Valem só para este navegador: no celular e no computador você escolhe separado.',
  comfort: {
    title: 'Conforto',
    motion: {
      title: 'Animações',
      hint: 'Dados girando, telas de carregamento e de erro, destaques que piscam.',
      device: 'Seu aparelho pede menos movimento, então o site começa sem animações.',
      options: {
        on: { name: 'Ligadas', text: 'O padrão: os dados giram e as telas têm movimento.' },
        off: { name: 'Desligadas', text: 'Nada se mexe na tela. Os resultados aparecem direto.' },
      },
    },
    font: {
      title: 'Fonte',
      hint: 'Troca as letras do texto e dos títulos.',
      sample: 'Aa',
      options: {
        default: { name: 'Padrão', text: 'Alegreya Sans no texto e Cinzel nos títulos.' },
        legible: {
          name: 'Mais legível',
          text: 'Atkinson Hyperlegible, feita para quem tem baixa visão. Letras parecidas (I, l, 1) ficam bem diferentes.',
        },
      },
    },
  },
  dice: {
    title: 'Dados',
    floating: {
      title: 'Botão flutuante de dados na ficha',
      text: 'O botão redondo na borda da ficha para rolar dados digitando. Desligado, as rolagens da ficha continuam funcionando.',
    },
  },
  data: {
    title: 'Seus dados',
    lead: 'O site guarda neste navegador a ficha avulsa, os atalhos de dados, o rascunho da criação de personagem, estas preferências e uma cópia das fichas da conta.',
    count: (n: number) =>
      n === 0
        ? 'Nada guardado agora.'
        : `${n} ${n === 1 ? 'item guardado' : 'itens guardados'} agora.`,
    export: 'Exportar (.json)',
    exportHint: 'Baixa um arquivo com tudo isso para guardar com você. Nada passa pelo servidor.',
    clear: 'Apagar dados deste navegador',
    cleared: 'Pronto: os dados deste navegador foram apagados.',
    confirm: {
      title: 'Apagar os dados deste navegador?',
      lead: 'Isto apaga de vez, neste navegador:',
      items: [
        'a ficha avulsa (a que não está numa conta);',
        'os atalhos de dados;',
        'o rascunho da criação de personagem;',
        'o tema, as animações, a fonte e o botão flutuante (voltam ao padrão);',
        'a cópia das fichas da conta guardada aqui.',
      ],
      account: 'As fichas salvas na sua conta não são apagadas: elas continuam no servidor.',
      noAccount:
        'Sem conta, a ficha avulsa só existe neste navegador. Se apagar sem exportar, ela some para sempre.',
      undo: 'Não dá para desfazer.',
      exportFirst: 'Exportar antes',
      cancel: 'Cancelar',
      confirm: 'Apagar tudo',
    },
  },
};
