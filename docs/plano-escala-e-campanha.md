# Plano: escala, campanha com várias pessoas e "site profissional"

- **Data:** 2026-10-22 (pedido: "planejar melhor a escalabilidade, concorrência — principalmente
  na campanha, onde várias pessoas poderão acessar a mesma ficha — e outras especificações de
  sites mais profissionais, **só planejamento**").
- **Situação:** nada daqui foi implementado, exceto o que está marcado como _feito_. A base
  continua a do plano técnico v2 (seções 6, 10, 11 e 15); este documento diz **o que muda com o
  que aprendemos** desde então e **em que ordem** fazer.
- Decisões que dependem de você estão marcadas com **(decisão)**.

## 1. Onde estamos (out/2026)

| Peça       | Hoje                                                         | Limite que importa                                                                                                     |
| ---------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Site       | Cloudflare Workers (arquivos estáticos + repasse de `/api`)  | Praticamente sem limite para arquivos; o Worker só roda em `/api/*` (100 mil pedidos/dia no plano grátis).            |
| API        | Render, plano grátis, 1 instância Node (Fastify)             | **Dorme após 15 min sem uso** e leva até ~1 min para acordar. Uma instância só.                                        |
| Banco      | Neon (Postgres), plano grátis                                | Pouco espaço (0,5 GB) e horas de processamento contadas; o banco também "dorme" sem uso (acorda em segundos).          |
| Ficha      | 1 linha por personagem; a ficha inteira em JSONB             | Salva **por seção** com revisão (`section_revs`): duas abas mexendo na mesma seção → aviso de conflito. Linha travada (`FOR UPDATE`) durante o salvamento. |
| Login      | Google (Better Auth), sessão por cookie no mesmo endereço     | Beta fechado (lista de e-mails) — **não muda agora**.                                                                  |

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

O plano v2 (10.2) já previa dois canais; a campanha é o momento de criar o segundo:

| Canal                  | Exemplo                                              | Como resolve a concorrência                                                                                                     |
| ---------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Seções** (já existe) | nome, atributos, notas, magias escolhidas            | Quem edita é quase sempre uma pessoa só. Conflito → a tela atual de escolha (já pronta).                                        |
| **Ações** (novo)       | "dano 7", "cura 4", "gastar espaço de 1º círculo", "condição Envenenado", "descanso longo", "+12 PO" | São **mudanças relativas**: o servidor aplica uma depois da outra, na ordem em que chegam. Não há conflito: dano 7 + espaço gasto = as duas coisas acontecem. |

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
  ficha), `actor_id` (quem fez: a jogadora ou a mestre), `action` (JSONB), `version`,
  `created_at`. Serve para: não aplicar duas vezes; mostrar o **histórico** ("a mestre aplicou
  7 de dano às 21h14"); **desfazer** a última ação; e deixar um aparelho atrasado **se
  atualizar** pedindo "eventos depois da versão N" em vez da ficha inteira.
- Eventos antigos podem ser resumidos/apagados depois de X dias (a ficha guarda o estado
  final; o histórico é só conveniência).

### 2.3 Quem pode o quê (papéis)

| Ação                                              | Dona da ficha | Mestre da campanha            | Outro jogador da mesa       |
| ------------------------------------------------- | ------------- | ----------------------------- | --------------------------- |
| Ver a ficha inteira                               | sim           | sim                           | só o resumo (**decisão**: nome, PV, CA, condições?) |
| Editar seções (atributos, magias, notas…)         | sim           | não (só sugere)               | não                         |
| Ações de jogo (dano, cura, condição, recursos)    | sim           | sim (aparece "pela mestre")   | não (**decisão**: cura entre jogadores?) |
| Tirar a ficha da campanha                         | sim           | sim                           | não                         |

- A permissão é conferida **no servidor**, a cada pedido (o site só esconde botões). Ficha de
  outra pessoa sem permissão responde 404, como hoje.
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

### 2.5 Testes que provam que funciona

- Unidade (motor): as relações do plano v2, 15.5 — dano 3 depois de dano 4 = dano 4 depois de
  dano 3; descanso longo duas vezes = uma vez; desfazer logo após o dano restaura o PV.
- Integração (API + Postgres): 20 pedidos de ação **ao mesmo tempo** na mesma ficha → todas
  aplicadas uma vez, versão final = 20, nenhuma perdida; reenvio do mesmo `actionId` → marcado
  como repetido.
- Bot (navegador): dois contextos (mestre e jogadora) na mesma ficha; a mestre aplica dano, a
  tela da jogadora mostra o PV novo em até X s.
- Permissões: um jogador tentando dano na ficha de outro → 404.

## 3. Escala (quando crescer)

| Gargalo                       | Sinal                                               | Saída                                                                                                                       |
| ----------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| API dormindo                  | Reclamação de demora ao entrar                      | _Feito:_ aviso "acordando" e novas tentativas sozinhas. Depois: monitor externo chamando `/health` a cada 5–10 min, ou Render pago (~US$ 7/mês). |
| Uma instância só              | CPU alta, respostas lentas                          | A API já não guarda nada na memória entre pedidos (sessão no banco): dá para ligar 2+ instâncias atrás do Render sem mudar código. |
| Conexões com o banco          | Erros "too many connections"                        | Usar o endereço **com pooler** do Neon (`-pooler` no host) e limitar o pool por instância.                                    |
| Ficha grande no banco         | Fotos de 100+ kB dentro do JSONB                    | Guardar a foto num armazenamento de arquivos (Cloudflare R2) e deixar na ficha só o endereço; limitar tamanho.               |
| Lista de personagens          | Muitas fichas por conta                             | Já há limite de 50 por conta e índice `(owner_id, updated_at)`; paginação quando o limite subir.                             |
| Abuso (robôs, spam)           | Picos de pedidos de um IP                           | Limite de pedidos por IP e por conta nas rotas de escrita (hoje só o login tem); regras de limite na Cloudflare.             |
| Tarefas agendadas             | Lixeira de 30 dias, limpar eventos antigos          | Gatilho agendado do Worker (Cron Trigger) chamando uma rota interna protegida, em vez de um servidor a mais.                  |

Índices previstos para a campanha: `campaign_members (user_id)`, `campaign_characters
(character_id)`, `character_events (character_id, version)`, `campaign_rolls (campaign_id,
created_at desc)`.

## 4. "Site profissional": o que falta além do código

Em ordem de prioridade.

1. **Aparecer no Google** — _feito nesta versão:_ título/descrição por página, endereço
   canônico, `sitemap.xml`, `robots.txt`, páginas pessoais com `noindex`, dados estruturados
   (schema.org) e imagem de prévia. **Falta você:** verificar o site no Search Console e enviar o
   sitemap (ver `docs/publicacao.md`, seção 6). Depois: domínio próprio **(decisão #3)** — um
   endereço `workers.dev` funciona, mas um nome próprio passa mais confiança e não muda se a
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
10. **Revisão jurídica** dos termos, privacidade e do uso do SRD **(decisão #4)** antes de
    divulgar amplamente. Nada de "D&D"/"Dungeons & Dragons" no nome, logo ou anúncios (o teste
    `brand.test.ts` já confere os textos do site).
11. **Conteúdo para busca**: páginas de guia (ex.: "como criar seu primeiro personagem",
    "o que é teste de resistência") escritas para o site com base no SRD 5.2. É o que mais traz
    gente pelo Google, depois do básico técnico.

## 5. Ordem sugerida

| Quando                         | O quê                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| **Agora** (feito em 22/10)     | Correções de tela, aviso de servidor acordando com novas tentativas, SEO básico.                         |
| Antes de divulgar              | Search Console + sitemap, contato e "Relatar problema", monitor de `/health`, revisão jurídica, domínio. |
| Antes da campanha              | PR + proteção da `main`, Sentry, backup testado, limite de pedidos nas rotas de escrita.                 |
| **Campanha, parte 1**          | Canal de ações + `character_events` + papéis + tela da mestre com polling (seção 2.4, opção 1).          |
| Campanha, parte 2              | Sala em tempo real (Durable Objects), rolagens no servidor, histórico e desfazer.                        |
| Quando crescer                 | API paga/2 instâncias, fotos no R2, staging, estatísticas.                                              |
