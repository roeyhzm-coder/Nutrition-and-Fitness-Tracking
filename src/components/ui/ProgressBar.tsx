type ProgressBarProps = {
  value: number
  max: number
  color?: 'primary' | 'accent' | 'warn' | 'violet'
}

const colors = {
  primary: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.35)]',
  accent: 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.35)]',
  warn: 'bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.35)]',
  violet: 'bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.35)]',
}

export function ProgressBar({
  value,
  max,
  color = 'primary',
}: ProgressBarProps) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-950/70 ring-1 ring-slate-800/60">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colors[color]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
