// Preenchidos pelo tsup no build (tsup.config.ts). Rodando com tsx/vitest, ficam indefinidos.
declare const __API_VERSION__: string | undefined;
declare const __API_COMMIT__: string | undefined;

export const buildInfo = {
  version: typeof __API_VERSION__ === 'string' ? __API_VERSION__ : 'dev',
  commit: typeof __API_COMMIT__ === 'string' ? __API_COMMIT__ : 'local',
};
