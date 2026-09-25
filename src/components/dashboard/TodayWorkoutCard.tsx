import { Link } from 'react-router-dom'
import { useAppData } from '../../context/AppDataContext'
import { useWorkoutSession } from '../../context/WorkoutSessionContext'
import { dayAllExercises, localDateKey, weekdayNumber, WEEKDAYS } from '../../lib/types'
import { Card } from '../ui/Card'
import { dayPlanLabel } from '../../lib/weekPlan'
import { StartWorkoutButton } from '../workouts/WeeklyPlanParts'

export function TodayWorkoutCard() {
  const { activeProgram } = useAppData()
  const { workoutLogs } = useWorkoutSession()
  const todayNumber = weekdayNumber()
  const day = activeProgram?.days.find((d) => d.dayNumber === todayNumber)
  const exercises = day ? dayAllExercises(day) : []
  const today = localDateKey()
  const doneToday = workoutLogs.filter(
    (l) => localDateKey(new Date(l.completedAt)) === today,
  )

  return (
    <Card
      title={`האימון של היום · ${WEEKDAYS[todayNumber - 1]}`}
      action={
        <Link to="/workouts" className="text-xs font-semibold text-primary hover:underline">
          ללוח השבועי
        </Link>
      }
    >
      {!day || (!day.isRest && exercises.length === 0) ? (
        <p className="text-sm text-muted">
          לא נקבע אימון להיום ב{activeProgram?.name ?? 'תוכנית'}.
        </p>
      ) : day.isRest ? (
        <p className="text-sm text-muted">יום מנוחה 💤 — התאוששות היא חלק מהתוכנית.</p>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-text">{dayPlanLabel(day)}</p>
            <p className="text-xs text-muted">
              {activeProgram?.name} · {exercises.length} תרגילים
            </p>
          </div>
          <StartWorkoutButton day={day} className="w-full" />
        </div>
      )}
      {doneToday.length ? (
        <p className="mt-3 text-xs font-medium text-accent">
          ✓ בוצע היום: {doneToday.map((l) => l.workoutName).join(', ')}
        </p>
      ) : null}
    </Card>
  )
}
