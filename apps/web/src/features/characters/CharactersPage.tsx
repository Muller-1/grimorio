import type { CharacterSummary } from '@grimorio/shared';
import { CloudUpload, HardDrive, LogIn, Plus, ScrollText, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ServerStatus } from '@/features/auth/ServerStatus';
import { useAuthStore } from '@/features/auth/store';
import { InlineLoader } from '@/features/screens/LoadingScreen';
import { useToastStore } from '@/features/toast/store';
import { formatDateTime } from '@/lib/format';
import { t } from '@/lib/i18n';
import { deleteCharacter, listCharacters } from './api';
import { forgetCachedCharacter, hasUnsyncedChanges } from './sync';

type ListState =
  { kind: 'loading' } | { kind: 'failed' } | { kind: 'ready'; items: CharacterSummary[] };

function LocalSheetCard() {
  const c = t.characters;
  return (
    <section className="rounded-xl border border-dashed border-border-strong bg-surface p-4">
      <h2 className="flex items-center gap-2 font-display font-bold">
        <HardDrive className="size-4 text-accent" aria-hidden="true" />
        {c.localTitle}
      </h2>
      <p className="mt-1 text-sm text-muted">{c.localText}</p>
      <Button asChild size="sm" className="mt-3">
        <Link to="/ficha">{c.localOpen}</Link>
      </Button>
    </section>
  );
}

function CharacterCard({
  item,
  pending,
  onRemove,
}: {
  item: CharacterSummary;
  pending: boolean;
  onRemove: () => void;
}) {
  const c = t.characters;
  const name = item.name || c.unnamed;
  return (
    <li className="flex items-stretch rounded-xl border border-border bg-surface shadow-card transition-colors hover:border-border-strong">
      <Link
        to={`/personagem?id=${item.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 p-4"
        aria-label={c.open(name)}
        data-testid="characters.item"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft font-display text-lg font-bold text-accent">
          {item.level}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-display text-lg font-bold">{name}</span>
          <span className="block truncate text-sm text-muted">
            {item.classSummary || c.noClass} · {c.level(item.level)}
          </span>
          <span className="block text-xs text-muted">
            {c.updated(formatDateTime(item.updatedAt))}
          </span>
        </span>
        {pending ? (
          <CloudUpload
            className="ml-auto size-4 shrink-0 text-gold"
            aria-label={c.pendingBadge}
            role="img"
          />
        ) : null}
      </Link>
      <Button
        variant="ghost"
        size="icon"
        className="m-2 self-center text-muted hover:text-danger"
        aria-label={c.remove(name)}
        onClick={onRemove}
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}

export default function CharactersPage() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const toast = useToastStore((s) => s.push);
  const [list, setList] = useState<ListState>({ kind: 'loading' });
  const [removing, setRemoving] = useState<CharacterSummary | null>(null);
  const c = t.characters;

  useEffect(() => {
    document.title = `${c.pageTitle} · ${t.brand.name}`;
  }, [c.pageTitle]);

  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    if (status !== 'signed-in') return;
    let cancelled = false;
    void listCharacters().then((result) => {
      if (cancelled) return;
      setList(result.ok ? { kind: 'ready', items: result.data } : { kind: 'failed' });
    });
    return () => {
      cancelled = true;
    };
  }, [status, reloadKey]);
  const reload = () => {
    setList({ kind: 'loading' });
    setReloadKey((k) => k + 1);
  };

  const confirmRemove = async () => {
    if (!removing) return;
    const target = removing;
    setRemoving(null);
    const result = await deleteCharacter(target.id);
    if (!result.ok && result.status !== 404) {
      toast(c.removeFailed, 'danger');
      return;
    }
    forgetCachedCharacter(target.id);
    setList((prev) =>
      prev.kind === 'ready'
        ? { kind: 'ready', items: prev.items.filter((i) => i.id !== target.id) }
        : prev,
    );
  };

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold">{c.pageTitle}</h1>
        {status === 'signed-in' ? <p className="text-sm text-muted">{c.lead}</p> : null}
      </div>
      <Button asChild variant="primary" data-testid="characters.create">
        <Link to="/criar">
          <Plus className="size-4" aria-hidden="true" />
          {c.create}
        </Link>
      </Button>
    </div>
  );

  let body;
  if (status === 'signed-in' && user) {
    if (list.kind === 'loading') {
      body = <InlineLoader label={c.loading} />;
    } else if (list.kind === 'failed') {
      body = (
        <div className="py-10 text-center">
          <p className="text-muted">{c.loadFailed}</p>
          <Button size="sm" className="mt-3" onClick={reload}>
            {c.retry}
          </Button>
        </div>
      );
    } else if (list.items.length === 0) {
      body = (
        <div className="rounded-xl border border-border bg-surface px-4 py-10 text-center">
          <ScrollText className="mx-auto size-10 text-muted" aria-hidden="true" />
          <p className="mt-3 font-semibold">{c.empty}</p>
          <p className="mt-1 text-sm text-muted">{c.emptyHint}</p>
          <Button asChild variant="primary" className="mt-4">
            <Link to="/criar">
              <Plus className="size-4" aria-hidden="true" />
              {c.emptyCta}
            </Link>
          </Button>
        </div>
      );
    } else {
      body = (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="characters.list">
          {list.items.map((item) => (
            <CharacterCard
              key={item.id}
              item={item}
              pending={hasUnsyncedChanges(item.id, user.id)}
              onRemove={() => setRemoving(item)}
            />
          ))}
        </ul>
      );
    }
  } else if (status === 'loading') {
    body = (
      <div>
        <InlineLoader label={c.loading} className="pb-6" />
        <ServerStatus className="mx-auto max-w-md justify-center text-left" />
      </div>
    );
  } else {
    body = (
      <div className="rounded-xl border border-border bg-surface p-5">
        {status === 'signed-out' ? (
          <>
            <h2 className="font-display text-lg font-bold">{c.signedOutTitle}</h2>
            <p className="mt-1 text-sm text-muted">{c.signedOutText}</p>
            <Button asChild size="sm" className="mt-3">
              <Link to="/entrar?voltar=/personagens">
                <LogIn className="size-4" aria-hidden="true" />
                {t.auth.signIn}
              </Link>
            </Button>
          </>
        ) : status === 'unavailable' ? (
          <ServerStatus />
        ) : (
          <p className="text-sm text-muted">{t.auth.page.disabled}</p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-8">
      {header}
      {body}
      <LocalSheetCard />
      <Dialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={c.removeTitle}
        description={removing ? c.removeText(removing.name || c.unnamed) : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemoving(null)}>
              {c.cancel}
            </Button>
            <Button variant="danger" onClick={() => void confirmRemove()}>
              {c.removeConfirm}
            </Button>
          </>
        }
      />
    </div>
  );
}
