# ADR-014 — Campanha, parte 1 (e conjurar com um toque)

- **Status:** aceito
- **Data:** 2026-10-22

## Contexto

O plano de escala (`docs/plano-escala-e-campanha.md`) deixou a campanha como o próximo passo
grande, com as decisões de 22/10: os outros jogadores veem só um resumo da ficha, a mestre vê
tudo e mexe no estado de jogo, e a cura entre jogadores vai por proposta que a dona aceita. O
problema central é a concorrência: a mestre aplica dano na mesma hora em que a jogadora gasta um
espaço de magia, e hoje as duas mudanças disputam a mesma seção da ficha.

Junto, três ajustes na aba Magias que vieram de uso real: o Conjurar já rolar o dado, o "Em mim"
só aparecer quando faz sentido e um atalho para conjurar com a carta fechada.

## Decisões

### Magias

1. **Conjurar gasta o espaço e já rola o dado da magia** (`spells/data/targeting.ts`,
   `castRoll`): o ataque de magia (com Bênção e Vantagem/Desvantagem, igual às armas, via
   `derived.spellAttack`); o dano das magias com salvaguarda (o toast mostra a CD) e das que
   acertam sempre (Mísseis Mágicos, Destruição Divina); a cura; os PV temporários. O dano das
   magias de ataque continua num botão à parte, porque depende do acerto.
2. **"Em mim" só em magia que ajuda ou cura e aceita você como alvo** (`spellTarget`): alcance
   Pessoal e o dano extra da Danação/Marca do Predador ficam sempre em você (ligam sozinhos);
   ataques e o Vínculo de Proteção ("outra criatura") não perguntam. Virou uma escolha
   "Em outro / Em mim"; curar em você aplica a cura na ficha.
3. **Atalho no cabeçalho da magia**, na cor do Conjurar (também gasta espaço), com o d20 quando
   rola algo.

### Campanha

4. **Canal de ações** (`POST /characters/:id/actions`): mudanças relativas (dano, cura, PV
   temporários, condição, Exaustão), aplicadas no servidor com o mesmo motor do site
   (`@grimorio/rules/campaign`). A linha da ficha é travada (`FOR UPDATE`) e cada ação traz um
   id gerado no aparelho; a tabela `character_events` não aceita o mesmo id duas vezes na mesma
   ficha. `set-condition` diz o estado desejado (não "alterna"): duas pessoas marcando
   Envenenado não se anulam.
5. **A ficha da dona acompanha a mesa**: enquanto a ficha da conta está numa campanha, ela
   pergunta `GET /characters/:id/updates?after=N` a cada 10 s (30 s com a aba escondida).
   Chegando ações de outra pessoa, elas são **reaplicadas sobre o que está na tela**
   (`withRemote`); se o servidor acusar conflito ao salvar, a ficha busca as ações e tenta de
   novo sozinha. A escolha "qual versão fica" só aparece quando os dois lados mudaram a mesma
   seção por outro caminho (dois aparelhos da dona), como antes.
6. **Papéis no servidor**: dona e mestre usam o canal de ações; outro jogador recebe 404. A
   mestre não edita seções (atributos, magias), só o estado de jogo.
7. **Resumo da mesa** (`GET /campaigns/:id/party`): montado no servidor com seis campos (nome,
   classe, nível, CA, PV, condições); um teste falha se aparecer um campo a mais.
8. **Propostas de cura**: o jogador propõe, a ficha não muda; a dona aceita (vira uma ação com
   o id da proposta: dois cliques aplicam uma vez) ou recusa. Até 10 pendentes por ficha, vencem
   em 24 h, e deixam de valer se a ficha sair da mesa.
9. **Convite por link** com código aleatório que vence em 7 dias (a mestre gera outro e o
   anterior para de funcionar); até 12 pessoas por mesa e 10 campanhas por conta; uma ficha fica
   em uma campanha só.
10. **Limite de pedidos** nas rotas de escrita (`plugins/rate-limit.ts`): 120 por minuto por IP,
    20 tentativas de convite por hora e 30 propostas a cada 10 min. Janela fixa na memória, que
    serve para uma instância (hoje é uma).
11. **Telas**: `/campanhas` (lista, criar, entrar pelo link) e `/campanha?id=…` (a mesa com o
    resumo de cada ficha, ações da mestre, propor cura, convite, pôr a própria ficha); a aba
    Campanha do topo passa a funcionar quando o site tem contas. A política de privacidade
    explica o que cada papel vê.
12. **Tamanho**: o indicador de salvamento saiu do pedaço da ficha (a ficha da conta o passa
    pronto), o que abriu espaço; a campanha e as regras dela ficam em pedaços próprios
    (`@grimorio/shared/campaign`, `@grimorio/rules/campaign`).

## Banco

Migração `0002_campanhas.sql`, só acrescenta: `campaigns`, `campaign_members`,
`campaign_characters`, `character_events`, `action_proposals`, com os índices do plano.

## Testes

- Integração: 20 ações ao mesmo tempo na mesma ficha (todas valem, uma vez cada); reenvio do
  mesmo id; dano da mestre + seção salva pela dona; condição marcada duas vezes; permissões;
  eventos depois da versão N; contrato do resumo; propostas (aceitar duas vezes, recusar,
  vencer, limite, sair da mesa); 429 com `Retry-After`.
- Unidade: ações da campanha (ordem do dano não importa), resumo, junção na tela (dano da
  mestre + espaço gasto pela jogadora ficam os dois).
- Bot: Clérigo com Raio Guia conjurado pelo atalho (gasta o espaço e rola o ataque) e Curar
  Ferimentos "Em mim".
- Conferido à mão com três navegadores (mestre, dona e outra jogadora): dano da mestre e dano
  da dona no mesmo instante somam sem pedir nada; a cura proposta aparece na ficha da dona e,
  aceita, soma.

## Fica para a parte 2

Sala em tempo real (Durable Objects) no lugar da consulta a cada 10 s, rolagens da campanha no
servidor, histórico visível e "desfazer", a mestre abrir a ficha inteira pela mesa, e um cenário
do bot com a API ligada no CI.
