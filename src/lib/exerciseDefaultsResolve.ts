import {
  blockExerciseKey,
  canonicalExerciseKey,
  defaultsFromHistory,
  exercisePatchFromDefaults,
  exercisePatchFromStoredValues,
  resolveExerciseMetric,
} from './exerciseDefaults'
import type { ExerciseDefaultsMap, StoredExerciseDefaults } from './exerciseDefaultsStore'
import type { Exercise, ExerciseMetric, LoggedExercise, WorkoutLog } from './types'

/** Which tier supplied an exercise's starting sets. */
export type ExerciseDefaultsSource = 'block' | 'global' | 'definition' | 'history' | 'seed'

export type ExerciseDefaultsContext = {
  /** Program (block) the workout belongs to. */
  blockId?: string | null
  stored: ExerciseDefaultsMap
  logs: WorkoutLog[]
}

export type ResolvedExerciseDefaults = {
  exercise: Exercise
  metric: ExerciseMetric
  source: ExerciseDefaultsSource
}

function usableRow(row: StoredExerciseDefaults | undefined): row is StoredExerciseDefaults {
  return !!row && !row.notesOnly
}

function fromRow(
  ex: Exercise,
  row: StoredExerciseDefaults,
  source: ExerciseDefaultsSource,
): ResolvedExerciseDefaults {
  return { exercise: { ...ex, ...exercisePatchFromStoredValues(row, ex) }, metric: row.metric, source }
}

/**
 * Strict hydration priority for an exercise's starting sets:
 * 1. saved default for `blockId + canonicalExerciseKey`
 * 2. saved global default for `canonicalExerciseKey`
 *    (a definition edited in a program / template editor after that save wins)
 * 3. the most recent completed workout that logged this exercise
 * 4. the static program / seed definition
 */
export function resolveExerciseDefaults(
  ex: Exercise,
  ctx: ExerciseDefaultsContext,
): ResolvedExerciseDefaults {
  const block = ctx.blockId ? ctx.stored[blockExerciseKey(ctx.blockId, ex.name)] : undefined
  if (usableRow(block)) return fromRow(ex, block, 'block')

  const global = ctx.stored[canonicalExerciseKey(ex.name)]
  const definitionNewer =
    !!ex.defaultsUpdatedAt && (!usableRow(global) || ex.defaultsUpdatedAt > global.updatedAt)
  if (usableRow(global) && !definitionNewer) return fromRow(ex, global, 'global')
  if (definitionNewer) {
    return { exercise: ex, metric: resolveExerciseMetric(ex), source: 'definition' }
  }

  const history = defaultsFromHistory(ctx.logs, ex.name)
  if (history) {
    const metric = history.metric ?? resolveExerciseMetric(ex)
    const patch = exercisePatchFromDefaults({ ...history.values, metric })
    // Keep the prescription labels; only the numbers come from the last session.
    return {
      exercise: { ...ex, ...patch, reps: ex.reps, weight: ex.weight, metric },
      metric,
      source: 'history',
    }
  }

  return { exercise: ex, metric: resolveExerciseMetric(ex), source: 'seed' }
}

/**
 * Re-align an active workout with its day's current exercise lineup after a
 * template switch (e.g. דחיפה → משיכה). Matching is by exercise id, then by
 * canonical key for exercises with completed sets; every other exercise is
 * hydrated fresh, so no uncommitted value ever carries over by array position.
 * Returns null when the lineup is unchanged.
 */
export function reconcileWorkoutExercises(
  current: LoggedExercise[],
  next: Exercise[],
  hydrate: (ex: Exercise) => LoggedExercise,
): LoggedExercise[] | null {
  const unchanged =
    current.length === next.length && current.every((l, i) => l.exerciseId === next[i]!.id)
  if (unchanged) return null

  const byId = new Map(current.map((l) => [l.exerciseId, l]))
  const committedByKey = new Map<string, LoggedExercise>()
  for (const logged of current) {
    const key = canonicalExerciseKey(logged.name)
    if (logged.sets.some((s) => s.done) && !committedByKey.has(key)) {
      committedByKey.set(key, logged)
    }
  }

  return next.map((ex) => {
    const same = byId.get(ex.id)
    if (same) return same
    const key = canonicalExerciseKey(ex.name)
    const committed = committedByKey.get(key)
    if (committed) {
      committedByKey.delete(key)
      return { ...committed, exerciseId: ex.id }
    }
    return hydrate(ex)
  })
}
