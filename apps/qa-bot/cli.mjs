// Bot de testes — uso (pela raiz do repositório):
//   pnpm bot                         todos os cenários, semente aleatória
//   pnpm bot --scenario=B11          só um cenário
//   pnpm bot --scenario=B11 --seed=8812   reproduz exatamente uma falha
//   pnpm bot --env=https://exemplo.pages.dev   contra um site já publicado (sem build local)
//   pnpm bot --headed                abre o navegador na tela
//   pnpm bot --project=celular       só a tela de celular
import { spawn } from 'node:child_process';
import { randomInt } from 'node:crypto';
import { createRequire } from 'node:module';

// Usa SEMPRE o Playwright deste projeto (nunca um instalado globalmente no computador).
const playwrightCli = createRequire(import.meta.url).resolve('@playwright/test/cli');

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value = 'true'] = arg.replace(/^--/, '').split('=');
    return [key, value];
  }),
);

const seed = args.seed ?? String(randomInt(1, 2 ** 31 - 1));
const env = { ...process.env, BOT_SEED: seed };
if (args.env && args.env !== 'local') env.BOT_BASE_URL = args.env;

const playwrightArgs = ['test'];
if (args.scenario) playwrightArgs.push('--grep', `@${String(args.scenario).toUpperCase()}\\b`);
if (args.project) playwrightArgs.push('--project', args.project);
if (args.headed === 'true') playwrightArgs.push('--headed');

const again = `pnpm bot${args.scenario ? ` --scenario=${args.scenario}` : ''} --seed=${seed}`;
console.log(`\nsemente: ${seed}   (para reproduzir: ${again})\n`);

const child = spawn(process.execPath, [playwrightCli, ...playwrightArgs], {
  stdio: 'inherit',
  env,
});
child.on('exit', (code) => {
  if (code !== 0) console.log(`\nfalhou com a semente ${seed}. Reproduza com: ${again}\n`);
  process.exit(code ?? 1);
});
