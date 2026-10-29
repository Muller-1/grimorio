# ADR-008 — Login com Google, fichas na conta e assistente de criação

- **Status:** aceito (contas em fase de testes até a revisão jurídica — decisão #4)
- **Data:** 2026-10-08

## Contexto

Objetivos desta etapa, nesta ordem: (1) login com conta Google e "link com o banco de dados";
(2) o sistema de criação de ficha em etapas — classe, origem, atributos e detalhes —, conferido
com o Livro do Jogador 2024 (5.5e). O ADR-007 deixava abertas as decisões #7 (biblioteca de
login), #3 (domínio, que bloqueava o cookie de sessão) e #6 (classes da fatia mínima).

## Decisões

### 1. Login: Better Auth, só com Google (decisão #7 fechada)

- Better Auth 1.7 dentro do Fastify (`apps/api/src/modules/auth`), com o adaptador Drizzle e as
  tabelas `users` (ganhou `email_verified`, `image`, `updated_at`), `sessions`, `accounts` e
  `verifications` — migração `0001_login_e_personagens`, que só adiciona.
- **Sem senha.** Só Google: nada de senha para vazar, nem provedor de e-mail para escolher agora.
  Discord ou link mágico podem entrar depois sem mudar o banco.
- **Dados mínimos (LGPD):** e-mail, nome (cortado em 60 caracteres), foto e o id da pessoa no
  Google. Os tokens do Google são **descartados** (`databaseHooks.account`): o site não chama
  nenhuma API do Google.
- Sessão de 30 dias, renovada no máximo 1 vez por dia; cookie `grimorio.session_token`
  `HttpOnly` + `SameSite=Lax` (`__Secure-` com https).
- A conferência de origem (CSRF) e de destino depois do login (redirecionamento aberto) fica
  **sempre ligada** — a biblioteca desliga essa conferência quando roda em testes, e aí os testes
  não provariam nada. Limite de tentativas ligado em produção.
- E-mail único **para sempre** (ADR-007, achado 2): a migração cria `users_email_uq` e apaga o
  e-mail de contas já excluídas.
- `POST /__test__/session` (só fora de produção, com token): cria um usuário e devolve o cookie,
  usando o plugin `testUtils` da biblioteca. É assim que o bot entra numa conta.

### 2. Site e API na mesma origem (contorna a decisão #3 por enquanto)

O navegador fala só com o site; o servidor do site repassa `/api/*` para a API.

- No computador: o Vite repassa `/api` para `localhost:3000` (`apps/web/vite.config.ts`).
  Endereço de retorno no Google: `http://localhost:5173/api/auth/callback/google`.
- Em produção: um proxy `/api/*` na frente do site (ex.: Cloudflare) **ou** a API em
  `api.` do mesmo domínio. Isso ainda é trabalho de publicação; até lá, o build de produção
  sai com contas desligadas.
- `SITE_URL` (API) diz qual é o endereço público do site; o retorno do Google sai dele.

### 3. Contas ligadas por variável de build: `VITE_ACCOUNTS`

- `pnpm dev`: ligado por padrão. Builds: desligado, a menos que `VITE_ACCOUNTS=true`.
- Desligado, o site se comporta como antes (tudo no navegador). O bot roda o build de teste com
  contas desligadas; a sessão com conta é testada na API e nos testes de unidade do site.
- O site pergunta `GET /api/v1/session` (sempre 200, `{ user }` ou `{ user: null }`) para não
  sujar o console com 401 em toda página. `GET /api/v1/me` continua respondendo 401.
- API fora do ar ⇒ estado `unavailable`: o ícone de nuvem riscada avisa, e a ficha do navegador
  e o rolador continuam funcionando (RF-47).

### 4. Fichas na conta: seções com revisão (plano v2, 10.3)

- Tabela `characters` (plano v2, 11.4) com `section_revs` (revisão de cada seção).
- Rotas: listar, criar (id vem do navegador — repetir não duplica), abrir, salvar por seção
  (`PATCH` com `baseRevs`; seção mudada em outro aparelho → 409 `CONFLICT_SECTION` com a versão do
  servidor) e excluir (lixeira). Ficha de outra pessoa responde 404. Limite de 50 por conta.
- O servidor valida a ficha inteira depois de juntar as seções, normaliza (PV acima do máximo
  etc.) e atualiza as colunas da lista.
- **Comparação de seções ignora a ordem das chaves**: o JSONB do Postgres reordena as chaves, e
  `JSON.stringify` direto acusava mudança onde não havia (achado dos testes de integração).
- O formato salvo ainda é a ficha local (ADR-002), agora com `creation` (registro do assistente).
  Enquanto o canal de ações (plano v2, 10.2) não existe, o estado de jogo (PV etc.) também é uma
  seção.
- No site (`features/characters/sync.ts`): cada mudança vai na hora para um cache neste aparelho
  e, depois de 0,8 s sem mudanças, só as seções alteradas vão para o servidor. Sem internet, o
  envio espera e tenta de novo (3 s, 10 s, 30 s, 60 s e ao voltar a conexão). Em conflito, o
  jogador escolhe "manter a deste aparelho" ou "usar a versão salva" — nada é descartado sem
  escolha. Ao sair da conta, o cache da conta é apagado (computador compartilhado).
- Rotas do site: `/entrar`, `/personagens`, `/personagem?id=…` (o id vai na busca: um HTML só,
  sem rota dinâmica na hospedagem estática) e `/criar`.

### 5. Assistente de criação com o conteúdo das regras abertas (decisão #6 substituída)

- Ordem do Livro do Jogador 2024 (cap. 2): **Classe → Origem → Atributos → Toques Finais**.
- Conteúdo em `packages/rules/src/creation/content.ts`: as **12 classes no nível 1**, **9
  espécies**, **antecedentes** (os 4 do SRD 5.2 mais os 12 do livro, marcados "Do livro"), os talentos de
  Origem e os estilos de luta (SRD 5.2 e livro), armas e armaduras do equipamento inicial. Os números foram
  conferidos com o livro (cap. 2 a 6); as descrições são **resumos escritos para o site**.
- O conteúdo do livro que não está no SRD (magias, talentos, estilos de luta, antecedentes) entra
  com **regras fiéis e texto próprio**, em arquivos separados com `source: 'book'`
  (`spells/data/book.ts`, `classes/book-feats.ts`, `creation/book-origins.ts`) e marcado "Do
  livro" na tela; para tirar, basta apagar o arquivo e a linha que o junta. Espécies e subclasses
  do livro continuam pela opção **"Outro (do livro)"** (RF-24). A revisão de licença (#4) segue
  em aberto.
- Atributos: Conjunto Padrão (com a sugestão do livro por classe), Compra de Pontos (27), Rolagem
  4d6 descartando o menor (pela porta `Rng`; o bot fixa a semente) e Manual; depois o bônus do
  antecedente (+2/+1 ou +1/+1/+1, máximo 20).
- `buildCharacterSheet` monta a ficha: salvaguardas, perícias (com Especialização), PV do nível 1,
  CA da armadura inicial (ou Defesa sem Armadura) como ajuste explicado, armas com proficiência e
  atributo certos (Monge usa Destreza), deslocamento (−3 m com armadura pesada sem Força 13),
  Tenacidade Anã e Alerta como campos novos e opcionais da ficha (`hpBonusPerLevel`,
  `initiativeProficiency`), e o resto (traços, talentos, treinamentos, idiomas, equipamento) como
  Características.
- Com conta, o personagem é criado na conta; sem conta, substitui a ficha deste navegador (com
  confirmação). O rascunho fica salvo no navegador até o personagem ser criado.
- Fora do assistente por enquanto: escolha de magias, invocações e maestrias (anotadas como texto).

## Consequências

- Página de créditos com a atribuição CC BY 4.0 do SRD 5.2.
- Termos e privacidade ganham a versão "com contas" (só aparece com `VITE_ACCOUNTS=true`), marcada
  como rascunho até a revisão jurídica (decisão #4).
- Testes: 48 de integração da API (login com retorno do Google simulado, CSRF, redirecionamento
  aberto, state preso ao navegador, autorização, conflito por seção, normalização) e testes de
  unidade do assistente (todas as classes e espécies montam ficha válida) e do salvamento
  (offline, conflito, reabrir com pendências). Novo cenário do bot: **B2**, que percorre o
  assistente com escolhas aleatórias e confere a ficha criada com o motor.

## Pendências

- Credenciais do Google (passo a passo em `docs/login-google.md`).
- Decisão #3/#8: domínio e hospedagem da API; proxy `/api/*` em produção → resolvido para o grupo de teste no [ADR-009](009-publicacao-com-contas.md) (sem domínio próprio).
- Decisão #4: revisão jurídica antes de abrir contas ao público.
- Excluir a conta pelo site (RF-04) e exportar dados (hoje: pedido pelo contato).
