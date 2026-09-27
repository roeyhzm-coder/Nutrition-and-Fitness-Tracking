import { useAppData } from '../../context/AppDataContext'
import { useWorkoutSession } from '../../context/WorkoutSessionContext'
import { localDateKey } from '../../lib/types'
import { parseDayMark } from '../../lib/weeklyConsistency'

/** Prominent green badge when today's workout is already completed. */
export function WorkoutCompletedBadge({ className = '' }: { className?: string }) {
  const { consistencyDayMarks } = useAppData()
  const { workoutLogs } = useWorkoutSession()
  const today = localDateKey()
  const doneFromLogs = workoutLogs.some(
    (l) => localDateKey(new Date(l.completedAt)) === today,
  )
  const todayMark = parseDayMark(consistencyDayMarks[today])
  const isDone = todayMark != null ? todayMark.done : doneFromLogs

  if (!isDone) return null

  return (
    <p
      role="status"
      className={[
        'rounded-2xl bg-emerald-50 px-4 py-3.5 text-center text-sm font-bold text-emerald-800 ring-1 ring-emerald-200',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      ✓ אימון הושלם להיום
    </p>
  )
}
