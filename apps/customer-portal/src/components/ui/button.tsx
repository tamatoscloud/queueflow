import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-white shadow-md hover:bg-primary-dark hover:shadow-lg',
        secondary:
          'bg-primary/10 text-primary hover:bg-primary/15',
        outline:
          'border border-border bg-surface hover:bg-neutral-50 dark:hover:bg-surface-elevated',
        ghost: 'hover:bg-neutral-100 dark:hover:bg-surface-elevated',
        danger: 'bg-danger text-white hover:bg-danger/90 shadow-md',
        gradient:
          'bg-gradient-to-r from-primary to-accent-purple text-white shadow-md hover:shadow-lg hover:brightness-110',
      },
      size: {
        default: 'h-11 px-5 py-2',
        lg: 'h-13 px-7 text-base rounded-2xl',
        sm: 'h-9 px-4 text-xs rounded-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';
