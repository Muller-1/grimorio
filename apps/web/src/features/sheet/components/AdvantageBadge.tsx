import { t } from '@/lib/i18n';

/** "V": uma habilidade ligada dá Vantagem nesta rolagem (o botão de rolar já usa 2d20). */
export function AdvantageBadge() {
  return (
    <abbr
      title={t.sheet.powers.advantage}
      aria-label={t.sheet.powers.advantage}
      className="grid size-5 shrink-0 place-items-center rounded bg-accent-soft text-[11px] font-bold text-accent no-underline"
    >
      {t.sheet.powers.advantageShort}
    </abbr>
  );
}

/** O d20 da rolagem: com Vantagem, rola dois e fica com o maior. */
export function d20(advantage: boolean): string {
  return advantage ? '2d20kh1' : '1d20';
}
