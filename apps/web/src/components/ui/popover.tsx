import { Popover as P } from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
}

/** Balão que abre ao tocar/clicar (funciona no celular, ao contrário do tooltip). */
export function Popover({ trigger, children, className, align = 'center' }: PopoverProps) {
  return (
    <P.Root>
      <P.Trigger asChild>{trigger}</P.Trigger>
      <P.Portal>
        <P.Content
          align={align}
          sideOffset={6}
          collisionPadding={12}
          className={cn(
            'z-50 w-72 max-w-[calc(100vw-1.5rem)] rounded-lg border border-border bg-surface p-3 text-sm shadow-card',
            className,
          )}
        >
          {children}
          <P.Arrow className="fill-surface" />
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}
