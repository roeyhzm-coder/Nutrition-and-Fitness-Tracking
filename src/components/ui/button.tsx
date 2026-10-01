import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import { Slot } from 'radix-ui'

const buttonVariants = cva(
  "group/button inline-flex min-h-11 max-h-[52px] shrink-0 cursor-pointer items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90',
        primary:
          'bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90',
        accent:
          'bg-accent text-accent-foreground shadow-sm shadow-accent/20 hover:bg-accent/90',
        outline:
          'border-border bg-background hover:bg-surface hover:text-foreground aria-expanded:bg-surface aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-slate-200 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        surface:
          'border-border bg-surface text-text hover:bg-slate-200 aria-expanded:bg-surface',
        ghost:
          'text-muted hover:bg-surface hover:text-text aria-expanded:bg-surface aria-expanded:text-text dark:hover:bg-surface/50',
        destructive:
          'bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40',
        link: 'h-auto max-h-none min-h-0 text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 gap-2 px-3.5 has-data-[icon=inline-end]:pe-2.5 has-data-[icon=inline-start]:ps-2.5',
        xs: 'h-11 gap-1.5 px-3 text-xs has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2 [&_svg:not([class*=\'size-\'])]:size-3.5',
        sm: 'h-11 gap-1.5 px-3 text-[0.8rem] has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2 [&_svg:not([class*=\'size-\'])]:size-3.5',
        lg: 'h-[52px] min-h-[52px] gap-2 px-4 has-data-[icon=inline-end]:pe-3 has-data-[icon=inline-start]:ps-3',
        icon: 'size-11 p-0',
        'icon-xs': 'size-11 p-0 [&_svg:not([class*=\'size-\'])]:size-3.5',
        'icon-sm': 'size-11 p-0',
        'icon-lg': 'size-[52px] min-h-[52px] max-h-[52px] p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'primary',
  size = 'default',
  asChild = false,
  type,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size }), className)}
      type={asChild ? type : (type ?? 'button')}
      {...props}
    />
  )
}

export { Button, buttonVariants }
