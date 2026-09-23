/**
 * Configurações do site. Valores que dependem de decisões ainda abertas ficam aqui,
 * num lugar só, para serem trocados sem caçar pelo código.
 */
export const siteConfig = {
  version: __APP_VERSION__,
  commit: __APP_COMMIT__,
  /**
   * Formulário externo de "Relatar problema" (RF-104). Vazio até a Etapa 8.
   * Quando existir, a página e a versão vão anexadas no link automaticamente.
   */
  reportUrl: '',
  /** Link da plataforma de apoio (decisão #2). Vazio até ser escolhida. */
  supportUrl: '',
};

export function reportLink(pathname: string): string | null {
  if (!siteConfig.reportUrl) return null;
  const url = new URL(siteConfig.reportUrl);
  url.searchParams.set('pagina', pathname);
  url.searchParams.set('versao', `${siteConfig.version}+${siteConfig.commit}`);
  return url.href;
}
