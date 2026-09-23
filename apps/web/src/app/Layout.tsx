import { CircleUserRound, Dices, House, ScrollText, Swords } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { D20Icon } from '@/components/ui/d20-icon';
import { Toaster } from '@/features/toast/Toaster';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { reportLink, siteConfig } from './config';

function NavTab({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors',
          isActive ? 'bg-accent text-accent-contrast' : 'text-text hover:bg-surface-2',
        )
      }
    >
      {icon}
      <span className="max-sm:sr-only">{children}</span>
    </NavLink>
  );
}

/** Barra superior do protótipo: início à esquerda, abas no centro, perfil à direita. */
function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-3 sm:px-4">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-surface-2"
          aria-label={t.nav.home}
        >
          <House className="size-5 text-muted sm:hidden" aria-hidden="true" />
          <D20Icon className="size-6 text-accent max-sm:hidden" />
          <span className="font-display text-lg font-bold tracking-wide max-sm:sr-only">
            {t.brand.name}
          </span>
        </Link>

        <nav
          aria-label={t.nav.mainLabel}
          className="mx-auto flex items-center gap-1 rounded-lg border border-border bg-bg p-1"
        >
          <NavTab to="/ficha" icon={<ScrollText className="size-4" />}>
            {t.nav.sheet}
          </NavTab>
          <span
            className="flex h-9 cursor-not-allowed items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-muted opacity-60"
            title={t.nav.campaignSoon}
            aria-disabled="true"
          >
            <Swords className="size-4" aria-hidden="true" />
            <span className="max-sm:sr-only">{t.nav.campaign}</span>
          </span>
          <NavTab to="/dados" icon={<Dices className="size-4" />}>
            {t.nav.dice}
          </NavTab>
        </nav>

        <span
          className="grid size-9 place-items-center rounded-full text-muted"
          title={t.nav.profileSoon}
          aria-label={t.nav.profileSoon}
          role="img"
        >
          <CircleUserRound className="size-7" aria-hidden="true" />
        </span>
      </div>
    </header>
  );
}

function Footer() {
  const { pathname } = useLocation();
  const report = reportLink(pathname);
  const link = 'hover:text-text underline-offset-4 hover:underline';
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap gap-x-4 gap-y-1">
          {report ? (
            <a href={report} target="_blank" rel="noreferrer" className={link}>
              {t.footer.report}
            </a>
          ) : (
            <span title={t.footer.reportSoon} className="cursor-help">
              {t.footer.report}
            </span>
          )}
          <Link to="/apoie" className={link}>
            {t.footer.support}
          </Link>
          <Link to="/creditos" className={link}>
            {t.footer.credits}
          </Link>
          <Link to="/termos" className={link}>
            {t.footer.terms}
          </Link>
          <Link to="/privacidade" className={link}>
            {t.footer.privacy}
          </Link>
        </nav>
        <p className="text-xs">
          {t.footer.compat}{' '}
          <span className="tabular">{t.footer.version(siteConfig.version, siteConfig.commit)}</span>
        </p>
      </div>
    </footer>
  );
}

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2"
      >
        {t.nav.skipToContent}
      </a>
      <Header />
      <main id="conteudo" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}
