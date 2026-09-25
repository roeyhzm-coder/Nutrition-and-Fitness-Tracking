import type { WorkoutDay } from './types'

/** Short label for a weekday: workout name, rest, or empty. */
export function dayPlanLabel(day: WorkoutDay) {
  if (day.isRest) return 'מנוחה'
  if (day.sessions.length) return day.sessions.map((s) => s.name).join(' + ')
  if (day.exercises.length) return 'מותאם'
  return '—'
}
