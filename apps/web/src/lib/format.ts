/** Formatação de números para a tela. O valor bruto vai sempre em `data-value`. */

/** +3, −1, +0 (com o sinal de menos tipográfico). */
export function formatModifier(n: number): string {
  return n >= 0 ? `+${n}` : `−${Math.abs(n)}`;
}

/** 30 pés → "9"; 25 pés → "7,5" (1,5 m a cada 5 pés, como nos livros em português). */
export function feetToMeters(feet: number): string {
  const m = (feet / 5) * 1.5;
  return Number.isInteger(m) ? String(m) : m.toFixed(1).replace('.', ',');
}

/** Metros digitados → pés (múltiplo de 5 mais próximo). */
export function metersToFeet(meters: number): number {
  return Math.max(0, Math.round(meters / 1.5) * 5);
}

export function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}
