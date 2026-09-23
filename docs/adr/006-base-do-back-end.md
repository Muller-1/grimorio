# ADR-006 — Base do back-end (Etapa 9)

- **Status:** aceito
- **Data:** 2026-09-23

## Contexto

A Etapa 9 deixa pronto o que o R2 (contas e ficha salva no servidor) precisa: a API, o banco,
as portas de teste e as salvaguardas. O usuário escolheu rodar o Postgres local com Docker.

## Decisões

1. **`apps/api` com Fastify 5** e um único ponto de montagem, `buildApp(env, { ports, db })`
   (plano v2, 6.5). Testes de unidade passam um banco falso; testes de integração, o Postgres de
   verdade; o servidor usa os padrões do ambiente.

2. **Portas** em `apps/api/src/ports`: `Rng` (o mesmo `cryptoRng`/`seededRng` do
   `@grimorio/rules`), `Clock`, `Mailer`, `EventBus` e `IdGenerator`. Fora de produção o gerador
   e o relógio são controláveis, o e-mail vai para uma caixa em memória e os eventos são
   gravados. Em produção nada disso existe, e o e-mail falha alto enquanto não houver provedor.
   O lint proíbe `Date.now`, `Math.random`, `crypto` e `randomUUID` fora das portas.

3. **Ambiente validado com Zod** na inicialização (`src/config/env.ts`): `APP_ENV` (`local`,
   `test`, `staging`, `production`), `DATABASE_URL`, `PORT`, `HOST`, `LOG_LEVEL`, `APP_COMMIT`,
   `ENABLE_TEST_API` e `TEST_API_TOKEN`. Todos os erros aparecem de uma vez. Ligar a API de teste
   em produção, ou sem um token de 32+ caracteres, é erro de configuração.

4. **Rotas de sistema**, também em produção: `/health` (processo de pé, não consulta nada),
   `/ready` (o banco responde em até 2 s; senão 503) e `/version` (versão, commit e ambiente).
   Toda resposta leva `x-request-id` gerado pela porta de ids (o valor enviado pelo cliente é
   ignorado).

5. **Postgres 18 no Docker** (`docker-compose.yml`), só em `127.0.0.1`, com os bancos `app_dev` e
   `app_test`. **Drizzle ORM** com o driver `pg`; migrações SQL geradas pelo `drizzle-kit` em
   `apps/api/drizzle/` e aplicadas por `src/db/migrate.ts` (também empacotado, para rodar antes
   do deploy). Primeira migração: `users`, com e-mail único só entre contas ativas (11.4).

6. **API de teste** (`src/plugins/test-api.ts`): `/__test__/reset`, `/clock`, `/rng`, `/outbox`
   e `/events`. Salvaguardas, cada uma com teste automático:
   - não registra com `APP_ENV=production` (a inicialização falha), mesmo que alguém passe por
     fora da validação do ambiente;
   - sem o `x-test-token` certo (comparação em tempo constante), toda rota responde **404 com o
     mesmo corpo** de uma rota que não existe;
   - `reset` só apaga bancos terminados em `_test` ou `_staging`; nos outros, 409 e nada muda.
     O teste de integração cria um banco "de desenvolvimento" descartável, com dados, e confere
     que eles continuam lá.

   As rotas ficam num contexto próprio do Fastify (prefixo `/__test__`), e o gancho do token
   vale para esse contexto. Um teste mostrou por quê: conferir o token só olhando o começo do
   endereço deixava passar `/%5F%5Ftest__/reset` (o roteador decodifica o `%5F`).

7. **Testes**: os de unidade da API rodam no `pnpm test` de sempre. Os de integração
   (`*.int.test.ts`) rodam com `pnpm test:api`, só num banco `*_test`, que é migrado antes. No
   CI, o job `api` sobe um Postgres 18 como serviço, roda os testes, empacota a API e confere que
   o pacote migra, sobe, responde `/health`, `/ready`, devolve o commit em `/version` e não tem
   `/__test__`.

8. **Empacotamento com tsup** (plano v2, 6.6): `dist/server.js` e `dist/db/migrate.js`, com os
   pacotes `@grimorio/*` dentro do bundle. Versão e commit entram no build.

## Ainda não feito (depende de decisões)

- **Staging da API e do banco** e o pipeline "migrar antes do deploy" num provedor: depende da
  decisão #8 (instância paga ou gratuita) e de onde hospedar a API e o Postgres (ver ADR-007).
  O pacote já está pronto para qualquer provedor Node: `pnpm install`, `pnpm build:api`,
  `node apps/api/dist/db/migrate.js` e `node apps/api/dist/server.js`.
- **Login** (decisão #7): ver ADR-007 e o resultado do _spike_.
- **Variáveis nos dados** (`@str`, ajuste A-2): começam com a ficha no servidor (R2).

## Consequências

- Rota nova de negócio segue `routes → service → repository`; serviço recebe portas, nunca
  chama relógio ou gerador direto.
- A tabela `users` pode ganhar colunas quando a biblioteca de login for escolhida; sempre por
  migrações que só adicionam (plano v2, 17).
- Rodar localmente: `pnpm db:up`, copiar `apps/api/.env.example` para `apps/api/.env`,
  `pnpm db:migrate` e `pnpm dev:api`.
