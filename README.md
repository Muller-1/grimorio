# Grimório (codinome)

Site gratuito de fichas de personagem e rolagem de dados para RPG compatível com a 5ª edição.
O site faz as contas: modificadores, proficiência, perícias, salvaguardas, PV, ataques.

> "Grimório" é só o codinome do repositório. O nome final do site é a decisão #3 do plano
> e não pode conter "D&D" nem "Dungeons & Dragons".

## O que já existe

| Parte                                                                                    | Onde                                                             | Estado                                        |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------- |
| Monorepo (pnpm, TypeScript estrito, ESLint, Prettier, Vitest)                            | raiz                                                             | Etapa 1 ✔                                     |
| CI (GitHub Actions) + modelo de PR                                                       | `.github/`                                                       | Etapa 2 ✔ (falta ativar a proteção da `main`) |
| Gerador aleatório (criptográfico + semente para testes)                                  | `packages/rules/src/dice/rng.ts`                                 | Etapa 3 ✔                                     |
| Parser e avaliação de expressões de dados                                                | `packages/rules/src/dice/`                                       | Etapa 4 ✔                                     |
| Site: rotas, layout, textos pt-BR, portas, `Panel`, pré-renderização de `/`              | `apps/web`                                                       | Etapa 5 ✔                                     |
| Tela inicial                                                                             | `apps/web/src/pages/HomePage.tsx`                                | ✔                                             |
| Ficha editável com cálculo automático (antecipada, ver ADR-002)                          | `apps/web/src/features/sheet` + `packages/rules/src/sheet`       | ✔                                             |
| Ganchos de teste + bot (Playwright) com os cenários B1, B11 e B12                        | `apps/web/src/testing` + `apps/qa-bot`                           | Etapa 6 ✔                                     |
| Rolador `/dados`: expressão livre, rolagem rápida, atalhos com nome, histórico, animação | `apps/web/src/pages/DicePage.tsx` + `apps/web/src/features/dice` | Etapa 7 ✔                                     |

Ainda **não** existem: publicação (Etapa 8), back-end e contas (Etapa 9 / R2).

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
pnpm build        # build de produção com a página inicial pré-renderizada (apps/web/dist)
pnpm format       # formata tudo com o Prettier
```

No Windows, o plano recomenda trabalhar dentro do WSL2, mas tudo acima também funciona no
PowerShell.

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

Toda execução imprime a semente. Os ganchos (`window.__APP_TEST__`) só existem no build de teste;
o CI falha se eles aparecerem no build de produção.

## Estrutura

```
grimorio/
├─ apps/
│  └─ web/                 # site (React + Vite + Tailwind)
│     └─ src/
│        ├─ app/           # entrada, rotas, layout, pré-renderização
│        ├─ pages/         # Início, Dados, Apoie, Créditos, Termos, Privacidade
│        ├─ features/
│        │  ├─ sheet/      # a ficha do protótipo
│        │  ├─ dice/       # rolagem, histórico, resultado
│        │  └─ toast/      # avisos curtos
│        ├─ components/ui/ # botões, diálogos, painéis (estilo shadcn/ui)
│        ├─ ports/         # rng, clock, ids, storage — única porta para o não determinismo
│        └─ lib/i18n/      # TODOS os textos em português
├─ packages/
│  ├─ shared/              # tipos e schemas Zod (ficha local)
│  ├─ rules/               # motor puro: dados + cálculos da ficha (sem React, sem Node)
│  └─ testkit/             # utilidades só para testes
└─ docs/                   # ADRs e referências aos planos
```

## Regras que o lint cobra

- `Math.random` e `Date.now` proibidos em `packages/rules`, `packages/shared` e fora de
  `apps/web/src/ports`.
- `rules` e `shared` não podem importar `node:*`, React nem Fastify.
- Nenhum código de produção importa `@grimorio/testkit`.
- Nenhum texto de interface escrito direto num componente `.tsx`: vai para
  `apps/web/src/lib/i18n/pt-BR.ts`.

## Documentação

- `docs/adr/` — decisões registradas (001: ajustes do plano de início; 002: ficha antecipada;
  003: pré-renderização; 004: terminologia e edição).
- Os planos (`plano-tecnico-site-dnd-v2.md` e `plano-de-inicio-site-dnd.md`) estão nos arquivos
  do Projeto no Claude; copie-os para `docs/` (Etapa 0).
