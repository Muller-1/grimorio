/**
 * Acesso ao armazenamento do navegador. Pode falhar (aba anônima, cota cheia, site
 * bloqueado), então toda leitura e escrita é protegida e nunca derruba a tela.
 */
export const safeStorage = {
  get(key: string): string | null {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  set(key: string, value: string): boolean {
    try {
      globalThis.localStorage?.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  remove(key: string): void {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // ignora
    }
  },
};
