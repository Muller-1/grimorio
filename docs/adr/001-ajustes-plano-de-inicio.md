# ADR-001 — Ajustes do plano de início em relação ao roadmap do v2

- **Status:** aceito
- **Data:** 2026-09-22

## Contexto

Ao detalhar as etapas do plano de início, três pontos do roadmap do plano técnico v2 foram
refinados (plano de início, seção 2).

## Decisão

| #   | Ajuste                                                                                                                                  | Motivo                                                                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| A-1 | A base do back-end (Fastify, Postgres, `/health`, API de teste, _spike_ de login) sai da Fase 0 e vai para a Etapa 9, entre o R1 e o R2 | O R1 não tem contas nem banco. Construir o back antes atrasa o primeiro lançamento sem benefício.                                   |
| A-2 | Variáveis nos dados (`@str`, `@prof`) ficam para o início do R2                                                                         | Sem ficha não há de onde ler os valores. O parser já reconhece o nó de variável; a avaliação devolve `variable-unavailable` até lá. |
| A-3 | Estimativa até o R1 publicado revista de 7–10 para 9–12 semanas                                                                         | O v2 subestimou o parser e a tela do rolador; em compensação, a Fase 0 ficou menor (A-1).                                           |

## Consequências

- `packages/rules/src/dice` implementa a gramática v2 completa, exceto a resolução de variáveis.
- `apps/api` e `packages/content` só nascem na Etapa 9.
