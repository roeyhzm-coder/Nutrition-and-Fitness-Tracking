import type { WorkoutDay, WorkoutProgram, WorkoutTemplate } from './types'
import { parseLocalDateKey, weekdayNumber } from './types'

export const INDEPENDENT_WORKOUT = {
  id: 'independent-cardio',
  name: 'אימון עצמאי/אירובי',
} as const

export type ConsistencyWorkoutOption = {
  id: string
  name: string
}

/** Short label for a weekday: workout name, rest, or empty. */
export function dayPlanLabel(day: WorkoutDay) {
  if (day.isRest) return 'מנוחה'
  if (day.sessions.length) return day.sessions.map((s) => s.name).join(' + ')
  if (day.exercises.length) return 'מותאם'
  return '—'
}

/** Scheduled workout for a calendar date from the active weekly plan. */
export function scheduledWorkoutForDate(
  program: WorkoutProgram | null | undefined,
  date: string,
): ConsistencyWorkoutOption {
  const day = program?.days.find(
    (d) => d.dayNumber === weekdayNumber(parseLocalDateKey(date)),
  )
  if (!day || day.isRest) {
    return { id: INDEPENDENT_WORKOUT.id, name: INDEPENDENT_WORKOUT.name }
  }
  const name = dayPlanLabel(day)
  if (!name || name === '—' || name === 'מנוחה') {
    return { id: INDEPENDENT_WORKOUT.id, name: INDEPENDENT_WORKOUT.name }
  }
  const session = day.sessions.length === 1 ? day.sessions[0] : null
  return {
    id: session?.sourceTemplateId || INDEPENDENT_WORKOUT.id,
    name,
  }
}

export function consistencyWorkoutOptions(
  templates: WorkoutTemplate[],
): ConsistencyWorkoutOption[] {
  const options = templates.map((t) => ({ id: t.id, name: t.name }))
  if (
    !options.some(
      (o) =>
        o.id === INDEPENDENT_WORKOUT.id || o.name === INDEPENDENT_WORKOUT.name,
    )
  ) {
    options.push({
      id: INDEPENDENT_WORKOUT.id,
      name: INDEPENDENT_WORKOUT.name,
    })
  }
  return options
}
