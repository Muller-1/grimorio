import { buildApp } from './app';
import { EnvError, parseEnv } from './config/env';

let env;
try {
  env = parseEnv();
} catch (error) {
  if (error instanceof EnvError) {
    console.error(`${error.message}\n\nDica: copie apps/api/.env.example para apps/api/.env.`);
    process.exit(1);
  }
  throw error;
}

const app = await buildApp(env);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    app.log.info({ signal }, 'encerrando');
    void app.close().then(() => process.exit(0));
  });
}

await app.listen({ host: env.HOST, port: env.PORT });
