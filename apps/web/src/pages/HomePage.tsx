import {
  Backpack,
  BookOpen,
  Calculator,
  Cloud,
  Dices,
  HeartPulse,
  Sparkles,
  TrendingUp,
  Wand2,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import { siteConfig } from '@/app/config';
import { Button } from '@/components/ui/button';
import { D20Icon } from '@/components/ui/d20-icon';
import { Ornament } from '@/components/ui/ornament';
import { formatModifier } from '@/lib/format';
import { t } from '@/lib/i18n';

/** Ícones de cada item, na ordem dos grupos de `t.home.features.groups`. */
const GROUP_ICONS: LucideIcon[][] = [
  [Wand2, TrendingUp, Sparkles],
  [Dices, HeartPulse, Zap],
  [Calculator, Backpack, Cloud],
];

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
      {/* Uma folha por baixo, como as páginas de um livro aberto. */}
      <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-xl border border-border bg-surface-2" />
      <div className="relative rounded-xl border border-border-strong bg-surface p-5 shadow-card">
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
        <div className="mt-4 flex items-center gap-3 rounded-lg bg-surface-2 p-3">
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

/**
 * Página inicial (ADR-012): sem rótulo acima do título, sem faixas
 * coloridas nem caixas iguais repetidas; as seções são separadas pelo filete dourado
 * (`Ornament`) e o conteúdo fica em listas, como num livro.
 */
export default function HomePage() {
  const h = t.home;
  // Com contas, a lista "Na ficha" ganha um item sobre onde a ficha fica salva.
  const groups = h.features.groups.map((g, gi) =>
    siteConfig.accountsEnabled && gi === h.features.groups.length - 1
      ? { ...g, items: [...g.items, h.features.accounts] }
      : g,
  );
  return (
    <div className="mx-auto max-w-6xl px-4">
      <section
        aria-labelledby="home-title"
        className="grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.15fr_1fr]"
      >
        <div>
          <h1
            id="home-title"
            className="font-display text-3xl leading-tight font-bold text-balance sm:text-5xl"
          >
            {h.title}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">{h.lead}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="primary" size="lg">
              <Link to="/criar" data-testid="home.create">
                {h.ctaCreate}
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/dados">
                <Dices className="size-5" />
                {h.ctaDice}
              </Link>
            </Button>
          </div>
          <ul className="mt-5 space-y-1.5 text-sm">
            <li>
              <Link
                to="/comecar"
                className="inline-flex items-center gap-1.5 font-semibold text-accent underline-offset-4 hover:underline"
                data-testid="home.start"
              >
                <BookOpen className="size-4" aria-hidden="true" />
                {h.startLink}
              </Link>
            </li>
            <li>
              <Link
                to="/ficha"
                className="text-muted underline underline-offset-4 hover:text-text"
                data-testid="home.blank"
              >
                {h.blankLink}
              </Link>
            </li>
          </ul>
          <p className="mt-4 max-w-xl text-sm text-muted">
            {h.freeNote} {siteConfig.accountsEnabled ? h.accountsNote : h.localNote}
          </p>
        </div>
        <PreviewCard />
      </section>

      <Ornament />

      <section aria-labelledby="home-how" className="py-12">
        <h2 id="home-how" className="font-display text-2xl font-bold">
          {h.how.title}
        </h2>
        <p className="mt-2 max-w-2xl text-muted">{h.how.lead}</p>
        {/* Os 4 passos são uma sequência de verdade: uma trilha com selos numerados. */}
        <ol className="relative mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <span
            aria-hidden="true"
            className="absolute top-5 right-[12%] left-[12%] hidden h-px bg-border-strong lg:block"
          />
          {h.how.steps.map((step, i) => (
            <li
              key={step.title}
              className="relative flex gap-3 lg:flex-col lg:items-center lg:text-center"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-accent bg-bg font-display text-lg font-bold text-accent">
                {i + 1}
              </span>
              <div className="lg:max-w-56">
                <h3 className="font-display text-base font-bold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Button asChild variant="primary">
            <Link to="/criar">{h.how.cta}</Link>
          </Button>
          <Link
            to="/comecar"
            className="text-sm font-semibold text-accent underline-offset-4 hover:underline"
          >
            {h.how.basics}
          </Link>
        </div>
      </section>

      <Ornament />

      <section aria-labelledby="home-features" className="py-12">
        <h2 id="home-features" className="font-display text-2xl font-bold">
          {h.features.title}
        </h2>
        <div className="mt-8 grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-border">
          {groups.map((group, gi) => (
            <section
              key={group.title}
              aria-labelledby={`home-group-${gi}`}
              className="md:px-6 md:first:pl-0 md:last:pr-0"
            >
              <h3 id={`home-group-${gi}`} className="font-display text-lg font-bold text-accent">
                {group.title}
              </h3>
              <ul className="mt-4 space-y-5">
                {group.items.map((item, ii) => {
                  const Icon = GROUP_ICONS[gi]?.[ii] ?? Calculator;
                  return (
                    <li key={item.title} className="flex gap-3">
                      <Icon className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden="true" />
                      <div>
                        <h4 className="font-semibold">{item.title}</h4>
                        <p className="mt-0.5 text-sm text-muted">{item.text}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </section>

      <Ornament />

      <div className="grid gap-10 py-12 pb-16 md:grid-cols-2">
        <section aria-labelledby="home-next">
          <h2 id="home-next" className="font-display text-xl font-bold">
            {h.next.title}
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {h.next.items.map((item) => (
              <li key={item} className="flex gap-2">
                <D20Icon className="mt-0.5 size-4 shrink-0 text-gold" />
                {item}
              </li>
            ))}
          </ul>
        </section>
        <aside
          aria-labelledby="home-support"
          className="flex flex-col justify-between rounded-xl border border-border bg-surface p-6"
        >
          <div>
            <h2 id="home-support" className="font-display text-xl font-bold">
              {h.supportTitle}
            </h2>
            <p className="mt-2 text-sm">{h.supportText}</p>
          </div>
          <Button asChild variant="primary" className="mt-4 self-start">
            <Link to="/apoie">{h.supportCta}</Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}
