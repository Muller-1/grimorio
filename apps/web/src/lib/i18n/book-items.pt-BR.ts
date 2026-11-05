/** "Adicionar do livro" do Inventário: vem com o diálogo, fora do pedaço da ficha. */
export const bookItemsPtBR = {
  title: 'Adicionar do livro',
  lead: 'Armas, armaduras e equipamento com os números do livro. Arma vai para as armas; armadura entra guardada (vista quando quiser).',
  search: 'Buscar pelo nome',
  kind: 'Tipo',
  kinds: { all: 'Tudo', weapon: 'Armas', armor: 'Armaduras', gear: 'Equipamento' },
  empty: 'Nada encontrado.',
  full: 'A ficha chegou ao limite (50 armas ou 200 itens). Tire algo antes de adicionar.',
  addOne: (name: string) => `Adicionar ${name}`,
  added: (name: string) => `Adicionado: ${name}.`,
  dexMax: (cap: number) => (cap === 0 ? 'sem Destreza' : `+ Destreza (máx. ${cap})`),
  dexAll: '+ Destreza',
  done: 'Pronto',
};
