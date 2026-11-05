# ADR-016 - Monitoramento e teste de carga

- **Status:** aceito
- **Data:** 2026-11-03

## Contexto

O site está no ar desde 13/10 (ADR-009): páginas e repasse `/api` na Cloudflare, API no Render
grátis (0,1 CPU e 512 MB, dorme depois de 15 min), banco no Neon grátis (suspende depois de
5 min parado, 100 CU-hora por mês). Até aqui, o que existia era o B14 (rola um dado na
produção a cada 30 min) e os painéis de cada serviço, cada um mostrando o seu pedaço.

Faltavam três respostas: (1) o caminho inteiro (site → repasse → API → banco) está
funcionando para quem usa? (2) onde a API está gastando tempo? (3) quantos jogadores ao mesmo
tempo ela aguenta, e o que acaba primeiro?

## Decisões

1. **Medidor dentro da API, sem serviço externo** (`apps/api/src/plugins/metrics.ts`, formato e
   contas em `packages/shared/src/metrics.ts`). Conta por padrão de rota (pedidos, códigos,
   tempo em faixas, bytes) e lê do processo a CPU usada e o limite do contêiner (cgroup),
   quantas vezes a CPU foi cortada, quanto o event loop ficou ocupado e atrasado, memória e a
   fila por conexões com o banco. Os contadores só crescem; quem lê subtrai duas leituras
   (`diffSnapshots`). Saídas:
   - linha `resumo do minuto` no log, só quando houve pedido do site (o `/health` do monitor
     não conta), e `pedido lento` acima de 1 s — aparecem nos Logs do Render sem instalar nada;
   - `GET /metrics` em JSON, só com `METRICS_TOKEN` (`Authorization: Bearer`); sem a variável,
     a rota não existe. Só números da API, nenhum dado de jogador.

   Sentry e estatísticas de visita continuam como decisão aberta (mudam a CSP e a política de
   privacidade). Prometheus/Grafana exigiriam mais um servidor.

2. **`/api/v1/status`**: a mesma pergunta do `/ready`, feita pelo endereço do site. Como a API só
   atende `/api/*` com o segredo do repasse, um 200 prova a cadeia inteira. A conferência do
   banco fica guardada por 1 minuto (10 s depois de uma falha), para chamar a rota muitas vezes
   não gerar consultas.

3. **Monitor externo (UptimeRobot, grátis) com cadências diferentes** (`docs/monitoramento.md`):
   `/health` a cada 5 min (decidido em 03/11: manter a API acordada; usa ~744 das 750 horas
   grátis do Render) e `/api/v1/status` a cada 60 min. O status não vai a cada 5 min porque
   consulta o banco: o Neon nunca dormiria e a cota de 100 CU-hora (≈ 400 h com 0,25 CU)
   acabaria em uns 16 dias.

4. **`pnpm monitor`**: confere páginas, API, versão publicada (comparada com `origin/main`), a
   cadeia e, com o token, os números do `/metrics`, e diz qual peça falhou.

5. **Teste de carga próprio** (`apps/load-test`, `pnpm load`), em vez de k6 ou Artillery: é
   TypeScript como o resto, usa os tipos de `shared`, imita o que o site faz (salvar por seção,
   a ficha perguntando à mesa a cada 10 s, o resumo da mesa da mestre, ações, propostas de cura)
   e lê o `/metrics` durante o teste para explicar o gargalo. O relatório (HTML e JSON) diz até
   quantos jogadores a meta é cumprida (95% em até 1 s, no máximo 1% de erros), o que acabou
   primeiro e quanto das cotas grátis cada pessoa gasta.
   - Roda contra a **mesma imagem do Render** num contêiner com `cpus: 0.1` e `mem_limit: 512m`
     (`docker-compose.yml`, perfil `carga`), com `APP_ENV=staging` e a API de teste para criar as
     contas, num banco descartável (`app_carga_staging`). Cada jogador virtual tem um IP próprio
     (cabeçalho do repasse), como na vida real; `--mesmo-ip` simula uma rede compartilhada.
   - Não simula a rede até o Render, o repasse da Cloudflare nem o Neon acordando: na produção os
     números tendem a ser um pouco piores.
   - Contra o site publicado só existe o cenário `visitante` (sem conta), com `--confirmar`; a API
     de teste continua proibida em produção.

6. **Criar ficha ou campanha com o mesmo id ao mesmo tempo devolvia 500.** Os testes novos de
   pedidos simultâneos (`concurrency.int.test.ts`) acharam: a conferência "esse id já existe?"
   vinha antes da trava por conta, então dois pedidos iguais (clique duplo, reenvio com internet
   ruim — mais provável com a API lenta) passavam juntos e o segundo batia na chave repetida.
   Agora a trava vem primeiro; o mesmo id vindo de outra conta responde 409 `CONFLICT_ID`.

7. **Leituras leves nas rotas que a mesa consulta a cada 10 s.** `/updates` lê primeiro só a
   versão e só lê a ficha inteira (que pode ter foto) quando a versão andou; o resumo da mesa
   (`/party`) lê a ficha sem o retrato. `DATABASE_POOL_MAX` (padrão 10) passa a ser uma
   variável, para testar mais conexões sem mudar código.

## Resultados (03/11/2026)

Mistura padrão: metade com a ficha sozinha, metade em mesas de 5; API limitada como o Render
grátis. Tempos do lado de quem usa.

| Jogadores ao mesmo tempo | Pedidos/s | p50    | p95      | Erros | CPU do limite | CPU cortada |
| ------------------------ | --------- | ------ | -------- | ----- | ------------- | ----------- |
| 10                       | 1,4       | 8 ms   | 182 ms   | 0%    | 11%           | 18%         |
| 50                       | 6,1       | 8 ms   | 219 ms   | 0%    | 33%           | 25%         |
| 100 (degrau de 1 min)    | 12,1      | 10 ms  | 505 ms   | 0%    | 58%           | 42%         |
| 100 (fixo, 3 min)        | 11,2      | 28 ms  | 979 ms   | 0%    | 61%           | 52%         |
| 150                      | 16,9      | 403 ms | 2.099 ms | 0%    | 83%           | 83%         |

- **100 jogadores ao mesmo tempo: aguenta, no limite** (p95 entre 0,5 e 1 s). Com 150, não.
- **O gargalo é a CPU de 0,1 núcleo.** O pedido típico é rápido (p50 de 8 a 30 ms); a cauda
  lenta vem de o contêiner só poder usar 10 ms de CPU a cada 100 ms: numa rajada, os pedidos
  esperam a próxima fatia. A fila por conexão com o banco só aparece com a CPU no teto (efeito,
  não causa).
- **Não há um ponto quente único.** Um perfil de CPU com 100 jogadores mostrou ~2 ms de CPU por
  pedido espalhados entre Fastify, montagem das consultas (Drizzle), conferência da sessão em
  todo pedido (Better Auth), validação (Zod), o driver do Postgres e o log.
- **As consultas da mesa a cada 10 s são ~45% dos pedidos** (`/updates` e `/party`).
- **Mesma rede (`--mesmo-ip`, 50 pessoas):** 12% dos pedidos recusados com 429 pelo limite de
  120 gravações por minuto por IP. O site não perde nada (guarda e tenta de novo em 3, 10, 30 e
  60 s), mas a pessoa vê o aviso de erro e o salvamento atrasa.
- **Cotas, por pessoa por hora:** jogador numa mesa ≈ 550 pedidos ao Worker e 2 a 2,3 MB de saída
  do Render; com a ficha sozinho ≈ 350 pedidos e 3,6 a 3,8 MB (cada salvamento devolve a ficha inteira,
  12 a 16 kB). Os 100 mil pedidos/dia do Worker dão ~180 horas-jogador de mesa por dia — umas 9
  mesas de 5 jogando 4 horas no mesmo dia.

## O que fica para depois (não feito agora)

- **Sala em tempo real** (campanha, parte 2): troca as consultas de 10 s por avisos na hora;
  é o que mais alivia a CPU e a cota do Worker ao mesmo tempo.
- **Cache da sessão no cookie** (`session.cookieCache` do Better Auth): tira uma consulta ao
  banco de cada pedido. **(decisão)**: uma sessão encerrada em outro aparelho continuaria valendo
  por até alguns minutos.
- **Plano pago do Render (0,5 CPU)** quando passar de ~100 pessoas ao mesmo tempo com
  frequência.
- **Limite por conta, além do IP**, antes de eventos ou turmas usando o site na mesma rede.
- **Salvar devolvendo só o que mudou** em vez da ficha inteira, e compressão entre o Render e a
  Cloudflare: reduzem a banda de saída do Render.
