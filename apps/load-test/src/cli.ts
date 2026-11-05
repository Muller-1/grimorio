/**
 * Teste de carga (ADR-016). Na raiz do repositório:
 *   pnpm load:up                      sobe a API limitada como o Render grátis (Docker)
 *   pnpm load                         escada 10 → 25 → 50 → 100 → 150 jogadores
 *   pnpm load --cenario=fixo --usuarios=100 --duracao=300
 *   pnpm load --cenario=pico --usuarios=100
 *   pnpm load --mesmo-ip              todos na mesma rede (escola, evento)
 *   pnpm load:down                    desliga a API do teste
 * Opções completas em src/config.ts. O relatório sai em apps/load-test/relatorios/.
 */
import { OptionsError, parseOptions, stagesFor } from './config';
import { diagnose, meetsSlo } from './diagnose';
import { createClient, Recorder } from './http';
import { consoleSummary, writeReports } from './report';
import { seededRng } from './rng';
import { runStages } from './runner';
import { fakeIp, prepare, SetupError, waitForApi, type VirtualUser } from './setup';

const log = (line: string) => console.log(line);

async function main(): Promise<number> {
  let options;
  try {
    options = parseOptions(process.argv.slice(2).filter((arg) => arg !== '--'));
  } catch (error) {
    if (error instanceof OptionsError) {
      console.error(error.message);
      return 2;
    }
    throw error;
  }

  const recorder = new Recorder();
  const client = createClient(
    { target: options.target, proxySecret: options.proxySecret },
    recorder,
  );
  const rng = seededRng(options.seed);
  const peak = Math.max(...stagesFor(options).map((s) => s.users));

  log(
    `Teste de carga · cenário ${options.scenario} · até ${peak} jogadores · alvo ${options.target}`,
  );
  let users: VirtualUser[];
  try {
    if (options.scenario === 'visitante') {
      users = Array.from({ length: peak }, (_, index) => ({
        index,
        name: `Visitante ${index + 1}`,
        kind: 'visitante' as const,
        ip: fakeIp(index, options.sameIp),
        cookie: '',
        characters: [],
      }));
    } else {
      log('Preparando (não entra na conta):');
      await waitForApi(client);
      users = await prepare(
        client,
        {
          users: peak,
          tableShare: options.tableShare,
          sameIp: options.sameIp,
          testToken: options.testToken,
          rng: rng.fork(999_999),
        },
        log,
      );
    }
  } catch (error) {
    if (error instanceof SetupError) {
      console.error(`\n${error.message}`);
      return 2;
    }
    throw error;
  }
  if (!options.metricsToken) {
    log('Sem token de métricas: o relatório só terá o lado de quem usa (sem CPU, fila do banco…).');
  }

  log('Rodando:');
  const result = await runStages(options, users, client, recorder, rng, log);
  const diagnosis = diagnose({
    stages: result.stages,
    sloP95Ms: options.sloP95Ms,
    sloErrorRate: options.sloErrorRate,
    sameIp: options.sameIp,
    serverRoutes: result.serverWhole?.routes ?? null,
    rates: result.rates,
    bandwidthGb: options.bandwidthGb,
    restarts: result.restarts,
  });
  log(consoleSummary(result, diagnosis));
  const { htmlPath } = writeReports(options, result, diagnosis, process.cwd());
  log(`\nRelatório: ${htmlPath}`);

  // Para o CI: falha se o degrau do número pedido (--usuarios) não cumpriu a meta.
  const judged =
    result.stages.find((s) => s.users === options.users) ?? result.stages[result.stages.length - 1];
  return judged && meetsSlo(judged, options.sloP95Ms, options.sloErrorRate) ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(2);
  },
);
