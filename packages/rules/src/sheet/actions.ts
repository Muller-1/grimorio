import type { HpEvent, LocalSheet } from '@grimorio/shared';
import { deriveSheet } from './derive';

/**
 * Ações de jogo da ficha local (subconjunto da `GameAction` do plano v2, 9.6).
 *
 * - O resultado do dado vem DENTRO da ação (`d20`, `rolled`), virtual ou físico:
 *   o reducer é puro e pode ser reaplicado no servidor no R2.
 * - Ações descrevem intenção relativa ("causar 5"), não valores absolutos ("PV = 19").
 * - "Desfazer" é uma ação inversa, não uma volta no tempo.
 */
export type SheetAction =
  | { type: 'damage'; amount: number; critical?: boolean }
  | { type: 'heal'; amount: number }
  | { type: 'set-temp-hp'; amount: number }
  | { type: 'undo-hp'; targetActionId: string }
  | { type: 'death-save'; d20: number }
  | { type: 'set-death-saves'; successes: number; failures: number }
  | { type: 'spend-hit-die'; rolled: number }
  | { type: 'long-rest' };

/** Avisos para a interface mostrar (códigos; a interface traduz). */
export type SheetNotice =
  | 'instant-death'
  | 'dead'
  | 'stable'
  | 'revived'
  | 'not-dying'
  | 'no-hit-dice'
  | 'needs-1-hp'
  | 'nothing-to-undo';

export interface ActionContext {
  /** Momento da ação (ISO). Vem da porta Clock: a função continua pura. */
  now: string;
  /** Id único da ação (porta de ids). */
  actionId: string;
}

export interface ActionOutcome {
  sheet: LocalSheet;
  notices: SheetNotice[];
}

const HP_LOG_LIMIT = 50;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const nonNegativeInt = (v: number) => Math.max(0, Math.floor(v));

export function applySheetAction(
  sheet: LocalSheet,
  action: SheetAction,
  ctx: ActionContext,
): ActionOutcome {
  const hpMax = deriveSheet(sheet).hpMax.value;
  const notices: SheetNotice[] = [];
  const { hp, deathSaves } = sheet.state;

  const withState = (state: Partial<LocalSheet['state']>): LocalSheet => ({
    ...sheet,
    state: { ...sheet.state, ...state },
  });

  const logEvent = (
    kind: HpEvent['kind'],
    amount: number,
    effect: HpEvent['effect'],
    extra: Partial<HpEvent> = {},
  ): HpEvent[] => {
    const event: HpEvent = { actionId: ctx.actionId, at: ctx.now, kind, amount, effect, ...extra };
    return [...sheet.state.hpLog, event].slice(-HP_LOG_LIMIT);
  };

  switch (action.type) {
    case 'damage': {
      const amount = nonNegativeInt(action.amount);
      const tempUsed = Math.min(hp.temp, amount);
      const rest = amount - tempUsed;
      let failures = deathSaves.failures;
      let current = hp.current;

      if (hp.current === 0 && rest > 0) {
        // Já caído: cada dano é uma falha (duas se crítico); dano ≥ PV máximo mata na hora.
        failures += action.critical ? 2 : 1;
        if (rest >= hpMax) {
          failures = 3;
          notices.push('instant-death');
        }
      } else if (rest > 0) {
        current = Math.max(0, hp.current - rest);
        const overflow = rest - hp.current;
        if (current === 0 && overflow >= hpMax) {
          failures = 3;
          notices.push('instant-death');
        }
      }
      failures = Math.min(3, failures);
      if (failures === 3 && deathSaves.failures < 3 && !notices.includes('instant-death')) {
        notices.push('dead');
      }

      return {
        sheet: withState({
          hp: { current, temp: hp.temp - tempUsed },
          deathSaves: { ...deathSaves, failures },
          hpLog: logEvent('damage', amount, { current: current - hp.current, temp: -tempUsed }),
        }),
        notices,
      };
    }

    case 'heal': {
      const amount = nonNegativeInt(action.amount);
      const current = Math.min(hpMax, hp.current + amount);
      const revived = hp.current === 0 && current > 0;
      return {
        sheet: withState({
          hp: { ...hp, current },
          deathSaves: revived ? { successes: 0, failures: 0 } : deathSaves,
          hpLog: logEvent('heal', amount, { current: current - hp.current, temp: 0 }),
        }),
        notices,
      };
    }

    case 'set-temp-hp': {
      // PV temporários não se somam: fica o maior.
      const amount = nonNegativeInt(action.amount);
      const temp = Math.max(hp.temp, amount);
      return {
        sheet: withState({
          hp: { ...hp, temp },
          hpLog: logEvent('temp', amount, { current: 0, temp: temp - hp.temp }),
        }),
        notices,
      };
    }

    case 'undo-hp': {
      const target = sheet.state.hpLog.find((e) => e.actionId === action.targetActionId);
      if (!target || target.undone) return { sheet, notices: ['nothing-to-undo'] };

      const current = clamp(hp.current - target.effect.current, 0, hpMax);
      const temp = Math.max(0, hp.temp - target.effect.temp);
      const hitDiceSpent =
        target.source === 'hit-die'
          ? Math.max(0, sheet.state.hitDiceSpent - 1)
          : sheet.state.hitDiceSpent;

      return {
        sheet: withState({
          hp: { current, temp },
          deathSaves: current > 0 ? { successes: 0, failures: 0 } : deathSaves,
          hitDiceSpent,
          hpLog: sheet.state.hpLog.map((e) => (e === target ? { ...e, undone: true } : e)),
        }),
        notices,
      };
    }

    case 'death-save': {
      if (hp.current > 0) return { sheet, notices: ['not-dying'] };
      const d20 = clamp(Math.floor(action.d20), 1, 20);

      if (d20 === 20) {
        notices.push('revived');
        return {
          sheet: withState({
            hp: { ...hp, current: Math.min(1, hpMax) },
            deathSaves: { successes: 0, failures: 0 },
            hpLog: logEvent('heal', 1, { current: 1, temp: 0 }),
          }),
          notices,
        };
      }

      let { successes, failures } = deathSaves;
      if (d20 === 1) failures += 2;
      else if (d20 >= 10) successes += 1;
      else failures += 1;
      successes = Math.min(3, successes);
      failures = Math.min(3, failures);
      if (failures === 3 && deathSaves.failures < 3) notices.push('dead');
      else if (successes === 3 && deathSaves.successes < 3) notices.push('stable');

      return { sheet: withState({ deathSaves: { successes, failures } }), notices };
    }

    case 'set-death-saves': {
      // Marcação manual (caixinhas). Só faz sentido caído.
      if (hp.current > 0) return { sheet, notices: ['not-dying'] };
      return {
        sheet: withState({
          deathSaves: {
            successes: clamp(Math.floor(action.successes), 0, 3),
            failures: clamp(Math.floor(action.failures), 0, 3),
          },
        }),
        notices,
      };
    }

    case 'spend-hit-die': {
      const { hitDice, abilities } = deriveSheet(sheet);
      if (hitDice.remaining <= 0) return { sheet, notices: ['no-hit-dice'] };
      if (hp.current < 1) return { sheet, notices: ['needs-1-hp'] };

      // Resultado do dado + Constituição, mínimo 1.
      const healing = Math.max(1, Math.floor(action.rolled) + abilities.con.mod);
      const current = Math.min(hpMax, hp.current + healing);
      return {
        sheet: withState({
          hp: { ...hp, current },
          hitDiceSpent: sheet.state.hitDiceSpent + 1,
          hpLog: logEvent(
            'heal',
            healing,
            { current: current - hp.current, temp: 0 },
            { source: 'hit-die' },
          ),
        }),
        notices,
      };
    }

    case 'long-rest':
      // Regras de 2024: precisa de pelo menos 1 PV para começar; ao terminar,
      // recupera todos os PV e todos os Dados de Vida gastos.
      if (hp.current < 1) return { sheet, notices: ['needs-1-hp'] };
      return {
        sheet: withState({
          hp: { current: hpMax, temp: 0 },
          deathSaves: { successes: 0, failures: 0 },
          hitDiceSpent: 0,
          hpLog: [],
        }),
        notices,
      };
  }
}
