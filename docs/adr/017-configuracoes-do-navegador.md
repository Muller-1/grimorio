# ADR-017 — Configurações deste navegador

- **Status:** aceito
- **Data:** 2026-11-03

## Contexto

As preferências estavam espalhadas: o tema na paleta da barra, uma caixa "Animação" solta no
painel "Última rolagem" (que só valia para os dados) e nenhuma forma de apagar o que o site
guarda sem ir nas configurações do navegador, como dizia a página de Privacidade. As outras
animações do site (telas de carregamento e de erro, brilho do assistente) só paravam com o
"reduzir movimento" do sistema.

O menu da conta também repetia "Meus personagens", que a aba Fichas já abre.

## Decisões

1. **Uma página `/configuracoes`**, carregada sob demanda e fora do Google (`index: false`).
   Três painéis: Conforto (tema, animações, fonte), Dados (botão flutuante) e Seus dados
   (exportar e apagar). Quem entrou chega nela pelo menu da conta; quem não entrou, pela
   engrenagem da barra (no celular, pelo menu ☰).

2. **Tudo vale só neste navegador.** Nada vai para a conta: quem quer o site parado no celular
   pode querer as animações no computador. As chaves ficam com o prefixo `grimorio.`, como as
   outras.

3. **Animações: Ligadas (padrão) ou Desligadas**, para o site inteiro. Foram pensados três níveis
   (com um "Reduzidas" que manteria as transições curtas), mas dois são mais fáceis de entender.
   Desligadas para animações e transições, a mesma regra que já valia para o "reduzir movimento"
   do sistema. Sem escolha, o site segue o sistema; escolher "Ligadas" vale mesmo com o sistema
   pedindo menos. A escolha vira `data-motion` no `<html>`, aplicado pelo `public/theme.js` antes
   de a página aparecer; o CSS, as variantes `motion-reduce:`/`motion-safe:` e o código que anima
   sozinho (`motionOff()`, `useMotion()` em `lib/preferences.ts`) leem a mesma coisa. O resultado
   dos dados só anima com as animações ligadas.

4. **A caixa "Animação" antiga sai.** Quem a tinha desmarcado (`grimorio.dados.animacao = 0`)
   começa com as animações desligadas; o `theme.js` faz a troca uma vez e apaga a chave antiga.

5. **Fonte "Mais legível": Atkinson Hyperlegible** (Braille Institute, SIL OFL 1.1), no texto e
   nos títulos, por `data-font` no `<html>`. Foi escolhida em vez da fonte do sistema porque foi
   desenhada para baixa visão (letras parecidas como I, l e 1 ficam bem diferentes). O recorte é
   o mesmo das outras fontes, ~10 kB por peso, e fica fora do `preload`: só baixa para quem
   escolhe ou abre as Configurações.

6. **Botão flutuante de dados da ficha pode ser desligado.** Ligado por padrão; desligado, a
   ficha não carrega o pedaço dele. As rolagens da ficha continuam iguais.

7. **Exportar e apagar olham só para as chaves `grimorio.`.** Exportar baixa um `.json`
   (`site`, `formato: 1`, `exportadoEm`, `dados`, com o JSON de cada chave aberto para dar para
   ler; o que não é objeto nem lista fica como texto) sem passar pelo servidor. Apagar abre uma
   janela que lista o que some e avisa que não dá para desfazer; depois recarrega a página, para
   nada que estava na memória voltar a ser salvo. **A cópia das fichas da conta (`grimorio.conta.`)
   não é apagada:** ela pode ter uma edição ainda não enviada, e já sai quando a pessoa clica em
   Sair. Importar fica para depois; o `formato` existe para isso.

8. **Menu da conta:** sai "Meus personagens"; entram Primeiros passos, Configurações e as opções
   de tema, no computador também. Com a conta, a barra fica só com o avatar.

9. **Regras da casa não entram aqui.** Elas são da ficha ou da mesa (criação de ficha e campanha)
   e ficam para quando essas telas ganharem opções de regra.
