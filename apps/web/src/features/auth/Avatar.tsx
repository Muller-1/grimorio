import { useState } from 'react';

/** Foto do Google ou as iniciais do nome. */
export function Avatar({
  name,
  image,
  size = 32,
}: {
  name: string;
  image: string | null;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';
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
        className="rounded-full border border-border object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="grid place-items-center rounded-full bg-accent text-xs font-bold text-accent-contrast"
      style={{ width: size, height: size }}
    >
      {initials}
    </span>
  );
}
