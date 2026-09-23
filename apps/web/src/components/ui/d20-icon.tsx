import type { SVGProps } from 'react';

/** Ícone de d20 (hexágono com o triângulo da face). */
export function D20Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 2.5 20.5 7.25v9.5L12 21.5l-8.5-4.75v-9.5z" />
      <path d="M12 7.5 16.5 15h-9z" />
      <path d="M12 2.5v5M3.5 7.25 7.5 15M20.5 7.25 16.5 15M3.5 16.75 7.5 15M20.5 16.75 16.5 15M12 21.5 7.5 15M12 21.5l4.5-6.5" />
    </svg>
  );
}
