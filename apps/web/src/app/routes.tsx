import { lazy, Suspense, type ReactNode } from 'react';
import { Route, Routes } from 'react-router';
import { LoadingScreen } from '@/features/screens/LoadingScreen';
import { NotFoundScreen } from '@/features/screens/NotFoundScreen';
import { AppErrorBoundary } from '@/features/screens/ServerErrorScreen';
import HomePage from '@/pages/HomePage';
import StartPage from '@/pages/StartPage';
import { CreditsPage, PrivacyPage, SupportPage, TermsPage } from '@/pages/SimplePages';
import { t } from '@/lib/i18n';
import { Layout } from './Layout';
import { pageMeta } from './meta';

// Ficha e rolador são carregados sob demanda: a página inicial fica leve.
const SheetPage = lazy(() => import('@/features/sheet/SheetPage'));
const DicePage = lazy(() => import('@/pages/DicePage'));
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const CharactersPage = lazy(() => import('@/features/characters/CharactersPage'));
const AccountSheetPage = lazy(() => import('@/features/characters/AccountSheetPage'));
const CreatePage = lazy(() => import('@/features/builder/CreatePage'));
const CampaignsPage = lazy(() => import('@/features/campaigns/CampaignsPage'));
const CampaignPage = lazy(() => import('@/features/campaigns/CampaignPage'));

function Loading({ children }: { children: ReactNode }) {
  return (
    // A tela de carregamento cobre tudo (e só aparece se demorar). O espaço vazio embaixo dela
    // ocupa a tela toda: o rodapé fica fora da vista e não "pula" quando a página chega
    // (Lighthouse, CLS ≤ 0,1).
    <Suspense
      fallback={
        <div className="min-h-dvh">
          <LoadingScreen />
        </div>
      }
    >
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
  /** `false`: página pessoal (conta, login), fora do Google e do sitemap. */
  index?: false;
}

/** Rotas do R1 (plano de início, Etapa 5) + fichas e contas. Fonte única para o roteador e o build. */
const PAGES: readonly PageRoute[] = [
  { path: '/', element: <HomePage />, prerender: 'full' },
  { path: '/comecar', element: <StartPage />, prerender: 'full' },
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
  {
    path: '/personagens',
    index: false,
    element: (
      <Loading>
        <CharactersPage />
      </Loading>
    ),
    prerender: 'shell',
    lazyModule: 'src/features/characters/CharactersPage.tsx',
  },
  {
    // A ficha da conta: /personagem?id=… (um HTML só; o id vai na busca, não no caminho).
    path: '/personagem',
    index: false,
    element: (
      <Loading>
        <AccountSheetPage />
      </Loading>
    ),
    prerender: 'shell',
    lazyModule: 'src/features/characters/AccountSheetPage.tsx',
  },
  {
    path: '/criar',
    element: (
      <Loading>
        <CreatePage />
      </Loading>
    ),
    prerender: 'shell',
    lazyModule: 'src/features/builder/CreatePage.tsx',
  },
  {
    path: '/entrar',
    index: false,
    element: (
      <Loading>
        <LoginPage />
      </Loading>
    ),
    prerender: 'shell',
    lazyModule: 'src/features/auth/LoginPage.tsx',
  },
  {
    path: '/campanhas',
    index: false,
    element: (
      <Loading>
        <CampaignsPage />
      </Loading>
    ),
    prerender: 'shell',
    lazyModule: 'src/features/campaigns/CampaignsPage.tsx',
  },
  {
    // Uma campanha: /campanha?id=… (como a ficha da conta, o id vai na busca).
    path: '/campanha',
    index: false,
    element: (
      <Loading>
        <CampaignPage />
      </Loading>
    ),
    prerender: 'shell',
    lazyModule: 'src/features/campaigns/CampaignPage.tsx',
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
  /** Título e descrição gravados no HTML da página (busca e prévia de link). */
  meta: { title: string; description: string };
  /** Entra no Google (sitemap e endereço canônico) ou leva `noindex`. */
  index: boolean;
}[] = [
  ...PAGES.map(({ path, prerender, lazyModule, index }) => ({
    path,
    file: path === '/' ? 'index.html' : `${path.slice(1)}.html`,
    prerender,
    ...(lazyModule ? { lazyModule } : {}),
    meta: pageMeta(path),
    index: index !== false,
  })),
  { path: '/404', file: '404.html', prerender: 'shell', meta: t.meta.default, index: false },
];

export function AppRoutes() {
  return (
    <AppErrorBoundary>
      <Routes>
        <Route element={<Layout />}>
          {PAGES.map(({ path, element }) =>
            path === '/' ? (
              <Route key={path} index element={element} />
            ) : (
              <Route key={path} path={path.slice(1)} element={element} />
            ),
          )}
        </Route>
        {/* As telas de erro têm cabeçalho próprio, sem a barra do site (docs/design.md). */}
        <Route path="*" element={<NotFoundScreen />} />
      </Routes>
    </AppErrorBoundary>
  );
}
