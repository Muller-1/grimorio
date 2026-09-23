import { cryptoRng, type Rng } from '@grimorio/rules';
import type { AppEnv } from '../config/env';
import { controllableClock, systemClock, type Clock } from './clock';
import { createEventBus, type EventBus } from './events';
import { randomIds, type IdGenerator } from './ids';
import { inMemoryMailer, unconfiguredMailer, type Mailer } from './mailer';
import { controllableRng } from './rng';

export * from './clock';
export * from './events';
export * from './ids';
export * from './mailer';
export * from './rng';

/** Tudo que é não determinístico ou externo entra por aqui (plano v2, 6.5). */
export interface Ports {
  rng: Rng;
  clock: Clock;
  mailer: Mailer;
  events: EventBus;
  ids: IdGenerator;
}

/** Portas padrão de cada ambiente. Em produção, nada é controlável nem gravado. */
export function defaultPorts(appEnv: AppEnv): Ports {
  const production = appEnv === 'production';
  return {
    rng: production ? cryptoRng : controllableRng(cryptoRng),
    clock: production ? systemClock : controllableClock(systemClock),
    mailer: production ? unconfiguredMailer : inMemoryMailer(),
    events: createEventBus({ record: !production }),
    ids: randomIds,
  };
}
