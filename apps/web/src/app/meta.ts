import { t } from '@/lib/i18n';

/** Título e descrição de uma página; as que não têm os seus usam os do site. */
export function pageMeta(path: string): { title: string; description: string } {
  return t.meta.pages[path] ?? t.meta.default;
}
