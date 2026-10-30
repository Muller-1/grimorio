import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-bold whitespace-nowrap transition-colors select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Couro (verdete no Obsidiana) com o brilho dourado por dentro da borda.
        primary:
          'border border-accent-border bg-accent text-accent-contrast inset-gleam hover:bg-accent-hover disabled:border-border disabled:bg-sunken disabled:text-muted disabled:opacity-100 disabled:shadow-none',
        // Contorno dourado (prateado): a ação secundária.
        outline: 'border border-border-strong bg-field text-text hover:bg-surface-2',
        ghost: 'text-text hover:bg-surface-2',
        subtle: 'bg-surface-2 text-text hover:bg-sunken',
        danger: 'border border-danger bg-field text-danger hover:bg-danger-soft',
        success: 'border border-success bg-field text-success hover:bg-success-soft',
        link: 'px-1 text-accent underline underline-offset-4 hover:text-accent-hover',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 rounded-[10px] px-6 text-[1.0625rem]',
        icon: 'size-10',
        'icon-sm': 'size-9',
      },
    },
    defaultVariants: { variant: 'outline', size: 'md' },
  },
);

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** Renderiza o filho (ex.: um <Link>) com a aparência de botão. */
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...(asChild ? {} : { type: type ?? 'button' })}
      {...props}
    />
  );
}

export { buttonVariants };
