/** Barramento de eventos de domínio (plano v2, 6.5 e 15.4: `/__test__/events`). */
export interface DomainEvent {
  type: string;
  at: string;
  data?: unknown;
}

type Handler = (event: DomainEvent) => void;

export interface EventBus {
  publish(event: DomainEvent): void;
  subscribe(handler: Handler): () => void;
  /** Eventos gravados (só fora de produção). `type` filtra por tipo. */
  recorded(filter?: { type?: string }): readonly DomainEvent[];
  clearRecorded(): void;
}

export function createEventBus({ record }: { record: boolean }): EventBus {
  const handlers = new Set<Handler>();
  const log: DomainEvent[] = [];
  return {
    publish(event) {
      if (record) log.push(event);
      for (const handler of handlers) handler(event);
    },
    subscribe(handler) {
      handlers.add(handler);
      return () => void handlers.delete(handler);
    },
    recorded: (filter) => log.filter((e) => !filter?.type || e.type === filter.type),
    clearRecorded: () => void (log.length = 0),
  };
}
