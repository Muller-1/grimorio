import { t } from '@/lib/i18n';

/**
 * Título e frase do rolador de dados. Ficam fora da página carregada sob demanda (DicePage):
 * já vêm no HTML e aparecem antes do resto, em vez de esperar o JavaScript do rolador.
 */
export function DiceIntro() {
  return (
    <div className="mb-5">
      <h1 className="font-display text-3xl font-bold">{t.dice.pageTitle}</h1>
      <p className="mt-2 max-w-2xl text-muted">{t.dice.pageLead}</p>
    </div>
  );
}
