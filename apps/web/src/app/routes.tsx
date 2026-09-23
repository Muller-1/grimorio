import { lazy, Suspense, type ReactNode } from 'react';
import { Route, Routes } from 'react-router';
import HomePage from '@/pages/HomePage';
import {
  CreditsPage,
  NotFoundPage,
  PrivacyPage,
  SupportPage,
  TermsPage,
} from '@/pages/SimplePages';
import { t } from '@/lib/i18n';
import { Layout } from './Layout';

// Ficha e rolador são carregados sob demanda: a página inicial fica leve.
const SheetPage = lazy(() => import('@/features/sheet/SheetPage'));
const DicePage = lazy(() => import('@/pages/DicePage'));

function Loading({ children }: { children: ReactNode }) {
  return (
    // Ocupa a tela toda enquanto carrega: o rodapé fica fora da vista e não "pula" quando a
    // página chega (Lighthouse, CLS ≤ 0,1).
    <Suspense fallback={<p className="min-h-dvh p-8 text-center text-muted">{t.common.loading}</p>}>
      {children}
    </Suspense>
  );
}

/**
 * Como a página vira HTML no build (scripts/prerender.mjs):
 * - `full`: HTML completo, que o navegador só "hidrata" (bom para busca e para abrir rápido);
 * - `shell`: só a moldura (cabeçalho, rodapé e "Carregando…"); a página é desenhada no navegador.
 */
type Prerender = 'full' | 'shell';

interface PageRoute {
  path: string;
  element: ReactNode;
  prerender: Prerender;
  /** Módulo carregado sob demanda: o HTML da página já pede os arquivos dele (modulepreload). */
  lazyModule?: string;
}

/** Rotas do R1 (plano de início, Etapa 5) + a ficha. Fonte única para o roteador e o build. */
const PAGES: readonly PageRoute[] = [
  { path: '/', element: <HomePage />, prerender: 'full' },
  {
    path: '/ficha',
    element: (
      <Loading>
        <SheetPage />
      </Loading>
    ),
    prerender: 'shell',
    lazyModule: 'src/features/sheet/SheetPage.tsx',
  },
  {
    path: '/dados',
    element: (
      <Loading>
        <DicePage />
      </Loading>
    ),
    prerender: 'shell',
    lazyModule: 'src/pages/DicePage.tsx',
  },
  { path: '/apoie', element: <SupportPage />, prerender: 'full' },
  { path: '/creditos', element: <CreditsPage />, prerender: 'full' },
  { path: '/termos', element: <TermsPage />, prerender: 'full' },
  { path: '/privacidade', element: <PrivacyPage />, prerender: 'full' },
];

/**
 * Arquivos gerados no build. Na Cloudflare Pages, `/dados` é servido por `dados.html`, e qualquer
 * endereço desconhecido recebe `404.html` com status 404 (docs/publicacao.md).
 */
export const STATIC_PAGES: readonly {
  path: string;
  file: string;
  prerender: Prerender;
  lazyModule?: string;
}[] = [
  ...PAGES.map(({ path, prerender, lazyModule }) => ({
    path,
    file: path === '/' ? 'index.html' : `${path.slice(1)}.html`,
    prerender,
    ...(lazyModule ? { lazyModule } : {}),
  })),
  { path: '/404', file: '404.html', prerender: 'shell' },
];

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {PAGES.map(({ path, element }) =>
          path === '/' ? (
            <Route key={path} index element={element} />
          ) : (
            <Route key={path} path={path.slice(1)} element={element} />
          ),
        )}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
