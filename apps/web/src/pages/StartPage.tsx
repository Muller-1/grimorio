import { ArrowRight, ChevronDown, Dices } from 'lucide-react';
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
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold text-balance">{s.pageTitle}</h1>
      <p className="mt-3 text-lg text-muted">{s.lead}</p>
      <div className="mt-5 flex flex-wrap gap-3">
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

      {/* Pedido de 15/10: a página era comprida demais. Cada parte abre ao tocar. */}
      <p className="mt-8 text-sm text-muted">{s.tapToOpen}</p>
      <div className="mt-2 divide-y divide-border rounded-xl border border-border bg-surface">
        {s.sections.map((section, i) => (
          <details key={section.title} open={i === 0} className="group px-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 font-display text-lg font-bold [&::-webkit-details-marker]:hidden">
              {section.title}
              <ChevronDown
                className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="space-y-2 pb-4 leading-relaxed text-muted">
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </details>
        ))}
      </div>

      <section className="mt-10" aria-labelledby="glossario">
        <h2 id="glossario" className="font-display text-xl font-bold">
          {s.glossaryTitle}
        </h2>
        <p className="mt-1 text-sm text-muted">{s.glossaryHint}</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {Object.values(t.glossary).map((entry) => (
            <li key={entry.term}>
              <details className="group rounded-lg border border-border bg-surface px-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-2 font-semibold [&::-webkit-details-marker]:hidden">
                  {entry.term}
                  <ChevronDown
                    className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="pb-3 text-sm text-muted">{entry.text}</p>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
