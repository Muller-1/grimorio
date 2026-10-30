import { CircleHelp, Menu, X } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { BrandMark } from '@/components/ui/d20-icon';
import { AccountMenu } from '@/features/auth/AccountMenu';
import { useAuthStore } from '@/features/auth/store';
import { ThemeOptions, ThemePicker } from '@/features/theme/ThemePicker';
import { Toaster } from '@/features/toast/Toaster';
import { t } from '@/lib/i18n';
import { useDismiss } from '@/lib/use-dismiss';
import { cn } from '@/lib/utils';
import { reportLink, siteConfig } from './config';
import { pageMeta } from './meta';

/** Páginas que contam como "Fichas" na barra (a lista, a ficha, o assistente). */
const SHEET_PATHS = ['/personagens', '/personagem', '/ficha', '/criar'];
const CAMPAIGN_PATHS = ['/campanhas', '/campanha'];

function useActive(to: string, activeFor?: readonly string[]) {
  const { pathname } = useLocation();
  return (
    pathname === to ||
    (activeFor?.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ?? false)
  );
}

/** Aba da barra: fichas, campanhas, dados. */
function NavTab({
  to,
  children,
  activeFor,
}: {
  to: string;
  children: ReactNode;
  activeFor?: readonly string[];
}) {
  const active = useActive(to, activeFor);
  return (
    <NavLink
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-10 items-center rounded-[7px] px-2 transition-colors sm:px-2.5 md:px-4',
        active
          ? 'bg-accent font-bold text-accent-contrast'
          : 'font-medium text-text hover:bg-surface-2',
      )}
    >
      {children}
    </NavLink>
  );
}

/** Campanhas: sem contas no build, aparece desligada e explica por quê. */
function CampaignTab() {
  if (siteConfig.accountsEnabled) {
    return (
      <NavTab to="/campanhas" activeFor={CAMPAIGN_PATHS}>
        {t.nav.campaign}
      </NavTab>
    );
  }
  return (
    <span
      className="flex min-h-10 cursor-not-allowed items-center rounded-[7px] px-2 font-medium text-muted sm:px-2.5 md:px-4"
      title={t.nav.campaignSoon}
      aria-disabled="true"
    >
      {t.nav.campaign}
    </span>
  );
}

function MainNav({ className }: { className?: string }) {
  return (
    <nav
      aria-label={t.nav.mainLabel}
      className={cn(
        'flex gap-1 rounded-[10px] border border-border bg-bg p-1 max-md:text-sm',
        className,
      )}
    >
      <NavTab to="/personagens" activeFor={SHEET_PATHS}>
        {t.nav.sheet}
      </NavTab>
      <CampaignTab />
      <NavTab to="/dados">{t.nav.dice}</NavTab>
    </nav>
  );
}

const iconButton = 'grid size-11 place-items-center rounded-lg text-text hover:bg-surface-2';

/** Celular, sem conta: as abas, os primeiros passos e o tema ficam neste menu. */
function MobileMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const close = useCallback(() => setOpen(false), []);
  const onBlur = useDismiss(open, close, rootRef, triggerRef);

  const item = 'flex min-h-11 items-center rounded-lg px-3 font-bold text-text hover:bg-surface-2';
  return (
    <div ref={rootRef} className="relative md:hidden" onBlur={onBlur}>
      <button
        ref={triggerRef}
        type="button"
        className={cn(iconButton, open && 'bg-surface-2')}
        aria-label={open ? t.nav.menuClose : t.nav.menu}
        aria-expanded={open}
        aria-controls={panelId}
        data-testid="nav.menu"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <X className="size-[22px]" strokeWidth={1.8} aria-hidden="true" />
        ) : (
          <Menu className="size-[22px]" strokeWidth={1.8} aria-hidden="true" />
        )}
      </button>
      {open ? (
        <div
          id={panelId}
          className="absolute top-full right-0 z-50 mt-2 w-80 max-w-[calc(100vw-1.5rem)] rounded-xl border border-border bg-surface p-3 shadow-card"
        >
          {/* Tocar num link leva à página e fecha o menu. */}
          <nav aria-label={t.nav.mainLabel} className="grid gap-0.5" onClick={close}>
            <Link to="/personagens" className={item}>
              {t.nav.sheet}
            </Link>
            {siteConfig.accountsEnabled ? (
              <Link to="/campanhas" className={item}>
                {t.nav.campaign}
              </Link>
            ) : null}
            <Link to="/dados" className={item}>
              {t.nav.dice}
            </Link>
            <Link to="/comecar" className={item}>
              {t.footer.start}
            </Link>
          </nav>
          <ThemeOptions className="mt-3 border-t border-border pt-3 text-sm" />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Barra superior (docs/design.md): marca à esquerda, abas no meio, ajuda, tema e conta à
 * direita. No celular, quem não entrou vê "Entrar" e o menu; quem entrou vê as abas e a conta
 * (tema e ajuda ficam no menu da conta).
 */
function Header() {
  const signedIn = useAuthStore((s) => s.status === 'signed-in');
  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-surface">
      <div className="flex min-h-16 items-center justify-between gap-2 px-3 py-2.5 md:gap-4 md:px-6">
        <Link
          to="/"
          className="inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-md text-text"
          aria-label={t.nav.homeLabel}
        >
          <BrandMark className="size-[26px]" />
          <span
            className={cn(
              'font-display text-lg font-bold tracking-[0.12em] uppercase',
              signedIn && 'max-md:hidden',
            )}
          >
            {t.brand.name}
          </span>
        </Link>

        <MainNav className={cn(!signedIn && 'max-md:hidden')} />

        <div className="flex shrink-0 items-center gap-1">
          <Link
            to="/comecar"
            className={cn(iconButton, 'max-md:hidden')}
            aria-label={t.nav.help}
            title={t.nav.help}
            data-testid="nav.help"
          >
            <CircleHelp className="size-5" strokeWidth={1.8} aria-hidden="true" />
          </Link>
          <ThemePicker className="max-md:hidden" />
          <AccountMenu />
          {signedIn ? null : <MobileMenu />}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const { pathname } = useLocation();
  const report = reportLink(pathname);
  const link = 'inline-flex min-h-9 items-center text-muted hover:text-text';
  return (
    <footer className="border-t border-rule bg-surface">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-8 gap-y-4 px-4 pt-6 pb-7 md:px-8">
        <nav aria-label={t.nav.footerLabel} className="flex flex-wrap gap-x-5 gap-y-1">
          {/* Sem o endereço do formulário (VITE_REPORT_URL), o link não aparece: nada de texto morto. */}
          {report ? (
            <a href={report} target="_blank" rel="noreferrer" className={link}>
              {t.footer.report}
            </a>
          ) : null}
          <Link to="/comecar" className={link}>
            {t.footer.start}
          </Link>
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
        <p className="text-sm text-muted">
          {t.footer.compat}{' '}
          <span className="tabular" title={t.footer.build(siteConfig.commit)}>
            {t.footer.version(siteConfig.version)}
          </span>
        </p>
      </div>
    </footer>
  );
}

/** Ao navegar, a descrição da página acompanha (o título, cada página põe o seu). */
function usePageDescription() {
  const { pathname } = useLocation();
  useEffect(() => {
    const description = pageMeta(pathname).description;
    for (const selector of ['meta[name="description"]', 'meta[property="og:description"]']) {
      document.querySelector(selector)?.setAttribute('content', description);
    }
  }, [pathname]);
}

export function Layout() {
  usePageDescription();
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
