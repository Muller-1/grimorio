/**
 * Relatório do teste: resumo no terminal e dois arquivos em --saida — um HTML para ler (com
 * gráficos, sem nada de fora) e um JSON com os números, para comparar uma rodada com a outra.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { LoadOptions } from './config';
import type { Diagnosis, StageResult } from './diagnose';
import type { RunResult, SeriesPoint } from './runner';
import { groupBy, summarize, type SampleSummary } from './stats';

const n = (value: number, digits = 0) =>
  value.toLocaleString('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
const msText = (value: number | null) => (value === null ? '—' : n(Math.round(value)));
const pctText = (value: number | null, digits = 0) =>
  value === null ? '—' : `${n(value * 100, digits)}%`;

export interface RouteRow {
  route: string;
  client: SampleSummary;
  serverAvgMs: number | null;
  serverP95Ms: number | null;
}

export function routeRows(result: RunResult): RouteRow[] {
  const seconds = result.stages.reduce((sum, s) => sum + s.seconds, 0);
  const rows: RouteRow[] = [];
  for (const [route, list] of groupBy(result.samples, (s) => s.label)) {
    const server = result.serverWhole?.routes[route] ?? null;
    rows.push({
      route,
      client: summarize(list, seconds),
      serverAvgMs: server?.avgMs ?? null,
      serverP95Ms: server?.p95Ms ?? null,
    });
  }
  return rows.sort((a, b) => b.client.count - a.client.count);
}

function pad(text: string, width: number, right = false) {
  return right ? text.padStart(width) : text.padEnd(width);
}

export function consoleSummary(result: RunResult, diagnosis: Diagnosis): string {
  const lines: string[] = [];
  lines.push('', `Resultado: ${diagnosis.verdict}`, '');
  lines.push(
    [
      pad('jogadores', 10),
      pad('pedidos/s', 10, true),
      pad('p50 ms', 8, true),
      pad('p95 ms', 8, true),
      pad('p99 ms', 8, true),
      pad('erros', 7, true),
      pad('CPU', 6, true),
      pad('cortada', 8, true),
      pad('fila bd', 8, true),
      pad('memória', 9, true),
    ].join(' '),
  );
  for (const s of result.stages) {
    const c = s.client;
    const v = s.server;
    lines.push(
      [
        pad(String(s.users), 10),
        pad(n(c.perSecond, 1), 10, true),
        pad(msText(c.p50), 8, true),
        pad(msText(c.p95), 8, true),
        pad(msText(c.p99), 8, true),
        pad(pctText(c.errorRate, 1), 7, true),
        pad(pctText(v?.cpuOfLimit ?? null), 6, true),
        pad(pctText(v?.throttledShare ?? null), 8, true),
        pad(pctText(v?.poolQueueShare ?? null), 8, true),
        pad(v ? `${n(v.rssMB)} MB` : '—', 9, true),
      ].join(' '),
    );
  }
  lines.push('', 'Achados:');
  if (diagnosis.findings.length === 0) lines.push('  nenhum problema encontrado.');
  for (const f of diagnosis.findings) {
    lines.push(`  [${f.level}] ${f.title}: ${f.detail}`);
    if (f.suggestion) lines.push(`      → ${f.suggestion}`);
  }
  return lines.join('\n');
}

// ---------- HTML ----------

const escape = (text: string) =>
  text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

interface Line {
  name: string;
  color: string;
  points: [number, number | null][];
  dashed?: boolean;
}

/** Gráfico de linhas em SVG puro (eixo x em minutos). */
export function lineChart(title: string, unit: string, lines: Line[], yMaxHint?: number): string {
  const W = 720;
  const H = 220;
  const L = 52;
  const R = 12;
  const T = 14;
  const B = 28;
  const xs = lines.flatMap((l) => l.points.map(([x]) => x));
  const ys = lines.flatMap((l) =>
    l.points.map(([, y]) => y).filter((y): y is number => y !== null),
  );
  const xMax = Math.max(1, ...xs);
  const rawMax = Math.max(yMaxHint ?? 0, ...ys, 1);
  const step = 10 ** Math.floor(Math.log10(rawMax));
  const yMax = Math.ceil(rawMax / step) * step;
  const x = (v: number) => L + (v / xMax) * (W - L - R);
  const y = (v: number) => T + (1 - v / yMax) * (H - T - B);
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((f) => {
      const v = yMax * f;
      return `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${n(v)}</text>`;
    })
    .join('');
  const ticks = Array.from({ length: Math.floor(xMax / 60) + 1 }, (_, i) => i * 60)
    .filter((_, i, all) => all.length <= 12 || i % Math.ceil(all.length / 12) === 0)
    .map((v) => `<text x="${x(v)}" y="${H - 8}" text-anchor="middle">${v / 60} min</text>`)
    .join('');
  const paths = lines
    .map((l) => {
      let d = '';
      let pen = false;
      for (const [px, py] of l.points) {
        if (py === null) {
          pen = false;
          continue;
        }
        d += `${pen ? 'L' : 'M'}${x(px).toFixed(1)},${y(Math.min(py, yMax)).toFixed(1)}`;
        pen = true;
      }
      return `<path d="${d}" fill="none" stroke="${l.color}" stroke-width="2"${l.dashed ? ' stroke-dasharray="5 4"' : ''}/>`;
    })
    .join('');
  const legend = lines
    .map((l) => `<span><i style="background:${l.color}"></i>${escape(l.name)}</span>`)
    .join('');
  return `<figure><figcaption>${escape(title)} <small>(${escape(unit)})</small></figcaption><div class="legend">${legend}</div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escape(title)}">${grid}${ticks}${paths}</svg></figure>`;
}

const COLORS = { a: '#2a9d8f', b: '#e76f51', c: '#7b6cd9', d: '#c99a2e' };

function charts(series: SeriesPoint[]): string {
  const pts = (f: (p: SeriesPoint) => number | null): [number, number | null][] =>
    series.map((p) => [p.t - (series[0]?.t ?? 0), f(p)]);
  const pct = (v: number | null | undefined) => (v === null || v === undefined ? null : v * 100);
  return [
    lineChart('Jogadores e pedidos por segundo', 'quantidade', [
      { name: 'jogadores online', color: COLORS.a, points: pts((p) => p.users) },
      { name: 'pedidos/s', color: COLORS.b, points: pts((p) => p.perSecond) },
    ]),
    lineChart('Tempo de resposta (95% dos pedidos em até…)', 'ms', [
      { name: 'visto por quem usa', color: COLORS.b, points: pts((p) => p.p95) },
      {
        name: 'dentro da API',
        color: COLORS.a,
        points: pts((p) => p.server?.p95Ms ?? null),
        dashed: true,
      },
    ]),
    lineChart(
      'Sinais da API',
      '% do tempo / do limite',
      [
        { name: 'CPU (do limite)', color: COLORS.b, points: pts((p) => pct(p.server?.cpuOfLimit)) },
        {
          name: 'CPU cortada',
          color: COLORS.d,
          points: pts((p) => pct(p.server?.throttledShare)),
        },
        {
          name: 'event loop ocupado',
          color: COLORS.c,
          points: pts((p) => pct(p.server?.loopBusy)),
        },
        {
          name: 'fila do banco',
          color: COLORS.a,
          points: pts((p) => pct(p.server?.poolQueueShare)),
        },
      ],
      100,
    ),
  ].join('');
}

function stageTable(stages: StageResult[]): string {
  const rows = stages
    .map((s) => {
      const c = s.client;
      const v = s.server;
      return `<tr><td>${s.users}</td><td>${n(c.perSecond, 1)}</td><td>${msText(c.p50)}</td><td>${msText(c.p95)}</td><td>${msText(c.p99)}</td><td>${msText(c.max)}</td><td>${pctText(c.errorRate, 1)}</td><td>${n(c.conflicts)}</td><td>${pctText(v?.cpuOfLimit ?? null)}</td><td>${pctText(v?.throttledShare ?? null)}</td><td>${pctText(v?.loopBusy ?? null)}</td><td>${msText(v?.lagP99Ms ?? null)}</td><td>${pctText(v?.poolQueueShare ?? null)}</td><td>${v ? n(v.rssMB) : '—'}</td></tr>`;
    })
    .join('');
  return `<table><thead><tr><th>Jogadores</th><th>Pedidos/s</th><th>p50 ms</th><th>p95 ms</th><th>p99 ms</th><th>Máx. ms</th><th>Erros</th><th>Conflitos (409)</th><th>CPU do limite</th><th>CPU cortada</th><th>Loop ocupado</th><th>Atraso loop p99</th><th>Fila do banco</th><th>Memória MB</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function routeTable(rows: RouteRow[]): string {
  const body = rows
    .map(
      (r) =>
        `<tr><td><code>${escape(r.route)}</code></td><td>${n(r.client.count)}</td><td>${msText(r.client.p50)}</td><td>${msText(r.client.p95)}</td><td>${msText(r.client.p99)}</td><td>${msText(r.client.max)}</td><td>${n(r.client.errors)}</td><td>${n(r.client.avgBytes / 1024, 1)}</td><td>${msText(r.serverAvgMs)}</td></tr>`,
    )
    .join('');
  return `<table><thead><tr><th>Rota</th><th>Pedidos</th><th>p50 ms</th><th>p95 ms</th><th>p99 ms</th><th>Máx. ms</th><th>Erros</th><th>Resposta média (kB)</th><th>Média dentro da API (ms)</th></tr></thead><tbody>${body}</tbody></table>`;
}

export function html(options: LoadOptions, result: RunResult, diagnosis: Diagnosis, when: Date) {
  const findings = diagnosis.findings
    .map(
      (f) =>
        `<li class="f-${f.level === 'médio' ? 'medio' : f.level}"><b>${escape(f.title)}</b> <span class="tag">${f.level}</span><br>${escape(f.detail)}${f.suggestion ? `<br><em>→ ${escape(f.suggestion)}</em>` : ''}</li>`,
    )
    .join('');
  const projections = diagnosis.projections
    .map(
      (p) =>
        `<tr><td>${escape(p.quota)}</td><td>${escape(p.limit)}</td><td>${escape(p.perUser)}</td><td>${escape(p.fits)}</td></tr>`,
    )
    .join('');
  const crashed = result.crashed.length
    ? `<p class="warn">Jogadores virtuais que pararam com erro do próprio teste: ${result.crashed.length} (ex.: ${escape(result.crashed[0]!)})</p>`
    : '';
  const date = when.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Teste de carga — ${escape(date)}</title>
<style>
:root{--bg:#f7f3ec;--fg:#2b211c;--muted:#6f6259;--line:#d9cfc2;--card:#fffdf9;--alto:#b3361f;--medio:#9a6a00;--info:#2a6f97}
@media (prefers-color-scheme:dark){:root{--bg:#121417;--fg:#e8e4de;--muted:#a39d95;--line:#33373d;--card:#1a1d21;--alto:#ff8a70;--medio:#e7b54a;--info:#79b8e0}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif}
main{max-width:1100px;margin:0 auto;padding:24px 16px 64px}
h1{font-size:1.6rem;margin:0 0 4px}h2{font-size:1.15rem;margin:32px 0 8px}
.meta{color:var(--muted);font-size:.9rem}
.verdict{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin:16px 0;font-size:1.05rem}
ul.findings{list-style:none;padding:0;margin:0}ul.findings li{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--info);border-radius:8px;padding:10px 12px;margin:8px 0}
li.f-alto{border-left-color:var(--alto)!important}li.f-medio{border-left-color:var(--medio)!important}
.tag{font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:.88rem;background:var(--card)}
th,td{border-bottom:1px solid var(--line);padding:6px 8px;text-align:right;white-space:nowrap}th:first-child,td:first-child{text-align:left}
th{color:var(--muted);font-weight:600}code{font-size:.85rem}
figure{margin:16px 0;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px}
figcaption{font-weight:600}figcaption small{color:var(--muted);font-weight:400}
svg{width:100%;height:auto;display:block}svg text{fill:var(--muted);font-size:11px}svg .grid{stroke:var(--line);stroke-width:1}
.legend{display:flex;flex-wrap:wrap;gap:12px;font-size:.85rem;color:var(--muted);margin:4px 0}.legend i{display:inline-block;width:12px;height:3px;margin-right:6px;vertical-align:middle}
.warn{color:var(--medio)}
</style></head><body><main>
<h1>Teste de carga</h1>
<p class="meta">${escape(date)} · cenário <b>${options.scenario}</b> · alvo ${escape(options.target)} · commit ${escape(result.commit ?? '?')} · ${n(result.samples.length)} pedidos medidos · meta: p95 ≤ ${n(options.sloP95Ms)} ms e erros ≤ ${n(options.sloErrorRate * 100, 1)}% · ${n(options.tableShare * 100)}% em mesas · pensar ×${n(options.think, 2)}${options.sameIp ? ' · todos no mesmo IP' : ''} · semente ${options.seed}</p>
<div class="verdict">${escape(diagnosis.verdict)}</div>
${crashed}
<h2>Achados</h2>
<ul class="findings">${findings || '<li>Nenhum problema encontrado.</li>'}</ul>
<h2>Degraus</h2>
<p class="meta">Tempos medidos do lado de quem usa, até a resposta chegar inteira. "CPU do limite" e "cortada" vêm de dentro do contêiner (0,1 CPU = Render grátis). "Fila do banco" = parte do tempo com pedido esperando conexão.</p>
<div class="scroll">${stageTable(result.stages)}</div>
<h2>Gráficos</h2>
${charts(result.series)}
<h2>Por rota (teste inteiro)</h2>
<div class="scroll">${routeTable(routeRows(result))}</div>
<h2>Cotas dos planos grátis</h2>
<p class="meta">Quanto UMA pessoa gasta por hora, medido neste teste, e quantas horas de uso cabem na cota. O Neon não entra aqui: ele conta horas com o banco acordado (100 CU-hora/mês ≈ 400 h com 0,25 CU), não pedidos.</p>
<div class="scroll"><table><thead><tr><th>Cota</th><th>Limite</th><th>Por pessoa</th><th>Cabe</th></tr></thead><tbody>${projections}</tbody></table></div>
<h2>Como foi medido</h2>
<p class="meta">A API roda a mesma imagem do Render (apps/api/Dockerfile), limitada no Docker a 0,1 CPU e 512 MB como o plano grátis. Não estão simulados: a rede até o Render, o repasse da Cloudflare e o Neon (aqui o Postgres é local, sem "acordar"). Os números reais tendem a ser um pouco piores.</p>
</main></body></html>`;
}

export function writeReports(
  options: LoadOptions,
  result: RunResult,
  diagnosis: Diagnosis,
  baseDir: string,
): { htmlPath: string; jsonPath: string } {
  const when = new Date();
  const stamp = when
    .toISOString()
    .slice(0, 16)
    .replace(/[-:T]/g, '')
    .replace(/^(\d{8})/, '$1-');
  const dir = resolve(baseDir, options.out);
  mkdirSync(dir, { recursive: true });
  const base = `carga-${options.scenario}-${options.users}-${stamp}`;
  const htmlPath = join(dir, `${base}.html`);
  const jsonPath = join(dir, `${base}.json`);
  writeFileSync(htmlPath, html(options, result, diagnosis, when));
  const { samples: _samples, ...rest } = result;
  writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        options: {
          ...options,
          proxySecret: undefined,
          testToken: undefined,
          metricsToken: undefined,
        },
        diagnosis,
        ...rest,
        routes: routeRows(result),
      },
      null,
      2,
    ),
  );
  return { htmlPath, jsonPath };
}
