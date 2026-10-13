# ADR-009 — Publicação com contas para um grupo de teste

- **Status:** aceito
- **Data:** 2026-10-13

## Contexto

O usuário quer que amigos testem o site com login e fichas na conta. Até aqui as contas só
funcionavam no computador: o Vite repassava `/api` para a API local (ADR-008, item 2). Faltava
escolher onde hospedar a API e o Postgres (decisão #8) e como manter site e API na mesma origem
sem domínio próprio (decisão #3). A revisão jurídica (decisão #4) continua pendente, então as
contas seguem **em fase de testes**.

## Decisões

1. **Tudo no plano grátis**, conferido em 13/10/2026:
   - **Site:** Cloudflare Pages (ADR-005). Arquivos estáticos são grátis e sem limite; as
     funções somam 100 mil pedidos por dia no plano grátis.
   - **API:** Render, plano _free_ (0,1 CPU, 512 MB), região Virginia. **Dorme depois de 15 min
     sem pedidos** e leva cerca de 1 min para acordar; 750 horas por mês por conta. Responde à
     decisão #8 por enquanto: **instância grátis, que dorme**. Para o lançamento público, rever.
   - **Banco:** Neon, plano _free_ (1 GB por projeto, 100 CU-hora por mês, suspende depois de
     5 min parado e volta sozinho no próximo pedido), região AWS us-east-1, perto da API. O banco
     grátis do Render foi descartado porque expira em 30 dias.

2. **Mesma origem sem domínio: uma função da Pages repassa `/api/*`** (`functions/api/[[path]].ts`,
   com a lógica e os testes em `apps/web/src/edge/api-proxy.ts`). O navegador só fala com
   `https://PROJETO.pages.dev`; o cookie de sessão continua "do próprio site" (ADR-007, achado 1).
   A função não segue redirecionamentos (o retorno do Google passa como veio), não mexe na
   resposta e, sem configuração ou com a API fora do ar, responde JSON 503/502. Com isso o site
   mostra "contas indisponíveis" e continua funcionando sem conta.

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

5. **Grupo de teste pelo próprio Google:** o app OAuth continua em **Teste**, e só entra quem
   está em **Usuários de teste** (até 100 contas). É o jeito de abrir para os amigos sem abrir ao
   público antes da revisão jurídica (#4).

6. **Prévias de pull request ficam sem contas:** `VITE_ACCOUNTS` só é definido no ambiente
   _Production_ da Pages. O retorno do Google aponta sempre para o endereço principal
   (`SITE_URL`), então o login numa prévia não teria como funcionar.

## Conferido

- Unidade: repasse (7 testes), proteção da API (5), ambiente (2).
- Integração (Postgres de verdade): em modo produção atrás do repasse, cada IP tem o seu
  limite, o retorno do Google sai em `https://…/api/auth/callback/google`, o cookie é
  `__Secure-` e pedido sem segredo leva 403.
- Ponta a ponta no contêiner da nuvem: `wrangler pages dev` com o build de produção
  (`VITE_ACCOUNTS=true`) e a imagem Docker da API em modo produção. Conferidos sessão,
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
