import type { Exercise, LoggedSet } from './types'

/** Structured defaults used to seed active-workout sets. */
export type ExerciseDefaultValues = {
  sets: number
  weightKg: number | null
  reps: number | null
  /** Free-text labels stored on the Exercise definition. */
  weightLabel?: string
  repsLabel?: string
}

/** Pulls the first numeric kg value from free-text weight. */
export function parseKg(text?: string): number | null {
  if (!text?.trim()) return null
  const match = text.match(/(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : null
}

/** Pulls a default rep count from free-text (e.g. `8-12` → 8). */
export function parseDefaultReps(text?: string): number | null {
  if (!text?.trim()) return null
  const match = text.match(/(\d+)/)
  return match ? Number(match[1]) : null
}

export function formatWeightLabel(weightKg: number | null, fallback?: string): string | undefined {
  if (weightKg != null && Number.isFinite(weightKg)) return `${weightKg} ק"ג`
  const trimmed = fallback?.trim()
  return trimmed || undefined
}

export function formatRepsLabel(reps: number | null, fallback?: string): string {
  if (reps != null && Number.isFinite(reps)) return String(reps)
  const trimmed = fallback?.trim()
  return trimmed || '8–10'
}

/** Resolve defaults from an exercise definition (program / template). */
export function defaultsFromExercise(ex: Pick<
  Exercise,
  'sets' | 'reps' | 'weight' | 'defaultWeightKg' | 'defaultReps'
>): ExerciseDefaultValues {
  return {
    sets: Math.max(1, ex.sets || 1),
    weightKg:
      ex.defaultWeightKg != null && Number.isFinite(ex.defaultWeightKg)
        ? ex.defaultWeightKg
        : parseKg(ex.weight),
    reps:
      ex.defaultReps != null && Number.isFinite(ex.defaultReps)
        ? ex.defaultReps
        : parseDefaultReps(ex.reps),
    weightLabel: ex.weight,
    repsLabel: ex.reps,
  }
}

/** Build LoggedSet rows from defaults (all unmarked). */
export function buildSetsFromDefaults(
  defaults: ExerciseDefaultValues,
  setCount = defaults.sets,
): LoggedSet[] {
  const count = Math.max(1, setCount)
  return Array.from({ length: count }, () => ({
    weightKg: defaults.weightKg,
    reps: defaults.reps,
    done: false,
    rpe: null,
  }))
}

/**
 * Derive defaults from the values currently entered in an active exercise block.
 * Prefers the first set that has both weight and reps; otherwise first available values.
 */
export function defaultsFromLoggedSets(sets: LoggedSet[]): ExerciseDefaultValues {
  const usable = sets.length ? sets : [{ weightKg: null, reps: null, done: false }]
  const withBoth = usable.find((s) => s.weightKg != null && s.reps != null)
  const withWeight = usable.find((s) => s.weightKg != null)
  const withReps = usable.find((s) => s.reps != null)
  const weightKg = withBoth?.weightKg ?? withWeight?.weightKg ?? null
  const reps = withBoth?.reps ?? withReps?.reps ?? null
  return {
    sets: Math.max(1, usable.length),
    weightKg,
    reps,
    weightLabel: formatWeightLabel(weightKg),
    repsLabel: formatRepsLabel(reps),
  }
}

/** Patch to persist onto the Exercise definition in the program. */
export function exercisePatchFromDefaults(
  defaults: ExerciseDefaultValues,
): Pick<Exercise, 'sets' | 'reps' | 'weight' | 'defaultWeightKg' | 'defaultReps'> {
  return {
    sets: Math.max(1, defaults.sets),
    reps: formatRepsLabel(defaults.reps, defaults.repsLabel),
    weight: formatWeightLabel(defaults.weightKg, defaults.weightLabel),
    defaultWeightKg: defaults.weightKg,
    defaultReps: defaults.reps,
  }
}
