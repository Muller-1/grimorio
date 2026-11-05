/**
 * Opções do teste de carga. Tudo tem padrão: `pnpm load` sozinho já roda a escada até 150
 * jogadores contra a API local limitada como no Render grátis (`pnpm load:up`).
 *
 *   --cenario=escada     10 → 25 → 50 → 100 → 150 jogadores (degraus de --usuarios), acha o limite
 *   --cenario=fixo       --usuarios ao mesmo tempo por --duracao segundos
 *   --cenario=pico       todo mundo entra nos primeiros 5 s (início de sessão, aula, evento)
 *   --cenario=visitante  só visitantes sem conta (páginas + /api/v1/session): serve para o site no ar
 *   --usuarios=100  --degrau=60  --duracao=180  --mesas=50 (% em mesas de 5)  --pensar=1
 *   --mesmo-ip      todos atrás do mesmo IP (escola, wi-fi de evento): mostra o limite por IP
 *   --alvo=http://localhost:10000   --semente=42   --saida=relatorios
 *   --banda-gb=5    banda de saída do Render por mês, para a projeção (confira no painel)
 *   --confirmar     obrigatório para mirar um endereço fora do seu computador
 */

export const SCENARIOS = ['escada', 'fixo', 'pico', 'visitante'] as const;
export type Scenario = (typeof SCENARIOS)[number];

export interface LoadOptions {
  scenario: Scenario;
  users: number;
  stepSeconds: number;
  durationSeconds: number;
  target: string;
  /** 0 a 1: parte dos jogadores que está numa mesa (5 por mesa: 1 mestre + 4). */
  tableShare: number;
  sameIp: boolean;
  /** Multiplica o tempo que cada jogador "pensa" entre uma ação e outra (0,5 = o dobro de ações). */
  think: number;
  seed: number;
  out: string;
  bandwidthGb: number;
  confirmRemote: boolean;
  proxySecret: string | null;
  testToken: string;
  metricsToken: string | null;
  /** Meta: 95% dos pedidos em até isso, e no máximo esta fração de erros. */
  sloP95Ms: number;
  sloErrorRate: number;
}

/** Os mesmos valores do serviço `api-carga` do docker-compose.yml (só valem no computador). */
export const LOCAL_DEFAULTS = {
  target: 'http://localhost:10000',
  proxySecret: 'segredo-do-repasse-do-teste-de-carga-32c',
  testToken: 'token-da-api-de-teste-da-carga-com-32-caracteres',
  metricsToken: 'token-das-metricas-da-carga-com-32-caracteres',
} as const;

export class OptionsError extends Error {
  override name = 'OptionsError';
}

function parseArgs(argv: string[]): Map<string, string> {
  const args = new Map<string, string>();
  for (const arg of argv) {
    if (!arg.startsWith('--')) throw new OptionsError(`opção desconhecida: ${arg}`);
    const [key, ...rest] = arg.slice(2).split('=');
    args.set(key!, rest.length > 0 ? rest.join('=') : 'true');
  }
  return args;
}

function number(
  args: Map<string, string>,
  key: string,
  fallback: number,
  min: number,
  max: number,
) {
  const raw = args.get(key);
  if (raw === undefined) return fallback;
  const value = Number(raw.replace(',', '.'));
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new OptionsError(`--${key} deve ser um número entre ${min} e ${max} (recebido: ${raw})`);
  }
  return value;
}

export function isLocal(target: string): boolean {
  const host = new URL(target).hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
}

export function parseOptions(
  argv: string[],
  env: Record<string, string | undefined> = process.env,
): LoadOptions {
  const args = parseArgs(argv);
  const known = new Set([
    'cenario',
    'usuarios',
    'degrau',
    'duracao',
    'alvo',
    'mesas',
    'mesmo-ip',
    'pensar',
    'semente',
    'saida',
    'banda-gb',
    'confirmar',
    'meta-p95',
    'meta-erros',
  ]);
  for (const key of args.keys()) {
    if (!known.has(key)) throw new OptionsError(`opção desconhecida: --${key}`);
  }
  const scenario = (args.get('cenario') ?? 'escada') as Scenario;
  if (!SCENARIOS.includes(scenario)) {
    throw new OptionsError(`--cenario deve ser ${SCENARIOS.join(', ')}`);
  }
  const target = (args.get('alvo') ?? env.CARGA_ALVO ?? LOCAL_DEFAULTS.target).replace(/\/+$/, '');
  try {
    new URL(target);
  } catch {
    throw new OptionsError(`--alvo não é um endereço válido: ${target}`);
  }
  const local = isLocal(target);
  const confirmRemote = args.get('confirmar') === 'true';
  if (!local && !confirmRemote) {
    throw new OptionsError(
      `O alvo ${target} não é o seu computador. Teste de carga em site publicado gasta cota dos ` +
        'serviços (Cloudflare, Render, Neon). Se é isso mesmo, repita com --confirmar.',
    );
  }
  if (!local && scenario !== 'visitante') {
    throw new OptionsError(
      'Fora do computador só o cenário "visitante" funciona: os outros criam contas pela API de ' +
        'teste, que não existe em produção (de propósito).',
    );
  }
  const users = number(args, 'usuarios', 100, 1, local ? 1000 : 100);
  return {
    scenario,
    users,
    stepSeconds: number(args, 'degrau', 60, 10, 900),
    durationSeconds: number(
      args,
      'duracao',
      scenario === 'pico' ? 120 : 180,
      10,
      local ? 3600 : 120,
    ),
    target,
    tableShare: number(args, 'mesas', 50, 0, 100) / 100,
    sameIp: args.get('mesmo-ip') === 'true',
    think: number(args, 'pensar', 1, 0.05, 10),
    seed: number(args, 'semente', 42, 0, 2 ** 32 - 1),
    out: args.get('saida') ?? 'relatorios',
    bandwidthGb: number(args, 'banda-gb', 5, 0.1, 10_000),
    confirmRemote,
    proxySecret: local ? (env.CARGA_PROXY_SECRET ?? LOCAL_DEFAULTS.proxySecret) : null,
    testToken: env.CARGA_TEST_TOKEN ?? LOCAL_DEFAULTS.testToken,
    metricsToken: local
      ? (env.CARGA_METRICS_TOKEN ?? LOCAL_DEFAULTS.metricsToken)
      : (env.CARGA_METRICS_TOKEN ?? null),
    sloP95Ms: number(args, 'meta-p95', 1000, 50, 60_000),
    sloErrorRate: number(args, 'meta-erros', 1, 0, 100) / 100,
  };
}

export interface Stage {
  users: number;
  seconds: number;
  /** Em quantos segundos os novos jogadores do degrau entram (espalhados, como na vida real). */
  rampSeconds: number;
}

/** Os degraus de cada cenário. */
export function stagesFor(
  o: Pick<LoadOptions, 'scenario' | 'users' | 'stepSeconds' | 'durationSeconds'>,
): Stage[] {
  if (o.scenario === 'escada') {
    const steps = [0.1, 0.25, 0.5, 1, 1.5].map((f) => Math.max(1, Math.round(o.users * f)));
    return [...new Set(steps)].map((users) => ({
      users,
      seconds: o.stepSeconds,
      rampSeconds: Math.min(15, o.stepSeconds / 3),
    }));
  }
  if (o.scenario === 'pico') {
    return [{ users: o.users, seconds: o.durationSeconds, rampSeconds: 5 }];
  }
  return [
    {
      users: o.users,
      seconds: o.durationSeconds,
      rampSeconds: Math.min(30, o.durationSeconds / 4),
    },
  ];
}
