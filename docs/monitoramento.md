# Monitoramento e teste de carga (ADR-016)

Como saber se o site está funcionando, onde a API está gastando tempo e quantos jogadores ela
aguenta. As decisões por trás disto estão no
[ADR-016](adr/016-monitoramento-e-carga.md).

## 1. O que cada serviço já mostra (e o que falta)

| Serviço    | Onde                                   | O que mostra                                                          |
| ---------- | -------------------------------------- | --------------------------------------------------------------------- |
| Render     | painel da API → **Logs**, **Events**   | o log da API (agora com "resumo do minuto" e "pedido lento"), deploys, reinícios; e-mail ao chegar perto dos limites do plano |
| Cloudflare | Worker `grimorio` → **Observability**  | pedidos e erros do repasse `/api`, tempo de CPU do Worker              |
| Neon       | projeto → **Monitoring** e **Usage**   | conexões, uso de CPU do banco e quanto da cota do mês já foi gasto     |
| GitHub     | **Actions → Monitor sintético (B14)**  | a cada 30 min abre `/dados` na produção e rola um dado                 |

Nenhum deles avisa quando o caminho inteiro quebra para quem usa (o repasse com o segredo
errado, o banco suspenso por cota) nem diz qual rota está lenta. Para isso existem as três
peças abaixo.

## 2. As peças novas

- **`/api/v1/status`** (pelo endereço do site): responde 200 só se o pedido passou pelo
  repasse da Cloudflare com o segredo certo, chegou na API e o banco respondeu. 503 com
  `"database": { "status": "down" }` = a API está de pé, mas o banco não. A conferência do
  banco fica guardada por 1 minuto, então chamar muitas vezes não gera consultas a mais.
- **Medidor da API**: a cada minuto com movimento, uma linha `resumo do minuto` no log do
  Render (pedidos, p95, erros 5xx, 429, CPU usada do limite, CPU cortada, event loop ocupado,
  memória, fila do banco, kB enviados). Pedido acima de 1 s vira `pedido lento` com a rota.
- **`/metrics`** (no endereço da API, com token): os mesmos números em JSON, desde que a API
  subiu. Só existe se a variável `METRICS_TOKEN` estiver definida.
- **`pnpm monitor`**: confere tudo de uma vez do seu computador e diz qual peça falhou.

```bash
pnpm monitor
pnpm monitor --site=https://grimorio.net.br          # depois de ligar o domínio
METRICS_TOKEN=… pnpm monitor                          # também mostra os números da API
```

### Ligar o `/metrics` no Render (opcional)

1. Gere um token: `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`.
2. Render → `grimorio-api` → **Environment** → **Add Environment Variable** → `METRICS_TOKEN` =
   o token. Salvar publica de novo.
3. Guarde o token só com você (gerenciador de senhas). Quem tem o token vê números da API
   (pedidos, tempos, CPU), nenhum dado de jogador.

## 3. Monitor externo com aviso por e-mail (UptimeRobot, grátis)

Crie uma conta em uptimerobot.com e três monitores do tipo **HTTP(s)**:

| Monitor          | Endereço                                                         | Intervalo  | Para quê                                                                   |
| ---------------- | ---------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------- |
| API acordada     | `https://grimorio-api-k28f.onrender.com/health`                  | **5 min**  | mantém a API acordada (sem "Acordando o servidor…") e avisa se ela cair    |
| Site             | `https://grimorio.gustavomullercavalheiro2.workers.dev/dados`    | 5 min      | as páginas (Cloudflare)                                                    |
| Caminho completo | `https://grimorio.gustavomullercavalheiro2.workers.dev/api/v1/status` | **60 min** | site → repasse → API → banco                                          |

- **Não** ponha o `/api/v1/status` (nem o `/ready`) a cada 5 minutos: ele consulta o banco, e o
  Neon grátis suspende o banco depois de 5 minutos parado justamente para economizar a cota
  (100 CU-hora por mês, cerca de 400 horas com o banco acordado). Consultando a cada 5 minutos,
  o banco nunca dorme e a cota acaba em uns 16 dias. De hora em hora gasta pouco.
- Manter a API acordada usa ~744 das 750 horas grátis do Render por mês: dá para **um**
  serviço grátis ligado o mês inteiro na conta, não dois.
- Em **Alert Contacts**, confirme o seu e-mail. Em cada monitor, marque o aviso por e-mail.
- Opcional: **Status Pages → New** com os três monitores. Gera uma página pública (endereço do
  UptimeRobot) para os jogadores verem se o site está no ar.
- Quando ligar o `grimorio.net.br`, troque os endereços do site nos monitores.

## 4. Teste de carga

Roda no seu computador, com a API limitada como no Render grátis (mesma imagem, 0,1 CPU e
512 MB) e um banco descartável. Precisa do Docker Desktop aberto.

```bash
pnpm load:up                                   # sobe a API do teste (primeira vez: ~2 min)
pnpm load                                      # escada: 10 → 25 → 50 → 100 → 150 jogadores
pnpm load --cenario=fixo --usuarios=100 --duracao=300
pnpm load --cenario=pico --usuarios=100        # todo mundo entra em 5 s
pnpm load --mesmo-ip                           # todos na mesma rede (escola, evento)
pnpm load --pensar=0.5                         # jogadores duas vezes mais ativos
pnpm load:down                                 # desliga a API do teste
```

- Os jogadores virtuais fazem o que o site faz: metade usa a ficha sozinha (abre, edita, salva
  por seção); a outra metade joga em mesas de 5 (a mestre olha o resumo da mesa a cada 10 s e
  aplica dano e cura; cada jogador tem a ficha perguntando à mesa a cada 10 s, usa o canal de
  ações, propõe cura e aceita as que recebe). Opções completas em
  `apps/load-test/src/config.ts`.
- O relatório sai em `apps/load-test/relatorios/` (HTML para ler, JSON para comparar). Ele diz
  até quantos jogadores a meta foi cumprida (95% dos pedidos em até 1 s, no máximo 1% de
  erros), o que acabou primeiro (CPU, conexões com o banco, memória, limite por IP), quais
  rotas somam mais tempo e quanto das cotas grátis (Cloudflare, Render) cada pessoa gasta.
- Para mudar o número de conexões com o banco: `CARGA_POOL_MAX=20 pnpm load:up`. Para ver o
  custo do log de cada pedido: `CARGA_LOG_LEVEL=warn pnpm load:up`.
- Contra o site publicado só existe o cenário `visitante` (sem conta), e é preciso dizer
  `--confirmar`: os outros criam contas pela API de teste, que não existe em produção de
  propósito.
