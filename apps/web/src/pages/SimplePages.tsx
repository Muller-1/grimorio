import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';

function SimplePage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl space-y-4 px-4 py-12">
      <p className="inline-block rounded-full bg-gold-soft px-3 py-1 text-xs font-semibold text-gold">
        {t.pages.draft}
      </p>
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      <div className="space-y-3 text-muted">{children}</div>
    </article>
  );
}

export function SupportPage() {
  return (
    <SimplePage title={t.pages.support.title}>
      <p>{t.pages.support.text}</p>
    </SimplePage>
  );
}

export function CreditsPage() {
  const c = t.pages.credits;
  return (
    <SimplePage title={c.title}>
      <p>{c.text}</p>
      <p>{c.libs}</p>
      <p>{c.srd}</p>
    </SimplePage>
  );
}

export function TermsPage() {
  return (
    <SimplePage title={t.pages.terms.title}>
      <p>{t.pages.terms.text}</p>
    </SimplePage>
  );
}

export function PrivacyPage() {
  return (
    <SimplePage title={t.pages.privacy.title}>
      <p>{t.pages.privacy.text}</p>
    </SimplePage>
  );
}

export function NotFoundPage() {
  const n = t.pages.notFound;
  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-20 text-center">
      <h1 className="font-display text-3xl font-bold">{n.title}</h1>
      <p className="text-muted">{n.text}</p>
      <Button asChild variant="primary">
        <Link to="/">{n.back}</Link>
      </Button>
    </div>
  );
}
