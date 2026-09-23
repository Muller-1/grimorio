// Testes de integração da API com Postgres de verdade (banco app_test).
//   docker compose up -d --wait      (na raiz; sobe o Postgres)
//   pnpm test:api                    (na raiz)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.int.test.ts'],
    globalSetup: ['./src/testing/int-global-setup.ts'],
    environment: 'node',
    // Todos os arquivos usam o mesmo banco: um de cada vez.
    fileParallelism: false,
  },
});
