# Grimório (codinome)

Site gratuito de fichas de personagem e rolagem de dados para RPG compatível com a 5ª edição.
O site faz as contas: modificadores, proficiência, perícias, salvaguardas, PV, ataques.

> "Grimório" é só o codinome do repositório. O nome final do site é a decisão #3 do plano
> e não pode conter "D&D" nem "Dungeons & Dragons".

## O que já existe

| Parte                                                                                          | Onde                                                                   | Estado                                          |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------- |
| Monorepo (pnpm, TypeScript estrito, ESLint, Prettier, Vitest)                                  | raiz                                                                   | Etapa 1 ✔                                       |
| CI (GitHub Actions) + modelo de PR                                                             | `.github/`                                                             | Etapa 2 ✔ (falta ativar a proteção da `main`)   |
| Gerador aleatório (criptográfico + semente para testes)                                        | `packages/rules/src/dice/rng.ts`                                       | Etapa 3 ✔                                       |
| Parser e avaliação de expressões de dados                                                      | `packages/rules/src/dice/`                                             | Etapa 4 ✔                                       |
| Site: rotas, layout, textos pt-BR, portas, `Panel`, pré-renderização de `/`                    | `apps/web`                                                             | Etapa 5 ✔                                       |
| Tela inicial                                                                                   | `apps/web/src/pages/HomePage.tsx`                                      | ✔                                               |
| Ficha editável com cálculo automático (antecipada, ver ADR-002)                                | `apps/web/src/features/sheet` + `packages/rules/src/sheet`             | ✔                                               |
| Ganchos de teste + bot (Playwright) com os cenários B1, B11 e B12                              | `apps/web/src/testing` + `apps/qa-bot`                                 | Etapa 6 ✔                                       |
| Rolador `/dados`: expressão livre, rolagem rápida, atalhos com nome, histórico, animação       | `apps/web/src/pages/DicePage.tsx` + `apps/web/src/features/dice`       | Etapa 7 ✔                                       |
| Publicação: páginas institucionais, Cloudflare Pages, CSP, orçamentos, Lighthouse, B14         | `docs/publicacao.md` + `apps/web/public/_headers`                      | Etapa 8 ✔ (falta criar o projeto na Cloudflare) |
| API (Fastify + Postgres/Drizzle): portas, `/health` `/ready` `/version`, API de teste          | `apps/api` + `docker-compose.yml`                                      | Etapa 9 ✔ (falta staging e decisões do R2)      |
| Login com Google (Better Auth) e fichas salvas na conta, com salvamento por seção              | `apps/api/src/modules` + `apps/web/src/features/{auth,characters}`     | ✔ (ADR-008; contas em fase de testes)           |
| Assistente de criação: Classe → Origem → Atributos → Toques Finais (regras de 2024)            | `apps/web/src/features/builder` + `packages/rules/src/creation`        | ✔ (ADR-008)                                     |
| Primeiros passos (`/comecar`), glossário e pendências clicáveis no assistente                  | `apps/web/src/pages/StartPage.tsx` + `features/builder/guide.ts`       | ✔ (feedback dos testadores)                     |
| Maestria em Arma e Invocação Mística no nível 1                                                | `packages/rules/src/creation/mastery.ts` + `content.ts`                | ✔                                               |
| Temas de cor (Automático, Pergaminho, Taverna, Arcano, Floresta, Alto contraste)               | `apps/web/src/lib/theme.ts` + `public/theme.js` + `index.css`          | ✔ (contraste AA testado)                        |
| Subida de nível (quantos níveis → telas curtas por nível → resumo), classes do 1 ao 20         | `features/levelup` + `packages/rules/src/{classes,levelup}`            | ✔ (ADR-010)                                     |
| Magias: 339 do SRD, aba Magias (CD, espaços, conjurar, Concentração, Outra magia)              | `features/spells` + `packages/rules/src/spells`                        | ✔ (ADR-010)                                     |
| Habilidades que o site calcula (Fúria, Frenesi, Ataque Furtivo, Bênção…)                       | `sheet/components/PowersPanel.tsx` + `packages/rules/src/engine`       | ✔ (ADR-010)                                     |
| Inventário (moedas, peso, arma equipada), características por origem, efeitos em você          | `features/inventory` + `packages/rules/src/{inventory,engine}`         | ✔ (ADR-011)                                     |
| Etapa Magias no assistente (recomendadas do livro, Iniciado em Magia); visual sem "cara de IA" | `features/builder/steps/SpellsStep.tsx` + `components/ui/ornament.tsx` | ✔ (ADR-012)                                     |

Contas estão em **fase de testes**: ligadas no `pnpm dev`; publicadas para quem tiver o link
(qualquer conta Google entra, ver ADR-009, decisão 5), com a API no Render, o banco no Neon e o
`/api` repassado pelo Worker do site na Cloudflare
([ADR-009](docs/adr/009-publicacao-com-contas.md), passo a passo em
[docs/publicar-com-contas.md](docs/publicar-com-contas.md)). Abrir ao público depende da revisão
jurídica (decisão #4 do [ADR-007](docs/adr/007-decisoes-do-r2.md)). Login local:
[docs/login-google.md](docs/login-google.md).

## Como rodar

Pré-requisitos: [Node.js](https://nodejs.org) 22.12 ou mais novo (o CI usa a versão do `.nvmrc`)
e o pnpm, ativado pelo Corepack que já vem com o Node:

```bash
corepack enable
pnpm install
pnpm dev          # abre o site em http://localhost:5173
```

Outros comandos:

```bash
pnpm check        # tipos + lint + testes (o mesmo que o CI roda)
pnpm test         # só os testes
pnpm test:watch   # testes rodando a cada mudança
pnpm build        # build de produção, um HTML por rota (apps/web/dist)
pnpm size         # orçamentos de tamanho (depois do build)
pnpm lighthouse   # Lighthouse em /dados e / (depois do build; precisa do Chrome)
pnpm format       # formata tudo com o Prettier
```

Para publicar, siga [docs/publicacao.md](docs/publicacao.md).

No Windows, o plano recomenda trabalhar dentro do WSL2, mas tudo acima também funciona no
PowerShell.

### API e banco (Etapa 9)

Precisa do [Docker Desktop](https://www.docker.com/products/docker-desktop/) ligado.

```bash
pnpm db:up                                   # sobe o Postgres (bancos app_dev e app_test)
cp apps/api/.env.example apps/api/.env       # copia o exemplo de configuração
pnpm db:migrate                              # cria as tabelas no app_dev
pnpm dev:api                                 # API em http://localhost:3000 (o site a acessa por /api)
pnpm test:api                                # testes de integração (usam só o app_test)
pnpm db:down                                 # desliga o Postgres (os dados ficam)
```

Login com Google: preencha `AUTH_SECRET`, `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no
`apps/api/.env` — passo a passo em [docs/login-google.md](docs/login-google.md). Com `pnpm dev` e
`pnpm dev:api` rodando, o site em `http://localhost:5173` repassa `/api` para a API.

Mudou `apps/api/src/db/schema.ts`? Gere a migração com `pnpm --filter @grimorio/api db:generate`
e confira o SQL em `apps/api/drizzle/` antes de commitar. Detalhes no
[ADR-006](docs/adr/006-base-do-back-end.md).

### Bot de testes (Etapa 6)

O bot abre o site num navegador de verdade, age como um jogador e confere os resultados com o
motor de regras. Ele gera sozinho o build de **teste** do site (o único que tem os ganchos) e
roda cada cenário em tela de computador e de celular.

```bash
pnpm --filter @grimorio/qa-bot install-browser   # só na primeira vez: baixa o Chromium
pnpm bot                                         # todos os cenários
pnpm bot --scenario=B11                          # só um cenário
pnpm bot --scenario=B11 --seed=8812              # repete exatamente uma execução
pnpm bot --headed                                # mostra o navegador
pnpm --filter @grimorio/qa-bot exec playwright show-report   # relatório da última execução
```

| Cenário              | O que confere                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------ |
| B1 — fumaça          | todas as páginas abrem sem erro no console; com semente fixa, `1d20` dá o valor do oráculo |
| B11 — dados          | a mesma sequência de rolagens na tela e no `seededRng` dá os mesmos dados, um a um         |
| B12 — acessibilidade | axe sem violações sérias ou críticas nas páginas e nos diálogos                            |
| B2 — assistente      | percorre a criação com escolhas aleatórias (pela semente) e confere a ficha com o motor    |
| B14 — monitor        | abre `/dados` na produção, rola `1d20` e confere o total (sem ganchos; roda a cada 30 min) |

Toda execução imprime a semente. Os ganchos (`window.__APP_TEST__`) só existem no build de teste;
o CI falha se eles aparecerem no build de produção. Em todos os cenários, qualquer erro no
console ou bloqueio da política de segurança (CSP) faz o teste falhar.

Contra um site publicado: `pnpm bot --scenario=B14 --env=https://grimorio.SUA-CONTA.workers.dev`.

## Estrutura

```
grimorio/
├─ apps/
│  ├─ api/                 # API (Fastify + Drizzle + Postgres)
│  │  ├─ drizzle/          # migrações SQL geradas pelo drizzle-kit
│  │  └─ src/
│  │     ├─ config/env.ts  # variáveis de ambiente validadas com Zod
│  │     ├─ ports/         # rng, clock, mailer, events, ids
│  │     ├─ db/            # schema, conexão, migrações, trava de banco descartável
│  │     ├─ modules/       # rotas: system, auth (login Google), characters (fichas na conta)
│  │     ├─ plugins/       # test-api (/__test__/*, nunca em produção)
│  │     ├─ app.ts         # buildApp: monta a API (usado também nos testes)
│  │     └─ server.ts
│  ├─ qa-bot/              # bot de testes (Playwright): cenários B1, B2, B11, B12, B14, B15
│  └─ web/                 # site (React + Vite + Tailwind)
│     ├─ build/            # ajudantes do build: cabeçalhos, preview igual à Cloudflare, marca
│     ├─ public/_headers   # cabeçalhos HTTP de produção (CSP, cache)
│     └─ src/
│        ├─ app/           # entrada, rotas, layout, pré-renderização
│        ├─ pages/         # Início, Dados, Apoie, Créditos, Termos, Privacidade
│        ├─ features/
│        │  ├─ auth/       # entrar/sair, menu da conta, página /entrar
│        │  ├─ builder/    # assistente de criação (/criar)
│        │  ├─ characters/ # lista, ficha da conta e salvamento automático
│        │  ├─ sheet/      # a ficha (com o painel Habilidades)
│        │  ├─ spells/     # aba Magias (carregada sob demanda)
│        │  ├─ levelup/    # subir de nível (carregado sob demanda)
│        │  ├─ dice/       # rolagem, histórico, resultado
│        │  └─ toast/      # avisos curtos
│        ├─ components/ui/ # botões, diálogos, painéis (estilo shadcn/ui)
│        ├─ ports/         # rng, clock, ids, storage — única porta para o não determinismo
│        └─ lib/i18n/      # TODOS os textos em português
├─ packages/
│  ├─ shared/              # tipos e schemas Zod (ficha local)
│  ├─ rules/               # motor puro: dados, ficha, criação, classes 1–20, magias, subida
│  │  └─ scripts/spells/   # gerador das 339 magias (SRD 5.2 + textos do site), ver README
│  └─ testkit/             # utilidades só para testes
├─ docker/                 # script que cria o app_test no Postgres do Docker
├─ docker-compose.yml      # Postgres local
└─ docs/                   # ADRs, publicação e referências aos planos
```

## Regras que o lint cobra

- `Math.random` e `Date.now` proibidos em `packages/rules`, `packages/shared` e fora das
  portas (`apps/web/src/ports`, `apps/api/src/ports`). Na API, `crypto`/`randomUUID` também.
- `rules` e `shared` não podem importar `node:*`, React nem Fastify.
- Nenhum código de produção importa `@grimorio/testkit`.
- Nenhum texto de interface escrito direto num componente `.tsx`: vai para
  `apps/web/src/lib/i18n/pt-BR.ts`.
- Em `packages/shared`, o Zod vem de `src/zod.ts` (modo sem `eval`, exigido pela CSP do site).

## Documentação

- `docs/adr/` — decisões registradas (001: ajustes do plano de início; 002: ficha antecipada;
  003: pré-renderização; 004: terminologia e edição; 005: publicação na Cloudflare; 006: base
  do back-end; 007: decisões do R2; 008: login com Google, fichas na conta e assistente;
  009: publicação com contas para um grupo de teste; 010: magias, subida de nível e
  habilidades que o site calcula).
- `docs/publicacao.md` — passo a passo para colocar o site no ar e ligar o monitor B14.
- `docs/publicar-com-contas.md` — site + API (Render) + banco (Neon) com login, para testar com
  amigos.
- Os planos (`plano-tecnico-site-dnd-v2.md` e `plano-de-inicio-site-dnd.md`) estão nos arquivos
  do Projeto no Claude; copie-os para `docs/` (Etapa 0).
