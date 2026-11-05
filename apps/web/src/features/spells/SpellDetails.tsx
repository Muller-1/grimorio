import type { SpellDef } from '@grimorio/rules';
import { tsp } from '@/lib/i18n/spells';

/** "V, S, M (uma pena)" */
export function spellComponents(spell: SpellDef): string {
  return [
    spell.components.v ? 'V' : null,
    spell.components.s ? 'S' : null,
    spell.components.m
      ? typeof spell.components.m === 'string'
        ? tsp.material(spell.components.m)
        : 'M'
      : null,
  ]
    .filter(Boolean)
    .join(', ');
}

/**
 * Conjuração, alcance, componentes, duração, texto e círculo superior. A aba Magias usa no
 * cartão aberto; as listas de escolha (assistente, subir de nível) usam em "Ver descrição".
 */
export function SpellDetails({ spell }: { spell: SpellDef }) {
  return (
    <>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        <dt className="text-muted">{tsp.castingTime}</dt>
        <dd>
          {spell.castingTime}
          {spell.ritual ? ` (${tsp.ritualTag})` : ''}
        </dd>
        <dt className="text-muted">{tsp.range}</dt>
        <dd>{spell.range}</dd>
        <dt className="text-muted">{tsp.components}</dt>
        <dd>{spellComponents(spell)}</dd>
        <dt className="text-muted">{tsp.duration}</dt>
        <dd>{spell.duration}</dd>
      </dl>
      <p className="whitespace-pre-line">{spell.text}</p>
      {spell.higher ? (
        <p className="whitespace-pre-line">
          <strong>{spell.level === 0 ? tsp.cantripUpgrade : tsp.higher}. </strong>
          {spell.higher}
        </p>
      ) : null}
    </>
  );
}
