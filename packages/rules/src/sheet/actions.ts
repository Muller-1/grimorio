import { freshAbilityState, type HpEvent, type LocalSheet } from '@grimorio/shared';
import { SPELL_ACTIVE_PREFIX } from '../engine/character';
import { CONDITION_PREFIX, EXHAUSTION_ID, exhaustionLevel, isOnYouKey } from '../engine/on-you';
import { SPELL_EFFECTS } from '../spells/effects';
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
  | { type: 'long-rest' }
  /** Descanso curto: recursos de descanso curto e Magia de Pacto voltam (Dados de Vida à parte). */
  | { type: 'short-rest' }
  | { type: 'spend-resource'; id: string; amount?: number }
  | { type: 'restore-resource'; id: string; amount?: number }
  /** Liga/desliga uma habilidade (Fúria). Ligar gasta o custo; desligar não devolve. */
  | { type: 'toggle-activation'; id: string }
  /** Usa uma habilidade de uso único (Retomar o Fôlego): gasta o custo e aplica a cura rolada. */
  | { type: 'use-activation'; id: string; healRolled?: number; tempHpRolled?: number }
  /** Espaço de magia (círculo 1–9) ou de Magia de Pacto (`pact`). */
  | { type: 'spend-slot'; circle: number; pact?: boolean }
  | { type: 'restore-slot'; circle: number; pact?: boolean }
  /** Começa (ou troca) a Concentração; `null` encerra. */
  | { type: 'set-concentration'; spellId: string | null }
  /** Marca que o efeito de uma magia está valendo em você (Bênção, Escudo da Fé…). */
  | { type: 'toggle-spell-effect'; spellId: string }
  /** Liga/desliga uma condição ("cond:poisoned") ou magia que atrapalha ("debuff:bane"). */
  | { type: 'toggle-on-you'; key: string }
  /** Nível de Exaustão (0 a 6). */
  | { type: 'set-exhaustion'; level: number };

/** Avisos para a interface mostrar (códigos; a interface traduz). */
export type SheetNotice =
  | 'instant-death'
  | 'dead'
  | 'stable'
  | 'revived'
  | 'not-dying'
  | 'no-hit-dice'
  | 'needs-1-hp'
  | 'nothing-to-undo'
  | 'no-uses'
  | 'requires-active'
  | 'no-slot'
  | 'unknown-ability'
  /** Ligar a Fúria encerrou a Concentração. */
  | 'concentration-ended';

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

type DeathSaves = LocalSheet['state']['deathSaves'];
const noSaves = (): DeathSaves => ({ successes: 0, failures: 0 });
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const nonNegativeInt = (v: number) => Math.max(0, Math.floor(v));

export function applySheetAction(
  sheet: LocalSheet,
  action: SheetAction,
  ctx: ActionContext,
): ActionOutcome {
  const derived = deriveSheet(sheet);
  const hpMax = derived.hpMax.value;
  const notices: SheetNotice[] = [];
  const { hp, deathSaves } = sheet.state;

  const withState = (state: Partial<LocalSheet['state']>): LocalSheet => ({
    ...sheet,
    state: { ...sheet.state, ...state },
  });

  /** Quanto os testes contra a morte mudaram (só entra no histórico quando mudou). */
  const savesDelta = (after: DeathSaves): Pick<HpEvent['effect'], 'deathSaves'> => {
    const successes = after.successes - deathSaves.successes;
    const failures = after.failures - deathSaves.failures;
    return successes || failures ? { deathSaves: { successes, failures } } : {};
  };

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
          hpLog: logEvent('damage', amount, {
            current: current - hp.current,
            temp: -tempUsed,
            ...savesDelta({ ...deathSaves, failures }),
          }),
        }),
        notices,
      };
    }

    case 'heal': {
      const amount = nonNegativeInt(action.amount);
      const current = Math.min(hpMax, hp.current + amount);
      const saves = hp.current === 0 && current > 0 ? noSaves() : deathSaves;
      return {
        sheet: withState({
          hp: { ...hp, current },
          deathSaves: saves,
          hpLog: logEvent('heal', amount, {
            current: current - hp.current,
            temp: 0,
            ...savesDelta(saves),
          }),
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
      const undoSaves = target.effect.deathSaves ?? noSaves();
      const hitDiceSpent =
        target.source === 'hit-die'
          ? Math.max(0, sheet.state.hitDiceSpent - 1)
          : sheet.state.hitDiceSpent;

      return {
        sheet: withState({
          hp: { current, temp },
          // De pé não há testes; caído, tira só o que este evento tinha mudado.
          deathSaves:
            current > 0
              ? noSaves()
              : {
                  successes: clamp(deathSaves.successes - undoSaves.successes, 0, 3),
                  failures: clamp(deathSaves.failures - undoSaves.failures, 0, 3),
                },
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
            deathSaves: noSaves(),
            hpLog: logEvent('heal', 1, { current: 1, temp: 0, ...savesDelta(noSaves()) }),
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
      const { hitDice, abilities } = derived;
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

    case 'short-rest': {
      const resources = { ...sheet.state.resources };
      for (const r of derived.engine.resources) {
        if (r.shortRest === 'all') delete resources[r.id];
        else if (r.shortRest === 'one' && r.spent > 0) resources[r.id] = r.spent - 1;
      }
      return { sheet: withState({ resources, pactSlotsSpent: 0 }), notices };
    }

    case 'spend-resource':
    case 'restore-resource': {
      const r = derived.engine.resources.find((x) => x.id === action.id);
      if (!r) return { sheet, notices: ['unknown-ability'] };
      const amount = Math.max(1, Math.floor(action.amount ?? 1));
      if (action.type === 'spend-resource' && r.remaining < amount) {
        return { sheet, notices: ['no-uses'] };
      }
      const spent = clamp(
        r.spent + (action.type === 'spend-resource' ? amount : -amount),
        0,
        r.max,
      );
      return { sheet: withState({ resources: withSpent(sheet, r.id, spent) }), notices };
    }

    case 'toggle-activation': {
      const a = derived.engine.activations.find((x) => x.id === action.id && x.mode === 'toggle');
      if (!a) return { sheet, notices: ['unknown-ability'] };
      if (a.active) {
        // Desliga esta e o que dependia dela (Golpe Brutal depende do Ataque Imprudente).
        const off = new Set([a.id]);
        for (const other of derived.engine.activations) {
          if (other.requires.some((id) => off.has(id))) off.add(other.id);
        }
        return {
          sheet: withState({ active: sheet.state.active.filter((id) => !off.has(id)) }),
          notices,
        };
      }
      if (a.blockedBy === 'requires') return { sheet, notices: ['requires-active'] };
      if (a.blockedBy === 'no-uses') return { sheet, notices: ['no-uses'] };
      let state: Partial<LocalSheet['state']> = { active: [...sheet.state.active, a.id] };
      if (a.cost) state = { ...state, resources: spendCost(sheet, derived, a.cost) };
      const next = withState(state);
      // Fúria: sem Concentração (Livro do Jogador, Bárbaro).
      if (a.id === 'rage' && next.state.concentration) {
        notices.push('concentration-ended');
        return { sheet: { ...next, state: withoutConcentration(next.state) }, notices };
      }
      return { sheet: next, notices };
    }

    case 'use-activation': {
      const a = derived.engine.activations.find((x) => x.id === action.id && x.mode === 'use');
      if (!a) return { sheet, notices: ['unknown-ability'] };
      if (a.blockedBy === 'no-uses') return { sheet, notices: ['no-uses'] };
      if (a.blockedBy === 'requires') return { sheet, notices: ['requires-active'] };
      let next: LocalSheet = a.cost
        ? withState({ resources: spendCost(sheet, derived, a.cost) })
        : sheet;
      if (action.healRolled !== undefined) {
        const amount = nonNegativeInt(action.healRolled);
        const current = Math.min(hpMax, next.state.hp.current + amount);
        const saves = next.state.hp.current === 0 && current > 0 ? noSaves() : deathSaves;
        next = {
          ...next,
          state: {
            ...next.state,
            hp: { ...next.state.hp, current },
            deathSaves: saves,
            hpLog: [
              ...next.state.hpLog,
              {
                actionId: ctx.actionId,
                at: ctx.now,
                kind: 'heal' as const,
                amount,
                effect: {
                  current: current - next.state.hp.current,
                  temp: 0,
                  ...savesDelta(saves),
                },
              },
            ].slice(-HP_LOG_LIMIT),
          },
        };
      }
      if (action.tempHpRolled !== undefined) {
        const temp = Math.max(next.state.hp.temp, nonNegativeInt(action.tempHpRolled));
        next = { ...next, state: { ...next.state, hp: { ...next.state.hp, temp } } };
      }
      return { sheet: next, notices };
    }

    case 'spend-slot':
    case 'restore-slot': {
      const sc = derived.spellcasting;
      const delta = action.type === 'spend-slot' ? 1 : -1;
      if (action.pact) {
        if (!sc?.pact) return { sheet, notices: ['no-slot'] };
        const spent = sc.pact.spent + delta;
        if (spent > sc.pact.max) return { sheet, notices: ['no-slot'] };
        return { sheet: withState({ pactSlotsSpent: clamp(spent, 0, sc.pact.max) }), notices };
      }
      const slot = sc?.slots.find((x) => x.circle === action.circle);
      if (!slot) return { sheet, notices: ['no-slot'] };
      const spent = slot.spent + delta;
      if (spent > slot.max) return { sheet, notices: ['no-slot'] };
      const slotsSpent = [...sheet.state.slotsSpent];
      slotsSpent[slot.circle - 1] = clamp(spent, 0, slot.max);
      return { sheet: withState({ slotsSpent }), notices };
    }

    case 'set-concentration': {
      const ended = withoutConcentration(sheet.state);
      if (action.spellId === null) return { sheet: { ...sheet, state: ended }, notices };
      return {
        sheet: { ...sheet, state: { ...ended, concentration: action.spellId.slice(0, 60) } },
        notices,
      };
    }

    case 'toggle-spell-effect': {
      const key = `${SPELL_ACTIVE_PREFIX}${action.spellId}`;
      if (!SPELL_EFFECTS[action.spellId]) return { sheet, notices: ['unknown-ability'] };
      const on = sheet.state.active.includes(key);
      return {
        sheet: withState({
          active: on ? sheet.state.active.filter((id) => id !== key) : [...sheet.state.active, key],
        }),
        notices,
      };
    }

    case 'toggle-on-you': {
      if (!isOnYouKey(action.key) || action.key.startsWith(`${CONDITION_PREFIX}${EXHAUSTION_ID}`)) {
        return { sheet, notices: ['unknown-ability'] };
      }
      const on = sheet.state.active.includes(action.key);
      return {
        sheet: withState({
          active: on
            ? sheet.state.active.filter((id) => id !== action.key)
            : [...sheet.state.active, action.key],
        }),
        notices,
      };
    }

    case 'set-exhaustion':
      return {
        sheet: withState({ active: withExhaustion(sheet.state.active, action.level) }),
        notices,
      };

    case 'long-rest':
      // Regras de 2024: precisa de pelo menos 1 PV para começar; ao terminar,
      // recupera todos os PV, todos os Dados de Vida, os espaços de magia e os usos das
      // habilidades, e o que estava ativo (Fúria, concentração) termina.
      if (hp.current < 1) return { sheet, notices: ['needs-1-hp'] };
      {
        const { concentration: _ended, ...rest } = sheet.state;
        // Condições continuam (o Mestre diz quando acabam); a Exaustão perde 1 nível.
        const conditions = sheet.state.active.filter(
          (id) =>
            id.startsWith(CONDITION_PREFIX) &&
            !id.startsWith(`${CONDITION_PREFIX}${EXHAUSTION_ID}`),
        );
        const active = withExhaustion(conditions, exhaustionLevel(sheet.state.active) - 1);
        return {
          sheet: {
            ...sheet,
            state: {
              ...rest,
              ...freshAbilityState(),
              active,
              hp: { current: hpMax, temp: 0 },
              deathSaves: noSaves(),
              hitDiceSpent: 0,
              hpLog: [],
            },
          },
          notices,
        };
      }
  }
}

function withSpent(sheet: LocalSheet, id: string, spent: number): Record<string, number> {
  const resources = { ...sheet.state.resources };
  if (spent <= 0) delete resources[id];
  else resources[id] = spent;
  return resources;
}

function spendCost(
  sheet: LocalSheet,
  derived: ReturnType<typeof deriveSheet>,
  cost: { resource: string; amount: number },
): Record<string, number> {
  const r = derived.engine.resources.find((x) => x.id === cost.resource);
  if (!r) return sheet.state.resources;
  return withSpent(sheet, r.id, Math.min(r.max, r.spent + cost.amount));
}

/**
 * Encerra a Concentração: tira `concentration` e o efeito ligado dessa magia em você.
 */
function withoutConcentration(state: LocalSheet['state']): LocalSheet['state'] {
  const { concentration, ...rest } = state;
  if (!concentration) return state;
  const key = `${SPELL_ACTIVE_PREFIX}${concentration}`;
  return { ...rest, active: rest.active.filter((id) => id !== key) };
}

/** Troca o nível de Exaustão em `state.active` (0 tira). */
function withExhaustion(active: string[], level: number): string[] {
  const rest = active.filter((id) => !id.startsWith(`${CONDITION_PREFIX}${EXHAUSTION_ID}`));
  const l = Math.min(6, Math.max(0, Math.floor(level)));
  return l > 0 ? [...rest, `${CONDITION_PREFIX}${EXHAUSTION_ID}:${l}`] : rest;
}
