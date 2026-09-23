# ADR-005 — Publicação na Cloudflare Pages, segurança e orçamentos (Etapa 8)

- **Status:** aceito
- **Data:** 2026-09-23

## Contexto

A Etapa 8 publica o R1: páginas institucionais, hospedagem estática com pré-visualização por
pull request, orçamentos de desempenho no CI e o monitor sintético B14. O usuário escolheu a
Cloudflare Pages. A plataforma de apoio (decisão #2) e o nome/domínio (decisão #3) seguem em
aberto.

## Decisões

1. **Hospedagem: Cloudflare Pages ligada ao GitHub.** Cada pull request ganha um endereço de
   pré-visualização (o "staging" do front no R1, com `X-Robots-Tag: noindex` automático) e a
   `main` vai para produção. Até existir domínio, o site fica no subdomínio gratuito
   `*.pages.dev`. Passo a passo em [docs/publicacao.md](../publicacao.md).

2. **Um HTML por rota, e 404 de verdade.** O build gera `index.html`, `apoie.html`,
   `creditos.html`, `termos.html`, `privacidade.html` (HTML completo, hidratado),
   `ficha.html`, `dados.html` (só a moldura do site, desenhada no navegador, com
   `modulepreload` dos arquivos da página) e `404.html`. Com um `404.html` na raiz, a Cloudflare
   sai do modo SPA: endereço desconhecido responde **404** em vez de 200 com a página inicial.
   Isso amplia o [ADR-003](003-pre-renderizacao.md) e resolve dois problemas: abrir `/dados` não
   mostra mais, por um instante, o conteúdo da página inicial; e buscadores não indexam páginas
   inexistentes. A lista de rotas fica num lugar só (`PAGES` em `apps/web/src/app/routes.tsx`),
   usada pelo roteador e pelo build.

3. **Cabeçalhos de segurança em `apps/web/public/_headers`**, com uma Content-Security-Policy
   estrita: scripts só do próprio site, sem `eval` e sem script inline; o site não pode ser
   embutido em outro (`frame-ancestors 'none'`). Duas concessões, documentadas no arquivo:
   `style-src 'unsafe-inline'` (os diálogos do Radix injetam um `<style>`) e `img-src https:`
   (o retrato da ficha é um link externo). O Zod roda em modo `jitless` para não tentar
   `new Function` (`packages/shared/src/zod.ts`; o lint obriga o uso desse módulo).

4. **O `vite preview` imita a Cloudflare**: lê o bloco `/*` do `_headers`, serve `/dados` a
   partir de `dados.html`, redireciona `/dados/` para `/dados` e responde 404 com `404.html`.
   Assim o bot e o Lighthouse testam o site com a mesma política da produção. O bot falha se o
   navegador registrar qualquer violação da CSP (evento `securitypolicyviolation`).

5. **Orçamentos no CI** (RNF-01): `size-limit` com gzip — JS inicial ≤ 200 kB, CSS inicial
   ≤ 15 kB, página `/dados` ≤ 70 kB, página `/ficha` ≤ 100 kB (as duas carregadas sob demanda).
   Lighthouse CI (emulação de celular, 3 execuções, mediana) em `/dados` e `/`: LCP ≤ 2,5 s,
   CLS ≤ 0,1, acessibilidade ≥ 0,95 e boas práticas ≥ 0,9 bloqueiam; desempenho e SEO só avisam,
   porque as máquinas do CI variam.

6. **B14 no GitHub Actions** (`.github/workflows/sintetico.yml`), a cada 30 minutos, contra a
   variável de repositório `PRODUCTION_URL`. Não usa ganchos de teste. Depois de 2 falhas
   seguidas (RNF-12) abre ou comenta uma issue. Usa o Chrome que já vem na máquina do GitHub.

7. **Configuração por variáveis de ambiente no build**: `VITE_REPORT_URL` ("Relatar problema",
   RF-104), `VITE_SUPPORT_PLATFORM` e `VITE_SUPPORT_URL` (decisão #2), `VITE_CONTACT_EMAIL`.
   Links que não sejam `https` são ignorados. Sem valor, as páginas explicam que o canal ainda
   não existe. Trocar um valor na Cloudflare e publicar de novo basta; o código não muda.

8. **Marca** (RNF-14): um teste varre `apps/web` e falha se aparecer a marca do jogo original
   no nome, logo ou textos.

## Adiado

- **Rastreamento de erros (Sentry)**: exige conta e muda a política de privacidade, que hoje
  diz que o site não usa ferramentas de rastreamento. Quando entrar: criar a conta, liberar o
  domínio do Sentry em `connect-src` no `_headers`, enviar só dados técnicos (sem conteúdo da
  ficha) e atualizar a página de Privacidade no mesmo PR.
- **Métricas agregadas** (ex.: Cloudflare Web Analytics): mesma condição acima.
- **Domínio definitivo** (decisão #3) e **plataforma de apoio** (decisão #2).

## Consequências

- O plano pedia B1, B11 e B12 "contra a pré-visualização". As pré-visualizações da Cloudflare
  são builds de produção, sem ganchos de teste (salvaguarda 1), então esses cenários rodam no CI
  contra o build de teste servido do mesmo jeito que a Cloudflare serve (item 4). Contra a
  pré-visualização e a produção roda o B14, que não precisa de ganchos.

- Rota nova no site = uma entrada em `PAGES`; o build gera o HTML dela e o CI confere.
- Serviço externo novo = mexer no `_headers` e na página de Privacidade juntos; o bot acusa se
  a CSP bloquear algo.
- Em repositório **privado**, o B14 gasta de 1 a 2 minutos de Actions por execução (de 1.440 a
  2.880 por mês), perto ou acima da cota gratuita de 2.000. Em repositório público é gratuito.
  Se o repositório for privado, troque o agendamento para a cada hora (`0 * * * *`).
