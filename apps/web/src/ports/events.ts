/**
 * Eventos internos do front (plano v2, 15.3). Hoje só `roll`. Na Etapa 6, os ganchos de
 * teste repassam cada evento para `window` como `app:<tipo>`, e o bot espera por eles.
 */
export type AppEvent = { type: 'roll'; label: string; expression: string; total: number };

type Listener = (event: AppEvent) => void;
const listeners = new Set<Listener>();

export function emit(event: AppEvent): void {
  for (const listener of listeners) listener(event);
}

/** Devolve a função que cancela a inscrição. */
export function onAny(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
