import type { LucideIcon } from 'lucide-react'

type StatCardProps = {
  label: string
  value: string
  hint: string
  icon: LucideIcon
}

export function StatCard({ label, value, hint, icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-line bg-surface-raised p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm text-ink-muted">{label}</p>
        <span className="rounded-md bg-accent-soft p-2 text-accent-deep">
          <Icon className="size-4" strokeWidth={1.75} />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">
        {value}
      </p>
      <p className="mt-1 text-xs text-ink-muted">{hint}</p>
    </div>
  )
}
