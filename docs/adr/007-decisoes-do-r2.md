# ADR-007 — Decisões que o R2 precisa (Etapa 9)

- **Status:** proposto — aguardando as escolhas do dono do projeto
- **Data:** 2026-09-23

## Contexto

A Etapa 9 pede que as decisões do R2 (contas e ficha salva no servidor) fiquem registradas.
Duas já foram tomadas no ADR-004: **#1 edição 2024** e **#5 termos do livro de 2024 em
português**. As demais dependem de quem é dono do projeto; este ADR reúne as opções, o que o
_spike_ mostrou e uma sugestão para cada uma. Quando uma decisão sair, troque "sugestão" por
"decidido" e registre a data.

## #7 — Biblioteca de login (depois do _spike_)

O _spike_ (`spikes/auth`, código descartável) testou **Better Auth 1.7 + Fastify 5 + Drizzle +
Postgres**. Tudo o que o R2 precisa funcionou:

| Pergunta                                                    | Resultado                                                   |
| ----------------------------------------------------------- | ----------------------------------------------------------- |
| Funciona dentro do nosso Fastify?                           | Sim, uma rota `/api/auth/*` (guia oficial)                  |
| Lê a sessão nas nossas rotas?                               | Sim, `auth.api.getSession(...)`                             |
| Usa a nossa porta de ids e o nosso padrão de nomes?         | Sim (`generateId`, `display_name`, campo `is_synthetic`)    |
| Cookie seguro?                                              | `HttpOnly` + `SameSite=Lax`; origem desconhecida recebe 403 |
| Login com Discord?                                          | Gera o endereço de autorização (faltam credenciais reais)   |
| Sessão de teste sem e-mail para o bot (`/__test__/session`) | Sim, plugin oficial `testUtils` (só fora de produção)       |
| Usa a nossa porta de relógio?                               | **Não**: expiração de sessão usa o relógio do sistema       |

Três achados que mudam o plano:

1. **Site e API precisam estar no mesmo domínio.** O cookie de sessão só é aceito pelos
   navegadores se o site e a API forem "o mesmo site" (ex.: `grimorio.com.br` e
   `api.grimorio.com.br`). Com o site em `*.pages.dev` e a API em outro provedor, o login falha
   no Safari e em navegadores que bloqueiam cookies de terceiros. Por isso **a decisão #3
   (domínio) passa a bloquear o R2**. Alternativa sem domínio: servir a API por baixo do
   próprio site (`/api/*` repassado pela Cloudflare), mais trabalho de configuração.
2. **E-mail único para sempre**, não só entre contas ativas. A biblioteca exige e-mail único.
   Em vez do índice parcial do plano (11.4), a exclusão da conta **apaga o e-mail** (troca por um
   valor sem sentido), o que também é melhor para a LGPD. A tabela `users` da Etapa 9 vai ganhar
   as colunas da biblioteca (`email_verified`, `image`, `updated_at`) e as tabelas `sessions`,
   `accounts` e `verifications` numa migração que só adiciona.
3. **Relógio**: testes de expiração de sessão usam relógio falso do Vitest em vez da porta
   `Clock`. Aceitável, porque a regra é da biblioteca, não nossa.

**Sugestão:** Better Auth, começando com login pelo Discord. Um segundo jeito de entrar (Google,
ou e-mail com link mágico, que exige escolher um provedor de e-mail) evita deixar de fora quem
não usa Discord.

## #3 — Nome e domínio (agora bloqueia o R2)

Ver o achado 1 acima. **Sugestão:** registrar o domínio antes de começar o login, e publicar o
site nele (Cloudflare → Custom domains) e a API em `api.` do mesmo domínio.

## #8 — Instância paga sempre ligada?

Em planos gratuitos que desligam a API sem uso, o primeiro acesso depois de um tempo parado
demora **dezenas de segundos** (plano v2, 18), e login, lista de personagens e sincronização
dependem da API. A ficha e o rolador continuam funcionando sem ela (RF-47).

- **Gratuito que hiberna:** custo zero; primeira ação lenta. Serve para um beta fechado.
- **Instância pequena sempre ligada:** custo mensal fixo; resposta imediata.

**Sugestão:** gratuito no beta fechado (com o aviso "acordando o servidor…" na tela) e instância
sempre ligada no lançamento aberto do R2. O banco pode ficar num Postgres gerenciado com plano
gratuito (Neon ou Supabase, plano v2, 18); confira os limites atuais antes de escolher. Esta
decisão também destrava o **staging** da API (`app_staging`), que ficou pendente no ADR-006.

## #4 — Idade mínima e contas de menores

O plano v2 (C-30) aponta que o ECA Digital e a LGPD alcançam um site de RPG, que tem acesso
provável por adolescentes. Isto **não é conselho jurídico**; a revisão com um advogado está
prevista antes do R2. Opções para conversar com ele:

- **Contas só para maiores de 18 no R2**, com o site sem conta (como hoje) aberto a todos.
  Menos obrigações enquanto a revisão não sai; exclui adolescentes das contas.
- **Contas a partir de uma idade mínima com consentimento dos responsáveis**, com as proteções
  que a lei exigir (sem interação aberta com desconhecidos, privado por padrão).

**Sugestão:** começar pela primeira e ampliar depois da revisão jurídica.

## #6 — Classes da fatia mínima

**Sugestão do plano:** Guerreiro (marcial) e Clérigo (conjurador), do conteúdo aberto de 2024
(SRD 5.2). Juntas cobrem ataque, dano, recursos com recarga e magias preparadas.

## Resumo

| #   | Decisão                 | Estado                                     | Bloqueia                   |
| --- | ----------------------- | ------------------------------------------ | -------------------------- |
| 1   | Edição das regras       | decidido: 2024 (ADR-004)                   | —                          |
| 5   | Terminologia            | decidido: livro 2024 (ADR-004)             | —                          |
| 3   | Nome e domínio          | **aberto**                                 | login do R2                |
| 4   | Idade mínima            | **aberto** (revisão jurídica)              | cadastro do R2             |
| 6   | Classes da fatia mínima | **aberto** (sugestão: Guerreiro + Clérigo) | conteúdo do R2             |
| 7   | Biblioteca de login     | **aberto** (sugestão: Better Auth)         | login do R2                |
| 8   | Instância paga          | **aberto**                                 | staging e lançamento do R2 |
