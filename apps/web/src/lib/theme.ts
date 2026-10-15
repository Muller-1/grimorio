/**
 * Tema visual (pedido dos testadores, 14/10/2026). As cores ficam em styles/index.css; aqui só
 * a escolha: guardada neste navegador e aplicada como `data-theme` no <html>.
 *
 * O public/theme.js repete a chave e a lista para aplicar o tema antes de a página aparecer
 * (a CSP não deixa script inline). O teste confere que os dois continuam iguais.
 */
export const THEMES = ['auto', 'light', 'dark', 'arcane', 'forest', 'contrast'] as const;
export type ThemeId = (typeof THEMES)[number];

export const THEME_STORAGE_KEY = 'grimorio.tema';
const CHANGE_EVENT = 'grimorio:tema';

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

/** "Automático" não marca nada: o CSS segue a preferência do sistema. */
function applyToDocument(id: ThemeId): void {
  const root = document.documentElement;
  if (id === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', id);
}

/** O tema em uso agora (o theme.js já aplicou o salvo antes de a página abrir). */
export function currentTheme(): ThemeId {
  const attr = document.documentElement.getAttribute('data-theme');
  return isThemeId(attr) ? attr : 'auto';
}

export function setTheme(id: ThemeId): void {
  applyToDocument(id);
  try {
    if (id === 'auto') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    // Navegador sem armazenamento (modo privado restrito): o tema vale só nesta visita.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Avisa quando o tema muda aqui ou em outra aba (a outra aba também passa a usar o novo). */
export function subscribeTheme(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
    applyToDocument(isThemeId(event.newValue) ? event.newValue : 'auto');
    onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}
