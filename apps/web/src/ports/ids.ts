/** Porta de ids (plano v2, 6.5). */
let counter = 0;

export function newId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  // Navegadores muito antigos: id suficiente para uso local.
  counter += 1;
  return `id-${Date.now().toString(36)}-${counter}`;
}
