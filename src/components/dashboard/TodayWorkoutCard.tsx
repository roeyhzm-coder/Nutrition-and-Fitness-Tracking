import { Link } from 'react-router-dom'
import { useAppData } from '../../context/AppDataContext'
import { useWorkoutSession } from '../../context/WorkoutSessionContext'
import { caloriesBurnedOnDate, workoutPerformedOn } from '../../lib/caloriesBurned'
import { dayAllExercises, localDateKey, weekdayNumber, WEEKDAYS } from '../../lib/types'
import { Card } from '../ui/Card'
import { dayPlanLabel } from '../../lib/weekPlan'
import { parseDayMark } from '../../lib/weeklyConsistency'
import { StartWorkoutButton } from '../workouts/WeeklyPlanParts'
import { WorkoutCompletedBadge } from '../workouts/WorkoutCompletedBadge'

export function TodayWorkoutCard() {
  const { activeProgram, consistencyDayMarks, focusTracks } = useAppData()
  const { workoutLogs } = useWorkoutSession()
  const todayNumber = weekdayNumber()
  const day = activeProgram?.days.find((d) => d.dayNumber === todayNumber)
  const exercises = day ? dayAllExercises(day) : []
  const today = localDateKey()
  const doneToday = workoutLogs.filter((l) => workoutPerformedOn(l) === today)
  const todayMark = parseDayMark(consistencyDayMarks[today])
  const completedFromLogs = doneToday.map((l) => l.workoutName).filter(Boolean)
  const isDone =
    todayMark != null ? todayMark.done : completedFromLogs.length > 0
  const completedName =
    (todayMark?.done && todayMark.workoutName) ||
    completedFromLogs.join(', ') ||
    (day && !day.isRest ? dayPlanLabel(day) : '')
  const burned = caloriesBurnedOnDate(today, { workoutLogs, focusTracks })

  return (
    <Card
      title={`אימון · ${WEEKDAYS[todayNumber - 1]}`}
      action={
        <Link to="/workouts" className="text-xs font-semibold text-blue-600 hover:underline">
          כל האימונים
        </Link>
      }
    >
      {isDone ? (
        <div className="space-y-2">
          <WorkoutCompletedBadge />
          {completedName ? (
            <p className="text-center text-xs text-muted">{completedName}</p>
          ) : null}
          {burned > 0 ? (
            <p className="text-center text-xs text-orange-700">נשרפו {burned} קק״ל</p>
          ) : null}
          <Link
            to="/workouts"
            className="block text-center text-xs font-semibold text-blue-600 hover:underline"
          >
            לבצע אימון נוסף מכל הרשימה
          </Link>
        </div>
      ) : day && !day.isRest && exercises.length > 0 ? (
        <div className="space-y-4">
          <div>
            <p className="text-[11px] text-muted">ברירת מחדל להיום — אפשר לבחור אימון אחר</p>
            <p className="font-display text-lg font-bold text-text">{dayPlanLabel(day)}</p>
            <p className="mt-1 text-xs text-muted">
              {activeProgram?.name} · {exercises.length} תרגילים
            </p>
          </div>
          <StartWorkoutButton day={day} className="w-full" />
          <Link
            to="/workouts"
            className="block text-center text-xs font-semibold text-blue-600 hover:underline"
          >
            או בחר אימון אחר מהרשימה
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-muted">
            {day?.isRest
              ? 'היום מתוכנן כמנוחה, אבל אפשר לבצע כל אימון מהרשימה.'
              : 'לא נקבע אימון כברירת מחדל להיום — בחר אימון מהרשימה המלאה.'}
          </p>
          <Link
            to="/workouts"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white"
          >
            בחר אימון לביצוע
          </Link>
        </div>
      )}
    </Card>
  )
}
