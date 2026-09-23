/**
 * Configurações do site. Tudo que depende de decisões ainda abertas fica aqui, num lugar só.
 *
 * Os valores vêm de variáveis de ambiente lidas NO BUILD (na Cloudflare Pages: Settings →
 * Variables and Secrets). Assim dá para ligar o "Relatar problema" ou o link de apoio sem mexer
 * no código. Veja docs/publicacao.md.
 */
const env = import.meta.env;

/** Aceita só endereços https (um link errado não pode virar `javascript:` nem `http:`). */
export function httpsOrEmpty(value: string | undefined): string {
  const text = value?.trim() ?? '';
  if (!text) return '';
  try {
    return new URL(text.replaceAll('{pagina}', 'x').replaceAll('{versao}', 'x')).protocol ===
      'https:'
      ? text
      : '';
  } catch {
    return '';
  }
}

/** Aceita um e-mail simples (algo@algo.algo); qualquer outra coisa vira vazio. */
export function emailOrEmpty(value: string | undefined): string {
  const text = value?.trim() ?? '';
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(text) ? text : '';
}

export const siteConfig = {
  version: __APP_VERSION__,
  commit: __APP_COMMIT__,

  /**
   * "Relatar problema" (RF-104) — VITE_REPORT_URL: endereço de um formulário ou de "nova issue"
   * no GitHub. Pode usar {pagina} e {versao}, que são preenchidos sozinhos. Sem os marcadores,
   * eles vão como parâmetros no fim do endereço. Vazio = o link aparece desativado.
   * Ex.: https://github.com/USUARIO/grimorio/issues/new?title=Problema%20em%20{pagina}&body=Vers%C3%A3o%3A%20{versao}
   */
  reportUrl: httpsOrEmpty(env.VITE_REPORT_URL),

  /**
   * Plataforma de apoio (decisão #2) — VITE_SUPPORT_PLATFORM (nome) e VITE_SUPPORT_URL (link).
   * Vazio = a página explica que a plataforma está sendo escolhida.
   */
  support: {
    platform: env.VITE_SUPPORT_PLATFORM?.trim() ?? '',
    url: httpsOrEmpty(env.VITE_SUPPORT_URL),
  },

  /** VITE_CONTACT_EMAIL: e-mail para pedidos sobre dados. Vazio = usa o "Relatar problema". */
  contactEmail: emailOrEmpty(env.VITE_CONTACT_EMAIL),

  /** Data da versão em vigor dos termos e da política de privacidade. */
  legalUpdatedAt: '23/09/2026',
};

/** Monta o link de "Relatar problema" com a página e a versão do site (RF-104). */
export function reportLink(
  pathname: string,
  template: string = siteConfig.reportUrl,
): string | null {
  if (!template) return null;
  const version = `${siteConfig.version}+${siteConfig.commit}`;
  if (template.includes('{pagina}') || template.includes('{versao}')) {
    return template
      .replaceAll('{pagina}', encodeURIComponent(pathname))
      .replaceAll('{versao}', encodeURIComponent(version));
  }
  const url = new URL(template);
  url.searchParams.set('pagina', pathname);
  url.searchParams.set('versao', version);
  return url.href;
}
