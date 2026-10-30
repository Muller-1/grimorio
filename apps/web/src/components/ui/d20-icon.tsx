import { useId, type SVGProps } from 'react';

/** Contorno do d20 (hexágono com o triângulo da face): botões de rolar e listas. */
export function D20Icon({ strokeWidth = 14, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <polygon points="100,8 180,54 180,146 100,192 20,146 20,54" />
      <polygon points="100,50 154,138 46,138" />
    </svg>
  );
}

/** Marca do Grimório: o d20 de couro com arestas douradas (prateadas no Obsidiana). */
export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true" {...props}>
      <polygon points="100,8 180,54 180,146 100,192 20,146 20,54" className="fill-seal" />
      <g fill="none" strokeWidth={10} strokeLinejoin="round" className="stroke-seal-line">
        <polygon points="100,8 180,54 180,146 100,192 20,146 20,54" />
        <polygon points="100,50 154,138 46,138" />
        <path d="M100 8V50M20 54L100 50L180 54M20 54L46 138L20 146M180 54L154 138L180 146M46 138L100 192L154 138" />
      </g>
    </svg>
  );
}

/** Losango (o ornamento do site): marcador de títulos, listas e o filete. */
export function Diamond(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true" {...props}>
      <path d="M7 0 14 7 7 14 0 7Z" fill="currentColor" />
    </svg>
  );
}

/** As dez faces visíveis do d20 ilustrado, da mais clara à mais escura (cores no index.css). */
const FACES: readonly [points: string, tone: number][] = [
  ['100,8 100,50 20,54', 1],
  ['100,8 180,54 100,50', 2],
  ['20,54 100,50 46,138', 3],
  ['100,50 180,54 154,138', 4],
  ['20,54 46,138 20,146', 5],
  ['180,54 180,146 154,138', 6],
  ['20,146 46,138 100,192', 7],
  ['154,138 180,146 100,192', 8],
  ['46,138 154,138 100,192', 9],
  ['100,50 154,138 46,138', 10],
];

/**
 * O d20 facetado, para pôr dentro de um <svg viewBox="0 0 200 200"> (ou num <g> escalado).
 * Faces e arestas seguem o tema; `value` aparece na face da frente.
 */
export function D20Facets({
  value,
  strokeWidth = 4,
  fontSize = 40,
  edgeClassName,
}: {
  value?: number | string | undefined;
  strokeWidth?: number | undefined;
  fontSize?: number | undefined;
  /** Arestas de uma cor só (classe `stroke-…`) em vez do degradê metálico. */
  edgeClassName?: string | undefined;
}) {
  const id = useId();
  const metal = `metal${id.replace(/:/g, '')}`;
  return (
    <>
      {edgeClassName ? null : (
        <defs>
          <linearGradient id={metal} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--metal-1)' }} />
            <stop offset="0.45" style={{ stopColor: 'var(--metal-2)' }} />
            <stop offset="0.6" style={{ stopColor: 'var(--metal-3)' }} />
            <stop offset="1" style={{ stopColor: 'var(--metal-4)' }} />
          </linearGradient>
        </defs>
      )}
      <g
        {...(edgeClassName ? { className: edgeClassName } : { stroke: `url(#${metal})` })}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      >
        {FACES.map(([points, tone]) => (
          <polygon key={points} points={points} style={{ fill: `var(--die-${tone})` }} />
        ))}
      </g>
      {value !== undefined ? (
        <text
          x="100"
          y={fontSize > 40 ? 122 : 121}
          textAnchor="middle"
          className="font-display"
          fontWeight="700"
          fontSize={fontSize}
          style={{ fill: 'var(--die-face)' }}
        >
          {value}
        </text>
      ) : null}
    </>
  );
}

/** O d20 facetado sozinho (carregamentos, rolagem). */
export function D20Die({
  value,
  strokeWidth,
  ...props
}: SVGProps<SVGSVGElement> & { value?: number | string }) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true" {...props}>
      <D20Facets value={value} strokeWidth={strokeWidth ? Number(strokeWidth) : undefined} />
    </svg>
  );
}
