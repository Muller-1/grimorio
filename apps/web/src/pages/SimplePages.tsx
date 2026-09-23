import { HandHeart } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { reportLink, siteConfig } from '@/app/config';
import { t } from '@/lib/i18n';

interface Section {
  title: string;
  body: readonly string[];
}

function PageShell({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold text-balance">{title}</h1>
      {meta ? <div className="mt-2 text-sm text-muted">{meta}</div> : null}
      <div className="mt-6 space-y-6 leading-relaxed">{children}</div>
    </article>
  );
}

function Sections({ sections }: { sections: readonly Section[] }) {
  return (
    <>
      {sections.map((section) => (
        <section key={section.title}>
          <h2 className="font-display text-lg font-bold">{section.title}</h2>
          {section.body.map((paragraph) => (
            <p key={paragraph} className="mt-2 text-muted">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </>
  );
}

function Contact() {
  const { pathname } = useLocation();
  const report = reportLink(pathname);
  return (
    <section>
      <h2 className="font-display text-lg font-bold">{t.pages.contactTitle}</h2>
      <p className="mt-2 text-muted">
        {siteConfig.contactEmail ? (
          <>
            {t.pages.contactEmailLead}{' '}
            <a
              href={`mailto:${siteConfig.contactEmail}`}
              className="text-text underline underline-offset-4"
            >
              {siteConfig.contactEmail}
            </a>
          </>
        ) : report ? (
          t.pages.contactReport
        ) : (
          t.footer.reportSoon
        )}
      </p>
    </section>
  );
}

function LegalMeta() {
  return (
    <>
      <p>{t.pages.updated(siteConfig.legalUpdatedAt)}</p>
      <p>{t.pages.initialVersion}</p>
    </>
  );
}

export function SupportPage() {
  const s = t.pages.support;
  const { platform, url } = siteConfig.support;
  return (
    <PageShell title={s.title}>
      <p className="text-lg">{s.lead}</p>
      {url ? (
        <Button asChild variant="primary" size="lg">
          <a href={url} target="_blank" rel="noreferrer">
            <HandHeart className="size-5" />
            {platform ? s.button(platform) : s.buttonGeneric}
          </a>
        </Button>
      ) : (
        <p className="rounded-lg border border-border bg-surface p-4 text-muted">{s.soon}</p>
      )}
      <section>
        <h2 className="font-display text-lg font-bold">{s.where}</h2>
        <p className="mt-2 text-muted">{s.whereText}</p>
      </section>
    </PageShell>
  );
}

export function CreditsPage() {
  const c = t.pages.credits;
  return (
    <PageShell title={c.title}>
      <p>{c.lead}</p>
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-2">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">
                {c.nameHeader}
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                {c.licenseHeader}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {c.libs.map(([name, license]) => (
              <tr key={name}>
                <td className="px-3 py-2">{name}</td>
                <td className="px-3 py-2 text-muted">{license}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section>
        <h2 className="font-display text-lg font-bold">{c.rulesTitle}</h2>
        <p className="mt-2 text-muted">{c.rules}</p>
        <p className="mt-2 text-muted">{c.trademark}</p>
      </section>
    </PageShell>
  );
}

export function TermsPage() {
  return (
    <PageShell title={t.pages.terms.title} meta={<LegalMeta />}>
      <Sections sections={t.pages.terms.sections} />
      <Contact />
    </PageShell>
  );
}

export function PrivacyPage() {
  return (
    <PageShell title={t.pages.privacy.title} meta={<LegalMeta />}>
      <Sections sections={t.pages.privacy.sections} />
      <Contact />
    </PageShell>
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
