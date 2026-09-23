/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;

/** Variáveis lidas no build (docs/publicacao.md). Todas opcionais. */
interface ImportMetaEnv {
  readonly VITE_REPORT_URL?: string;
  readonly VITE_SUPPORT_PLATFORM?: string;
  readonly VITE_SUPPORT_URL?: string;
  readonly VITE_CONTACT_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
