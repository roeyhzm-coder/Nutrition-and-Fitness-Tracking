import { DEFAULT_MACRO_TARGETS } from '../../data/habits'
import type { FoodLogEntry } from '../../lib/types'
import { todayKey } from '../../lib/types'
import { Card } from '../ui/Card'
import { ProgressBar } from '../ui/ProgressBar'

type MacroTargetsProps = {
  logs: FoodLogEntry[]
  targets?: typeof DEFAULT_MACRO_TARGETS
}

export function MacroTargets({
  logs,
  targets = DEFAULT_MACRO_TARGETS,
}: MacroTargetsProps) {
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
      color: 'primary' as const,
    },
    {
      label: 'חלבון',
      value: totals.protein,
      max: targets.protein,
      unit: 'ג׳',
      color: 'accent' as const,
    },
    {
      label: 'פחמימות',
      value: totals.carbs,
      max: targets.carbs,
      unit: 'ג׳',
      color: 'primary' as const,
    },
    {
      label: 'שומנים',
      value: totals.fats,
      max: targets.fats,
      unit: 'ג׳',
      color: 'warn' as const,
    },
  ]

  return (
    <Card title="יעדי מאקרו יומיים">
      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="text-muted">{row.label}</span>
              <span className="font-semibold text-text">
                {Math.round(row.value)} / {row.max} {row.unit}
              </span>
            </div>
            <ProgressBar value={row.value} max={row.max} color={row.color} />
          </div>
        ))}
      </div>
    </Card>
  )
}
