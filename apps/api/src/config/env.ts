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
    /** API de teste (/__test__/*, plano v2, 15.4). Nunca em produção. */
    ENABLE_TEST_API: flag,
    TEST_API_TOKEN: z.string().optional(),
  })
  .superRefine((env, ctx) => {
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
