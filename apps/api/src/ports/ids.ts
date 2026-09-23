import { randomUUID } from 'node:crypto';

/** Gerador de ids (plano v2, 6.5). Nos testes, uma sequência previsível. */
export interface IdGenerator {
  uuid(): string;
}

export const randomIds: IdGenerator = { uuid: () => randomUUID() };

/** 00000000-0000-4000-8000-000000000001, …002, … — válidos como UUID v4 e fáceis de ler. */
export function sequentialIds(start = 1): IdGenerator {
  let next = start;
  return {
    uuid: () => `00000000-0000-4000-8000-${String(next++).padStart(12, '0')}`,
  };
}
