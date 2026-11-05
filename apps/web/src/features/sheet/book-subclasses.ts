import { bookSubclassesReady, loadBookSubclasses, sheetNeedsBookSubclasses } from '@grimorio/rules';
import { useEffect, useReducer } from 'react';

type ProgressionLike = { classId: string; subclassId?: string | undefined } | undefined;

/**
 * Baixa as subclasses do livro de uma classe (ADR-018) e diz se já chegaram. Se o arquivo não
 * vier (sem internet), segue com as do SRD em vez de esperar para sempre.
 */
export function useClassBookSubclasses(classId: string | undefined): boolean {
  const [failed, markFailed] = useReducer(
    (_: string | undefined, id: string | undefined) => id,
    undefined,
  );
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!classId) return;
    let alive = true;
    // Ao chegar, desenha de novo: é o que tira a tela de espera (sem "vai e volta").
    void loadBookSubclasses(classId).then(
      () => alive && rerender(),
      () => alive && markFailed(classId),
    );
    return () => {
      alive = false;
    };
  }, [classId]);
  return bookSubclassesReady(classId) || failed === classId;
}

/**
 * A ficha já pode ser calculada? Só espera quando a subclasse gravada é do livro e ainda não
 * chegou; SRD e "Outra (do livro)" nunca esperam. Também deixa a classe baixada para a subida
 * de nível.
 */
export function useBookSubclassesReady(progression: ProgressionLike): boolean {
  const loaded = useClassBookSubclasses(progression?.classId);
  return loaded || !sheetNeedsBookSubclasses(progression);
}
