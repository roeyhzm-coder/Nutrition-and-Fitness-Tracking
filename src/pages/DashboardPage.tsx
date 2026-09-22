import { Link } from 'react-router-dom'
import { Activity, Flame, Scale, Target } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { KeyLiftsProgress } from '../components/workouts/KeyLiftsProgress'
import { useAppData } from '../context/AppDataContext'
import { DEFAULT_MACRO_TARGETS, HABIT_GROUPS } from '../data/habits'
import { todayKey } from '../lib/types'

export function DashboardPage() {
  const { setLogs, foodLogs, weightLogs, habitChecks } = useAppData()
  const today = todayKey()

  const todayFood = foodLogs.filter((f) => f.loggedAt.startsWith(today))
  const calories = todayFood.reduce((s, f) => s + f.calories, 0)
  const protein = todayFood.reduce((s, f) => s + f.protein, 0)
  const todaySets = setLogs.filter((s) => s.loggedAt.startsWith(today)).length
  const latestWeight = weightLogs.at(-1)?.weightKg

  const habitIds = HABIT_GROUPS.flatMap((g) => g.items.map((i) => i.id))
  const habitsDone = (habitChecks[today] ?? []).filter((id) =>
    habitIds.includes(id),
  ).length

  const stats = [
    {
      label: 'קלוריות היום',
      value: `${Math.round(calories)}`,
      hint: `מתוך ${DEFAULT_MACRO_TARGETS.calories}`,
      icon: Flame,
    },
    {
      label: 'חלבון',
      value: `${Math.round(protein)}ג׳`,
      hint: `יעד ${DEFAULT_MACRO_TARGETS.protein}ג׳`,
      icon: Target,
    },
    {
      label: 'סטים היום',
      value: String(todaySets),
      hint: 'רישומי אימון',
      icon: Activity,
    },
    {
      label: 'משקל אחרון',
      value: latestWeight != null ? `${latestWeight}` : '—',
      hint: latestWeight != null ? 'ק״ג' : 'אין שקילה',
      icon: Scale,
    },
  ]

  return (
    <>
      <PageHeader
        title="דשבורד"
        subtitle="סקירה יומית של אימונים, תזונה והרגלים"
      />
      <div className="space-y-4 px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          {stats.map(({ label, value, hint, icon: Icon }) => (
            <div
              key={label}
              className="rounded-2xl border border-line bg-card p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted">{label}</p>
                <Icon className="size-4 text-primary" strokeWidth={1.75} />
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-text">
                {value}
              </p>
              <p className="mt-1 text-xs text-muted">{hint}</p>
            </div>
          ))}
        </div>

        <Card title="הרגלים היום">
          <p className="text-sm text-text">
            הושלמו{' '}
            <span className="font-bold text-accent">
              {habitsDone}/{habitIds.length}
            </span>{' '}
            משימות
          </p>
          <Link
            to="/habits"
            className="mt-3 inline-block text-sm font-medium text-primary"
          >
            מעבר להרגלים ←
          </Link>
        </Card>

        <KeyLiftsProgress logs={setLogs} />
      </div>
    </>
  )
}
