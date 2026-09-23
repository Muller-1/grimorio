/** Relógio injetável (plano v2, 6.5). Serviços nunca chamam `Date.now()` direto. */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };

/** Relógio que a API de teste pode parar ou adiantar (ex.: "avançar 31 dias"). */
export interface ControllableClock extends Clock {
  /** Para o relógio num instante. `null` volta ao relógio real. */
  set(iso: string | null): void;
  /** Adianta o relógio parado. */
  advance(ms: number): void;
}

export function controllableClock(base: Clock = systemClock): ControllableClock {
  let fixed: Date | null = null;
  return {
    now: () => (fixed ? new Date(fixed) : base.now()),
    set(iso) {
      if (iso === null) {
        fixed = null;
        return;
      }
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) throw new RangeError(`data inválida: ${iso}`);
      fixed = date;
    },
    advance(ms) {
      fixed = new Date((fixed ?? base.now()).getTime() + ms);
    },
  };
}

export function isControllableClock(clock: Clock): clock is ControllableClock {
  return typeof (clock as Partial<ControllableClock>).set === 'function';
}
