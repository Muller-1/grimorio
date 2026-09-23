# Grimório (codinome)

Site gratuito de fichas de personagem e rolagem de dados para RPG compatível com a 5ª edição.
O site faz as contas: modificadores, proficiência, perícias, salvaguardas, PV, ataques.

> "Grimório" é só o codinome do repositório. O nome final do site é a decisão #3 do plano
> e não pode conter "D&D" nem "Dungeons & Dragons".

## O que já existe

| Parte                                                                                    | Onde                                                             | Estado                                                         |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------- |
| Monorepo (pnpm, TypeScript estrito, ESLint, Prettier, Vitest)                            | raiz                                                             | Etapa 1 ✔                                                      |
| CI (GitHub Actions) + modelo de PR                                                       | `.github/`                                                       | Etapa 2 ✔ (falta ativar a proteção da `main`)                  |
| Gerador aleatório (criptográfico + semente para testes)                                  | `packages/rules/src/dice/rng.ts`                                 | Etapa 3 ✔                                                      |
| Parser e avaliação de expressões de dados                                                | `packages/rules/src/dice/`                                       | Etapa 4 ✔                                                      |
| Site: rotas, layout, textos pt-BR, portas, `Panel`, pré-renderização de `/`              | `apps/web`                                                       | Etapa 5 ✔                                                      |
| Tela inicial                                                                             | `apps/web/src/pages/HomePage.tsx`                                | ✔                                                              |
| Ficha editável com cálculo automático (antecipada, ver ADR-002)                          | `apps/web/src/features/sheet` + `packages/rules/src/sheet`       | ✔                                                              |
| Rolador `/dados`: expressão livre, rolagem rápida, atalhos com nome, histórico, animação | `apps/web/src/pages/DicePage.tsx` + `apps/web/src/features/dice` | Etapa 7 ✔ (faltam os cenários do bot, que dependem da Etapa 6) |

Ainda **não** existem: ganchos de teste e bot (Etapa 6), publicação (Etapa 8), back-end e
contas (Etapa 9 / R2).

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
