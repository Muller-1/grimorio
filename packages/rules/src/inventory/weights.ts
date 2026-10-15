/**
 * Peso dos itens mais comuns (cap. 6), em kg: 1 libra do SRD 5.2 = 0,5 kg, a mesma conversão
 * das tabelas do livro em português. Só números e nomes (termos do livro), nenhum texto.
 * Um item fora da tabela fica sem peso até o jogador preencher.
 */
const KG: [string, number][] = [
  // Armas simples
  ['Adaga', 0.5],
  ['Azagaia', 1],
  ['Cajado', 2],
  ['Clava', 1],
  ['Clava Grande', 5],
  ['Foice', 1],
  ['Lança', 1.5],
  ['Maça', 2],
  ['Machadinha', 1],
  ['Martelo Leve', 1],
  ['Arco Curto', 1],
  ['Besta Leve', 2.5],
  ['Dardo', 0.125],
  ['Funda', 0],
  // Armas marciais
  ['Alabarda', 3],
  ['Chicote', 1.5],
  ['Cimitarra', 1.5],
  ['Espada Curta', 1],
  ['Espada Grande', 3],
  ['Espada Longa', 1.5],
  ['Glaive', 3],
  ['Lança de Montaria', 3],
  ['Lança Longa', 9],
  ['Maça Estrela', 2],
  ['Machado de Batalha', 2],
  ['Machado Grande', 3.5],
  ['Malho', 5],
  ['Mangual', 1],
  ['Martelo de Guerra', 2.5],
  ['Picareta de Guerra', 1],
  ['Rapieira', 1],
  ['Tridente', 2],
  ['Arco Longo', 1],
  ['Besta de Mão', 1.5],
  ['Besta Pesada', 9],
  ['Mosquete', 5],
  ['Pistola', 1.5],
  ['Zarabatana', 0.5],
  ['Ataque Desarmado', 0],
  ['Ataque Desarmado (Artes Marciais)', 0],
  // Armaduras
  ['Armadura Acolchoada', 4],
  ['Armadura de Couro', 5],
  ['Armadura de Couro Batido', 6.5],
  ['Gibão de Peles', 6],
  ['Cota de Malha Parcial', 10],
  ['Loriga de Escamas', 22],
  ['Couraça Peitoral', 10],
  ['Armadura de Placas Parcial', 20],
  ['Cota de Anéis', 20],
  ['Cota de Malha', 27.5],
  ['Armadura de Tala', 30],
  ['Armadura de Placas', 32.5],
  ['Escudo', 3],
  // Munição e recipientes
  ['Flecha', 0.025],
  ['Virote', 0.0375],
  ['Aljava', 0.5],
  ['Algibeira', 0.5],
  ['Mochila', 2.5],
  ['Cantil', 2.5],
  ['Saco de Dormir', 3.5],
  // Kits (cap. 6, pacotes de equipamento)
  ['Kit de Assaltante', 21],
  ['Kit de Aventureiro', 27.5],
  ['Kit de Explorador', 27.5],
  ['Kit de Explorador de Masmorras', 27.5],
  ['Kit de Artista', 29.25],
  ['Kit de Diplomata', 19.5],
  ['Kit de Sacerdote', 14.5],
  ['Kit de Erudito', 11],
  ['Kit de Curandeiro', 1.5],
  ['Kit de Herbalismo', 1.5],
  ['Kit de Jogos', 0],
  // Ferramentas e outros
  ['Ferramentas de Ladrão', 0.5],
  ['Suprimentos de Calígrafo', 2.5],
  ['Foco Arcano (cajado)', 2],
  ['Foco Arcano (cristal)', 0.5],
  ['Foco Arcano (orbe)', 1.5],
  ['Foco Arcano (varinha)', 0.5],
  ['Foco Druídico (cajado)', 2],
  ['Foco Druídico (ramo de visco)', 0],
  ['Símbolo Sagrado', 0.5],
  ['Livro', 2.5],
  ['Livro de Magias', 1.5],
  ['Pergaminho', 0],
  ['Pé de Cabra', 2.5],
  ['Corda', 2.5],
  ['Tocha', 0.5],
  ['Ração', 1],
  ['Roupas de Viagem', 2],
  ['Roupas Finas', 3],
  ['Túnica', 2],
];

/** Sem acento, minúsculas, cada palavra no singular ("Espadas Curtas" → "espada curta"). */
export function itemKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9() ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w))
    .join(' ');
}

const TABLE = new Map(KG.map(([name, kg]) => [itemKey(name), kg]));

/**
 * Quantidade escrita junto do nome: "4 Machadinhas" (lista de equipamento) ou "Machadinha (×4)"
 * (arma na ficha). Sem número, 1.
 */
export function splitQuantity(text: string): { quantity: number; name: string } {
  const trimmed = text.trim();
  const before = /^(\d{1,4})\s+(.+)$/.exec(trimmed);
  if (before) return { quantity: Number(before[1]), name: before[2]!.trim() };
  const after = /^(.+?)\s*\(×\s*(\d{1,4})\)$/.exec(trimmed);
  if (after) return { quantity: Number(after[2]), name: after[1]!.trim() };
  return { quantity: 1, name: trimmed };
}

/** Peso de UMA unidade pelo nome, se o item estiver na tabela. */
export function knownWeightKg(name: string): number | undefined {
  const key = itemKey(name);
  return TABLE.get(key) ?? TABLE.get(itemKey(name.replace(/\s*\([^)]*\)\s*$/, '')));
}
