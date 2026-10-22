import { Check, HardDrive, LogIn } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { D20Icon } from '@/components/ui/d20-icon';
import { t } from '@/lib/i18n';
import { ServerStatus } from './ServerStatus';
import { safeNext, useAuthStore } from './store';

/** Logo do Google (marca do botão "Entrar com Google", conforme as regras de uso do Google). */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const [params] = useSearchParams();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const googleEnabled = useAuthStore((s) => s.googleEnabled);
  const signIn = useAuthStore((s) => s.signInWithGoogle);
  const [redirecting, setRedirecting] = useState(false);
  const [failed, setFailed] = useState(false);
  const p = t.auth.page;

  const next = safeNext(params.get('voltar'));
  const errorCode = params.get('error');
  const errorText = errorCode ? (p.errors[errorCode] ?? p.errors.generic) : null;

  useEffect(() => {
    document.title = `${p.title} · ${t.brand.name}`;
  }, [p.title]);

  return (
    <div className="mx-auto grid max-w-4xl gap-6 px-4 py-10 md:grid-cols-[1.2fr_1fr]">
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-card">
        <D20Icon className="size-10 text-accent" />
        <h1 className="mt-3 font-display text-2xl font-bold">{p.title}</h1>
        <p className="mt-2 text-muted">{p.lead}</p>

        {errorText ? (
          <p role="alert" className="mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
            {errorText}
          </p>
        ) : null}

        <div className="mt-6" aria-live="polite">
          {status === 'signed-in' && user ? (
            <div className="space-y-3">
              <p className="font-semibold">{p.alreadyIn(user.displayName)}</p>
              <Button asChild variant="primary">
                <Link to="/personagens">{p.goToCharacters}</Link>
              </Button>
            </div>
          ) : status === 'disabled' ? (
            <p className="text-sm text-muted">{p.disabled}</p>
          ) : status === 'unavailable' ? (
            <ServerStatus />
          ) : (
            <div className="space-y-3">
              <Button
                size="lg"
                variant="outline"
                className="w-full gap-3 sm:w-auto"
                disabled={status === 'loading' || !googleEnabled || redirecting}
                data-testid="login.google"
                onClick={async () => {
                  setFailed(false);
                  setRedirecting(true);
                  const ok = await signIn(next);
                  if (!ok) {
                    setRedirecting(false);
                    setFailed(true);
                  }
                }}
              >
                <GoogleMark />
                {redirecting ? p.redirecting : p.google}
              </Button>
              {status === 'loading' ? <ServerStatus /> : null}
              {status === 'signed-out' && !googleEnabled ? (
                <p className="text-sm text-muted">{p.googleOff}</p>
              ) : null}
              {failed ? (
                <p role="alert" className="text-sm text-danger">
                  {p.failed}
                </p>
              ) : null}
              <p className="text-xs text-muted">
                <Link to="/termos" className="underline underline-offset-2">
                  {p.terms}
                </Link>
              </p>
            </div>
          )}
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="flex items-center gap-2 font-display font-bold">
            <LogIn className="size-4 text-accent" aria-hidden="true" />
            {p.what}
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {p.whatItems.map((item) => (
              <li key={item} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link to="/privacidade" className="mt-3 inline-block text-xs text-muted underline">
            {t.footer.privacy}
          </Link>
        </section>
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="flex items-center gap-2 font-display font-bold">
            <HardDrive className="size-4 text-accent" aria-hidden="true" />
            {p.noAccount}
          </h2>
          <p className="mt-2 text-sm text-muted">{p.noAccountText}</p>
          <Button asChild size="sm" className="mt-3">
            <Link to="/ficha">{p.openLocalSheet}</Link>
          </Button>
        </section>
      </aside>
    </div>
  );
}
