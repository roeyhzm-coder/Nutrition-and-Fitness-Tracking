import type { ReactNode } from 'react'

export type SegmentedOption<T extends string> = {
  id: T
  label: string
  icon?: ReactNode
}

/** Two-to-four way sub-view switch (same look across pages). */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (next: T) => void
  label: string
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="grid gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm shadow-slate-200/60"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const active = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={[
              'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-bold transition',
              active
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25'
                : 'text-muted hover:bg-slate-50 hover:text-text',
            ].join(' ')}
          >
            {option.icon}
            <span className="truncate">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
