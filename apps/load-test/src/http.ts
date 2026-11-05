/**
 * Cliente HTTP do teste de carga: cada pedido é cronometrado (até o corpo chegar inteiro) e
 * anotado com um rótulo estável (o padrão da rota, não o endereço com ids).
 */
import { performance } from 'node:perf_hooks';

export type UserKind = 'solo' | 'jogador' | 'mestre' | 'visitante' | 'preparo';

export interface Sample {
  /** Segundos desde o início do teste. */
  t: number;
  stage: number;
  kind: UserKind;
  label: string;
  /** 0 = não houve resposta (rede ou tempo esgotado). */
  status: number;
  ms: number;
  bytes: number;
  failure?: 'rede' | 'tempo';
}

export class Recorder {
  readonly samples: Sample[] = [];
  readonly startedAt = performance.now();
  stage = -1;

  elapsedSeconds(): number {
    return (performance.now() - this.startedAt) / 1000;
  }

  add(sample: Omit<Sample, 't' | 'stage'>): void {
    this.samples.push({ ...sample, t: this.elapsedSeconds(), stage: this.stage });
  }
}

export interface RequestInput {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  label: string;
  kind: UserKind;
  body?: unknown;
  cookie?: string;
  ip?: string;
  headers?: Record<string, string>;
}

export interface Response<T> {
  status: number;
  data: T | null;
  ms: number;
}

export interface ClientOptions {
  target: string;
  proxySecret: string | null;
  timeoutMs?: number;
}

export const PROXY_SECRET_HEADER = 'x-grimorio-proxy';
export const CLIENT_IP_HEADER = 'x-grimorio-client-ip';

export function createClient(options: ClientOptions, recorder: Recorder) {
  const timeoutMs = options.timeoutMs ?? 30_000;

  async function request<T = unknown>(input: RequestInput): Promise<Response<T>> {
    const headers: Record<string, string> = { accept: 'application/json', ...input.headers };
    if (input.body !== undefined) headers['content-type'] = 'application/json';
    if (input.cookie) headers.cookie = input.cookie;
    // Como o repasse do site faz: prova que veio "pelo site" e diz o IP de quem pediu.
    if (options.proxySecret) {
      headers[PROXY_SECRET_HEADER] = options.proxySecret;
      if (input.ip) headers[CLIENT_IP_HEADER] = input.ip;
    }
    const started = performance.now();
    let status = 0;
    let text = '';
    let failure: Sample['failure'];
    try {
      const res = await fetch(options.target + input.path, {
        method: input.method,
        headers,
        ...(input.body !== undefined ? { body: JSON.stringify(input.body) } : {}),
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'manual',
      });
      status = res.status;
      text = await res.text();
    } catch (error) {
      failure = (error as Error).name === 'TimeoutError' ? 'tempo' : 'rede';
    }
    const ms = performance.now() - started;
    recorder.add({
      kind: input.kind,
      label: input.label,
      status,
      ms,
      bytes: Buffer.byteLength(text),
      ...(failure ? { failure } : {}),
    });
    let data: T | null = null;
    if (text) {
      try {
        data = JSON.parse(text) as T;
      } catch {
        data = null;
      }
    }
    return { status, data, ms };
  }

  return { request, target: options.target };
}

export type Client = ReturnType<typeof createClient>;

/** Espera `ms`, mas acorda na hora se o teste acabar. */
export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted || ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(done, ms);
    function done() {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      resolve();
    }
    signal.addEventListener('abort', done, { once: true });
  });
}
