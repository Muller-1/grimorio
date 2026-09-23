/** Porta de relógio do front (plano v2, 6.5). Testes poderão fixar o horário. */
let fixed: string | null = null;

export function nowIso(): string {
  return fixed ?? new Date().toISOString();
}

export function setNow(iso: string | null): void {
  fixed = iso;
}
