import type { ReactNode } from 'react'

type PanelProps = {
  title: string
  action?: string
  children: ReactNode
}

export function Panel({ title, action, children }: PanelProps) {
  return (
    <section className="rounded-xl border border-line bg-surface-raised">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="font-display text-base font-bold text-ink">{title}</h2>
        {action ? (
          <button
            type="button"
            className="text-sm font-medium text-accent-deep transition-colors hover:text-accent"
          >
            {action}
          </button>
        ) : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}
