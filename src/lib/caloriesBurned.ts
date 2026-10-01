import type { FocusTrack, WorkoutLog } from './types'
import { localDateKey } from './types'

export function workoutPerformedOn(log: WorkoutLog): string {
  if (log.performedOn && /^\d{4}-\d{2}-\d{2}$/.test(log.performedOn)) {
    return log.performedOn
  }
  return localDateKey(new Date(log.completedAt))
}

export function caloriesFromWorkoutLogs(
  logs: WorkoutLog[],
  date: string,
): number {
  return logs.reduce((sum, log) => {
    if (workoutPerformedOn(log) !== date) return sum
    const calories = Number(log.estimatedCalories)
    return sum + (Number.isFinite(calories) && calories > 0 ? calories : 0)
  }, 0)
}

export function caloriesFromFocusTracks(
  tracks: FocusTrack[],
  date: string,
): number {
  return tracks.reduce((sum, track) => {
    if (track.archivedAt) return sum
    if (!track.completedDates.includes(date)) return sum
    return sum + Math.max(0, track.estimatedCalories || 0)
  }, 0)
}

export function caloriesBurnedOnDate(
  date: string,
  input: { workoutLogs?: WorkoutLog[]; focusTracks?: FocusTrack[] },
): number {
  return (
    caloriesFromWorkoutLogs(input.workoutLogs ?? [], date) +
    caloriesFromFocusTracks(input.focusTracks ?? [], date)
  )
}
