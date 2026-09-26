import { Link } from 'react-router-dom'
import type { FoodLogEntry, MacroTargets } from '../../lib/types'
import { todayKey } from '../../lib/types'
import { Card } from '../ui/Card'
import { ProgressBar } from '../ui/ProgressBar'

type MacroTargetsProps = {
  logs: FoodLogEntry[]
  targets: MacroTargets
}

export function MacroTargetsView({ logs, targets }: MacroTargetsProps) {
  const today = todayKey()
  const todayLogs = logs.filter((l) => l.loggedAt.startsWith(today))
  const totals = todayLogs.reduce(
    (acc, l) => ({
      calories: acc.calories + l.calories,
      protein: acc.protein + l.protein,
      carbs: acc.carbs + l.carbs,
      fats: acc.fats + l.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  )

  const rows = [
    {
      label: 'קלוריות',
      value: totals.calories,
      max: targets.calories,
      unit: 'קק״ל',
      color: 'warn' as const,
      chip: 'bg-orange-50 text-orange-700',
    },
    {
      label: 'חלבון',
      value: totals.protein,
      max: targets.protein,
      unit: 'ג׳',
      color: 'violet' as const,
      chip: 'bg-violet-50 text-violet-700',
    },
    {
      label: 'פחמימות',
      value: totals.carbs,
      max: targets.carbs,
      unit: 'ג׳',
      color: 'accent' as const,
      chip: 'bg-cyan-50 text-cyan-700',
    },
    {
      label: 'שומנים',
      value: totals.fats,
      max: targets.fats,
      unit: 'ג׳',
      color: 'warn' as const,
      chip: 'bg-orange-50 text-orange-700',
    },
  ]

  return (
    <Card
      title="יעדי מאקרו יומיים"
      action={
        <Link
          to="/profile#goals"
          className="text-xs font-semibold text-blue-600 hover:underline"
        >
          עריכה בפרופיל
        </Link>
      }
    >
      <div className="space-y-5">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-2 flex items-end justify-between gap-3">
              <span className={`rounded-xl px-2.5 py-1 text-xs font-semibold ${row.chip}`}>
                {row.label}
              </span>
              <span className="font-display text-lg font-extrabold tabular-nums text-text">
                {Math.round(row.value)}
                <span className="ms-1 text-sm font-semibold text-muted">
                  / {row.max} {row.unit}
                </span>
              </span>
            </div>
            <ProgressBar value={row.value} max={row.max} color={row.color} />
          </div>
        ))}
      </div>
    </Card>
  )
}
