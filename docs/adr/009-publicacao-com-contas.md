# ADR-009 — Publicação com contas para um grupo de teste

- **Status:** aceito
- **Data:** 2026-10-13

## Contexto

Quero que amigos testem o site com login e fichas na conta. Até aqui as contas só
funcionavam no computador: o Vite repassava `/api` para a API local (ADR-008, item 2). Faltava
escolher onde hospedar a API e o Postgres (decisão #8) e como manter site e API na mesma origem
sem domínio próprio (decisão #3). A revisão jurídica (decisão #4) continua pendente, então as
contas seguem **em fase de testes**.

## Decisões

1. **Tudo no plano grátis**, conferido em 13/10/2026:
   - **Site:** Cloudflare, como **Worker com arquivos estáticos** (o tipo que o painel cria
     hoje; o ADR-005 previa Pages). Arquivos estáticos são grátis e sem limite; o Worker, que só
     roda para `/api/*`, tem 100 mil pedidos por dia no plano grátis.
   - **API:** Render, plano _free_ (0,1 CPU, 512 MB), região Virginia. **Dorme depois de 15 min
     sem pedidos** e leva cerca de 1 min para acordar; 750 horas por mês por conta. Responde à
     decisão #8 por enquanto: **instância grátis, que dorme**. Para o lançamento público, rever.
   - **Banco:** Neon, plano _free_ (1 GB por projeto, 100 CU-hora por mês, suspende depois de
     5 min parado e volta sozinho no próximo pedido), região AWS us-east-1, perto da API. O banco
     grátis do Render foi descartado porque expira em 30 dias.

2. **Mesma origem sem domínio: o Worker do site repassa `/api/*`.** O `wrangler.jsonc` da raiz
   publica `apps/web/dist` com `_headers`, `/dados` → `dados.html` (`auto-trailing-slash`) e
   404 de verdade com o `404.html` (`404-page`), igual ao ADR-005. Com `run_worker_first:
["/api/*"]`, só a API passa pelo código (`apps/web/src/edge/worker.ts`, que chama
   `api-proxy.ts`). O navegador só fala com `https://grimorio.SUA-CONTA.workers.dev`; o cookie
   de sessão continua "do próprio site" (ADR-007, achado 1; `workers.dev` está na lista de
   sufixos públicos, então cada site tem os seus cookies). O repasse não segue
   redirecionamentos (o retorno do Google passa como veio), não mexe na resposta e, sem
   configuração ou com a API fora do ar, responde JSON 503/502. Com isso o site mostra "contas
   indisponíveis" e continua funcionando sem conta. `keep_vars` evita que a publicação apague
   `API_ORIGIN`, criada no painel. A primeira versão usava uma Pages Function
   (`functions/api/[[path]].ts`); saiu quando o projeto foi criado como Worker.

3. **Segredo entre o repasse e a API (`PROXY_SECRET`).** Sem ele, todos os jogadores chegariam
   à API com o IP da Cloudflare e dividiriam um único limite de tentativas do login (3 a cada
   10 s). A função manda `x-grimorio-proxy: <segredo>` e `x-grimorio-client-ip` com o
   `cf-connecting-ip`, que o navegador não consegue forjar; o que o navegador mandar com esses
   nomes é descartado. Com `PROXY_SECRET` definido, a API responde **403** a tudo que chegar sem
   o segredo certo, menos `/health`, `/ready` e `/version`. A conferência usa o padrão da rota
   (não dá para escapar com `/%61pi/...`) e comparação em tempo constante. Só então o Better
   Auth lê o IP desse cabeçalho (`advanced.ipAddress.ipAddressHeaders`). O Render gera o valor
   (`generateValue`), e ele é copiado para a Cloudflare como `API_PROXY_SECRET`. Sem
   `PROXY_SECRET` (no computador e nos testes), nada muda.

4. **A API vai em Docker** (`apps/api/Dockerfile`, contexto na raiz). Assim o pnpm fica na versão
   do `packageManager`, sem depender do que vem instalado no Render. A imagem é montada em duas
   etapas, com as dependências de produção reinstaladas, roda como o usuário `node` e **aplica
   as migrações a cada início** (o Render grátis não tem comando de pré-deploy). As migrações só
   acrescentam (ADR-008) e não fazem nada quando não há novidade. O `render.yaml` (Blueprint)
   fixa plano, região, verificação em `/health`, deploy a cada commit (só quando muda algo da
   API) e as variáveis. Os segredos ficam marcados `sync: false` e são pedidos uma vez.

5. **Quem consegue entrar: qualquer conta Google.** Corrigido em 13/10/2026, depois do primeiro
   teste publicado. A ideia inicial era usar a lista de **Usuários de teste** do app OAuth como
   grupo fechado, mas o Google abre uma exceção para apps que só pedem nome, e-mail e foto (o
   nosso caso): nesses, quem não está na lista também entra, mesmo com o app em **Teste**
   ([ajuda do Google](https://support.google.com/cloud/answer/15549945)). Publicar o app não
   muda nada para nós. Na prática, as contas estão abertas a quem tiver o link. Restringir a um
   grupo exigiria uma lista de e-mails permitidos na própria API (ainda não feito). A revisão
   jurídica (#4) continua pendente.

6. **`VITE_ACCOUNTS` é variável do build** (Settings → Build), e `API_ORIGIN`/`API_PROXY_SECRET`
   são variáveis do Worker no ar (Settings → Variables and Secrets). O retorno do Google aponta
   sempre para o endereço principal (`SITE_URL`), então o login só funciona nele, não em
   endereços de prévia.

## Conferido

- Unidade: repasse (7 testes), Worker (3), proteção da API (5), ambiente (2).
- Integração (Postgres de verdade): em modo produção atrás do repasse, cada IP tem o seu
  limite, o retorno do Google sai em `https://…/api/auth/callback/google`, o cookie é
  `__Secure-` e pedido sem segredo leva 403.
- Ponta a ponta no contêiner da nuvem: `wrangler dev` com o `wrangler.jsonc` e o build de
  produção (`VITE_ACCOUNTS=true`), e a imagem Docker da API em modo produção. Rotas estáticas,
  `/dados/` → `/dados`, 404 com status 404, CSP e cache de `/assets` conferidos. Conferidos sessão,
  criar/listar/salvar seção/excluir personagem, corpo grande demais (413), sair, origem
  estranha com cookie (403), API desligada (502 em JSON) e IP forjado pelo navegador ignorado.
  No Chromium, `/entrar` foi até o Google sem nenhum erro de CSP.
- CI: o job `api` monta a imagem do Render e confere `/health`, `/ready` e o 403 sem segredo.

## Consequências

- **Primeiro acesso depois de 15 min parado demora até ~1 min** (a API acordando). Nesse
  intervalo o site já funciona e só a parte da conta espera.
- Conta grátis do Render: 750 h por mês. Dá para uma API ligada o mês inteiro, mas ela dorme
  quando não há uso, então sobra bastante.
- Neon grátis: 100 CU-hora por mês com suspensão depois de 5 min. Com poucos jogadores,
  sobra. A verificação do Render usa `/health`, que não consulta o banco, para não manter o
  banco acordado.
- Domínio próprio (decisão #3) continua em aberto. Quando existir, basta trocar `SITE_URL` no
  Render e os endereços no Google; o repasse continua o mesmo.
- Antes de abrir ao público: revisão jurídica (#4), publicar o app no Google e rever a decisão
  #8 (API que não dorme).
- Passo a passo para iniciante: [docs/publicar-com-contas.md](../publicar-com-contas.md).
