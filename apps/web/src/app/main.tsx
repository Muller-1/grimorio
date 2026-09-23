import '@/styles/index.css';
import { cryptoRng, roll } from '@grimorio/rules';
import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { AppRoutes } from './routes';

const container = document.getElementById('root');
if (!container) throw new Error('#root não encontrado');

const app = (
  <StrictMode>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </StrictMode>
);

// A página inicial vem pré-renderizada no build (HTML pronto, bom para busca).
// Outras rotas recebem o mesmo arquivo como "fallback" e são desenhadas do zero.
if (container.dataset.prerendered === window.location.pathname) {
  hydrateRoot(container, app);
} else {
  container.replaceChildren();
  createRoot(container).render(app);
}

// Ganchos do bot de testes (Etapa 6). Só existem no build de teste (`vite build --mode test`):
// em produção a condição vira `false` no build e o import inteiro some do bundle.
if (import.meta.env.MODE === 'test') {
  void import('../testing/test-hooks').then((m) => m.installTestHooks());
}

// Etapa 5, "pronto quando": rolar 1d20 no console do navegador (só em desenvolvimento).
if (import.meta.env.DEV) {
  Object.assign(window, { grimorio: { roll: (expr: string) => roll(expr, { rng: cryptoRng }) } });
}
