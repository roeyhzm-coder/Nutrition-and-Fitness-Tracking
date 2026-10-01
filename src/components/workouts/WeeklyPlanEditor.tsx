import { useAppData } from '../../context/AppDataContext'
import { WEEKDAYS } from '../../lib/types'
import { Card } from '../ui/Card'
import { DayPlanSelect } from './WeeklyPlanParts'

export function WeeklyPlanEditor() {
  const { workoutDays } = useAppData()
  if (!workoutDays.length) return null

  return (
    <Card title="תוכנית ברירת מחדל לשבוע">
      <p className="mb-3 text-xs text-muted">
        קובע איזה אימון משויך לכל יום כברירת מחדל. אפשר לבצע כל אימון בכל יום
        בלי להמתין ליום המתוכנן.
      </p>
      <ul className="space-y-3">
        {workoutDays.map((day) => (
          <li
            key={day.id}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5"
          >
            <p className="mb-1 text-xs font-semibold text-text">
              {WEEKDAYS[day.dayNumber - 1]}
            </p>
            <DayPlanSelect day={day} />
          </li>
        ))}
      </ul>
    </Card>
  )
}
