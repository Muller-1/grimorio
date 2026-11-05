/**
 * Roda os degraus: põe os jogadores virtuais para dentro aos poucos, lê o /metrics da API a cada
 * 5 s e no começo e no fim de cada degrau, e guarda tudo para o relatório.
 */
import {
  diffSnapshots,
  type IntervalSummary,
  type MetricsSnapshot,
} from '@grimorio/shared/metrics';
import { stagesFor, type LoadOptions, type Stage } from './config';
import type { StageResult } from './diagnose';
import { sleep, type Client, type Recorder, type Sample, type UserKind } from './http';
import type { Rng } from './rng';
import type { VirtualUser } from './setup';
import { percentile, summarize, usageRates, type UsageRate } from './stats';
import { behaviorFor } from './users';

const SERIES_EVERY_MS = 5_000;

export interface SeriesPoint {
  t: number;
  users: number;
  perSecond: number;
  p95: number | null;
  errors: number;
  server: IntervalSummary | null;
}

export interface RunResult {
  plan: Stage[];
  stages: StageResult[];
  samples: Sample[];
  series: SeriesPoint[];
  serverWhole: IntervalSummary | null;
  rates: UsageRate[];
  restarts: number;
  crashed: string[];
  commit: string | null;
  durationSeconds: number;
}

export async function readMetrics(
  target: string,
  token: string | null,
): Promise<MetricsSnapshot | null> {
  if (!token) return null;
  try {
    const res = await fetch(`${target}/metrics`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok ? ((await res.json()) as MetricsSnapshot) : null;
  } catch {
    return null;
  }
}

export async function runStages(
  options: LoadOptions,
  users: VirtualUser[],
  client: Client,
  recorder: Recorder,
  rng: Rng,
  log: (line: string) => void,
): Promise<RunResult> {
  const plan = stagesFor(options);
  const controller = new AbortController();
  const running: Promise<void>[] = [];
  const crashed: string[] = [];
  const online = new Map<number, { kind: UserKind; since: number }>();
  let started = 0;
  let restarts = 0;
  const metricsToken = options.metricsToken;

  const start = (user: VirtualUser) => {
    if (controller.signal.aborted) return;
    online.set(user.index, { kind: user.kind, since: recorder.elapsedSeconds() });
    const ctx = {
      client,
      rng: rng.fork(user.index),
      signal: controller.signal,
      think: options.think,
    };
    running.push(
      behaviorFor(user.kind)(user, ctx).catch((error: unknown) => {
        crashed.push(`${user.name}: ${(error as Error).message}`);
      }),
    );
  };

  // Série a cada 5 s (gráficos do relatório).
  const series: SeriesPoint[] = [];
  let lastSnap = await readMetrics(options.target, metricsToken);
  const firstSnap = lastSnap;
  let lastT = recorder.elapsedSeconds();
  let seenSamples = recorder.samples.length;
  let sampling = Promise.resolve();
  const sampler = setInterval(() => {
    sampling = sampling.then(async () => {
      const snap = await readMetrics(options.target, metricsToken);
      const t = recorder.elapsedSeconds();
      const fresh = recorder.samples.slice(seenSamples).filter((s) => s.stage >= 0);
      seenSamples = recorder.samples.length;
      if (snap && lastSnap && snap.uptimeMs < lastSnap.uptimeMs) restarts++;
      series.push({
        t,
        users: online.size,
        perSecond: fresh.length / Math.max(0.001, t - lastT),
        p95: percentile(
          fresh.map((s) => s.ms).sort((a, b) => a - b),
          95,
        ),
        errors: fresh.filter((s) => s.status === 0 || s.status >= 500 || s.status === 429).length,
        server: snap ? diffSnapshots(lastSnap, snap) : null,
      });
      if (snap) lastSnap = snap;
      lastT = t;
    });
  }, SERIES_EVERY_MS);

  const stages: StageResult[] = [];
  for (const [index, stage] of plan.entries()) {
    recorder.stage = index;
    const before = await readMetrics(options.target, metricsToken);
    const tStart = recorder.elapsedSeconds();
    const newcomers = users.slice(started, stage.users);
    started = Math.max(started, stage.users);
    newcomers.forEach((user, k) => {
      const delay = (k / Math.max(1, newcomers.length)) * stage.rampSeconds * 1000;
      setTimeout(() => start(user), delay);
    });
    await sleep(stage.seconds * 1000, new AbortController().signal);
    const after = await readMetrics(options.target, metricsToken);
    const seconds = recorder.elapsedSeconds() - tStart;
    const own = recorder.samples.filter((s) => s.stage === index);
    const result: StageResult = {
      index,
      users: stage.users,
      seconds,
      client: summarize(own, seconds),
      server: after ? diffSnapshots(before, after) : null,
    };
    stages.push(result);
    const c = result.client;
    const s = result.server;
    log(
      `  degrau ${index + 1}/${plan.length}: ${stage.users} jogadores · ` +
        `${c.perSecond.toFixed(1)} pedidos/s · p95 ${c.p95 === null ? '—' : Math.round(c.p95)} ms · ` +
        `erros ${(c.errorRate * 100).toFixed(1)}%` +
        (s
          ? ` · CPU ${s.cpuOfLimit === null ? '?' : Math.round(s.cpuOfLimit * 100)}% do limite` +
            ` · fila do banco ${s.poolQueueShare === null ? '?' : Math.round(s.poolQueueShare * 100)}%`
          : ''),
    );
  }

  // Fim: todos saem; espera os pedidos em andamento (no máximo 35 s).
  const end = recorder.elapsedSeconds();
  controller.abort();
  clearInterval(sampler);
  await Promise.race([Promise.allSettled(running), sleep(35_000, new AbortController().signal)]);
  await sampling;
  const lastSnapshot = await readMetrics(options.target, metricsToken);

  const userSeconds: Partial<Record<UserKind, number>> = {};
  for (const { kind, since } of online.values()) {
    userSeconds[kind] = (userSeconds[kind] ?? 0) + Math.max(0, end - since);
  }
  const measured = recorder.samples.filter((s) => s.stage >= 0);
  return {
    plan,
    stages,
    samples: measured,
    series,
    serverWhole: lastSnapshot ? diffSnapshots(firstSnap, lastSnapshot) : null,
    rates: usageRates(measured, userSeconds),
    restarts,
    crashed,
    commit: lastSnapshot?.commit ?? null,
    durationSeconds: end,
  };
}
