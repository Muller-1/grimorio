import { Download, Trash2 } from 'lucide-react';
import { useEffect, useId, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Panel } from '@/components/ui/panel';
import { RadioCard } from '@/components/ui/radio-card';
import { SwitchTrack } from '@/components/ui/switch-track';
import { useAuthStore } from '@/features/auth/store';
import { ThemeOptions } from '@/features/theme/ThemePicker';
import { t } from '@/lib/i18n';
import { tst } from '@/lib/i18n/settings';
import { clearLocalData, downloadExport, localKeys } from '@/lib/local-data';
import {
  FONTS,
  MOTIONS,
  setFloatingDice,
  setFont,
  setMotion,
  subscribePreferences,
  useFloatingDice,
  useFont,
  useMotion,
} from '@/lib/preferences';

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

/** O aparelho pede menos movimento (para explicar por que o site começou sem animações). */
function useDeviceReducesMotion(): boolean {
  return useSyncExternalStore(
    subscribePreferences,
    () => window.matchMedia?.(REDUCE_QUERY).matches ?? false,
    () => false,
  );
}

function Group({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="font-display font-bold">{title}</legend>
      <p className="text-xs text-muted">{hint}</p>
      <div className="mt-2 grid gap-1">{children}</div>
    </fieldset>
  );
}

function MotionOptions() {
  const motion = useMotion();
  const device = useDeviceReducesMotion();
  const m = tst.comfort.motion;
  return (
    <Group title={m.title} hint={m.hint}>
      {MOTIONS.map((id) => (
        <RadioCard
          key={id}
          name="grimorio-movimento"
          value={id}
          checked={motion === id}
          onSelect={() => setMotion(id)}
          title={m.options[id].name}
          text={m.options[id].text}
          testId={`settings.motion.${id}`}
        />
      ))}
      {device ? <p className="mt-1 text-xs text-muted">{m.device}</p> : null}
    </Group>
  );
}

function FontOptions() {
  const font = useFont();
  const f = tst.comfort.font;
  return (
    <Group title={f.title} hint={f.hint}>
      {FONTS.map((id) => (
        <RadioCard
          key={id}
          name="grimorio-fonte"
          value={id}
          checked={font === id}
          onSelect={() => setFont(id)}
          title={f.options[id].name}
          text={f.options[id].text}
          // A amostra já usa a própria fonte, mesmo antes de escolher (`data-font` vale ali dentro).
          visual={
            <span
              aria-hidden="true"
              data-font={id}
              className="grid h-9 w-11 shrink-0 place-items-center rounded border border-border-strong bg-field font-display text-lg font-bold"
            >
              {f.sample}
            </span>
          }
          testId={`settings.font.${id}`}
        />
      ))}
    </Group>
  );
}

function FloatingDiceSwitch() {
  const on = useFloatingDice();
  const d = tst.dice.floating;
  const id = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-text`}
      onClick={() => setFloatingDice(!on)}
      className="flex w-full items-center gap-3 rounded-lg border border-border-soft bg-field px-3 py-2.5 text-left hover:bg-surface-2"
      data-testid="settings.floating-dice"
    >
      <span className="min-w-0 flex-1">
        <span id={`${id}-title`} className="block text-sm font-bold">
          {d.title}
        </span>
        <span id={`${id}-text`} className="block text-xs text-muted">
          {d.text}
        </span>
      </span>
      <SwitchTrack on={on} check />
    </button>
  );
}

function LocalData() {
  const signedIn = useAuthStore((s) => s.status === 'signed-in');
  const [count, setCount] = useState(() => localKeys().length);
  const [confirm, setConfirm] = useState(false);
  const d = tst.data;
  const c = d.confirm;

  // Uma preferência trocada aqui, ou qualquer coisa do site mudada em outra aba, muda a contagem.
  useEffect(() => {
    const recount = () => setCount(localKeys().length);
    const stop = subscribePreferences(recount);
    window.addEventListener('storage', recount);
    return () => {
      stop();
      window.removeEventListener('storage', recount);
    };
  }, []);

  const clear = () => {
    clearLocalData();
    // Recarrega do zero: nada que estava na memória da página volta a ser salvo.
    window.location.assign('/configuracoes?apagado=1');
  };

  return (
    <>
      <p className="text-sm text-muted">{d.lead}</p>
      <p className="mt-1 text-sm" data-testid="settings.data.count" data-value={count}>
        {d.count(count)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={downloadExport} disabled={count === 0} data-testid="settings.export">
          <Download className="size-4" aria-hidden="true" />
          {d.export}
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            setCount(localKeys().length);
            setConfirm(true);
          }}
          disabled={count === 0}
          data-testid="settings.clear"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          {d.clear}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted">{d.exportHint}</p>

      <Dialog
        open={confirm}
        onOpenChange={setConfirm}
        title={c.title}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              {c.cancel}
            </Button>
            <Button onClick={downloadExport}>
              <Download className="size-4" aria-hidden="true" />
              {c.exportFirst}
            </Button>
            <Button variant="danger" onClick={clear} data-testid="settings.clear.confirm">
              <Trash2 className="size-4" aria-hidden="true" />
              {c.confirm}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <p>{c.lead}</p>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            {c.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="font-bold">{signedIn ? c.account : c.noAccount}</p>
          <p className="rounded-md bg-danger-soft px-3 py-2 font-bold text-danger">{c.undo}</p>
        </div>
      </Dialog>
    </>
  );
}

/** Configurações deste aparelho: conforto (tema, animações, fonte), dados e o que fica guardado. */
export default function SettingsPage() {
  const [params, setParams] = useSearchParams();
  // Depois de apagar, a página volta com ?apagado=1: o aviso aparece uma vez e o endereço fica
  // limpo (recarregar não repete o aviso).
  const [cleared] = useState(() => params.get('apagado') === '1');

  useEffect(() => {
    document.title = `${tst.title} · ${t.brand.name}`;
  }, []);

  useEffect(() => {
    if (params.has('apagado')) setParams({}, { replace: true });
  }, [params, setParams]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold">{tst.title}</h1>
      <p className="mt-2 text-muted">{tst.lead}</p>

      <div role="status">
        {cleared ? (
          <p
            className="mt-4 rounded-lg border border-success bg-success-soft px-3 py-2 text-sm font-bold text-success"
            data-testid="settings.cleared"
          >
            {tst.data.cleared}
          </p>
        ) : null}
      </div>

      <div className="mt-6 space-y-4">
        <Panel title={tst.comfort.title} bodyClassName="grid gap-5 md:grid-cols-2">
          <ThemeOptions />
          <MotionOptions />
          <FontOptions />
        </Panel>

        <Panel title={tst.dice.title}>
          <FloatingDiceSwitch />
        </Panel>

        <Panel title={tst.data.title}>
          <LocalData />
        </Panel>
      </div>
    </div>
  );
}
