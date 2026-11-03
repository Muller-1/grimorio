/**
 * O que o site guarda neste navegador (página Configurações, "Seus dados"): a ficha avulsa, os
 * atalhos de dados, o rascunho do assistente, as preferências e a cópia das fichas da conta.
 * Tudo fica no localStorage com o prefixo `grimorio.`, então exportar e apagar olham só para ele:
 * o que outros sites guardam no mesmo navegador nunca entra.
 */
import { nowIso } from '@/ports/clock';
import { safeStorage } from '@/ports/storage';

export const STORAGE_PREFIX = 'grimorio.';

export interface LocalDataExport {
  site: 'grimorio';
  formato: 1;
  exportadoEm: string;
  /** Cada chave como estava guardada; o que é JSON vai aberto, para dar para ler o arquivo. */
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
export function downloadExport(): void {
  const blob = new Blob([JSON.stringify(buildExport(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = exportFileName();
  document.body.append(link);
  link.click();
  link.remove();
  // Alguns navegadores ainda leem o endereço logo depois do clique.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Apaga tudo o que o site guardou neste navegador e diz quantas chaves saíram. Não mexe na
 * conta: as fichas salvas nela continuam no servidor e voltam ao entrar de novo.
 */
export function clearLocalData(): number {
  const keys = localKeys();
  for (const key of keys) safeStorage.remove(key);
  return keys.length;
}
