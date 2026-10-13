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
  /** Chaves que começam com `prefix`. */
  keys(prefix: string): string[] {
    try {
      const storage = globalThis.localStorage;
      if (!storage) return [];
      const found: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key?.startsWith(prefix)) found.push(key);
      }
      return found;
    } catch {
      return [];
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
