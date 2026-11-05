# ADR-018 — Subclasses do Livro do Jogador e listas de magia

- **Status:** aceito
- **Data:** 2026-11-04

## Contexto

Cada classe tinha só a subclasse do SRD; as outras três do Livro do Jogador 2024 entravam como
"Outra subclasse (do livro)", sem nenhuma conta. Na mesa, pediram as subclasses completas.

O problema é o tamanho. As classes vão no pedaço da ficha (o motor usa as características para
calcular CA, recursos, resistências), e a `/ficha` estava em 118,9 kB de 120. As 36 subclasses,
com textos, somam uns 25 kB comprimidos. Cada personagem usa uma.

Também apareceram defeitos na escolha de magias: a lista cortava em 60 resultados (Queda Suave
sumia para o Mago sem buscar), a busca não achava pelo nome em inglês, o seletor da aba Magias
do Bruxo 11+ oferecia magias de 6º a 9º círculo como preparadas e a lista guardava o filtro de
uma tela para a outra na subida de nível.

## Decisões

1. **Um arquivo por classe, sob demanda.** `packages/rules/src/classes/book-subclasses/<classe>.ts`
   traz as 3 subclasses do livro com `source: 'book'`. `loadBookSubclasses(classe)` baixa o arquivo
   e junta as subclasses em `CLASS_PROGRESSIONS[classe].subclasses`, depois da do SRD; daí em diante
   o motor trata todas igual. O Vite deixa esses arquivos fora do pedaço `rules` (2,7 a 3,6 kB cada).
2. **A ficha só espera quando precisa.** `sheetNeedsBookSubclasses` diz se a subclasse gravada é do
   livro e ainda não chegou; só nesse caso a ficha mostra "Carregando…". SRD e "Outra
   (do livro)" abrem como antes. A ficha baixa a classe em segundo plano para a subida de nível, e
   o diálogo refaz o plano quando ela chega. Sem internet, segue com as do SRD.
3. **Cache da ficha com revisão.** `derivedOf` guarda junto a `bookSubclassRevision()`; quando chega
   uma classe, o que foi calculado antes é refeito.
4. **API carrega todas ao subir** (`buildApp`), para o resumo da mesa e a conferência das fichas.
5. **Subclasse pode ter colunas próprias** (`columns`: Dados de Superioridade, Energia Psiônica,
   Luz Medicinal), lidas antes das da classe pelo `{ column }`.
6. **Conjuração de um terço** (`kind: 'third'`) para Cavaleiro Místico e Trapaceiro Arcano, com
   `spellcasting` na subclasse e a lista do Mago (sem restrição de escola, como no livro de 2024).
7. **Textos nossos.** As regras seguem o livro (conferidas no texto do PDF); os textos são
   resumos com palavras próprias, como nos talentos do livro.
8. **Escolha de magias:** a lista mostra 60 de cada vez com "Mostrar mais" (nada fica escondido);
   cada magia tem "Ver descrição" com conjuração, alcance, componentes, duração e texto; a busca
   acha também pelo nome em inglês; um círculo que não existe na tela atual volta a "Todos"; cada
   escolha da subida de nível tem a sua lista. O Arcano Místico sai do círculo máximo das magias
   preparadas (continua sendo escolhido à parte, na subida de nível).
9. **Listas de classe conferidas com o livro:** as cerca de 370 magias com o mesmo nome no livro e
   nos dados têm as mesmas classes e o mesmo círculo. Nada mudou nos dados.

## Fica de fora

- Manobras do Mestre da Batalha: o motor escolhe uma opção por vez, e ele aprende 3 a 9. A lista
  fica no texto (em três partes); o jogador anota as suas.
- Fichas que já usam "Outra subclasse" com o nome de uma subclasse do livro continuam assim; trocar
  para a do livro é escolher de novo ao subir de nível.
- Forma Selvagem do Círculo da Lua, Surto de Magia Selvagem, Fera Primal e afins: só texto.
