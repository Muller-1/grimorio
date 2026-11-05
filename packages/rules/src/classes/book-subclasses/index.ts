import type { ClassId } from '../../creation/content';
import { CLASS_PROGRESSIONS } from '../index';
import type { SubclassDef } from '../types';

/**
 * Subclasses do Livro do Jogador 2024 que o SRD não traz (ADR-018). Ficam fora do pedaço da
 * ficha: cada classe tem o seu arquivo, baixado só quando a ficha ou a subida de nível precisa.
 * Ao chegar, entram em `CLASS_PROGRESSIONS[classe].subclasses`, depois das do SRD, e o motor
 * passa a enxergá-las como qualquer outra.
 *
 * Fichas com subclasse do SRD ou "Outra (do livro)" não dependem disto e abrem como antes.
 */

type Module = { BOOK_SUBCLASSES: SubclassDef[] };

const LOADERS: Record<ClassId, () => Promise<Module>> = {
  barbarian: () => import('./barbarian'),
  bard: () => import('./bard'),
  cleric: () => import('./cleric'),
  druid: () => import('./druid'),
  fighter: () => import('./fighter'),
  monk: () => import('./monk'),
  paladin: () => import('./paladin'),
  ranger: () => import('./ranger'),
  rogue: () => import('./rogue'),
  sorcerer: () => import('./sorcerer'),
  warlock: () => import('./warlock'),
  wizard: () => import('./wizard'),
};

const isClassId = (id: string | undefined): id is ClassId =>
  id !== undefined && Object.hasOwn(LOADERS, id);

const loaded = new Set<ClassId>();
const pending = new Map<ClassId, Promise<void>>();
let revision = 0;

/** Muda a cada classe registrada (quem guarda contas da ficha usa para saber que precisa refazer). */
export function bookSubclassRevision(): number {
  return revision;
}

/** Junta as subclasses na classe, sem repetir (registrar duas vezes não faz nada). */
export function registerBookSubclasses(classId: ClassId, defs: readonly SubclassDef[]): void {
  const list = CLASS_PROGRESSIONS[classId].subclasses;
  let added = false;
  for (const def of defs) {
    if (list.some((s) => s.id === def.id)) continue;
    list.push(def);
    added = true;
  }
  loaded.add(classId);
  if (added) revision += 1;
}

/** As subclasses do livro desta classe já chegaram? (Id desconhecido: não há o que esperar.) */
export function bookSubclassesReady(classId: string | undefined): boolean {
  return !isClassId(classId) || loaded.has(classId);
}

/** Baixa e registra as subclasses do livro de uma classe. Pode ser chamada várias vezes. */
export function loadBookSubclasses(classId: string | undefined): Promise<void> {
  if (!isClassId(classId) || loaded.has(classId)) return Promise.resolve();
  let job = pending.get(classId);
  if (!job) {
    job = LOADERS[classId]()
      .then((m) => registerBookSubclasses(classId, m.BOOK_SUBCLASSES))
      .finally(() => pending.delete(classId));
    pending.set(classId, job);
  }
  return job;
}

/** Todas de uma vez (API e testes: lá não há pedaço para economizar). */
export async function loadAllBookSubclasses(): Promise<void> {
  await Promise.all((Object.keys(LOADERS) as ClassId[]).map((id) => loadBookSubclasses(id)));
}

/**
 * A ficha precisa esperar as subclasses do livro antes de calcular? Só quando a subclasse
 * gravada não é do SRD nem "Outra (do livro)" e a classe ainda não chegou.
 */
export function sheetNeedsBookSubclasses(progression?: {
  classId: string;
  subclassId?: string | undefined;
}): boolean {
  if (!progression?.subclassId || progression.subclassId === 'custom') return false;
  if (!isClassId(progression.classId) || loaded.has(progression.classId)) return false;
  return !CLASS_PROGRESSIONS[progression.classId].subclasses.some(
    (s) => s.id === progression.subclassId,
  );
}
