import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  dialect: 'postgresql',
  schema: './schema.ts',
  dbCredentials: { url: 'postgres://app:app@localhost:5432/spike_auth_test' },
});
