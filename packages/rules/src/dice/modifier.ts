/** Monta "base+mod" / "base-mod" / "base" (ex.: "1d20" e +5 → "1d20+5"). */
export function withModifier(base: string, mod: number): string {
  if (mod === 0) return base;
  return mod > 0 ? `${base}+${mod}` : `${base}-${Math.abs(mod)}`;
}
