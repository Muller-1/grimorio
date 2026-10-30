import {
  freshAbilityState,
  type ActiveInfo,
  type EffectDuration,
  type HpEvent,
  type LocalSheet,
} from '@grimorio/shared';
import { SPELL_ACTIVE_PREFIX } from '../engine/character';
import {
  CONDITION_PREFIX,
  EXHAUSTION_ID,
  exhaustionLevel,
  isOnYouKey,
  onYouEntry,
} from '../engine/on-you';
import { durationInRounds } from '../spells/duration';
import { SPELL_EFFECTS } from '../spells/effects';
import { deriveSheet, type SheetDerived } from './derive';

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
  /**
   * Começa (ou troca) a Concentração; `null` encerra. `duration`: a da magia (sem ela, a das
   * magias que a ficha conhece).
   */
  | { type: 'set-concentration'; spellId: string | null; duration?: EffectDuration }
  /**
   * Marca que o efeito de uma magia está valendo em você (Bênção, Escudo da Fé…). `by`: quem
   * conjurou (padrão: você).
   */
  | { type: 'toggle-spell-effect'; spellId: string; by?: 'self' | 'other' }
  /**
   * Liga/desliga uma condição ("cond:poisoned") ou magia que atrapalha ("debuff:bane").
   * `rounds`: quantas rodadas dura (ex.: Atordoado até o fim do próximo turno = 1).
   */
  | { type: 'toggle-on-you'; key: string; rounds?: number }
  /** Combate: começa na rodada 1, passa para a próxima (o que acabou sai) ou termina. */
  | { type: 'start-combat' }
  | { type: 'next-round' }
  | { type: 'end-combat' }
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
  | 'concentration-ended'
  /** Passou o tempo de algum efeito (ou da Concentração): ele saiu da ficha. */
  | 'effects-ended';

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

/**
 * Aplica uma ação de jogo. `derived` é o `deriveSheet(sheet)` que a tela já calculou; sem ele, a
 * função calcula de novo (o resultado é o mesmo, só custa mais).
 */
export function applySheetAction(
  sheet: LocalSheet,
  action: SheetAction,
  ctx: ActionContext,
  derived: SheetDerived = deriveSheet(sheet),
): ActionOutcome {
  const outcome = applyAction(sheet, action, ctx, derived);
  if (outcome.sheet === sheet) return outcome;
  return {
    ...outcome,
    sheet: { ...outcome.sheet, state: tidyInfo(sheet.state, outcome.sheet.state, ctx) },
  };
}

function applyAction(
  sheet: LocalSheet,
  action: SheetAction,
  ctx: ActionContext,
  derived: SheetDerived,
): ActionOutcome {
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
      // Passa 1 hora: acaba o que dura até 1 hora (Bênção, Escudo da Fé…).
      const passed = expire(sheet.state, (info) => fitsIn(info, 600));
      if (passed.ended) notices.push('effects-ended');
      return {
        sheet: { ...sheet, state: { ...passed.state, resources, pactSlotsSpent: 0 } },
        notices,
      };
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
      const duration = action.duration ?? SPELL_EFFECTS[action.spellId]?.duration;
      const concentrationInfo: ActiveInfo = {
        ...startInfo(sheet.state, ctx),
        ...(duration ? { duration } : {}),
        by: 'self',
        concentration: true,
      };
      return {
        sheet: {
          ...sheet,
          state: { ...ended, concentration: action.spellId.slice(0, 60), concentrationInfo },
        },
        notices,
      };
    }

    case 'toggle-spell-effect': {
      const key = `${SPELL_ACTIVE_PREFIX}${action.spellId}`;
      const spell = SPELL_EFFECTS[action.spellId];
      if (!spell) return { sheet, notices: ['unknown-ability'] };
      const on = sheet.state.active.includes(key);
      if (on) {
        return {
          sheet: withState({ active: sheet.state.active.filter((id) => id !== key) }),
          notices,
        };
      }
      const info: ActiveInfo = {
        ...startInfo(sheet.state, ctx),
        ...(spell.duration ? { duration: spell.duration } : {}),
        by: action.by ?? 'self',
        ...(spell.concentration ? { concentration: true } : {}),
      };
      return {
        sheet: withState({
          active: [...sheet.state.active, key],
          activeInfo: { ...sheet.state.activeInfo, [key]: info },
        }),
        notices,
      };
    }

    case 'toggle-on-you': {
      if (!isOnYouKey(action.key) || action.key.startsWith(`${CONDITION_PREFIX}${EXHAUSTION_ID}`)) {
        return { sheet, notices: ['unknown-ability'] };
      }
      const on = sheet.state.active.includes(action.key);
      const rounds = action.rounds === undefined ? 0 : clamp(Math.floor(action.rounds), 0, 9999);
      const info: ActiveInfo = {
        ...startInfo(sheet.state, ctx),
        ...(rounds > 0 ? { duration: { amount: rounds, unit: 'round' as const } } : {}),
        by: 'other',
      };
      const state = {
        ...sheet.state,
        ...(on
          ? { active: sheet.state.active.filter((id) => id !== action.key) }
          : {
              active: [...sheet.state.active, action.key],
              activeInfo: { ...sheet.state.activeInfo, [action.key]: info },
            }),
      };
      // Incapacitado (e o que inclui) encerra a Concentração.
      const breaks = onYouEntry(action.key)?.effects.some(
        (e) => e.type === 'cannot-act' && e.breaksConcentration,
      );
      if (!on && breaks && state.concentration) {
        notices.push('concentration-ended');
        return { sheet: { ...sheet, state: withoutConcentration(state) }, notices };
      }
      return { sheet: { ...sheet, state }, notices };
    }

    case 'start-combat': {
      // O que já estava ligado conta a partir da rodada 1.
      const from1 = (info: ActiveInfo): ActiveInfo =>
        info.startedRound === undefined ? { ...info, startedRound: 1 } : info;
      const { concentrationInfo, activeInfo } = sheet.state;
      return {
        sheet: withState({
          round: 1,
          ...(activeInfo ? { activeInfo: mapInfo(activeInfo, from1) } : {}),
          ...(concentrationInfo ? { concentrationInfo: from1(concentrationInfo) } : {}),
        }),
        notices,
      };
    }

    case 'next-round': {
      const round = (sheet.state.round ?? 0) + 1;
      const passed = expire({ ...sheet.state, round }, (info) => {
        if (!info.duration || info.startedRound === undefined) return false;
        return round >= info.startedRound + durationInRounds(info.duration);
      });
      if (passed.ended) notices.push('effects-ended');
      return { sheet: { ...sheet, state: passed.state }, notices };
    }

    case 'end-combat': {
      // Acaba o que dura rodadas; o resto continua, mas sem rodada para contar.
      const passed = expire(sheet.state, (info) => info.duration?.unit === 'round');
      if (passed.ended) notices.push('effects-ended');
      const { round: _round, ...state } = passed.state;
      const outOfCombat = ({ startedRound: _r, ...info }: ActiveInfo): ActiveInfo => info;
      if (state.activeInfo) state.activeInfo = mapInfo(state.activeInfo, outOfCombat);
      if (state.concentrationInfo) state.concentrationInfo = outOfCombat(state.concentrationInfo);
      return { sheet: { ...sheet, state }, notices };
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
  const { concentration, concentrationInfo: _info, ...rest } = state;
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

/** Início de um efeito: agora e, em combate, a rodada. */
function startInfo(state: LocalSheet['state'], ctx: ActionContext): ActiveInfo {
  return { startedAt: ctx.now, ...(state.round ? { startedRound: state.round } : {}) };
}

function mapInfo(
  info: Record<string, ActiveInfo>,
  fn: (i: ActiveInfo) => ActiveInfo,
): Record<string, ActiveInfo> {
  return Object.fromEntries(Object.entries(info).map(([k, v]) => [k, fn(v)]));
}

/** Dura no máximo `rounds` rodadas (efeito sem duração contada não acaba sozinho). */
function fitsIn(info: ActiveInfo, rounds: number): boolean {
  return info.duration !== undefined && durationInRounds(info.duration) <= rounds;
}

/** Tira o que acabou (pelo critério dado), inclusive a Concentração e o efeito dela. */
function expire(
  state: LocalSheet['state'],
  isOver: (info: ActiveInfo) => boolean,
): { state: LocalSheet['state']; ended: boolean } {
  const info = state.activeInfo ?? {};
  const gone = state.active.filter((id) => info[id] && isOver(info[id]));
  let next: LocalSheet['state'] = gone.length
    ? { ...state, active: state.active.filter((id) => !gone.includes(id)) }
    : state;
  const concentrationOver = Boolean(
    next.concentration && next.concentrationInfo && isOver(next.concentrationInfo),
  );
  if (concentrationOver) next = withoutConcentration(next);
  return { state: next, ended: gone.length > 0 || concentrationOver };
}

/**
 * Depois de cada ação: o que acabou de ser ligado ganha início (se a ação não deu detalhes), o
 * que saiu de `active` perde os detalhes, e a Concentração encerrada leva os dela junto.
 */
function tidyInfo(
  before: LocalSheet['state'],
  after: LocalSheet['state'],
  ctx: ActionContext,
): LocalSheet['state'] {
  const info: Record<string, ActiveInfo> = {};
  for (const id of after.active) {
    const known = after.activeInfo?.[id];
    if (known) info[id] = known;
    else if (!before.active.includes(id)) info[id] = startInfo(after, ctx);
  }
  const { activeInfo: _old, concentrationInfo, ...rest } = after;
  let concentration = after.concentration ? concentrationInfo : undefined;
  if (after.concentration && after.concentration !== before.concentration && !concentration) {
    concentration = { ...startInfo(after, ctx), by: 'self', concentration: true };
  }
  return {
    ...rest,
    ...(Object.keys(info).length ? { activeInfo: info } : {}),
    ...(concentration ? { concentrationInfo: concentration } : {}),
  };
}
