import { FilePlus2, ImageUp, Pencil, Sparkles } from 'lucide-react';
import { lazy, Suspense, useId, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Popover } from '@/components/ui/popover';
import { useToastStore } from '@/features/toast/store';
import type { ImageError } from '@/lib/image';
import { ts } from '@/lib/i18n/sheet';
import { cn } from '@/lib/utils';
import { useSheet } from '../hooks';
import { useSheetStore } from '../store';
import { ExplainButton } from './Explain';

type TextField = 'name' | 'className' | 'playerName' | 'origin';

const i = ts.identity;

// O diálogo de subir de nível (com a lista de magias) só carrega quando o jogador abre.
const LevelUpDialog = lazy(() => import('@/features/levelup/LevelUpDialog'));

function LevelUpButton() {
  const level = useSheetStore((s) => s.sheet.build.level);
  const [open, setOpen] = useState(false);
  const l = ts.levelUp;
  return (
    <>
      <Button
        variant="primary"
        className="px-3.5"
        onClick={() => setOpen(true)}
        disabled={level >= 20}
        title={level >= 20 ? l.max : l.hint}
        data-testid="levelup.open"
      >
        {l.button}
      </Button>
      {open ? (
        <Suspense fallback={null}>
          <LevelUpDialog onClose={() => setOpen(false)} />
        </Suspense>
      ) : null}
    </>
  );
}

/** O retrato num selo redondo; tocar abre o envio de foto ou o link da imagem. */
function Portrait({ name }: { name: string }) {
  const url = useSheetStore((s) => s.sheet.identity.portraitUrl);
  const data = useSheetStore((s) => s.sheet.identity.portraitData);
  const edit = useSheetStore((s) => s.edit);
  const toast = useToastStore((s) => s.push);
  const [draft, setDraft] = useState(url ?? '');
  const [busy, setBusy] = useState(false);
  const id = useId();
  const fileId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const shown = data ?? url;

  const commit = (text: string) => {
    setDraft(text);
    const trimmed = text.trim();
    if (trimmed === '') {
      edit((d) => void delete d.identity.portraitUrl);
      return;
    }
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'https:') edit((d) => void (d.identity.portraitUrl = parsed.href));
    } catch {
      // ainda digitando
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      // A compressão só carrega quando o jogador escolhe uma foto.
      const { compressPortrait } = await import('@/lib/image');
      const compressed = await compressPortrait(file);
      edit((d) => void (d.identity.portraitData = compressed));
    } catch (err) {
      const code: ImageError =
        err instanceof Error && ['not-image', 'too-big'].includes(err.message)
          ? (err.message as ImageError)
          : 'unreadable';
      toast(i.portraitErrors[code], 'danger');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Popover
      align="start"
      trigger={
        <button
          type="button"
          className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-bg font-display text-[1.625rem] font-bold text-accent shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--ornament)] hover:shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--border-strong)]"
          aria-label={i.portrait}
          data-testid="portrait.trigger"
        >
          {shown ? (
            <img
              src={shown}
              alt={i.portrait}
              className="size-full object-cover"
              referrerPolicy="no-referrer"
              data-testid="portrait.image"
            />
          ) : (
            <span aria-hidden="true">{name.trim()[0]?.toUpperCase() ?? '?'}</span>
          )}
        </button>
      }
    >
      <div className="space-y-3">
        <div>
          <input
            ref={fileRef}
            id={fileId}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => void upload(e.target.files?.[0])}
            data-testid="portrait.file"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="primary"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <ImageUp className="size-4" />
              {busy ? i.portraitBusy : i.portraitUpload}
            </Button>
            {data ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => edit((d) => void delete d.identity.portraitData)}
                data-testid="portrait.remove"
              >
                {i.portraitRemove}
              </Button>
            ) : null}
          </div>
          <p className="mt-1.5 text-xs text-muted">{i.portraitUploadHint}</p>
        </div>
        <div className="border-t border-border pt-3">
          <Label htmlFor={id}>{i.portraitUrl}</Label>
          <Input
            id={id}
            type="url"
            inputMode="url"
            placeholder={i.portraitPlaceholder}
            value={draft}
            onChange={(e) => commit(e.target.value)}
            className="mt-1"
          />
          <p className="mt-1.5 text-xs text-muted">{i.portraitHint}</p>
        </div>
      </div>
    </Popover>
  );
}

function TextInput({ field, label }: { field: TextField; label: string }) {
  const value = useSheetStore((s) => s.sheet.identity[field]);
  const edit = useSheetStore((s) => s.edit);
  const id = useId();
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        maxLength={field === 'origin' ? 120 : 80}
        onChange={(e) => edit((d) => void (d.identity[field] = e.target.value))}
        data-testid={`identity.${field}`}
      />
    </div>
  );
}

/** Nome, classe, jogador, origem e descrição (na ficha em branco, preenchidos à mão). */
function IdentityDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const description = useSheetStore((s) => s.sheet.identity.description);
  const edit = useSheetStore((s) => s.edit);
  const descId = useId();
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={i.editTitle}
      footer={
        <Button variant="primary" onClick={onClose}>
          {i.done}
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput field="name" label={i.name} />
        <TextInput field="className" label={i.className} />
        <TextInput field="playerName" label={i.player} />
        <TextInput field="origin" label={i.origin} />
      </div>
      <div className="mt-3 space-y-1">
        <Label htmlFor={descId}>{i.description}</Label>
        <Textarea
          id={descId}
          value={description}
          maxLength={4000}
          placeholder={i.descriptionPlaceholder}
          onChange={(e) => edit((d) => void (d.identity.description = e.target.value))}
          className="min-h-32"
        />
      </div>
    </Dialog>
  );
}

/** "Criminosa · Humana" (assistente) vira antecedente e espécie; texto livre fica como origem. */
function originParts(origin: string): { label: string; value: string }[] {
  if (!origin.trim()) return [];
  const parts = origin.split(' · ');
  if (parts.length === 2) {
    return [
      { label: i.species, value: parts[1]! },
      { label: i.background, value: parts[0]! },
    ];
  }
  return [{ label: i.origin, value: origin }];
}

/** Ações da ficha que não cabem na faixa: editar os dados e, na ficha deste navegador, recomeçar. */
function SheetMenu({
  onEdit,
  onExample,
  onBlank,
}: {
  onEdit: () => void;
  onExample?: (() => void) | undefined;
  onBlank?: (() => void) | undefined;
}) {
  const item = 'w-full justify-start';
  return (
    <Popover
      align="end"
      trigger={
        <button
          type="button"
          aria-label={i.menu}
          title={i.menu}
          className="grid size-11 shrink-0 place-items-center rounded-[10px] border border-border bg-field hover:bg-surface-2 max-md:absolute max-md:top-3.5 max-md:right-4"
          data-testid="sheet.menu"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-text">
            <circle cx="5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="19" cy="12" r="1.8" />
          </svg>
        </button>
      }
      className="w-64"
    >
      <div className="grid gap-1">
        <Button variant="ghost" size="sm" className={item} onClick={onEdit}>
          <Pencil className="size-4" />
          {i.edit}
        </Button>
        {onExample ? (
          <Button variant="ghost" size="sm" className={item} onClick={onExample}>
            <Sparkles className="size-4" />
            {ts.loadExample}
          </Button>
        ) : null}
        {onBlank ? (
          <Button variant="ghost" size="sm" className={item} onClick={onBlank}>
            <FilePlus2 className="size-4" />
            {ts.newSheet}
          </Button>
        ) : null}
      </div>
    </Popover>
  );
}

/**
 * Faixa de identidade (docs/design.md): retrato, nome e onde está salva; classe, espécie,
 * antecedente e jogador; nível com "Subir de nível", proficiência e o menu da ficha.
 */
export function IdentityBar({
  status,
  onExample,
  onBlank,
}: {
  /** Ficha da conta: a situação do salvamento; sem ela, "Salvo neste navegador". */
  status?: ReactNode;
  onExample?: () => void;
  onBlank?: () => void;
}) {
  const { sheet, derived } = useSheet();
  const [editing, setEditing] = useState(false);
  const { identity } = sheet;
  const name = identity.name || ts.unnamed;
  const facts = [
    { label: i.className, value: identity.className },
    ...originParts(identity.origin),
    { label: i.player, value: identity.playerName || i.you },
  ].filter((f) => f.value);

  return (
    <section
      aria-label={i.sectionLabel}
      className="@container relative flex flex-wrap items-center gap-x-6 gap-y-4 rounded-xl border border-border bg-surface px-4 py-3.5 md:px-5"
    >
      <div className="flex min-w-0 flex-[0_1_auto] items-center gap-4 max-md:pr-12">
        <Portrait name={name} />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="truncate font-display text-[1.5rem] leading-[1.15] font-bold md:text-[1.75rem]">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="max-w-full truncate rounded-md text-left hover:text-accent"
              title={i.edit}
            >
              {name}
            </button>
          </h1>
          {status ?? (
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="size-3.5"
              >
                <path d="M4 14v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5M12 4v11M8 11l4 4 4-4" />
              </svg>
              {ts.savedLocally}
            </p>
          )}
        </div>
      </div>

      {/* Classe, espécie… ficam entre o nome e o nível quando cabem (a faixa tem ~1290 px); na
          tela menor, descem para uma linha só delas, em vez de quebrar no meio. */}
      {facts.length ? (
        <dl className="grid w-full grid-cols-2 gap-x-4 gap-y-3 border-y border-border-soft py-3 md:order-last md:flex md:flex-wrap md:items-stretch md:justify-center md:gap-y-2.5 md:border-b-0 md:pb-0 @min-[1290px]:order-none @min-[1290px]:w-auto @min-[1290px]:flex-[1_1_420px] @min-[1290px]:border-t-0 @min-[1290px]:pt-0">
          {facts.map((f, n) => (
            <div
              key={f.label}
              className={cn(
                'flex flex-col gap-0.5 md:border-l md:border-border md:px-5 md:py-0.5',
                n === facts.length - 1 && 'md:border-r',
              )}
            >
              <dt className="label-caps text-xs tracking-[0.12em]">{f.label}</dt>
              <dd className="text-[1.0625rem] font-bold">{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 max-md:w-full md:ml-auto">
        <div className="flex h-[60px] items-center justify-between gap-3 rounded-[10px] border border-border bg-field pr-2.5 pl-4 max-md:flex-[1_1_190px]">
          <div className="flex flex-col items-center">
            <span className="label-caps text-xs tracking-[0.12em]">{i.level}</span>
            <span
              className="tabular font-display text-2xl leading-[1.1] font-bold"
              data-testid="stat.level"
              data-value={sheet.build.level}
            >
              {sheet.build.level}
            </span>
          </div>
          <LevelUpButton />
        </div>
        <ExplainButton
          explained={derived.proficiencyBonus}
          title={i.proficiency}
          testId="stat.prof"
          className="flex h-[60px] min-w-[104px] flex-col items-center justify-center rounded-[10px] border border-border bg-field px-3 hover:border-ornament hover:bg-field hover:no-underline max-md:flex-[1_1_104px]"
        >
          <span className="label-caps text-xs tracking-[0.12em]">{i.proficiency}</span>
          <span className="font-display text-2xl leading-[1.1] font-bold">
            {`+${derived.proficiencyBonus.value}`}
          </span>
        </ExplainButton>
        <SheetMenu onEdit={() => setEditing(true)} onExample={onExample} onBlank={onBlank} />
      </div>
      <IdentityDialog open={editing} onClose={() => setEditing(false)} />
    </section>
  );
}
