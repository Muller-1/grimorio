/**
 * O que o site guarda neste navegador (página Configurações, "Seus dados"): a ficha avulsa, os
 * atalhos de dados, o rascunho do assistente, as preferências e a cópia das fichas da conta.
 * Tudo fica no localStorage com o prefixo `grimorio.`, então exportar e apagar olham só para ele:
 * o que outros sites guardam no mesmo navegador nunca entra.
 */
import { nowIso } from '@/ports/clock';
import { safeStorage } from '@/ports/storage';

export const STORAGE_PREFIX = 'grimorio.';
/**
 * A cópia das fichas da conta (e a marca de quem entrou). Apagar não mexe nela: pode ter edição
 * ainda não enviada, e ela já sai sozinha quando a pessoa clica em Sair (features/auth/store.ts).
 */
export const ACCOUNT_PREFIX = 'grimorio.conta.';

export interface LocalDataExport {
  site: 'grimorio';
  formato: 1;
  exportadoEm: string;
  /** Cada chave como estava guardada; objetos e listas vão abertos, para dar para ler o arquivo. */
  dados: Record<string, unknown>;
}

/** As chaves do site neste navegador, em ordem (o arquivo sai igual a cada exportação). */
export function localKeys(): string[] {
  return safeStorage.keys(STORAGE_PREFIX).sort();
}

export function buildExport(): LocalDataExport {
  const dados: Record<string, unknown> = {};
  for (const key of localKeys()) {
    const raw = safeStorage.get(key);
    if (raw === null) continue;
    // Só abre objeto e lista: '0', '1' e 'dark' continuam texto, como estavam guardados.
    if (!/^\s*[[{]/.test(raw)) {
      dados[key] = raw;
      continue;
    }
    try {
      dados[key] = JSON.parse(raw);
    } catch {
      dados[key] = raw;
    }
  }
  return { site: 'grimorio', formato: 1, exportadoEm: nowIso(), dados };
}

export function exportFileName(): string {
  return `grimorio-dados-${nowIso().slice(0, 10)}.json`;
}

/** Baixa o arquivo .json com tudo (fica no aparelho; nada passa pelo servidor). */
/** Baixa `data` como um arquivo .json (Configurações → Exportar, exportar ficha). */
export function downloadJson(fileName: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Alguns navegadores ainda leem o endereço logo depois do clique.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadExport(): void {
  downloadJson(exportFileName(), buildExport());
}

/** O que "Apagar" leva: tudo do site, menos a cópia das fichas da conta. */
export function clearableKeys(): string[] {
  return localKeys().filter((key) => !key.startsWith(ACCOUNT_PREFIX));
}

/**
 * Apaga o que o site guardou neste navegador e diz quantas chaves saíram. Não mexe na conta nem
 * na cópia dela aqui (ver ACCOUNT_PREFIX).
 */
export function clearLocalData(): number {
  const keys = clearableKeys();
  for (const key of keys) safeStorage.remove(key);
  return keys.length;
}
