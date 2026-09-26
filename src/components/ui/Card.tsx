import type { ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  className?: string
  title?: string
  action?: ReactNode
}

export function Card({ children, className = '', title, action }: CardProps) {
  return (
    <section
      className={`rounded-3xl border border-slate-800/60 bg-slate-900/70 shadow-lg shadow-black/20 backdrop-blur-md ${className}`}
    >
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b border-slate-800/60 px-5 py-4">
          <h2 className="font-display text-base font-semibold tracking-tight text-text">
            {title}
          </h2>
          {action}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  )
}
