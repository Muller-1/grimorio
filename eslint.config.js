// @ts-check
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Pacotes que nenhum código de produção pode importar (plano v2, seção 7, regra 1). */
const forbidTestkit = {
  group: ['@grimorio/testkit', '@grimorio/testkit/*'],
  message: 'Código de produção não pode depender do testkit.',
};

/** `rules` e `shared` precisam rodar igual no navegador e no Node (plano v2, 6.6). */
const pureRestrictedImports = [
  'error',
  {
    patterns: [
      { group: ['node:*'], message: 'rules/shared não podem usar APIs exclusivas do Node.' },
      {
        group: ['react', 'react-dom', 'react-dom/*', 'react/*'],
        message: 'rules/shared não conhecem a interface.',
      },
      { group: ['fastify', '@fastify/*'], message: 'rules/shared não conhecem o servidor.' },
      forbidTestkit,
    ],
  },
];

/** Fontes de não determinismo só entram por portas (plano v2, 6.5 e RNF-03). */
const nonDeterminism = [
  'error',
  {
    object: 'Math',
    property: 'random',
    message: 'Use a porta Rng (cryptoRng/seededRng). Math.random é proibido aqui.',
  },
  { object: 'Date', property: 'now', message: 'Use a porta Clock.' },
];

const testFiles = ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'];

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/dist-ssr/**',
    '**/dist-test/**',
    '**/dist-ssr-test/**',
    '**/playwright-report/**',
    '**/test-results/**',
    '**/.tsbuild/**',
    '**/coverage/**',
    '**/.lighthouseci/**',
  ]),

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    languageOptions: { ecmaVersion: 2023, sourceType: 'module' },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      eqeqeq: ['error', 'always'],
    },
  },

  // Scripts e configs rodam no Node.
  {
    files: [
      '*.js',
      '*.ts',
      'scripts/**',
      'apps/*/scripts/**',
      'apps/*/build/**',
      'apps/*/*.ts',
      'apps/*/.size-limit.mjs',
    ],
    languageOptions: { globals: globals.node },
  },

  // ---- packages/rules e packages/shared: puros ----
  {
    files: ['packages/rules/src/**/*.ts', 'packages/shared/src/**/*.ts'],
    ignores: testFiles,
    rules: {
      'no-restricted-imports': pureRestrictedImports,
      'no-restricted-properties': nonDeterminism,
    },
  },

  {
    // O `z` sai de packages/shared/src/zod.ts, que desliga o eval do Zod (CSP do site).
    files: ['packages/shared/src/**/*.ts'],
    ignores: ['packages/shared/src/zod.ts', ...testFiles],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'zod', message: "Importe { z } de '../zod' (sem eval, por causa da CSP)." },
          ],
          patterns: pureRestrictedImports[1].patterns,
        },
      ],
    },
  },

  // ---- apps/web ----
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-restricted-imports': ['error', { patterns: [forbidTestkit] }],
    },
  },
  {
    // Fora das portas, nada de Math.random, Date.now ou crypto direto.
    files: ['apps/web/src/**/*.{ts,tsx}'],
    ignores: ['apps/web/src/ports/**', ...testFiles],
    rules: {
      'no-restricted-properties': nonDeterminism,
      'no-restricted-globals': [
        'error',
        { name: 'crypto', message: 'Use as portas em src/ports (rng, ids).' },
      ],
    },
  },
  {
    // Nenhum texto de interface "solto" nos componentes: tudo vem de src/lib/i18n.
    files: ['apps/web/src/**/*.tsx'],
    ignores: ['apps/web/src/lib/i18n/**', ...testFiles],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXText[value=/[A-Za-zÀ-ÿ]{2,}/]',
          message: 'Texto de interface deve vir do arquivo de traduções (src/lib/i18n).',
        },
        {
          selector:
            'JSXAttribute[name.name=/^(aria-label|title|placeholder|alt)$/] > Literal[value=/[A-Za-zÀ-ÿ]{2,}/]',
          message: 'Texto de interface deve vir do arquivo de traduções (src/lib/i18n).',
        },
      ],
    },
  },

  // ---- bot de testes (Playwright): Node + callbacks que rodam no navegador ----
  {
    files: ['apps/qa-bot/**/*.{ts,mjs}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    // Fixtures do Playwright exigem `async ({}, use) => …`
    rules: { 'no-empty-pattern': 'off' },
  },

  // ---- testes ----
  {
    files: testFiles,
    languageOptions: { globals: globals.node },
  },
]);
