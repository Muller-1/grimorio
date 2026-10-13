import type { Env } from './config/env';
import type { DatabasePort } from './db/client';
import type { Auth } from './modules/auth/auth';
import type { CurrentUser } from './modules/auth/routes';
import type { Ports } from './ports';

declare module 'fastify' {
  interface FastifyInstance {
    env: Env;
    ports: Ports;
    db: DatabasePort;
    /** Só existe com banco Postgres (ver `buildApp`). */
    auth: Auth;
    currentUser(request: FastifyRequest): Promise<CurrentUser | null>;
  }
}
