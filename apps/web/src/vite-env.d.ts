/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;

/** Variáveis lidas no build (docs/publicacao.md). Todas opcionais. */
interface ImportMetaEnv {
  readonly VITE_REPORT_URL?: string;
  readonly VITE_SUPPORT_PLATFORM?: string;
  readonly VITE_SUPPORT_URL?: string;
  readonly VITE_CONTACT_EMAIL?: string;
  /** "true" liga contas (login com Google) e fichas na conta. Em `pnpm dev`, ligado por padrão. */
  readonly VITE_ACCOUNTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
