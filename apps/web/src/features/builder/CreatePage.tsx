import {
  buildCharacterSheet,
  CLASSES,
  creationSteps,
  stepIssues,
  type CreationStep,
} from '@grimorio/rules';
import { ArrowLeft, ArrowRight, BookOpen, Check, Info, RotateCcw } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useAuthStore } from '@/features/auth/store';
import { createCharacter } from '@/features/characters/api';
import { hasLocalSheet, useSheetStore } from '@/features/sheet/store';
import { useToastStore } from '@/features/toast/store';
import { t } from '@/lib/i18n';
import { tw } from '@/lib/i18n/wizard';
import { newId } from '@/ports/ids';
import { safeStorage } from '@/ports/storage';
import { cn } from '@/lib/utils';
import { StepBar } from './components/parts';
import { goToIssue } from './guide';
import { AbilitiesStep } from './steps/AbilitiesStep';
import { ClassStep } from './steps/ClassStep';
import { DetailsStep } from './steps/DetailsStep';
import { OriginStep } from './steps/OriginStep';
import { useBuilderStore } from './store';

// A etapa Magias traz a lista das magias: só carrega para quem conjura.
const SpellsStep = lazy(() => import('./steps/SpellsStep'));

const w = tw;

/** O jogador já viu (e fechou) a explicação de como o assistente funciona. */
export const WIZARD_INTRO_KEY = 'grimorio.criacao.intro-visto';

/**
 * Assistente de criação (RF-20): Classe → Origem → Atributos → (Magias) → Toques Finais, na ordem
 * do Livro do Jogador 2024. Magias só aparece para quem conjura no nível 1 ou tem Iniciado em
 * Magia. Com conta, o personagem vai para a conta; sem conta, para este navegador.
 */
export default function CreatePage() {
  const step = useBuilderStore((s) => s.step);
  const draft = useBuilderStore((s) => s.draft);
  const setStep = useBuilderStore((s) => s.setStep);
  const reset = useBuilderStore((s) => s.reset);
  const authStatus = useAuthStore((s) => s.status);
  const loadLocal = useSheetStore((s) => s.loadLocal);
  const toast = useToastStore((s) => s.push);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [accountFailed, setAccountFailed] = useState(false);
  const [introSeen, setIntroSeen] = useState(() => safeStorage.get(WIZARD_INTRO_KEY) === '1');
  const topRef = useRef<HTMLDivElement>(null);

  const steps = creationSteps(draft);
  const index = Math.max(0, steps.indexOf(step));
  const issues = stepIssues(draft, step);
  const isLast = index === steps.length - 1;
  const saveTo = authStatus === 'signed-in' ? 'account' : 'local';

  useEffect(() => {
    document.title = `${w.pageTitle} · ${t.brand.name}`;
  }, []);

  // Trocou para uma classe que não conjura estando em Magias: volta para Atributos.
  const stepGone = !steps.includes(step);
  useEffect(() => {
    if (stepGone) setStep('abilities');
  }, [stepGone, setStep]);

  const go = (next: CreationStep) => {
    setStep(next);
    topRef.current?.scrollIntoView({ block: 'start' });
  };

  /** Dá para pular para uma etapa se todas as anteriores estão completas. */
  const reachable = (target: CreationStep) =>
    steps.slice(0, steps.indexOf(target)).every((s) => stepIssues(draft, s).length === 0);
  const done = (s: CreationStep) => stepIssues(draft, s).length === 0;

  const closeIntro = () => {
    safeStorage.set(WIZARD_INTRO_KEY, '1');
    setIntroSeen(true);
  };

  /** Texto da pendência; a escolha da classe usa o nome dela (Ordem Divina, Invocação Mística…). */
  const issueText = (issue: (typeof issues)[number]) => {
    const label = draft.classId ? CLASSES[draft.classId].option?.label : undefined;
    return issue === 'class-option-missing' && label ? w.chooseOption(label) : w.issues[issue];
  };

  /** Avançar/Criar nunca "não faz nada": com pendência, leva até ela. */
  const ready = issues.length === 0;
  const onPrimary = () => {
    if (!ready) {
      goToIssue(issues[0]!);
      return;
    }
    if (isLast) void create();
    else go(steps[index + 1]!);
  };

  const finishLocal = () => {
    const sheet = buildCharacterSheet(draft, { newId });
    if (!sheet) return;
    loadLocal(sheet);
    reset();
    toast(w.result.savedLocal, 'success');
    void navigate('/ficha');
  };

  const create = async () => {
    const sheet = buildCharacterSheet(draft, { newId });
    if (!sheet) return;
    if (saveTo === 'local') {
      if (hasLocalSheet()) setConfirmReplace(true);
      else finishLocal();
      return;
    }
    setBusy(true);
    setAccountFailed(false);
    const id = newId();
    const result = await createCharacter(id, sheet);
    setBusy(false);
    if (result.ok) {
      reset();
      toast(w.result.created(sheet.identity.name), 'success');
      void navigate(`/personagem?id=${id}`);
      return;
    }
    if (result.error?.code === 'LIMIT_EXCEEDED') toast(w.result.limit, 'danger');
    else setAccountFailed(true);
  };

  return (
    <div ref={topRef} className="mx-auto w-full max-w-6xl scroll-mt-16 px-4 pt-6 pb-32">
      <div className="mb-8 flex items-center gap-3">
        <StepBar
          steps={steps}
          current={step}
          done={done}
          reachable={reachable}
          onSelect={(s) => reachable(s) && go(s)}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={w.restart}
          title={w.restart}
          onClick={() => setConfirmRestart(true)}
        >
          <RotateCcw className="size-4" />
        </Button>
      </div>

      {introSeen ? null : (
        <aside
          className="mb-6 flex flex-col gap-3 rounded-xl border border-gold/40 bg-gold-soft p-4 sm:flex-row sm:items-center"
          data-testid="wizard.intro"
        >
          <Info className="size-6 shrink-0 text-gold" aria-hidden="true" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">{w.intro.title}</p>
            <p className="mt-0.5">{w.intro.text}</p>
            <Link
              to="/comecar"
              className="mt-1 inline-flex items-center gap-1 font-semibold text-gold underline underline-offset-4 hover:no-underline"
            >
              <BookOpen className="size-4" aria-hidden="true" />
              {w.intro.basics}
            </Link>
          </div>
          <Button size="sm" variant="outline" onClick={closeIntro} data-testid="wizard.intro.ok">
            {w.intro.ok}
          </Button>
        </aside>
      )}

      <p className="sr-only" aria-live="polite">
        {w.stepOf(index + 1, steps.length)}
      </p>

      {step === 'class' ? <ClassStep /> : null}
      {step === 'origin' ? <OriginStep /> : null}
      {step === 'abilities' ? <AbilitiesStep /> : null}
      {step === 'spells' && !stepGone ? (
        <Suspense fallback={<p className="py-8 text-center text-muted">{w.spells.loading}</p>}>
          <SpellsStep />
        </Suspense>
      ) : null}
      {step === 'details' ? <DetailsStep saveTo={saveTo} /> : null}

      {/* Rodapé fixo: voltar, o que falta e avançar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            disabled={index === 0}
            onClick={() => go(steps[index - 1]!)}
            data-testid="wizard.back"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {w.back}
          </Button>
          <div className="min-w-0 flex-1 text-sm" aria-live="polite">
            {issues.length ? (
              <div id="wizard-pending" data-testid="wizard.issues" title={w.pendingHint}>
                <span className="mr-1 font-semibold">{w.pending}</span>
                {issues.map((issue, i) => (
                  <button
                    key={issue}
                    type="button"
                    onClick={() => goToIssue(issue)}
                    className={cn(
                      'mr-2 underline underline-offset-4 hover:text-accent',
                      i === 0 ? 'font-semibold text-text' : 'text-muted max-sm:hidden',
                    )}
                    data-testid={`wizard.issue.${issue}`}
                  >
                    {issueText(issue)}
                  </button>
                ))}
              </div>
            ) : accountFailed ? (
              <p className="text-danger">{w.result.failed}</p>
            ) : (
              <p className="max-sm:hidden text-muted">{w.draftSaved}</p>
            )}
          </div>
          {accountFailed ? (
            <Button
              variant="outline"
              onClick={() => (hasLocalSheet() ? setConfirmReplace(true) : finishLocal())}
            >
              {w.result.saveLocalInstead}
            </Button>
          ) : null}
          {/* Com pendência o botão fica em contorno (menos destaque) mas continua clicável: leva até o que falta
              (por isso não é `disabled` nem `aria-disabled`; o leitor de tela ouve a pendência). */}
          <Button
            variant={ready ? 'primary' : 'outline'}
            disabled={busy}
            onClick={onPrimary}
            aria-describedby={ready ? undefined : 'wizard-pending'}
            data-testid={isLast ? 'wizard.finish' : 'wizard.next'}
            data-ready={ready}
          >
            {isLast ? (
              <>
                <Check className="size-4" aria-hidden="true" />
                {busy ? w.creating : w.create}
              </>
            ) : (
              <>
                {w.next}
                <ArrowRight className="size-4" aria-hidden="true" />
              </>
            )}
          </Button>
        </div>
      </div>

      <Dialog
        open={confirmRestart}
        onOpenChange={setConfirmRestart}
        title={w.restartTitle}
        description={w.restartText}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmRestart(false)}>
              {w.cancel}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                reset();
                setConfirmRestart(false);
              }}
            >
              {w.restartConfirm}
            </Button>
          </>
        }
      />
      <Dialog
        open={confirmReplace}
        onOpenChange={setConfirmReplace}
        title={w.result.replaceTitle}
        description={w.result.replaceText}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReplace(false)}>
              {w.cancel}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setConfirmReplace(false);
                finishLocal();
              }}
            >
              {w.result.replaceConfirm}
            </Button>
          </>
        }
      />
    </div>
  );
}
