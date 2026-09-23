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
    <Suspense fallback={<p className="p-8 text-center text-muted">{t.common.loading}</p>}>
      {children}
    </Suspense>
  );
}

/** Rotas do R1 (plano de início, Etapa 5) + a ficha. */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route
          path="ficha"
          element={
            <Loading>
              <SheetPage />
            </Loading>
          }
        />
        <Route
          path="dados"
          element={
            <Loading>
              <DicePage />
            </Loading>
          }
        />
        <Route path="apoie" element={<SupportPage />} />
        <Route path="creditos" element={<CreditsPage />} />
        <Route path="termos" element={<TermsPage />} />
        <Route path="privacidade" element={<PrivacyPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
