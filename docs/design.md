# Design do Grimório

Este documento descreve o visual do site como ele está no código: cores, letras, componentes,
telas, animações e o que cada coisa precisa garantir. Ele nasceu do quadro de design "Grimório —
design do site" (guia de estilo, carregamento, 404/500/403, ficha revisada, página inicial e
painel, no computador e no celular) e é a referência quando algo for ajustado depois.

Regra geral: **use as variáveis, não os valores.** Quem escreve `bg-surface` ganha o tema escuro
de graça; quem escreve `bg-[#fbf8f2]` cria um bug no Obsidiana.

---

## 1. Temas

São dois, e mais o "Automático":

| Tema           | Clima                                                         | Quando vale                                   |
| -------------- | ------------------------------------------------------------- | --------------------------------------------- |
| **Pergaminho** | papel envelhecido, couro vermelho-escuro, dourado nos detalhes | padrão; ou escolhido                          |
| **Obsidiana**  | preto com petróleo, verdete e prata                           | escolhido; ou "Automático" com o sistema escuro |

Como funciona:

- `apps/web/public/theme.js` roda no `<head>`, antes de qualquer pintura (a CSP não deixa script
  inline). Ele aplica a escolha salva (`localStorage['grimorio.tema']`) como `data-theme` no
  `<html>` e mantém `data-system-dark` no `<html>` enquanto o aparelho estiver no escuro, até se o
  sistema mudar com a página aberta.
- `styles/index.css` tem **um** bloco por tema. O escuro vale para
  `:root[data-system-dark]:not([data-theme])` e para `[data-theme='dark']`. Não existe cópia numa
  `@media (prefers-color-scheme)`: o teste `build/themes.test.ts` falha se alguém criar uma.
- A variante `dark:` do Tailwind segue a mesma regra. Use-a só para o que **não** dá para resolver
  com uma variável (trocar uma ilustração por outra, por exemplo).
- O seletor de tema mostra amostras com as cores reais: um `<span data-theme="…">` faz as variáveis
  daquele tema valerem só ali dentro.
- Sem JavaScript, o "Automático" fica no claro. É o único caso em que a preferência do sistema é
  ignorada.

### 1.1 Cores

Todas existem nos dois temas (o teste confere) e os pares de texto/fundo usados passam no
contraste AA da WCAG 2.1 (4,5:1 para texto; 3:1 para foco e bordas de campo).

| Variável          | Pergaminho | Obsidiana | Uso                                                        |
| ----------------- | ---------- | --------- | ---------------------------------------------------------- |
| `bg`              | `#f3ede2`  | `#090e10` | fundo da página                                            |
| `surface`         | `#fbf8f2`  | `#111a1d` | painéis, barra do site, diálogos                           |
| `surface-2`       | `#efe5d1`  | `#1a2a2f` | faixa de título dos painéis, hover de botões discretos     |
| `sunken`          | `#e9e0cf`  | `#1e2f33` | trilho das barras, interruptor desligado                   |
| `field`           | `#fffdf8`  | `#0e171a` | cartões e campos dentro de um painel                       |
| `border`          | `#d8ccb6`  | `#26383b` | borda padrão                                               |
| `border-soft`     | `#e2d6bf`  | `#1f3034` | divisórias internas                                        |
| `border-strong`   | `#9a7426`  | `#8c939c` | contorno de campos e botões secundários                    |
| `rule`            | `#d2be93`  | `#3a4a4e` | filete sob a barra do site e ornamentos                    |
| `text`            | `#2a1e18`  | `#e7ecec` | texto                                                      |
| `muted`           | `#6a5649`  | `#9fb0b0` | texto de apoio                                             |
| `accent`          | `#7a2e1e`  | `#5cc2ae` | ação principal, links, item ativo                          |
| `accent-hover`    | `#5e2216`  | `#7fd3c2` | hover da ação principal                                    |
| `accent-border`   | `#5e2216`  | `#3e9c8a` | borda do botão principal                                   |
| `accent-soft`     | `#f6ede6`  | `#12302e` | fundo de item marcado                                      |
| `accent-contrast` | `#fbf8f2`  | `#06100f` | texto sobre `accent`                                       |
| `gold`            | `#7d5e1c`  | `#b8bdc6` | rótulos em caixa-alta (`label-caps`)                       |
| `gold-soft`       | `#f6e9c8`  | `#1a2a2c` | fundo de destaques dourados                                |
| `ornament`        | `#b8913a`  | `#c7cbd3` | losangos, anéis, selos, borda de "isto se mexe"            |
| `seal` / `seal-line` | `#7a2e1e` / `#efd48e` | `#1e3e3f` / `#e7ecec` | o d20 da marca          |
| `success` / `success-soft` | `#2f6b3a` / `#e6eee3` | `#7cc98a` / `#132820` | cura, sucessos   |
| `danger` / `danger-soft`   | `#a3261f` / `#f7dcd9` | `#f08a80` / `#3b1c19` | dano, fracassos, erros |
| `focus`           | `#9a7426`  | `#5cc2ae` | contorno de foco do teclado                                |
| `die-1…10`, `die-face` | vermelhos | petróleos | faces do d20 ilustrado                              |
| `metal-1…4`       | dourados   | pratas    | arestas do d20 ilustrado                                   |
| `shadow`          | quase nada | um pouco mais escura | `shadow-card`                               |
| `accent-inset`    | dourado 30% | branco 25% | o brilho por dentro do botão principal (`inset-gleam`)   |

Sem degradê em cartões e fundos de painel: as superfícies são lisas. Degradês só aparecem nas
cenas ilustradas (carregamento e erros) e na arte da página inicial.

### 1.2 Cores das cenas

As ilustrações (carregamento, 404, 500, 403) usam variáveis próprias, `--sc-*`, definidas em
`styles/motion.css` na classe `gr-scene`, com um bloco para cada tema. Exemplos: `--sc-line`
(traço dos círculos), `--sc-glow` (brilho da rachadura do 500), `--sc-paper` (o mapa do 404),
`--sc-wax` (o lacre do 403), `--sc-backdrop` (a luz de petróleo do fundo no escuro, `none` no
claro) e `--sc-rule` (o filete sob o cabeçalho das cenas). Cor nova numa cena entra aqui, não
como `dark:fill-[#…]` no componente.

---

## 2. Letras

| Família          | Pesos         | Onde                                                                       |
| ---------------- | ------------- | -------------------------------------------------------------------------- |
| **Cinzel**       | 700           | títulos, nome do personagem, números grandes (CA, PV, modificadores), nomes de armas |
| **Alegreya Sans**| 400, 700      | todo o resto                                                               |

As duas vêm do próprio site, porque a CSP não deixa buscar fontes de fora: são recortes com o
alfabeto latino e a pontuação que usamos, sem "hinting", ~14 kB cada (`src/assets/fonts`, com o
LEIA-ME de como foram feitos). Só três arquivos, e o HTML já pede os três logo no começo
(`preload`): o texto não espera o CSS para começar a baixar a fonte. Pesos intermediários
(`font-medium`, `font-semibold`) caem no peso carregado mais próximo. Números usam algarismos
alinhados (`lining-nums`) e, em colunas, `tabular`.

Escala (só o que mudou em relação ao Tailwind):

| Classe        | Tamanho / entrelinha | Uso                                          |
| ------------- | -------------------- | -------------------------------------------- |
| `text-xs`     | 13 px / 1,4          | legendas, dicas, rótulos                     |
| `text-sm`     | 15 px / 1,45         | botões, abas, texto de apoio                 |
| `text-base`   | 16 px                | corpo                                        |
| `label-caps`  | 13 px, negrito, caixa-alta, espaçamento 0,14em, cor `gold` | títulos de painel e rótulos de número |

Títulos de tela usam Cinzel entre 1,5 e 3,3 rem (o título das cenas é fluido:
`clamp(2.1rem, 4.2vw, 3.3rem)`). Evite tamanhos novos: se precisar, use os da escala.

---

## 3. Forma

- **Cantos:** 6 px em campos pequenos, 8 px (`rounded-lg`) em botões, 10 px em cartões e caixas de
  número, 12 px (`rounded-xl`) em painéis.
- **Bordas:** 1 px. Caixas que rolam um dado (modificador de atributo, Percepção passiva) têm
  1,5 px na cor `ornament`: a borda dourada/prateada diz "toque aqui para rolar".
- **Sombra:** só `shadow-card` (quase imperceptível). Profundidade vem de borda e de cor de
  superfície, não de sombra.
- **Brilho do botão principal:** `inset-gleam`, uma linha de luz por dentro da borda.
- **Alvo de toque:** no mínimo 44 × 44 px (`size-11`, `min-h-11`) em tudo que se toca no celular.

---

## 4. Componentes

| Componente | Arquivo | Variantes / props | Observações |
| --- | --- | --- | --- |
| Botão | `components/ui/button.tsx` | `primary`, `outline` (padrão), `ghost`, `subtle`, `danger`, `success`, `link`; tamanhos `sm` 36 px, `md` 40 px, `lg` 48 px, `icon`, `icon-sm` | desabilitado: 50% de opacidade; o principal desabilitado vira cinza em vez de transparente |
| Painel | `components/ui/panel.tsx` | `title`, `actions`, `className`, `bodyClassName` | faixa de título em `surface-2` com losango e `label-caps`; corpo em `surface` |
| Campo | `components/ui/input.tsx` | `fieldClass`, `Label` | 40 px de altura, fundo `field`, borda `border-strong`, sombra interna leve; rótulo em `text-xs` negrito `muted` |
| Marca e dados | `components/ui/d20-icon.tsx` | `BrandMark`, `D20Icon`, `D20Die`, `Diamond`, `D20Facets` | o d20 desenhado à mão do guia de estilo; `D20Die` é o dado ilustrado com faces `die-*` e arestas `metal-*` |
| Ícones de traço | `components/ui/stroke-icon.tsx` | `StrokeIcon name="…"` | os ícones do quadro que não existem no Lucide (escudo, raio, pegadas, pergaminho…) |
| Ornamento | `components/ui/ornament.tsx` | — | filete com losango no meio |
| Avatar | `features/auth/Avatar.tsx` | `ringed` | só a inicial; com anel dourado quando é a conta logada |
| Tema | `features/theme/ThemePicker.tsx` | `ThemePicker` (barra), `ThemeOptions` (menus) | grupo de rádio do navegador: as setas trocam o tema |
| Proficiência | `features/sheet/components/ProficiencyToggle.tsx` | `ProficiencyDot`, `ProficiencyToggle` | vazio → proficiente (cheio) → especialista (cheio com anel `ornament`) |
| Interruptor | `components/ui/switch-track.tsx` | `SwitchTrack on check` | o desenho (trilho e bolinha) dentro de um `<button role="switch">`; a bolinha anda com `transform` |

---

## 5. Telas

### 5.1 Barra do site

Fixa no topo (`sticky`, 64 px), fundo `surface`, filete `rule` embaixo.

- Esquerda: marca (d20 + "GRIMÓRIO" em Cinzel).
- Centro: navegação em pílula (Fichas, Campanhas, Dados); o item ativo fica em `accent` com texto
  `accent-contrast`.
- Direita: ajuda, paleta (tema) e a conta.
- **Celular, visitante:** a navegação e a paleta vão para o menu ☰ (`nav.menu`), que também traz
  as opções de tema.
- **Celular, logado:** a navegação fica no meio da barra (mais estreita) e o tema e a ajuda passam
  para o balão da conta.

### 5.2 Página inicial (visitante)

Pré-renderizada por inteiro (boa para busca, abre com o texto já na tela).

1. **Abertura:** título, frase, "Criar personagem" (principal) e "Primeiros passos" (contorno),
   selos do que o site faz e, à direita, a arte animada: círculo arcano girando devagar, o d20
   flutuando e brilhos.
2. **Prévias:** cartões mostrando o assistente, o subir de nível, a rolagem de dados e o "de onde
   vem este número". São desenhos estáticos feitos com os componentes reais, não capturas de tela.
3. Rodapé.

No celular a arte vai para cima do texto e as prévias viram uma coluna.

### 5.3 Painel (quem entrou)

`features/home/Dashboard.tsx`, carregado sob demanda: o visitante não baixa nada disto.
Enquanto a sessão é conferida, aparece o carregamento dentro da página (o d20 rolando).

- **Continuar:** a última ficha aberta, com selo, nome, "Espécie · Classe · Nível", CA, PV com
  barra e, se estiver numa campanha, "X está na mesa".
- **Rolagem rápida:** d4…d20 e d100 com o desenho de cada dado; o resultado aparece no próprio
  painel.
- **Personagens:** até 6, cada um com selo colorido e CA/PV. Sem personagem, o painel convida a
  criar o primeiro.
- **Campanhas:** as mesas da conta.
- **Dica:** uma dica do jogo, sorteada.

No celular os blocos empilham, e os atalhos de dados ficam numa grade de 7 colunas a partir de
420 px.

CA e PV de cada personagem vêm do campo `card` da lista de personagens da API. Se a API ainda
não manda esse campo, o cartão mostra só nome e nível.

### 5.4 Ficha

`features/sheet/SheetPage.tsx`. Duas linhas no computador (larguras 2:1, com quebra automática
abaixo de ~1190 px):

| Linha | Coluna larga | Coluna estreita |
| --- | --- | --- |
| 1 | **Atributos, salvaguardas e perícias**: seis cartões; em cada um, o modificador (rola), o nome, o valor (editável), a salvaguarda em itálico sobre fundo dourado claro e as perícias daquele atributo em ordem alfabética. Embaixo, a legenda dos marcadores e a Percepção passiva. | **Combate** (CA, Iniciativa, Deslocamento, Inspiração Heroica, Pontos de Vida, Dados de Vida, descansos) e **Salvaguardas contra Morte** |
| 2 | **Ações**: abas Armas, Magias, Inventário e Características, busca e, em Armas, a tabela (arma, propriedades, crítico, acerto, dano) | **Habilidades e efeitos** (usos por descanso, liga/desliga, efeitos em você) |

Acima de tudo, a **faixa de identidade**: retrato com a inicial, nome (abre a edição), onde está
salva, classe/espécie/antecedente/jogador, nível com "Subir de nível", proficiência e o menu "…"
(editar dados; na ficha do navegador, carregar exemplo e começar outra). Classe, espécie e o resto
ficam entre o nome e o nível quando a faixa tem ~1290 px ou mais (consulta de contêiner,
`@min-[1290px]`); abaixo disso descem para uma linha só delas, em vez de quebrar no meio.

Regras de interação:

- **O nome rola, o número explica.** Tocar no nome de uma perícia rola o d20 com o bônus; tocar
  no número abre "de onde vem" (atributo + proficiência + efeitos).
- O d20 pequeno aparece ao passar o mouse (no toque, sempre) para dizer "isto rola".
- Vantagem/desvantagem aparecem como selo ao lado do nome e trocam o d20 por 2d20.
- O ataque já leva os dados extras (Bênção: +1d4). Crítico mostra "20" ou "19–20".

No celular as três colunas viram abas (Personagem, Combate, Ações) presas abaixo da barra do
site, com troca por gesto de deslizar. A faixa de identidade vira: retrato e nome com o "…" no
canto, dados em duas colunas e, embaixo, nível e proficiência lado a lado. Na tabela de armas o
cabeçalho some e o crítico leva o próprio rótulo; os botões de acerto e dano ocupam a largura.

### 5.5 Carregamento e erros

Telas inteiras, com cabeçalho próprio (sem a barra do site) e fundo de papel com fibras
(Pergaminho) ou petróleo com estrelas e grão prateado (Obsidiana). Classe base: `SCENE` em
`features/screens/scene.tsx`.

| Tela | Arte | Texto e ações |
| --- | --- | --- |
| **Carregamento** | d20 lançado sobre um círculo arcano em camadas que giram em sentidos opostos; sombra que acompanha o pulo; ondas no chão | frase do jogo sorteada; o losango corre no filete |
| **404** | mapa rasgado com trilha pontilhada que anda, bússola, pedaço solto flutuando e um d20 com "1" | "Esta página não está no mapa"; Voltar ao início, Rolar de novo (o dado gira e o texto comenta o novo resultado), Ver minhas fichas |
| **500** | círculo partido que treme, rachadura brilhando, runas falhando, fumaça e faíscas | "A magia saiu pela culatra"; Tentar de novo, Avisar sobre o problema e o código do erro |
| **403** | pergaminho lacrado balançando, brilho passando no lacre | "Esta parte é só do Mestre"; Ver resumo da ficha, Voltar à campanha |

O carregamento só aparece se demorar mais de 0,35 s, para carregamentos rápidos não piscarem. O
500 fica no pacote principal (precisa aparecer até quando um pedaço do site não baixou).

---

## 6. Movimento

Tudo em `styles/motion.css`. Com "reduzir movimento" ligado no sistema, todas as animações rodam
uma vez só, sem duração (regra em `index.css`), e o que só aparece animado (fumaça, faíscas) fica
parado à vista.

Para ficar leve no celular, a regra é **animar a camada, não o desenho**:

- O que se mexe é uma camada inteira, só com `transform` e `opacity`, que o navegador move pronta,
  sem redesenhar. Peças pequenas de uma ilustração viram `ArtLayer` (`features/screens/scene.tsx`):
  um `<div>` posicionado em porcentagem por cima do desenho, com um `<svg>` nas mesmas coordenadas.
  A animação vai no `<div>`: deslocar o próprio `<svg>` faz o Chrome recalcular a página a cada
  quadro.
- Filtro (sombra, brilho, desfoque) nunca vai em algo que se mexe. Ou fica dentro da camada,
  desenhado uma vez (a sombra do pergaminho, o brilho da rachadura), ou vira uma camada parada por
  baixo (o brilho dos anéis do carregamento), ou um degradê redondo que gira junto sem mudar de
  cara (o d20 lançado).
- O fundo das cenas (fibras do papel, grão prateado) é ruído caro: cada um tem a própria camada
  (`will-change-transform`) e é desenhado uma vez só. As estrelas, que cobrem a tela, cintilam em
  degraus (quatro por segundo).
- O traço que anda (trilha do 404, traço do carregamento) muda o desenho a cada quadro: fica numa
  camada própria, separada do que é caro.
- A face do d20 e a frase do carregamento trocam no meio do lançamento, seguindo o próprio ciclo
  da animação (`animationiteration`), então nunca saem do compasso.

Conferência (Chrome com a CPU 4× mais lenta): todas as cenas ficaram entre 50 e 60 quadros por
segundo, sem recalcular a página a cada quadro.

| Elemento | Quando | Animação | Duração | Curva |
| --- | --- | --- | --- | --- |
| Tela de carregamento | ao aparecer | surge (opacidade) | 0,3 s, após 0,35 s | ease-out |
| d20 do carregamento | sempre | lançado e cai girando; sombra cresce e encolhe junto | 2,4 s | cubic-bezier(.45,.05,.35,1) |
| Círculos arcanos | sempre | giram (60 s, 28 s, 16 s inverso, 40 s inverso); órbita 4,8 s; varredura 3,6 s | — | linear |
| Glifos e estrelas | sempre | cintilam entre `--lo` e `--hi` | 2,4–4 s | ease-in-out |
| Frase e resultados | ao trocar | sobem 6 px e aparecem | 0,5 s | ease-out |
| Losango do filete | sempre | vai e volta | 2,4 s | ease-in-out |
| Arte da página inicial | sempre | círculo 90 s e 60 s inverso; d20 flutua | 4,8 s | ease-in-out |
| d20 pequeno (carregando dentro da página) | sempre | rola com leve encolhida | 1,8 s | cubic-bezier(.5,.1,.3,1) |
| Trilha do 404 | sempre | tracejado anda | 1,4 s | linear |
| d20 do 404 | "Rolar de novo" | gira rápido | 0,3 s por volta | linear |
| Círculo do 500 | sempre | treme em rajadas | 4 s | ease-in-out |
| Pergaminho do 403 | sempre | balança 1,2° | 6 s | ease-in-out |
| Resultado de dado | ao rolar | "pula" e assenta | 0,45 s | cubic-bezier(.2,.8,.2,1) |

---

## 7. Tamanhos de tela

| Faixa | O que muda |
| --- | --- |
| < 640 px (`sm`) | abas da ficha só com ícone (o nome continua para leitores de tela) |
| < 768 px (`md`) | barra do site compacta; ficha em abas; faixa de identidade em grade; tabela de armas sem cabeçalho |
| 768–1190 px | colunas da ficha empilham (larga em cima, estreita embaixo) |
| > 1190 px | ficha em duas colunas, 2:1 |

---

## 8. Casos de borda

- **Nome longo:** corta com reticências em uma linha (nome do personagem, nomes de arma). O nome
  completo continua no título da página e na edição.
- **Origem fora do padrão:** o assistente grava "Antecedente · Espécie". Texto livre aparece
  inteiro como "Origem".
- **Ficha vazia:** a ficha em branco mostra o convite para o assistente; listas vazias dizem o que
  fazer ("Nenhuma arma ainda. Use o + para adicionar.").
- **Sem perícia:** Constituição mostra "Nenhuma perícia usa Constituição."
- **Conexão lenta:** carregamento só depois de 0,35 s; o aviso de servidor acordando continua
  valendo para a API. Listas da conta (personagens, campanhas) mostram o d20 rolando enquanto
  carregam.
- **Ficha de outra pessoa:** 403 ilustrado, sem a barra do site.

---

## 9. Acessibilidade

- **Contraste:** AA nos dois temas, conferido por teste a cada build.
- **Foco:** contorno de 2 px na cor `focus`, afastado 2 px, em tudo que recebe foco.
- **Teclado:** o seletor de tema abre no tema marcado e as setas trocam; Esc fecha e devolve o
  foco ao botão. As abas de Ações (Armas, Magias…) andam com as setas; as abas de colunas do
  celular são botões comuns com `role="tab"`.
- **Leitores de tela:** salvaguardas são `checkbox`; perícias têm rótulo "Nome: estado" e o
  marcador é decorativo. Botões só com ícone têm `aria-label` (e `title`). Ilustrações das cenas
  são `aria-hidden`.
- **Movimento:** "reduzir movimento" desliga as animações.
- **Toque:** alvos de 44 px no mínimo.

---

## 10. Peso

Orçamentos em `apps/web/.size-limit.mjs` (gzip): JS inicial até 200 kB, CSS inicial até 15 kB,
ficha até 120 kB. Para manter o CSS no limite:

- Prefira as variáveis e a escala de tamanhos; cada valor solto (`h-[37px]`) vira uma regra a mais.
- Cor de cena vai para `--sc-*`, não para `dark:`.
- Nada de `backdrop-blur`: custa caro ao rolar no celular e puxa um bloco inteiro de CSS. Fundo
  liso (`bg-surface`) resolve.
- Palavras do código que o Tailwind confundia com classes estão listadas no `@source not inline`
  do `index.css`. Se o build passar a gerar uma classe que ninguém usa, entra ali.

O Lighthouse do CI (celular em 4G lenta, simulado) cobra LCP de até 2,5 s em `/` e `/dados`. O
que pesou com o visual novo, e o que resolveu:

- **Fontes:** só três arquivos recortados (~14 kB cada) e pedidos já no HTML (`preload`).
- **Número de pedidos:** o teste simula HTTP/1.1, com seis conexões; vinte arquivos pequenos
  custam mais do que um maior. Os grupos de `vite.config.ts` juntam as peças de interface usadas
  em quase toda página (`ui`) e o rolador de dados (`dice`).
- **Só o que a página usa:** os textos da ficha ficam em `lib/i18n/sheet.pt-BR.ts` (como os do
  assistente), o editor de atalho e a 404 baixam sob demanda, e o rolador confere os atalhos
  salvos sem o Zod.
- **O maior texto já no HTML:** o título e a frase do rolador (`DiceIntro`) ficam fora da parte
  carregada sob demanda; enquanto o resto chega, só o d20 rolando embaixo deles.

Resultado no teste local: LCP de `/dados` ~2,3 s (era 2,4 s antes do visual novo) e de `/`
~2,2 s.
