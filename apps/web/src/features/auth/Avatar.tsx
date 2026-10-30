import { useState } from 'react';
import { cn } from '@/lib/utils';

/** Foto do Google ou a inicial do nome, num selo de couro (verdete no Obsidiana). */
export function Avatar({
  name,
  image,
  size = 36,
  ringed = false,
}: {
  name: string;
  image: string | null;
  size?: number;
  /** Anel dourado (prateado) em volta, como na barra superior. */
  ringed?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const initial = name.trim()[0]?.toUpperCase() ?? '?';
  const ring = ringed ? 'shadow-[0_0_0_2px_var(--surface),0_0_0_3px_var(--ornament)]' : '';
  if (image && !broken) {
    return (
      <img
        src={image}
        alt=""
        width={size}
        height={size}
        // O Google às vezes recusa a foto quando recebe o endereço de origem.
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className={cn('rounded-full border border-border object-cover', ring)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid place-items-center rounded-full bg-accent font-display font-bold text-accent-contrast',
        ring,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.44) }}
    >
      {initial}
    </span>
  );
}
