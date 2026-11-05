import { parseSheetFile, sheetFileName, type LocalSheet } from '@grimorio/shared';
import { tt } from '@/lib/i18n/transfer';
import { downloadJson } from '@/lib/local-data';
import { useSheetStore } from './store';

/** Exportar e importar ficha (.json). Fica fora do pedaço da ficha: carrega no clique. */
export function exportOpenSheet(): void {
  const sheet = useSheetStore.getState().sheet;
  downloadJson(sheetFileName(sheet), sheet);
}

/** Lê o arquivo escolhido: a ficha (já migrada) e os textos da confirmação, ou o aviso de erro. */
export function readImport(
  text: string,
  unnamed: string,
): { sheet: LocalSheet; title: string; text: string; done: string } | { error: string } {
  const sheet = parseSheetFile(text);
  if (!sheet) return { error: tt.failed };
  const name = sheet.identity.name || unnamed;
  return { sheet, title: tt.confirmTitle, text: tt.confirmText(name), done: tt.done(name) };
}
