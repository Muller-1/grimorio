import { bookSubclassesReady, loadBookSubclasses, sheetNeedsBookSubclasses } from '@grimorio/rules';
import { useEffect, useState } from 'react';

type ProgressionLike = { classId: string; subclassId?: string | undefined } | undefined;

/**
 * Baixa as subclasses do livro de uma classe (ADR-018) e diz se já chegaram. Se o arquivo não
 * vier (sem internet), segue com as do SRD em vez de esperar para sempre.
 */
export function useClassBookSubclasses(classId: string | undefined): boolean {
  const [done, setDone] = useState<string>();
  useEffect(() => {
    if (!classId) return;
    let alive = true;
    // Ao chegar (ou falhar), desenha de novo: é o que tira a tela de espera.
    const finish = () => alive && setDone(classId);
    void loadBookSubclasses(classId).then(finish, finish);
    return () => {
      alive = false;
    };
  }, [classId]);
  return bookSubclassesReady(classId) || done === classId;
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
