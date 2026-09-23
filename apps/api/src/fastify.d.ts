import type { Env } from './config/env';
import type { DatabasePort } from './db/client';
import type { Ports } from './ports';

declare module 'fastify' {
  interface FastifyInstance {
    env: Env;
    ports: Ports;
    db: DatabasePort;
  }
}
