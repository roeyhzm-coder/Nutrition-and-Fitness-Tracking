import { Play } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { useWorkoutSession } from '../../context/WorkoutSessionContext'
import type { WorkoutDay } from '../../lib/types'
import { dayAllExercises } from '../../lib/types'
import { Button } from '../ui/Button'

const CUSTOM = '__custom'

export function DayPlanSelect({ day }: { day: WorkoutDay }) {
  const { workoutTemplates, setDayPlan } = useAppData()
  const onlySession = day.sessions.length === 1 && !day.exercises.length ? day.sessions[0] : null
  const value = day.isRest
    ? 'rest'
    : !dayAllExercises(day).length
      ? 'empty'
      : onlySession?.sourceTemplateId &&
          workoutTemplates.some((t) => t.id === onlySession.sourceTemplateId)
        ? onlySession.sourceTemplateId
        : CUSTOM

  return (
    <label className="block text-xs text-muted">
      אימון ליום {day.title}
      <select
        value={value}
        onChange={(e) => {
          const next = e.target.value
          if (next === CUSTOM) return
          if (
            value === CUSTOM &&
            !window.confirm('להחליף את האימון המותאם של היום? התרגילים הנוכחיים יימחקו.')
          ) {
            return
          }
          setDayPlan(
            day.id,
            next === 'rest'
              ? { type: 'rest' }
              : next === 'empty'
                ? { type: 'empty' }
                : { type: 'template', templateId: next },
          )
        }}
        className="mt-1 field"
      >
        <option value="empty">ריק (לא נבחר אימון)</option>
        <option value="rest">יום מנוחה</option>
        <optgroup label="מהספרייה">
          {workoutTemplates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </optgroup>
        {value === CUSTOM ? (
          <option value={CUSTOM} disabled>
            מותאם אישית
          </option>
        ) : null}
      </select>
    </label>
  )
}

export function StartWorkoutButton({
  day,
  className = '',
}: {
  day: WorkoutDay
  className?: string
}) {
  const { activeWorkout, startWorkout } = useWorkoutSession()
  const hasExercises = dayAllExercises(day).length > 0
  const isThisDay = activeWorkout?.dayId === day.id
  const otherActive = !!activeWorkout && !isThisDay

  if (day.isRest || !hasExercises) return null
  return (
    <Button
      variant="accent"
      className={className}
      onClick={() => startWorkout(day)}
      title={otherActive ? 'יש אימון פעיל אחר — הוא ייפתח' : undefined}
    >
      <Play className="size-3.5" strokeWidth={2} />
      {isThisDay ? 'המשך אימון' : otherActive ? 'לאימון הפעיל' : 'התחל אימון'}
    </Button>
  )
}
