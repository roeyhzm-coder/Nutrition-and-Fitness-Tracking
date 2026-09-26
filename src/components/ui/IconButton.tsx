import type { ButtonHTMLAttributes, ReactNode } from 'react'

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  tone?: 'default' | 'danger' | 'accent' | 'dangerSolid' | 'accentSolid'
  children: ReactNode
}

const tones = {
  default: 'text-muted hover:bg-slate-100 hover:text-text',
  danger: 'text-muted hover:bg-rose-50 hover:text-danger',
  accent: 'text-muted hover:bg-blue-50 hover:text-blue-600',
  dangerSolid: 'bg-rose-50 text-danger hover:bg-rose-100',
  accentSolid: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
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
        'icon-hit inline-flex size-11 shrink-0 items-center justify-center rounded-2xl transition active:scale-[0.96] disabled:opacity-40',
        tones[tone],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}
