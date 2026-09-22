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
      className={`rounded-2xl border border-line bg-card ${className}`}
    >
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="font-display text-base font-semibold text-text">
            {title}
          </h2>
          {action}
        </div>
      ) : null}
      <div className={title ? 'p-4' : 'p-4'}>{children}</div>
    </section>
  )
}
