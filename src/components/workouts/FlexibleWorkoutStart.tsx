import { Play } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { useWorkoutSession } from '../../context/WorkoutSessionContext'
import { dayAllExercises } from '../../lib/types'
import { dayPlanLabel, estimatedCaloriesForDay } from '../../lib/weekPlan'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export function FlexibleWorkoutStart() {
  const { workoutDays, workoutTemplates } = useAppData()
  const { activeWorkout, startFlexibleWorkout } = useWorkoutSession()

  const scheduled = workoutDays.filter(
    (day) => !day.isRest && dayAllExercises(day).length > 0,
  )

  if (workoutTemplates.length === 0 && scheduled.length === 0) return null

  return (
    <Card title="התחל כל אימון, בכל יום">
      <p className="mb-3 text-xs text-muted">
        אין נעילה ליום בשבוע — בחר אימון מהרשימה ובצע אותו היום, גם אם תוכנן
        ליום אחר.
      </p>
      {workoutTemplates.length > 0 ? (
        <ul className="space-y-2">
          {workoutTemplates.map((template) => (
            <li
              key={template.id}
              className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">
                  {template.name}
                </p>
                <p className="text-[11px] text-muted">
                  {template.exercises.length} תרגילים
                  {template.estimatedCalories
                    ? ` · ${template.estimatedCalories} קק״ל`
                    : ''}
                </p>
              </div>
              <Button
                variant="accent"
                className="shrink-0 px-3 text-xs"
                onClick={() =>
                  startFlexibleWorkout({
                    name: template.name,
                    exercises: template.exercises,
                    estimatedCalories: template.estimatedCalories ?? null,
                  })
                }
              >
                <Play className="size-3.5" strokeWidth={2} />
                {activeWorkout ? 'לאימון הפעיל' : 'התחל'}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {scheduled.length > 0 ? (
        <div className="mt-4 border-t border-slate-200 pt-3">
          <p className="mb-2 text-xs font-medium text-muted">מתוכנית השבוע</p>
          <ul className="space-y-2">
            {scheduled.map((day) => (
              <li
                key={day.id}
                className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text">
                    {dayPlanLabel(day)}
                  </p>
                  <p className="text-[11px] text-muted">
                    ברירת מחדל: {day.title} · {dayAllExercises(day).length} תרגילים
                  </p>
                </div>
                <Button
                  variant="surface"
                  className="shrink-0 px-3 text-xs"
                  onClick={() =>
                    startFlexibleWorkout({
                      name: dayPlanLabel(day),
                      exercises: dayAllExercises(day),
                      dayId: day.id,
                      dayNumber: day.dayNumber,
                      estimatedCalories: estimatedCaloriesForDay(
                        day,
                        workoutTemplates,
                      ),
                    })
                  }
                >
                  <Play className="size-3.5" strokeWidth={2} />
                  בצע היום
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  )
}
