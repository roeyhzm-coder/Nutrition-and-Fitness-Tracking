import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'accent' | 'ghost' | 'surface'

const styles: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:brightness-110',
  accent: 'bg-accent text-bg hover:brightness-110',
  ghost: 'bg-transparent text-muted hover:bg-surface hover:text-text',
  surface: 'bg-surface text-text hover:bg-line',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
}

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        styles[variant],
        className,
      ].join(' ')}
      {...props}
    />
  )
}
