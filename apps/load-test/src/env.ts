/**
 * Liga e desliga a API do teste de carga (serviço `api-carga` do docker-compose.yml): a mesma
 * imagem do Render, com 0,1 CPU e 512 MB, num banco descartável (`app_carga_staging`).
 *   pnpm load:up      sobe o Postgres, cria o banco se faltar, monta a imagem e espera a API
 *   pnpm load:down    desliga só a API do teste (o Postgres continua)
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const DATABASE = 'app_carga_staging';

function compose(args: string[], capture = false): string {
  const out = execFileSync('docker', ['compose', ...args], {
    cwd: ROOT,
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    encoding: 'utf8',
  });
  return typeof out === 'string' ? out : '';
}

function up() {
  console.log('Postgres…');
  compose(['up', '-d', '--wait', 'postgres']);
  const exists = compose(
    [
      'exec',
      '-T',
      'postgres',
      'psql',
      '-U',
      'app',
      '-d',
      'app_dev',
      '-tAc',
      `select 1 from pg_database where datname = '${DATABASE}'`,
    ],
    true,
  ).trim();
  if (exists !== '1') {
    console.log(`Criando o banco ${DATABASE}…`);
    compose(['exec', '-T', 'postgres', 'createdb', '-U', 'app', DATABASE]);
  }
  console.log('API do teste (imagem do Render, 0,1 CPU e 512 MB)…');
  compose(['--profile', 'carga', 'up', '-d', '--build', '--wait', 'api-carga']);
  console.log('\nPronto: http://localhost:10000  →  agora rode `pnpm load`.');
}

function down() {
  compose(['--profile', 'carga', 'rm', '--stop', '--force', 'api-carga']);
}

const command = process.argv[2];
try {
  if (command === 'up') up();
  else if (command === 'down') down();
  else {
    console.error('Use: tsx src/env.ts up | down');
    process.exit(2);
  }
} catch (error) {
  console.error(
    `\nNão deu certo: ${(error as Error).message}\nO Docker Desktop está aberto? (docker version)`,
  );
  process.exit(1);
}
