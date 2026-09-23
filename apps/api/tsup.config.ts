// Empacotamento da API (plano v2, 6.6): um bundle que já inclui os pacotes do workspace
// (@grimorio/*, que são TypeScript fonte). Dependências de terceiros ficam em node_modules.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as {
  version: string;
};

function commit(): string {
  const fromCi = process.env.GITHUB_SHA ?? process.env.APP_COMMIT;
  if (fromCi) return fromCi.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'local';
  }
}

export default defineConfig({
  entry: { server: 'src/server.ts', 'db/migrate': 'src/db/migrate.ts' },
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  noExternal: [/^@grimorio\//],
  define: {
    __API_VERSION__: JSON.stringify(version),
    __API_COMMIT__: JSON.stringify(commit()),
  },
});
