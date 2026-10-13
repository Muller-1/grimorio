/**
 * Variáveis de ambiente da API, validadas com Zod na inicialização (plano de início, Etapa 9).
 * Qualquer valor inválido derruba a API na hora, com uma mensagem clara — nunca no meio de uma
 * requisição.
 */
import { z } from 'zod';

export const APP_ENVS = ['local', 'test', 'staging', 'production'] as const;
export type AppEnv = (typeof APP_ENVS)[number];

/** "true"/"1" → true; "false"/"0"/vazio → false. Nada de `Boolean("false") === true`. */
const flag = z
  .enum(['true', 'false', '1', '0', ''])
  .default('false')
  .transform((value) => value === 'true' || value === '1');

/** Endereço http(s) sem barra no fim (ex.: http://localhost:5173). */
const origin = z
  .string()
  .trim()
  .refine((value) => {
    try {
      const url = new URL(value);
      return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === value;
    } catch {
      return false;
    }
  }, 'deve ser só a origem, ex.: https://meusite.com.br (sem caminho nem barra no fim)');

/** Valor de exemplo do .env.example: aceito no computador, recusado em staging e produção. */
export const EXAMPLE_AUTH_SECRET = 'troque-este-segredo-local-por-um-com-32-caracteres-ou-mais';

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const postgresUrl = z
  .string()
  .trim()
  .refine((value) => /^postgres(ql)?:\/\//.test(value), 'deve começar com postgres://');

const EnvSchema = z
  .object({
    APP_ENV: z.enum(APP_ENVS),
    HOST: z.string().default('0.0.0.0'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    DATABASE_URL: postgresUrl,
    /** Commit publicado; as plataformas de hospedagem costumam fornecer. Sem valor, usa o do build. */
    APP_COMMIT: z.string().trim().min(1).optional(),
    /**
     * Endereço público do SITE (ADR-008). A API é acessada por baixo dele, em /api (no
     * computador, o Vite repassa /api para a porta 3000). É daqui que sai o endereço de retorno
     * do Google: `${SITE_URL}/api/auth/callback/google`.
     */
    SITE_URL: origin.default('http://localhost:5173'),
    /** Outras origens que podem usar o login (separadas por vírgula). Ex.: a prévia do site. */
    TRUSTED_ORIGINS: z
      .string()
      .default('')
      .transform((value) =>
        value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      )
      .pipe(z.array(origin)),
    /** Segredo que assina os cookies de sessão. 32+ caracteres, diferente em cada ambiente. */
    AUTH_SECRET: z.string().min(32, 'deve ter pelo menos 32 caracteres'),
    /** Credenciais do Google Cloud (ADR-008). Sem as duas, o botão "Entrar com Google" some. */
    GOOGLE_CLIENT_ID: optionalText,
    GOOGLE_CLIENT_SECRET: optionalText,
    /**
     * Segredo combinado com o repasse /api do site (ADR-009). Com ele, a API só atende /api/*
     * que chegue pelo site (cabeçalho `x-grimorio-proxy`) e confia no IP do jogador que o site
     * informa — sem isso, todos os jogadores pareceriam vir do mesmo IP para o limite de
     * tentativas. Sem valor, a API atende direto (computador, testes).
     */
    PROXY_SECRET: optionalText.pipe(
      z.string().min(32, 'deve ter pelo menos 32 caracteres').optional(),
    ),
    /** API de teste (/__test__/*, plano v2, 15.4). Nunca em produção. */
    ENABLE_TEST_API: flag,
    TEST_API_TOKEN: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (Boolean(env.GOOGLE_CLIENT_ID) !== Boolean(env.GOOGLE_CLIENT_SECRET)) {
      ctx.addIssue({
        code: 'custom',
        path: ['GOOGLE_CLIENT_SECRET'],
        message: 'GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET vão juntos (os dois ou nenhum)',
      });
    }
    const deployed = env.APP_ENV === 'production' || env.APP_ENV === 'staging';
    if (deployed && env.AUTH_SECRET === EXAMPLE_AUTH_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['AUTH_SECRET'],
        message: 'o segredo de exemplo não pode ser usado em staging nem em produção',
      });
    }
    if (env.APP_ENV === 'production' && !env.SITE_URL.startsWith('https://')) {
      ctx.addIssue({
        code: 'custom',
        path: ['SITE_URL'],
        message: 'em produção o site precisa de https (o cookie de sessão é "Secure")',
      });
    }
    if (!env.ENABLE_TEST_API) return;
    if (env.APP_ENV === 'production') {
      ctx.addIssue({
        code: 'custom',
        path: ['ENABLE_TEST_API'],
        message: 'a API de teste não pode ser ligada em produção',
      });
    }
    if (!env.TEST_API_TOKEN || env.TEST_API_TOKEN.length < 32) {
      ctx.addIssue({
        code: 'custom',
        path: ['TEST_API_TOKEN'],
        message: 'com ENABLE_TEST_API, é obrigatório um token de pelo menos 32 caracteres',
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

export class EnvError extends Error {
  override name = 'EnvError';
}

/** Lê e valida o ambiente. Lança `EnvError` listando todos os problemas de uma vez. */
export function parseEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = EnvSchema.safeParse(source);
  if (result.success) return result.data;
  const lines = result.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
  throw new EnvError(`Variáveis de ambiente inválidas:\n${lines.join('\n')}`);
}
