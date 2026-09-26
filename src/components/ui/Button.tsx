import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'accent' | 'ghost' | 'surface'

const styles: Record<Variant, string> = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20',
  accent:
    'bg-cyan-600 text-white hover:bg-cyan-500 shadow-lg shadow-cyan-600/20',
  ghost: 'bg-transparent text-muted hover:bg-slate-100 hover:text-text',
  surface:
    'bg-slate-100 text-text hover:bg-slate-200 border border-slate-200',
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
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        styles[variant],
        className,
      ].join(' ')}
      {...props}
    />
  )
}
