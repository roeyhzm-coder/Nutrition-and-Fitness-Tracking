type ProgressBarProps = {
  value: number
  max: number
  color?: 'primary' | 'accent' | 'warn'
}

const colors = {
  primary: 'bg-primary',
  accent: 'bg-accent',
  warn: 'bg-warn',
}

export function ProgressBar({
  value,
  max,
  color = 'primary',
}: ProgressBarProps) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="h-2 overflow-hidden rounded-full bg-surface">
      <div
        className={`h-full rounded-full transition-all ${colors[color]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
