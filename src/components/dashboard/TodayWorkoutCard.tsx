import { Link } from 'react-router-dom'
import { useAppData } from '../../context/AppDataContext'
import { useWorkoutSession } from '../../context/WorkoutSessionContext'
import { dayAllExercises, localDateKey, weekdayNumber, WEEKDAYS } from '../../lib/types'
import { Card } from '../ui/Card'
import { dayPlanLabel } from '../../lib/weekPlan'
import { parseDayMark } from '../../lib/weeklyConsistency'
import { StartWorkoutButton } from '../workouts/WeeklyPlanParts'

export function TodayWorkoutCard() {
  const { activeProgram, consistencyDayMarks } = useAppData()
  const { workoutLogs } = useWorkoutSession()
  const todayNumber = weekdayNumber()
  const day = activeProgram?.days.find((d) => d.dayNumber === todayNumber)
  const exercises = day ? dayAllExercises(day) : []
  const today = localDateKey()
  const doneToday = workoutLogs.filter(
    (l) => localDateKey(new Date(l.completedAt)) === today,
  )
  const todayMark = parseDayMark(consistencyDayMarks[today])
  const completedFromLogs = doneToday.map((l) => l.workoutName).filter(Boolean)
  const isDone =
    todayMark != null ? todayMark.done : completedFromLogs.length > 0
  const completedName =
    (todayMark?.done && todayMark.workoutName) ||
    completedFromLogs.join(', ') ||
    (day && !day.isRest ? dayPlanLabel(day) : '')

  return (
    <Card
      title={`האימון של היום · ${WEEKDAYS[todayNumber - 1]}`}
      action={
        <Link to="/workouts" className="text-xs font-semibold text-blue-600 hover:underline">
          ללוח השבועי
        </Link>
      }
    >
      {isDone ? (
        <p className="rounded-2xl bg-blue-50 px-4 py-4 text-center text-sm font-semibold text-blue-700">
          ✓ בוצע: {completedName || 'אימון'}
        </p>
      ) : !day || (!day.isRest && exercises.length === 0) ? (
        <p className="text-sm leading-relaxed text-muted">
          לא נקבע אימון להיום ב{activeProgram?.name ?? 'תוכנית'}.
        </p>
      ) : day.isRest ? (
        <p className="rounded-2xl bg-slate-50 px-4 py-5 text-center text-sm leading-relaxed text-muted">
          יום מנוחה 💤 — התאוששות היא חלק מהתוכנית.
        </p>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="font-display text-lg font-bold text-text">{dayPlanLabel(day)}</p>
            <p className="mt-1 text-xs text-muted">
              {activeProgram?.name} · {exercises.length} תרגילים
            </p>
          </div>
          <StartWorkoutButton day={day} className="w-full" />
        </div>
      )}
    </Card>
  )
}
