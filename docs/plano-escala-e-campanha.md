# Plano: escala, campanha com várias pessoas e "site profissional"

- **Data:** 2026-10-22 (objetivo: planejar melhor a escalabilidade, a concorrência — principalmente
  na campanha, onde várias pessoas poderão acessar a mesma ficha — e outras especificações de
  sites mais profissionais; **só planejamento**).
- **Situação:** nada daqui foi implementado, exceto o que está marcado como _feito_. A base
  continua a do plano técnico v2 (seções 6, 10, 11 e 15); este documento diz **o que muda com o
  que aprendemos** desde então e **em que ordem** fazer.
- **Atualização (22/10, manhã):** ficaram decididos **o que os outros jogadores veem da ficha** e
  **como funciona a cura entre jogadores** (seções 2.2, 2.3 e 2.5); o domínio **`grimorio.net.br`**
  foi comprado (decisão #3; passo a passo na seção 4.1); e a plataforma de apoio será o
  **Apoia.se** (decisão #2; a página fica para depois).
- Decisões que dependem de você estão marcadas com **(decisão)**; as já tomadas aparecem como
  **(decidido em 22/10)**.

## 1. Onde estamos (out/2026)

| Peça       | Hoje                                                         | Limite que importa                                                                                                     |
| ---------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Site       | Cloudflare Workers (arquivos estáticos + repasse de `/api`)  | Praticamente sem limite para arquivos; o Worker só roda em `/api/*` (100 mil pedidos/dia no plano grátis).            |
| API        | Render, plano grátis, 1 instância Node (Fastify)             | **Dorme após 15 min sem uso** e leva até ~1 min para acordar. Uma instância só.                                        |
| Banco      | Neon (Postgres), plano grátis                                | Pouco espaço (0,5 GB) e horas de processamento contadas; o banco também "dorme" sem uso (acorda em segundos).          |
| Ficha      | 1 linha por personagem; a ficha inteira em JSONB             | Salva **por seção** com revisão (`section_revs`): duas abas mexendo na mesma seção → aviso de conflito. Linha travada (`FOR UPDATE`) durante o salvamento. |
| Login      | Google (Better Auth), sessão por cookie no mesmo endereço     | Beta fechado (lista de e-mails) — **não muda agora**.                                                                  |

Endereço: hoje o site responde em `grimorio.gustavomullercavalheiro2.workers.dev`; o domínio
`grimorio.net.br` já foi comprado, **mas ainda não está ligado** ao site (seção 4.1).

Isso aguenta com folga o grupo de teste e algumas centenas de pessoas usando a ficha sozinhas.
O que **não** aguenta bem: (1) a primeira pessoa do dia esperar o servidor acordar; (2) várias
pessoas mexendo na **mesma** ficha ao mesmo tempo (a campanha); (3) fotos dentro da ficha
(engordam o banco).

## 2. Concorrência na campanha (o ponto principal)

### 2.1 O problema, com um exemplo

Mesa com a mestre e 4 jogadores. A mestre aplica **7 de dano** na Kaela; no mesmo segundo, a
jogadora da Kaela gasta **um espaço de magia**. Hoje as duas coisas mexem na seção `state` da
mesma ficha: quem salva depois recebe "esta ficha mudou em outro aparelho" e tem de escolher uma
versão — e uma das duas mudanças se perde. Numa sessão de jogo isso acontece toda hora.

### 2.2 A regra: valores absolutos por seção, **ações** para o que muda em jogo

O plano v2 (10.2) já previa dois canais; a campanha é o momento de criar o segundo — e um
terceiro, bem pequeno, para a cura entre jogadores (decidido em 22/10):

| Canal                  | Exemplo                                              | Como resolve a concorrência                                                                                                     |
| ---------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Seções** (já existe) | nome, atributos, notas, magias escolhidas            | Quem edita é quase sempre uma pessoa só. Conflito → a tela atual de escolha (já pronta).                                        |
| **Ações** (novo)       | "dano 7", "cura 4", "gastar espaço de 1º círculo", "condição Envenenado", "descanso longo", "+12 PO" | São **mudanças relativas**: o servidor aplica uma depois da outra, na ordem em que chegam. Não há conflito: dano 7 + espaço gasto = as duas coisas acontecem. |
| **Propostas** (novo)   | outro jogador quer "curar 5 PV" na ficha da Kaela    | **Não mudam a ficha.** Ficam pendentes até a dona aceitar; ao aceitar, viram uma ação normal do canal acima.                     |

Detalhes do canal de ações:

- `POST /api/v1/characters/:id/actions` com até 50 ações por pedido, cada uma com um
  **`actionId` gerado no aparelho** (UUID). Reenviar o mesmo pedido (internet ruim) não aplica
  duas vezes: a tabela de eventos tem `(character_id, action_id)` único.
- O servidor trava a linha da ficha (`SELECT … FOR UPDATE`, como já faz hoje), aplica as ações
  com o mesmo motor de regras do site (`@grimorio/rules`), grava, sobe a **versão** da ficha e
  devolve o estado novo. Uma ficha = uma fila: nunca dois salvamentos ao mesmo tempo na mesma
  linha. Fichas diferentes não se travam entre si.
- O aparelho aplica a ação na hora (otimista) e guarda numa fila; se o servidor recusar (ex.:
  não há espaço de magia), desfaz e avisa.
- **Tabela `character_events`** (plano v2, 11.2): `id`, `character_id`, `action_id` (único por
  ficha), `actor_id` (quem fez: a jogadora ou a mestre), `approved_by` (só quando a ação veio de
  uma proposta aceita: a dona), `action` (JSONB), `version`, `created_at`. Serve para: não aplicar
  duas vezes; mostrar o **histórico** ("a mestre aplicou 7 de dano às 21h14"); **desfazer** a
  última ação; e deixar um aparelho atrasado **se atualizar** pedindo "eventos depois da versão
  N" em vez da ficha inteira.
- Eventos antigos podem ser resumidos/apagados depois de X dias (a ficha guarda o estado
  final; o histórico é só conveniência).

Detalhes do canal de propostas **(decidido em 22/10: um jogador não altera a ficha de outro
direto; envia uma ação "curar 5 PV" e a dona aceita, ou a mestre aplica)**:

- `POST /api/v1/characters/:id/proposals` — só para quem é **jogador da mesma campanha** da
  ficha, e nunca para a própria ficha (a dona usa o canal de ações). Cada proposta traz um
  **`proposalId`** (UUID gerado no aparelho, para reenvio seguro), a ação e uma nota opcional.
- **Nesta versão só existe a proposta de cura** (`heal` com valor inteiro positivo, com teto).
  Dano, condições, recursos e descansos continuam só com a dona e a mestre.
- **Tabela `action_proposals`**: `id` (= `proposalId`), `character_id`, `proposer_id`, `action`
  (JSONB), `status` (`pending`, `accepted`, `rejected` ou `expired`), `created_at`,
  `decided_at`, `decided_by`.
- A dona vê as pendentes na própria ficha (aviso + "Aceitar" / "Recusar"). **Aceitar** =
  o servidor trava a ficha e aplica a cura como ação normal, com `action_id` igual ao
  `proposalId`: aceitar duas vezes (dois cliques, duas abas) aplica **uma vez**. O evento grava
  `actor_id` = quem propôs e `approved_by` = a dona.
- **A mestre não precisa de proposta:** ela aplica a ação direto pelo canal de ações (aparece
  "pela mestre" no histórico).
- Histórico legível: "Duda curou 5 PV (aceito por Kaela) às 21h14".
- Proteções: no máximo **10 pendentes por ficha** (**decisão** pequena, sugestão); proposta
  pendente expira em **24 h** (**decisão** pequena, sugestão); se a ficha sai da campanha, as
  pendentes viram `expired`.

### 2.3 Quem pode o quê (papéis) — decidido em 22/10

| Ação                                              | Dona da ficha | Mestre da campanha            | Outro jogador da mesa       |
| ------------------------------------------------- | ------------- | ----------------------------- | --------------------------- |
| Ver a ficha inteira                               | sim           | **sim**                       | **não** — só o **resumo**: nome, classe, nível, CA, PV e condições |
| Editar seções (atributos, magias, notas…)         | sim           | não (só sugere)               | não                         |
| Ações de jogo (dano, cura, condição, recursos)    | sim           | sim (aparece "pela mestre")   | não, direto                 |
| **Propor cura** na ficha de outro jogador         | —             | — (aplica a ação direto)      | **sim** (a dona decide)     |
| Aceitar ou recusar uma proposta                   | sim           | não (se quiser, aplica a ação direto) | não                 |
| Tirar a ficha da campanha                         | sim           | sim                           | não                         |

- A permissão é conferida **no servidor**, a cada pedido (o site só esconde botões). Ficha de
  outra pessoa sem permissão responde 404, como hoje.
- **O resumo é montado no servidor** (`GET /api/v1/campaigns/:id/party`): a resposta contém
  **apenas os seis campos** do resumo. O resto da ficha nunca sai do servidor para outro
  jogador, nem para quem abrir as ferramentas do navegador.
- **Transparência:** a tela de convite da campanha avisa "a mestre poderá ver a ficha inteira
  dos personagens que entrarem" e o que os outros jogadores veem (o resumo).
- Padrão adotado: a mestre mexe no **estado de jogo** (ações), não na **construção** da ficha
  (seções). **(decisão, só se quiser mudar):** deixar a mestre editar seções também.
- Tabelas: `campaigns` (dona = mestre), `campaign_members` (papel `dm` ou `player`, convite por
  link com validade), `campaign_characters` (que ficha está em que campanha). Estão no plano v2,
  11.2.
- Se a mestre excluir a conta, a campanha passa para outra pessoa com papel `dm` ou fica
  arquivada; nunca some em silêncio (plano v2, 11.3).

### 2.4 Tempo real: como os outros veem a mudança

Em ordem do mais simples para o mais completo. A ideia é **começar pelo 1** e só passar para o
2 quando o 1 incomodar.

1. **Consulta periódica (polling) com versão.** A tela da campanha pergunta a cada 5–10 s
   "tem algo depois da versão N?" (`GET …/events?after=N`). Resposta vazia é barata. Simples,
   funciona com a infraestrutura de hoje, e enquanto alguém está na tela da campanha a API não
   dorme. Para 100 mesas de 6 pessoas: ~60–120 pedidos/s no pior caso — aguenta numa instância
   paga pequena; no plano grátis, não.
2. **Uma "sala" por campanha na Cloudflare (Durable Objects + WebSocket).** Cada campanha vira
   um objeto na Cloudflare que mantém as conexões abertas dos participantes e repassa os
   eventos na hora. O Postgres continua sendo **a verdade**: a API grava a ação e, depois de
   gravar, avisa a sala, que repassa a todos. Se a conexão cair, o aparelho volta para o
   "eventos depois da versão N". Combina com o que já usamos (Worker na frente de tudo); as
   conexões em espera quase não custam (modo "hibernação"). **Conferir na época** o que o plano
   grátis inclui.
3. Alternativa sem Cloudflare: WebSocket direto na API (Render) com Postgres `LISTEN/NOTIFY`
   para avisar entre instâncias. Exige API sempre ligada e complica com mais de uma instância.

**Rolagens da campanha** são feitas **no servidor** (ninguém "rola de novo" escondido), gravadas
em `campaign_rolls` e repassadas pelo mesmo canal; rolagem "só para a mestre" existe
(`visibility`).

**Propostas e resumo** usam o mesmo caminho: no polling, a tela da dona também pergunta pelas
propostas pendentes e a tela da mesa atualiza o resumo (`/party`); na sala em tempo real
(opção 2), a proposta e a mudança de PV chegam na hora.

### 2.5 Testes que provam que funciona

- Unidade (motor): as relações do plano v2, 15.5 — dano 3 depois de dano 4 = dano 4 depois de
  dano 3; descanso longo duas vezes = uma vez; desfazer logo após o dano restaura o PV.
- Integração (API + Postgres): 20 pedidos de ação **ao mesmo tempo** na mesma ficha → todas
  aplicadas uma vez, versão final = 20, nenhuma perdida; reenvio do mesmo `actionId` → marcado
  como repetido.
- Integração (propostas): proposta de cura **não muda a ficha** até ser aceita; aceitar duas
  vezes (ou em duas abas) aplica **uma vez**; recusar deixa a ficha igual; proposta vencida não
  pode mais ser aceita; o 11º pendente é recusado; ninguém propõe para a própria ficha.
- Contrato do resumo: a resposta de `/party` contém **só** nome, classe, nível, CA, PV e
  condições (teste que falha se um campo novo vazar).
- Bot (navegador): dois contextos (mestre e jogadora) na mesma ficha; a mestre aplica dano, a
  tela da jogadora mostra o PV novo em até X s. Outro cenário: a jogadora Duda propõe cura, a
  dona Kaela aceita e o PV muda na tela da Kaela e no resumo da mesa.
- Permissões: um jogador tentando dano (ação direta) na ficha de outro → 404; quem não é da
  campanha pedindo `/party` ou propondo cura → 404; jogador pedindo a ficha inteira de outro →
  404.

## 3. Escala (quando crescer)

| Gargalo                       | Sinal                                               | Saída                                                                                                                       |
| ----------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| API dormindo                  | Reclamação de demora ao entrar                      | _Feito:_ aviso "acordando" e novas tentativas sozinhas. Depois: monitor externo chamando `/health` a cada 5–10 min, ou Render pago (~US$ 7/mês). |
| Uma instância só              | CPU alta, respostas lentas                          | A API já não guarda nada na memória entre pedidos (sessão no banco): dá para ligar 2+ instâncias atrás do Render sem mudar código. |
| Conexões com o banco          | Erros "too many connections"                        | Usar o endereço **com pooler** do Neon (`-pooler` no host) e limitar o pool por instância.                                    |
| Ficha grande no banco         | Fotos de 100+ kB dentro do JSONB                    | Guardar a foto num armazenamento de arquivos (Cloudflare R2) e deixar na ficha só o endereço; limitar tamanho.               |
| Lista de personagens          | Muitas fichas por conta                             | Já há limite de 50 por conta e índice `(owner_id, updated_at)`; paginação quando o limite subir.                             |
| Abuso (robôs, spam)           | Picos de pedidos de um IP                           | Limite de pedidos por IP e por conta nas rotas de escrita (hoje só o login tem); regras de limite na Cloudflare. As propostas de cura entram nesse limite. |
| Tarefas agendadas             | Lixeira de 30 dias, limpar eventos antigos          | Gatilho agendado do Worker (Cron Trigger) chamando uma rota interna protegida, em vez de um servidor a mais. Também expira as propostas vencidas. |

Índices previstos para a campanha: `campaign_members (user_id)`, `campaign_characters
(character_id)`, `character_events (character_id, version)`, `campaign_rolls (campaign_id,
created_at desc)`, `action_proposals (character_id, status)`.

## 4. "Site profissional": o que falta além do código

Em ordem de prioridade.

1. **Aparecer no Google** — _feito nesta versão:_ título/descrição por página, endereço
   canônico, `sitemap.xml`, `robots.txt`, páginas pessoais com `noindex`, dados estruturados
   (schema.org) e imagem de prévia. **Falta você:** verificar o site no Search Console e enviar o
   sitemap (ver `docs/publicacao.md`, seção 6) — **agora no endereço novo**, depois de ligar o
   domínio (seção 4.1), para não verificar duas vezes. Domínio próprio **(decisão #3, decidida em
   22/10: `grimorio.net.br`, comprado)** — um nome próprio passa mais confiança e não muda se a
   hospedagem mudar.
2. **Canais de contato** (LGPD): e-mail de contato e "Relatar problema" configurados — hoje a
   página de privacidade diz que o canal "ainda não foi configurado". **Falta você.**
3. **Monitoramento de erros**: Sentry (plano grátis) no site e na API, para ver erros que as
   pessoas não relatam. Exige atualizar a política de privacidade e a CSP **(decisão)**.
4. **Monitor de disponibilidade**: além do B14 (que já testa o rolador), um monitor externo de
   `/health` da API com aviso por e-mail.
5. **Backups**: o Neon permite voltar o banco no tempo dentro de uma janela curta no plano
   grátis (**conferir o prazo atual**). Somar um backup semanal (`pg_dump`) guardado fora do
   Neon e **testar a restauração** uma vez.
6. **Fluxo de mudanças**: hoje o código vai direto para a `main` e para o ar. Profissional:
   cada mudança num _pull request_, com os testes do CI obrigatórios antes de juntar (proteção
   da `main`), e uma prévia do site por PR (a Cloudflare gera versões de prévia).
7. **Ambiente de testes (staging)**: uma cópia do site + API + banco (o Neon cria "ramos" do
   banco) para testar migrações antes da produção.
8. **Segurança da operação**: verificação em duas etapas em GitHub, Google Cloud, Cloudflare,
   Render e Neon; atualização automática de dependências (Dependabot/Renovate) com o CI
   conferindo; trocar os segredos (`AUTH_SECRET`, `PROXY_SECRET`) se alguém de fora tiver tido
   acesso.
9. **Estatísticas de uso sem cookies** (Cloudflare Web Analytics) para saber quantas pessoas
   usam e quais páginas — exige liberar o script na CSP e citar na privacidade **(decisão)**.
10. **Revisão jurídica** dos termos, privacidade e do uso do SRD **(decisão #4, ainda aberta)**
    antes de divulgar amplamente. Nada de "D&D"/"Dungeons & Dragons" no nome, logo ou anúncios (o
    teste `brand.test.ts` já confere os textos do site).
11. **Conteúdo para busca**: páginas de guia (ex.: "como criar seu primeiro personagem",
    "o que é teste de resistência") escritas para o site com base no SRD 5.2. É o que mais traz
    gente pelo Google, depois do básico técnico.
12. **Apoio** — **plataforma escolhida em 22/10: Apoia.se (decisão #2)**. **Falta você**
    (depois): criar a página de apoio no Apoia.se e guardar o link; aí configuramos as variáveis
    `VITE_SUPPORT_*` e a página de apoio do site. É só um link: trocar de plataforma depois
    custa pouco. Fica na etapa "antes de divulgar" (seção 5).

### 4.1 Ligar o domínio `grimorio.net.br` ao site (a fazer)

O domínio foi comprado em 22/10. Falta ligá-lo. **(manual)** = clique ou variável nos painéis
dos serviços; **(código)** = alteração ou teste no repositório. Os nomes exatos de botões e
variáveis ficam em `docs/publicacao.md`; conferir lá antes de começar.

1. **(manual) Trazer o DNS para a Cloudflare.** Na Cloudflare, adicionar o domínio
   `grimorio.net.br` (plano grátis) e, no Registro.br, trocar os servidores de nomes
   (nameservers) pelos dois que a Cloudflare indicar. Pode levar de alguns minutos a algumas
   horas.
2. **(manual) Dar o domínio ao Worker.** Workers & Pages → `grimorio` → Settings → Domains &
   routes → adicionar `grimorio.net.br` como domínio personalizado (e, se quiser, `www`).
3. **(manual) Variável de build** `VITE_SITE_URL=https://grimorio.net.br` → refazer a publicação
   (Retry build). Assim o endereço canônico, o `sitemap.xml`, o schema.org e a imagem de
   prévia passam a usar o endereço novo.
4. **(manual) Login do Google.** No Google Cloud, no ID do cliente OAuth do login, adicionar
   `https://grimorio.net.br` às origens autorizadas e o endereço de retorno com o **mesmo
   caminho** do atual, trocando só o domínio. Manter os antigos até confirmar que o novo
   funciona.
5. **(manual) API no Render.** Trocar a variável do endereço público do site (a que a biblioteca
   de login usa como endereço-base e origem confiável) pelo endereço novo. O cookie de sessão
   continua no mesmo endereço do site, porque a API é chamada por `/api` do Worker; a
   arquitetura não muda.
6. **(manual) `workers.dev`.** Redirecionar para o domínio novo ou deixar como está; o endereço
   canônico já aponta para o novo.
7. **(manual) Search Console** no endereço novo (propriedade "Prefixo do URL" com
   `https://grimorio.net.br`) e envio do `sitemap.xml`. A propriedade do `workers.dev` não
   precisa mais ser verificada.
8. **(código)** Apontar o bot (B1: canônico, sitemap, robots, `noindex`) e o monitor de
   `/health` para o endereço novo e conferir o login e o salvamento de ficha ponta a ponta.

## 5. Ordem sugerida

| Quando                         | O quê                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| **Agora** (feito em 22/10)     | Correções de tela, aviso de servidor acordando com novas tentativas, SEO básico. Decisões de campanha, domínio e apoio tomadas. |
| Antes de divulgar              | **Ligar `grimorio.net.br` (seção 4.1)**, depois Search Console + sitemap no endereço novo, contato e "Relatar problema", **página de apoio no Apoia.se**, monitor de `/health`, revisão jurídica (#4). |
| Antes da campanha              | PR + proteção da `main`, Sentry, backup testado, limite de pedidos nas rotas de escrita.                 |
| **Campanha, parte 1**          | Canal de ações + `character_events` + papéis + **resumo da mesa (`/party`)** + **propostas de cura** + tela da mestre com polling (seção 2.4, opção 1). |
| Campanha, parte 2              | Sala em tempo real (Durable Objects), rolagens no servidor, histórico e desfazer.                        |
| Quando crescer                 | API paga/2 instâncias, fotos no R2, staging, estatísticas.                                              |
