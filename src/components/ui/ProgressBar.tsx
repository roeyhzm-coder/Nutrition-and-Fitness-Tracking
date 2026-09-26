type ProgressBarProps = {
  value: number
  max: number
  color?: 'primary' | 'accent' | 'warn' | 'violet'
}

const colors = {
  primary: 'bg-blue-600',
  accent: 'bg-cyan-600',
  warn: 'bg-orange-500',
  violet: 'bg-violet-500',
}

export function ProgressBar({
  value,
  max,
  color = 'primary',
}: ProgressBarProps) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colors[color]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
