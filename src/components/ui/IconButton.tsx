import type { ButtonHTMLAttributes, ReactNode } from 'react'

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  tone?: 'default' | 'danger' | 'accent' | 'dangerSolid' | 'accentSolid'
  children: ReactNode
}

const tones = {
  default: 'text-muted hover:bg-slate-800/80 hover:text-text',
  danger: 'text-muted hover:bg-rose-500/10 hover:text-danger',
  accent: 'text-muted hover:bg-cyan-400/10 hover:text-cyan-300',
  dangerSolid: 'bg-rose-500/15 text-danger hover:bg-rose-500/25',
  accentSolid: 'bg-cyan-400/15 text-cyan-300 hover:bg-cyan-400/25',
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
