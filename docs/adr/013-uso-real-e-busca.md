# ADR-013 — Pronto para uso de verdade: correções, servidor acordando e busca do Google

- **Status:** aceito
- **Data:** 2026-10-22

## Contexto

Revisão de 22/10, antes de chamar mais gente para usar: corrigir o que estava quebrado ou mal
acabado, deixar o site **usável de verdade** e **aparecer no Google**, e planejar (só planejar)
escala, concorrência na campanha e o que falta para um site profissional. Dois problemas vistos
no tema escuro: o título "Salvaguardas contra Morte" quebrado e, no glossário de Primeiros
passos, abrir "Modificador" esticava a linha de "Atributo" na outra coluna.

Além desses, uma auditoria automática (5 temas × computador, tablet, celular e celular de
360 px × 21 telas, procurando rolagem lateral, texto estourando a caixa e erros no console) e
uma revisão visual acharam os outros pontos abaixo.

## Decisões

### Correções de tela

1. **Cabeçalho dos painéis** (`components/ui/panel.tsx`): o título nunca fica mais estreito que
   a sua maior palavra; se as ações (ex.: "Descanso curto/longo", o dado da salvaguarda) não
   cabem ao lado, descem para a linha de baixo. Antes, ora o título quebrava no meio da palavra
   ("Salvaguarda/s"), ora ficava espremido em 1 px no celular.
2. **Glossário** (`pages/StartPage.tsx`): duas listas independentes (uma por coluna) em vez de
   uma grade; abrir um termo não mexe mais na outra coluna.
3. **PV no celular**: Quantidade, Dano, Cura e Temp. numa grade de 4 colunas (o "Temp." caía
   sozinho na linha de baixo); ícones somem abaixo de 380 px.
4. **Perícias no celular**: uma coluna abaixo de 480 px (em duas, os nomes eram cortados:
   "Investiga…"). Desfaz uma mudança do ADR-012.
5. **Créditos**: o bloco de atribuição do SRD quebra a linha no celular de 360 px.
6. **Texto velho** no assistente ("magias numa próxima versão") atualizado.
7. **Rodapé**: "Relatar problema" só aparece quando o link existe (antes, um texto sem link).

### Servidor "acordando" (plano grátis do Render)

A API dorme após 15 min sem uso e leva até ~1 min para acordar. Antes, o site mostrava
"o servidor não respondeu" e só tentava de novo se a pessoa recarregasse.

- `features/auth/store.ts`: `checking`, `slow` (a consulta passou de 2,5 s) e `nextRetryAt`.
  Sem resposta, tenta de novo sozinho depois de **5, 10, 20, 30 e 60 s**; depois disso, só pelo
  botão. Também tenta na hora quando a internet volta ou a pessoa volta para a aba. Dois
  pedidos ao mesmo tempo viram uma consulta só.
- `features/auth/ServerStatus.tsx`: "Acordando o servidor… leva até 1 minuto" com indicador, ou
  "não respondeu… Tentando de novo em N s" com **Tentar agora**. Usado em Entrar, Meus
  personagens e na ficha da conta (que ganhou "Tentar de novo" quando só a ficha falha). O
  ícone da conta pisca enquanto o servidor acorda.
- Nada muda no controle de acesso do beta.

### Busca do Google (SEO básico)

Tudo gerado no build, sem nada a mais no pacote do navegador (`app/seo.ts`, usado pelo
`scripts/prerender.mjs`):

- **Endereço canônico** em cada página pública e `og:url`.
- **`noindex`** em Entrar, Meus personagens, ficha da conta e 404 (páginas pessoais).
- **`sitemap.xml`** com as 9 páginas públicas e **`robots.txt`** (tudo liberado menos `/api/`,
  com o endereço do sitemap).
- **Dados estruturados** (schema.org `WebSite` + `WebApplication`, grátis, pt-BR) na inicial.
- **Imagem de prévia** (`public/og.jpg`, 1200×630, 57 kB) para WhatsApp e redes, e
  `apple-touch-icon.png` para quem salva o site na tela inicial do celular.
- Variáveis do build: `VITE_SITE_URL` (padrão: o endereço `workers.dev` atual; trocar quando
  houver domínio próprio) e `VITE_GOOGLE_SITE_VERIFICATION` (código do Search Console; o build
  falha com mensagem clara se colarem a tag inteira em vez do código).
- O bot B1 confere sitemap, robots, canônico, `noindex` e a imagem.

As páginas "shell" (ficha, dados, criar) chegam só com a moldura e o Google as desenha com o
JavaScript, como faz hoje com a maioria dos sites; as de texto (inicial, primeiros passos,
termos…) já chegam completas.

## Planejamento (sem código)

`docs/plano-escala-e-campanha.md`: concorrência na campanha (canal de **ações** relativas e
idempotentes + tabela de eventos, em vez de salvar a seção inteira), papéis (dona, mestre,
jogador), tempo real (consulta periódica primeiro; depois uma "sala" por campanha com Durable
Objects), gargalos de escala e a lista do que falta para um site profissional, em ordem.

## Pendências fora do código

Search Console (verificar e enviar o sitemap), e-mail de contato e link de "Relatar problema",
monitor externo do `/health` (opcional, mantém a API acordada), domínio próprio (#3), revisão
jurídica (#4), plano pago do Render (opcional). Passo a passo em `docs/publicacao.md`, seção 6.
