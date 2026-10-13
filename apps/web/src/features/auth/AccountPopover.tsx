import { LogOut, ScrollText } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Popover } from '@/components/ui/popover';
import { useToastStore } from '@/features/toast/store';
import { t } from '@/lib/i18n';
import { Avatar } from './Avatar';
import { useAuthStore } from './store';

/**
 * Menu da conta (logado). Carregado sob demanda: o balão (Radix) só pesa para quem entrou.
 */
export default function AccountPopover() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const toast = useToastStore((s) => s.push);
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  if (!user) return null;

  return (
    <Popover
      align="end"
      trigger={
        <button
          type="button"
          className="rounded-full p-0.5 hover:bg-surface-2"
          aria-label={t.auth.accountMenu(user.displayName)}
          data-testid="account.menu"
        >
          <Avatar name={user.displayName} image={user.image} />
        </button>
      }
    >
      <div className="flex items-center gap-3">
        <Avatar name={user.displayName} image={user.image} size={40} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{user.displayName}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>
      </div>
      <div className="mt-3 grid gap-1 border-t border-border pt-3">
        <Button asChild variant="ghost" size="sm" className="justify-start">
          <Link to="/personagens">
            <ScrollText className="size-4" aria-hidden="true" />
            {t.auth.myCharacters}
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="justify-start"
          disabled={leaving}
          data-testid="account.signout"
          onClick={async () => {
            setLeaving(true);
            const ok = await signOut();
            setLeaving(false);
            if (!ok) toast(t.auth.signOutFailed, 'danger');
            else void navigate('/');
          }}
        >
          <LogOut className="size-4" aria-hidden="true" />
          {leaving ? t.auth.signingOut : t.auth.signOut}
        </Button>
      </div>
    </Popover>
  );
}
