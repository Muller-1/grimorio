import { ArrowRight, Dices } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';

/** "Primeiros passos" (feedback dos testadores, 14/10): o básico para quem nunca jogou. */
export default function StartPage() {
  const s = t.start;
  useEffect(() => {
    document.title = `${s.pageTitle} · ${t.brand.name}`;
  }, [s.pageTitle]);

  return (
    <article className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold text-balance">{s.pageTitle}</h1>
      <p className="mt-3 text-lg text-muted">{s.lead}</p>

      <div className="mt-8 space-y-7 leading-relaxed">
        {s.sections.map((section) => (
          <section key={section.title}>
            <h2 className="font-display text-xl font-bold">{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="mt-2 text-muted">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild variant="primary" size="lg">
          <Link to="/criar" data-testid="start.create">
            {s.ctaCreate}
            <ArrowRight className="size-5" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link to="/dados">
            <Dices className="size-5" />
            {s.ctaDice}
          </Link>
        </Button>
      </div>

      <section className="mt-12" aria-labelledby="glossario">
        <h2 id="glossario" className="font-display text-xl font-bold">
          {s.glossaryTitle}
        </h2>
        <dl className="mt-4 divide-y divide-border rounded-xl border border-border bg-surface">
          {Object.values(t.glossary).map((entry) => (
            <div key={entry.term} className="px-4 py-3">
              <dt className="font-semibold">{entry.term}</dt>
              <dd className="mt-0.5 text-sm text-muted">{entry.text}</dd>
            </div>
          ))}
        </dl>
      </section>
    </article>
  );
}
