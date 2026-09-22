import type { ButtonHTMLAttributes, ReactNode } from 'react'

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  tone?: 'default' | 'danger' | 'accent'
  children: ReactNode
}

const tones = {
  default: 'text-muted hover:bg-surface hover:text-text',
  danger: 'text-muted hover:bg-danger/10 hover:text-danger',
  accent: 'text-muted hover:bg-primary/10 hover:text-primary',
}

export function IconButton({
  label,
  tone = 'default',
  className = '',
  type = 'button',
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={[
        'inline-flex size-8 shrink-0 items-center justify-center rounded-lg transition disabled:opacity-40',
        tones[tone],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}
