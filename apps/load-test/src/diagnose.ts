/**
 * Diagnóstico automático: com quantos jogadores a API ainda cumpre a meta, o que acabou primeiro
 * (CPU, conexões com o banco, memória, limite por IP…) e quanto das cotas grátis cada jogador
 * gasta. Só regras simples sobre os números; quem decide o que fazer é você.
 */
import type { IntervalSummary } from '@grimorio/shared/metrics';
import type { UserKind } from './http';
import type { SampleSummary, UsageRate } from './stats';

export interface StageResult {
  index: number;
  users: number;
  seconds: number;
  client: SampleSummary;
  /** Diferença do /metrics entre o começo e o fim do degrau (null sem token de métricas). */
  server: IntervalSummary | null;
}

export interface Finding {
  level: 'alto' | 'médio' | 'info';
  title: string;
  detail: string;
  suggestion?: string;
}

export interface Projection {
  quota: string;
  limit: string;
  perUser: string;
  fits: string;
}

export interface Diagnosis {
  /** Maior número de jogadores em que todos os degraus até ali cumpriram a meta. */
  capacity: number | null;
  maxTested: number;
  verdict: string;
  findings: Finding[];
  projections: Projection[];
}

export interface DiagnoseInput {
  stages: StageResult[];
  sloP95Ms: number;
  sloErrorRate: number;
  sameIp: boolean;
  /** Rotas do servidor no teste inteiro (para "onde a API gasta tempo"). */
  serverRoutes: IntervalSummary['routes'] | null;
  rates: UsageRate[];
  bandwidthGb: number;
  /** Quantas vezes a API reiniciou durante o teste (os contadores do /metrics voltaram a zero). */
  restarts?: number;
}

const pct = (value: number, digits = 0) =>
  `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: digits })}%`;
const num = (value: number, digits = 0) =>
  value.toLocaleString('pt-BR', { maximumFractionDigits: digits });
const ms = (value: number | null) => (value === null ? '—' : `${num(Math.round(value))} ms`);

export function meetsSlo(stage: StageResult, sloP95Ms: number, sloErrorRate: number): boolean {
  return (
    stage.client.count > 0 &&
    stage.client.p95 !== null &&
    stage.client.p95 <= sloP95Ms &&
    stage.client.errorRate <= sloErrorRate
  );
}

const KIND_NAMES: Partial<Record<UserKind, string>> = {
  solo: 'jogador com a ficha sozinho',
  jogador: 'jogador numa mesa',
  mestre: 'mestre de uma mesa',
  visitante: 'visitante sem conta',
};

/** Pedidos no Worker da Cloudflare por dia no plano grátis. */
export const WORKER_REQUESTS_PER_DAY = 100_000;

export function diagnose(input: DiagnoseInput): Diagnosis {
  const { stages, sloP95Ms, sloErrorRate } = input;
  const findings: Finding[] = [];
  let capacity: number | null = null;
  let firstFail: StageResult | null = null;
  for (const stage of stages) {
    if (!meetsSlo(stage, sloP95Ms, sloErrorRate)) {
      firstFail = stage;
      break;
    }
    capacity = stage.users;
  }
  const maxTested = Math.max(0, ...stages.map((s) => s.users));
  // O degrau que explica o limite: o primeiro que falhou ou, se nenhum falhou, o mais pesado.
  const focus = firstFail ?? stages[stages.length - 1] ?? null;
  const server = focus?.server ?? null;

  let verdict: string;
  if (stages.length === 0) verdict = 'O teste não chegou a rodar nenhum degrau.';
  else if (!firstFail) {
    verdict = `Cumpriu a meta (95% dos pedidos em até ${ms(sloP95Ms)} e no máximo ${pct(sloErrorRate, 1)} de erros) em todos os degraus, até ${maxTested} jogadores ao mesmo tempo.`;
  } else if (capacity === null) {
    verdict = `Não cumpriu a meta já no primeiro degrau (${firstFail.users} jogadores).`;
  } else {
    verdict = `Cumpre a meta até ${capacity} jogadores ao mesmo tempo; com ${firstFail.users}, não (p95 ${ms(firstFail.client.p95)}, erros ${pct(firstFail.client.errorRate, 1)}).`;
  }

  if (focus && server) {
    const where = `com ${focus.users} jogadores`;
    const cpuHot =
      (server.cpuOfLimit !== null && server.cpuOfLimit >= 0.85) ||
      (server.throttledShare !== null && server.throttledShare >= 0.3);
    if (cpuHot) {
      findings.push({
        level: firstFail ? 'alto' : 'médio',
        title: 'A CPU da API é o gargalo',
        detail:
          `${where}, a API usou ${server.cpuOfLimit === null ? '?' : pct(server.cpuOfLimit)} do limite de CPU` +
          (server.throttledShare !== null
            ? ` e ficou parada esperando CPU em ${pct(server.throttledShare)} dos períodos`
            : '') +
          `. O event loop ficou ocupado ${server.loopBusy === null ? '?' : pct(server.loopBusy)} do tempo.`,
        suggestion:
          'O plano grátis do Render tem 0,1 CPU. Saídas: o plano pago mais barato (0,5 CPU, 5× mais) ' +
          'ou deixar mais leves as rotas que mais gastam tempo (tabela "Onde a API gasta tempo").',
      });
    }
    if (server.poolQueueShare !== null && server.poolQueueShare >= 0.1) {
      const queue = `${where}, havia pedido esperando uma conexão livre em ${pct(server.poolQueueShare)} do tempo (fila média ${num(server.avgPoolQueue ?? 0, 1)}).`;
      findings.push(
        cpuHot
          ? {
              level: 'info',
              title: 'Fila do banco (efeito da CPU)',
              detail: `${queue} Com a CPU cortada, cada pedido segura a conexão por mais tempo dentro da transação.`,
              suggestion:
                'Mais conexões não resolvem enquanto a CPU estiver no teto: resolver a CPU primeiro.',
            }
          : {
              level: 'alto',
              title: 'Fila por conexão com o banco',
              detail: queue,
              suggestion:
                'Subir DATABASE_POOL_MAX (hoje 10) usando o endereço com pooler do Neon (-pooler ' +
                'no host), e conferir se alguma consulta segura a conexão por muito tempo.',
            },
      );
    }
    if (!cpuHot && server.lagP99Ms !== null && server.lagP99Ms >= 250) {
      findings.push({
        level: 'médio',
        title: 'Cálculo pesado travando a API',
        detail: `${where}, o event loop chegou a atrasar ${ms(server.lagP99Ms)} (p99) sem a CPU estar no teto: algum pedido faz muito trabalho de uma vez.`,
        suggestion: 'Ver a rota mais lenta abaixo e o que ela calcula a cada chamada.',
      });
    }
    if (server.memoryOfLimit !== null && server.memoryOfLimit >= 0.8) {
      findings.push({
        level: 'alto',
        title: 'Memória perto do limite',
        detail: `${where}, a API usou ${num(server.rssMB)} MB (${pct(server.memoryOfLimit)} do limite). Se passar, o Render reinicia a API.`,
      });
    }
    const gap =
      focus.client.p95 !== null && server.p95Ms !== null ? focus.client.p95 - server.p95Ms : null;
    if (gap !== null && gap > 500 && cpuHot) {
      findings.push({
        level: 'info',
        title: 'Fila antes de a API começar a atender',
        detail: `O p95 visto por quem usa (${ms(focus.client.p95)}) é bem maior que o medido dentro da API (até ${ms(server.p95Ms)}): os pedidos esperam na porta enquanto a CPU está ocupada.`,
      });
    }
  }

  if (input.restarts) {
    findings.push({
      level: 'alto',
      title: 'A API reiniciou durante o teste',
      detail: `${input.restarts} reinício(s): costuma ser falta de memória (o contêiner é morto) ou um erro que derruba o processo.`,
      suggestion: 'Ver o log da API (docker compose logs api-carga) no horário.',
    });
  }

  const allClient = stages.map((s) => s.client);
  const limited = allClient.reduce((sum, c) => sum + c.rateLimited, 0);
  if (limited > 0) {
    findings.push({
      level: input.sameIp ? 'médio' : 'alto',
      title: 'Limite de pedidos por IP (429)',
      detail: `${num(limited)} pedidos recusados com 429.${input.sameIp ? ' Todos os jogadores estavam no mesmo IP (--mesmo-ip): é o que acontece numa escola ou evento no mesmo wi-fi.' : ''}`,
      suggestion: input.sameIp
        ? 'O limite de escrita é 120 por minuto por IP. Para eventos, contar por conta (além do IP) ou subir o limite.'
        : 'Com um IP por jogador isso não deveria acontecer: conferir as regras em plugins/rate-limit.ts.',
    });
  }
  const failures = allClient.reduce((sum, c) => sum + c.noResponse, 0);
  const errors5xx = allClient.reduce(
    (sum, c) =>
      sum + Object.entries(c.codes).reduce((s, [code, n]) => s + (code.startsWith('5') ? n : 0), 0),
    0,
  );
  if (failures + errors5xx > 0) {
    findings.push({
      level: 'alto',
      title: 'Pedidos que falharam',
      detail: `${num(errors5xx)} respostas 5xx e ${num(failures)} sem resposta (rede ou mais de 30 s).`,
      suggestion: 'Ver o log da API ("pedido lento" e erros) no horário do degrau.',
    });
  }

  if (input.serverRoutes) {
    const costs = Object.entries(input.serverRoutes)
      .map(([route, r]) => ({ route, total: (r.avgMs ?? 0) * r.count, ...r }))
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total);
    const all = costs.reduce((sum, r) => sum + r.total, 0);
    if (all > 0 && costs[0]) {
      const top = costs
        .slice(0, 3)
        .map((r) => `${r.route} (${pct(r.total / all)}; média ${ms(r.avgMs)})`);
      findings.push({
        level: 'info',
        title: 'Onde a API gasta tempo',
        detail: `As rotas que mais somam tempo: ${top.join(', ')}.`,
      });
    }
  }

  const projections: Projection[] = [];
  for (const rate of input.rates) {
    const name = KIND_NAMES[rate.kind];
    if (!name || rate.requestsPerHour <= 0) continue;
    projections.push({
      quota: 'Cloudflare: pedidos ao Worker (/api)',
      limit: `${num(WORKER_REQUESTS_PER_DAY)} por dia`,
      perUser: `${num(rate.requestsPerHour)} pedidos por hora (${name})`,
      fits: `${num(WORKER_REQUESTS_PER_DAY / rate.requestsPerHour)} horas de ${name} por dia`,
    });
    if (rate.bytesPerHour > 0) {
      const monthly = input.bandwidthGb * 1024 ** 3;
      projections.push({
        quota: 'Render: banda de saída',
        limit: `${num(input.bandwidthGb, 1)} GB por mês (confira em Billing)`,
        perUser: `${num(rate.bytesPerHour / 1024 / 1024, 1)} MB por hora (${name})`,
        fits: `${num(monthly / rate.bytesPerHour)} horas de ${name} por mês`,
      });
    }
  }
  return { capacity, maxTested, verdict, findings, projections };
}
