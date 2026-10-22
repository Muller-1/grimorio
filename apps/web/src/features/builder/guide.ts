import type { CreationIssue } from '@grimorio/rules';

/**
 * Para onde levar o jogador quando algo falta (feedback dos testadores: "não soube onde clicar").
 * Cada pendência aponta para o bloco da tela que a resolve (os `id`s ficam nas etapas).
 */
export const ISSUE_TARGETS: Record<CreationIssue, string> = {
  'class-missing': 'wizard-class-list',
  'class-option-missing': 'wizard-class-option',
  'fighting-style-missing': 'wizard-fighting-style',
  'class-skills-count': 'wizard-class-skills',
  'class-equipment-invalid': 'wizard-class-equipment',
  'weapon-mastery-count': 'wizard-weapon-mastery',
  'background-missing': 'wizard-background',
  'custom-background-incomplete': 'wizard-background-details',
  'species-missing': 'wizard-species',
  'custom-species-incomplete': 'wizard-species-details',
  'species-option-missing': 'wizard-species-details',
  'species-skills-count': 'wizard-species-details',
  'species-feat-missing': 'wizard-species-details',
  'feat-skills-count': 'wizard-feat-skills',
  'languages-count': 'wizard-languages',
  incomplete: 'wizard-abilities',
  'standard-array-mismatch': 'wizard-abilities',
  'point-buy-over-budget': 'wizard-abilities',
  'point-buy-out-of-range': 'wizard-abilities',
  'rolled-not-rolled': 'wizard-abilities',
  'rolled-mismatch': 'wizard-abilities',
  'manual-out-of-range': 'wizard-abilities',
  'bonus-wrong-shape': 'wizard-background-bonus',
  'bonus-outside-background': 'wizard-background-bonus',
  'bonus-over-cap': 'wizard-background-bonus',
  'spell-cantrips-count': 'wizard-spell-cantrips',
  'spell-prepared-count': 'wizard-spell-prepared',
  'spellbook-count': 'wizard-spellbook',
  'spell-prepared-not-in-book': 'wizard-spell-prepared',
  'initiate-incomplete': 'wizard-initiate',
  'name-missing': 'wizard-name',
  'expertise-count': 'wizard-expertise',
};

const FLASH_CLASS = 'wizard-flash';

/** Rola até o bloco da pendência, destaca por um instante e põe o foco no primeiro campo. */
export function goToIssue(issue: CreationIssue): void {
  const el = document.getElementById(ISSUE_TARGETS[issue]);
  if (!el) return;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  el.classList.remove(FLASH_CLASS);
  // Força o navegador a reiniciar a animação se o jogador clicar duas vezes seguidas.
  void el.offsetWidth;
  el.classList.add(FLASH_CLASS);
  window.setTimeout(() => el.classList.remove(FLASH_CLASS), 1600);
  const field = el.querySelector<HTMLElement>(
    'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
  );
  field?.focus({ preventScroll: true });
}
