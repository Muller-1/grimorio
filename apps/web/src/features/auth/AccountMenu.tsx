import { CircleUserRound, CloudOff, LogIn } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Avatar } from './Avatar';
import { useAuthStore } from './store';

const AccountPopover = lazy(() => import('./AccountPopover'));

/** Canto direito da barra superior: entrar, ou o menu da conta. */
export function AccountMenu() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const slow = useAuthStore((s) => s.slow);

  if (status === 'disabled' || status === 'loading') {
    const label =
      status === 'disabled' ? t.nav.profileSoon : slow ? t.auth.server.wakingShort : t.auth.account;
    return (
      <span
        className={cn(
          'grid size-9 place-items-center rounded-full text-muted',
          slow && 'animate-pulse',
        )}
        title={label}
        aria-label={label}
        role="img"
        data-testid="account.status"
        data-value={status}
      >
        <CircleUserRound className="size-7" aria-hidden="true" />
      </span>
    );
  }

  if (status === 'unavailable') {
    return (
      <span
        className="grid size-9 place-items-center rounded-full text-muted"
        title={t.nav.accountsUnavailable}
        aria-label={t.nav.accountsUnavailable}
        role="img"
        data-testid="account.status"
        data-value={status}
      >
        <CloudOff className="size-6" aria-hidden="true" />
      </span>
    );
  }

  if (status === 'signed-out' || !user) {
    return (
      <Button asChild size="sm" variant="outline" data-testid="account.signin">
        <Link to="/entrar">
          <LogIn className="size-4" aria-hidden="true" />
          <span className="max-sm:sr-only">{t.auth.signIn}</span>
        </Link>
      </Button>
    );
  }

  return (
    <Suspense
      fallback={
        <span className="rounded-full p-0.5">
          <Avatar name={user.displayName} image={user.image} />
        </span>
      }
    >
      <AccountPopover />
    </Suspense>
  );
}
