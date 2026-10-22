import { ChevronDown, Dices } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Ornament } from '@/components/ui/ornament';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** "Primeiros passos" (feedback dos testadores, 14/10): o básico para quem nunca jogou. */
export default function StartPage() {
  const s = t.start;
  const entries = Object.values(t.glossary);
  const half = Math.ceil(entries.length / 2);
  const columns = [entries.slice(0, half), entries.slice(half)];
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
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
              {/* O título é um h2 de verdade: o leitor de tela lista as partes da página. */}
              <h2 className="font-display text-lg font-bold">{section.title}</h2>
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

      <Ornament className="mt-10" />

      <section className="mt-10" aria-labelledby="glossario">
        <h2 id="glossario" className="font-display text-xl font-bold">
          {s.glossaryTitle}
        </h2>
        <p className="mt-1 text-sm text-muted">{s.glossaryHint}</p>
        {/* Uma lista só (antes eram 22 caixinhas iguais). No computador, duas colunas
            independentes: abrir uma palavra não estica a palavra ao lado. */}
        <div className="mt-3 rounded-xl border border-border bg-surface px-4 sm:grid sm:grid-cols-2 sm:items-start sm:gap-x-8">
          {columns.map((column, ci) => (
            <ul key={ci}>
              {column.map((entry) => (
                <li
                  key={entry.term}
                  className={cn(
                    'border-b border-border last:border-b-0',
                    // No celular as duas listas viram uma: a 1ª mantém a linha no fim.
                    ci === 0 && 'max-sm:last:border-b',
                  )}
                >
                  <details className="group">
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
          ))}
        </div>
      </section>
    </article>
  );
}
