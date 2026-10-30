import { ts } from '@/lib/i18n/sheet';

/**
 * "V" (Vantagem) ou "D" (Desvantagem) por habilidade, magia ou condição. Com as duas, elas se
 * anulam (regra do livro) e nada aparece. O botão de rolar já usa o d20 certo (`d20`).
 */
export function AdvantageBadge({
  advantage = true,
  disadvantage = false,
}: {
  advantage?: boolean;
  disadvantage?: boolean;
}) {
  if (advantage === disadvantage) return null;
  const p = ts.powers;
  const label = advantage ? p.advantage : p.disadvantage;
  return (
    <abbr
      title={label}
      aria-label={label}
      className={
        advantage
          ? 'grid size-5 shrink-0 place-items-center rounded bg-accent-soft text-[11px] font-bold text-accent no-underline'
          : 'grid size-5 shrink-0 place-items-center rounded bg-danger-soft text-[11px] font-bold text-danger no-underline'
      }
    >
      {advantage ? p.advantageShort : p.disadvantageShort}
    </abbr>
  );
}

/** O d20 da rolagem: Vantagem rola dois e fica com o maior; Desvantagem, com o menor. */
export function d20(advantage: boolean, disadvantage = false): string {
  if (advantage && !disadvantage) return '2d20kh1';
  if (disadvantage && !advantage) return '2d20kl1';
  return '1d20';
}
