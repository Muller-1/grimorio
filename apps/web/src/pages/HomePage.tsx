import { ArrowRight, Calculator, Dices, HeartPulse, Lightbulb } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { D20Icon } from '@/components/ui/d20-icon';
import { formatModifier } from '@/lib/format';
import { t } from '@/lib/i18n';

const FEATURE_ICONS = [Calculator, Lightbulb, Dices, HeartPulse];

/** Cartão ilustrativo: como a ficha explica um número (valores do personagem de exemplo). */
function PreviewCard() {
  const parts = [
    { label: t.abilities.dex, value: 3 },
    { label: t.sheet.explain.proficiency(2), value: 4 },
  ];
  const dice = [
    { value: 16, kept: true },
    { value: 9, kept: false },
  ];
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-3 -z-10 rotate-2 rounded-2xl bg-accent-soft" />
      <div className="rounded-2xl border border-border-strong bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between">
          <p className="font-display text-lg font-bold">{t.skills.stealth}</p>
          <span className="tabular rounded-md bg-gold-soft px-2 py-0.5 font-display text-xl font-bold text-gold">
            {formatModifier(7)}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">{t.sheet.explain.title}</p>
        <dl className="mt-3 space-y-1.5 text-sm">
          {parts.map((p) => (
            <div key={p.label} className="flex justify-between">
              <dt className="text-muted">{p.label}</dt>
              <dd className="tabular font-semibold">{formatModifier(p.value)}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-border pt-1.5 font-bold">
            <dt>{t.sheet.explain.total}</dt>
            <dd className="tabular">{formatModifier(7)}</dd>
          </div>
        </dl>
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-surface-2 p-3">
          <D20Icon className="size-8 text-accent" />
          <div className="flex-1">
            <p className="font-mono text-xs text-muted">{'2d20kh1+7'}</p>
            <div className="mt-1 flex gap-1">
              {dice.map((d, i) => (
                <span
                  key={i}
                  className={
                    d.kept
                      ? 'tabular rounded border border-border-strong bg-surface px-1.5 text-xs'
                      : 'tabular rounded border border-dashed border-border px-1.5 text-xs text-muted line-through'
                  }
                >
                  {d.value}
                </span>
              ))}
            </div>
          </div>
          <strong className="tabular font-display text-3xl">{23}</strong>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const h = t.home;
  return (
    <div>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:py-16 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <p className="text-sm font-semibold tracking-wide text-accent">{h.eyebrow}</p>
          <h1 className="mt-3 font-display text-4xl leading-tight font-bold text-balance sm:text-5xl">
            {h.title}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">{h.lead}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="primary" size="lg">
              <Link to="/ficha">
                {h.ctaSheet}
                <ArrowRight className="size-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/dados">
                <Dices className="size-5" />
                {h.ctaDice}
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted">{h.localNote}</p>
        </div>
        <PreviewCard />
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="font-display text-2xl font-bold">{h.features.title}</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {h.features.items.map((item, i) => {
              const Icon = FEATURE_ICONS[i] ?? Calculator;
              return (
                <li key={item.title} className="rounded-xl border border-border bg-bg p-5">
                  <Icon className="size-6 text-accent" aria-hidden="true" />
                  <h3 className="mt-3 font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted">{item.text}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-display text-2xl font-bold">{h.how.title}</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {h.how.steps.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent font-display text-lg font-bold text-accent-contrast">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm text-muted">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-16 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="font-display text-xl font-bold">{h.next.title}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {h.next.items.map((item) => (
              <li key={item} className="flex gap-2">
                <D20Icon className="mt-0.5 size-4 shrink-0 text-gold" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col justify-between rounded-xl border border-accent/30 bg-accent-soft p-6">
          <div>
            <h2 className="font-display text-xl font-bold">{h.supportTitle}</h2>
            <p className="mt-2 text-sm">{h.supportText}</p>
          </div>
          <Button asChild variant="primary" className="mt-4 self-start">
            <Link to="/apoie">{h.supportCta}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
