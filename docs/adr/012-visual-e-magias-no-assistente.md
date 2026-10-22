# ADR-012 — Visual mais limpo e magias no assistente

- **Status:** aceito
- **Data:** 2026-10-22

## Contexto

Revisão de design de 22/10. A ideia era deixar o visual com menos cara de modelo pronto, **sem
refazer tudo e mantendo o tema mágico**, e continuar a etapa de magias do assistente. Os
padrões genéricos que mais aparecem em sites de modelo (e que eu queria evitar):

- caixas iguais repetidas (grade de 3 colunas com ícone + título + frase em toda seção), o mesmo
  arredondado e a mesma sombra em tudo, faixas coloridas alternadas;
- rótulo pequeno acima do título ("A · B · C"), etiquetas coloridas sem informação, seta "→" em
  todo botão;
- gradiente roxo, brilho, emoji como ícone, ícones de conjuntos diferentes;
- HTML: vários `h1`, título feito de `div`, `div` clicável, descrição igual em todas as páginas,
  seções sem nome;
- o que ajuda: um sistema de tokens com nome (cores, tipos, espaços) e regras do que fazer e do
  que não fazer.

O site já não tinha gradiente, emoji nem roxo; a paleta (pergaminho, carmim, ouro) e a Cinzel
são o tema e ficam.

## Decisões (o que entrou)

1. **Um ornamento só** (`components/ui/ornament.tsx`): filete dourado com losangos, como as
   divisões de capítulo de um grimório. Separa as seções da página inicial e de Primeiros passos
   no lugar das faixas coloridas.
2. **Página inicial**: sem o rótulo acima do título; sem seta no botão principal; os 4 passos
   viram uma trilha com selos numerados (é uma sequência de verdade); "O que já dá para fazer"
   vira três listas agrupadas pelo momento do jogo (Criar e evoluir, Durante a sessão, Na ficha)
   em vez de 8 caixas iguais; o cartão de exemplo ganha uma "folha por baixo" no lugar do
   retângulo rosa torto.
3. **Assistente, Classe**: cada classe com um símbolo (mesmo conjunto de ícones do site) e a
   dificuldade em pontos (●●○) no lugar das etiquetas coloridas; o atributo principal em texto.
4. **Menos caixa dentro de caixa**: contadores de PV numa faixa com divisórias; atalhos do
   rolador e glossário de Primeiros passos como listas com divisórias.
5. **HTML**: cada página com título e descrição próprios no HTML gerado (e Open Graph para a
   prévia do link no WhatsApp); a descrição acompanha a navegação. Painéis nomeados pelo título
   (`aria-labelledby`); as partes de Primeiros passos são `h2` de verdade dentro do `summary`;
   rodapé com `nav` nomeado; seções da inicial com `aria-labelledby`.
6. Ajustes pequenos: título da inicial menor no celular; ações do cabeçalho dos painéis descem
   de linha em vez de quebrar o título; buraco entre "Última rolagem" e "Histórico" no rolador.

## Ficou de fora (radical demais agora)

Trocar paleta ou fontes, refazer a ficha, cantos retos em tudo, animações de entrada, ilustrações
geradas. Candidatos para depois, em partes: lista de magias e cartões de arma com divisórias em
vez de caixas; ícone próprio (SVG) por classe; resumo fixo do personagem no assistente.

## Magias no assistente (livro, cap. 3 e cap. 5)

- Nova etapa **Magias** entre Atributos e Toques Finais, só para quem conjura no nível 1 ou tem o
  talento Iniciado em Magia (`creationSteps`). Quantidades da tabela de cada classe: truques,
  magias preparadas e, no Mago, as 6 do grimório (as 4 preparadas saem dele). Clérigo
  Taumaturgo e Druida Mágico conhecem 1 truque a mais (corrigido também na ficha).
- Botão **"Usar as recomendadas do livro"**: as magias que o livro recomenda para cada classe no
  nível 1 (`creation/recommended-spells.ts`, só ids; teste confere lista e círculo). Cada magia
  mostra o começo do texto para ajudar quem nunca jogou.
- **Iniciado em Magia**: lista (fixa quando vem do antecedente: Acólito → Clérigo, Sábio → Mago),
  atributo de conjuração (Int, Sab ou Car), 2 truques e 1 magia de 1º círculo; vão para "sempre
  preparadas" com a fonte "talento", e a magia tem 1 uso grátis por Descanso Longo.
- A lista das magias continua carregando sob demanda (a etapa é um pedaço à parte).
- Testes: unidade (quantidades das 12 classes, Taumaturgo, quando a etapa aparece, pendências,
  ficha montada, recomendadas) e bot B2 (aleatório + Mago Sábio determinístico).
