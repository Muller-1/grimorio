# ADR-003 — Pré-renderização da página inicial (prova de conceito da Etapa 5)

- **Status:** aceito
- **Data:** 2026-09-22

## Contexto

A Etapa 5 pede uma prova de conceito, com limite de 1 dia, de gerar a rota `/` como HTML
estático no build. Se não saísse, o plano B era publicar como SPA.

## Decisão

A prova de conceito funcionou, sem dependências extras:

1. `vite build` gera o site normal (cliente).
2. `vite build --ssr src/app/entry-server.tsx` gera uma versão para o Node que desenha as rotas
   com `StaticRouter` e `renderToString`.
3. `scripts/prerender.mjs` coloca o HTML da rota `/` dentro de `dist/index.html`, com
   `data-prerendered="/"` no `#root`, e apaga a pasta temporária.
4. No navegador, `main.tsx` usa `hydrateRoot` quando a rota atual é a pré-renderizada e
   `createRoot` nas outras (que recebem o mesmo arquivo como fallback de SPA).

A ficha e o rolador são carregados sob demanda (`React.lazy`), então a página inicial não
baixa Zod nem o motor da ficha.

## Consequências

- Para pré-renderizar mais rotas (ex.: o compêndio no R4), basta incluí-las em `ROUTES` no
  script e publicar cada uma como `rota/index.html`.
- Componentes das páginas públicas não podem acessar `window`/`localStorage` durante a
  renderização. A ficha (que usa) não é pré-renderizada.
- O CI confere que `dist/index.html` contém `data-prerendered="/"`.
