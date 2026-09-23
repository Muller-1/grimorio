import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./apps/web/src', import.meta.url)),
    },
  },
  test: {
    include: [
      'packages/*/src/**/*.test.ts',
      'apps/*/src/**/*.test.{ts,tsx}',
      'apps/web/build/**/*.test.ts',
    ],
    // Testes de integração da API precisam de Postgres: rodam com `pnpm test:api`.
    exclude: [...configDefaults.exclude, '**/*.int.test.ts'],
    environment: 'node',
    // Toda execução com fast-check imprime a semente; para reproduzir: FC_SEED=<n> pnpm test
    reporters: ['default'],
  },
});
