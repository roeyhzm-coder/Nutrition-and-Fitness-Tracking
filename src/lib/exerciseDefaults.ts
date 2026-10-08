import type { Exercise, ExerciseDefaultSet, LoggedSet } from './types'

/** Structured defaults used to seed active-workout sets. */
export type ExerciseDefaultValues = {
  sets: number
  weightKg: number | null
  reps: number | null
  defaultSets: ExerciseDefaultSet[]
  /** Free-text labels stored on the Exercise definition. */
  weightLabel?: string
  repsLabel?: string
}

export type ExerciseDefaultsSource = Pick<
  Exercise,
  'sets' | 'reps' | 'weight' | 'defaultWeightKg' | 'defaultReps' | 'defaultSets'
>

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

export function parseOptionalNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
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

function sameOptionalNumber(
  a: number | null | undefined,
  b: number | null | undefined,
): boolean {
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  return a === b
}

function allSameOptional(values: Array<number | null>): boolean {
  if (values.length <= 1) return true
  return values.every((v) => sameOptionalNumber(v, values[0]))
}

export function replicateDefaultSets(
  count: number,
  weightKg: number | null,
  reps: number | null,
): ExerciseDefaultSet[] {
  const n = Math.max(1, count)
  return Array.from({ length: n }, (_, i) => ({
    setNumber: i + 1,
    weightKg,
    reps,
  }))
}

function normalizeDefaultSetRow(raw: unknown, index: number): ExerciseDefaultSet {
  if (!raw || typeof raw !== 'object') {
    return { setNumber: index + 1, weightKg: null, reps: null }
  }
  const row = raw as Record<string, unknown>
  return {
    setNumber: parseOptionalNumber(row.setNumber ?? row.set_number) ?? index + 1,
    weightKg: parseOptionalNumber(row.weightKg ?? row.weight_kg ?? row.weight),
    reps: parseOptionalNumber(row.reps),
  }
}

/**
 * Normalize stored per-set defaults. Legacy exercises with only a single
 * defaultWeightKg/defaultReps expand to one row per set (same values).
 * Extra requested slots copy the last defined set instead of wiping earlier rows.
 */
export function normalizeDefaultSets(
  raw: unknown,
  count: number,
  fallbackWeight: number | null,
  fallbackReps: number | null,
): ExerciseDefaultSet[] {
  const n = Math.max(1, count)
  if (!Array.isArray(raw) || raw.length === 0) {
    return replicateDefaultSets(n, fallbackWeight, fallbackReps)
  }
  const parsed = raw
    .map((row, i) => normalizeDefaultSetRow(row, i))
    .sort((a, b) => a.setNumber - b.setNumber)
    .map((row, i) => ({ ...row, setNumber: i + 1 }))
  if (parsed.length >= n) {
    return parsed.slice(0, n).map((row, i) => ({ ...row, setNumber: i + 1 }))
  }
  const last = parsed[parsed.length - 1]!
  const extra = Array.from({ length: n - parsed.length }, (_, i) => ({
    setNumber: parsed.length + i + 1,
    weightKg: last.weightKg,
    reps: last.reps,
  }))
  return [...parsed, ...extra]
}

export function defaultSetAt(
  defaults: Pick<ExerciseDefaultValues, 'defaultSets' | 'weightKg' | 'reps'>,
  index: number,
): ExerciseDefaultSet {
  const rows = defaults.defaultSets
  if (rows.length) {
    const row = rows[index] ?? rows[rows.length - 1]!
    return { setNumber: index + 1, weightKg: row.weightKg, reps: row.reps }
  }
  return { setNumber: index + 1, weightKg: defaults.weightKg, reps: defaults.reps }
}

function formatJoinedNumbers(values: Array<number | null>, suffix: string): string {
  if (!values.length || values.every((v) => v == null)) return '—'
  if (allSameOptional(values)) {
    const v = values[0]
    return v == null ? '—' : `${v}${suffix}`
  }
  return `${values.map((v) => (v == null ? '—' : String(v))).join(' / ')}${suffix}`
}

export function formatPerSetDefaultSummary(defaults: ExerciseDefaultValues): string {
  const weights = defaults.defaultSets.map((s) => s.weightKg)
  const reps = defaults.defaultSets.map((s) => s.reps)
  return `${defaults.sets} סטים · ${formatJoinedNumbers(weights, ' ק״ג')} · ${formatJoinedNumbers(reps, '')} חזרות`
}

/** Resolve defaults from an exercise definition (program / template). */
export function defaultsFromExercise(ex: ExerciseDefaultsSource): ExerciseDefaultValues {
  const sets = Math.max(1, ex.sets || 1)
  const weightKg =
    ex.defaultWeightKg != null && Number.isFinite(ex.defaultWeightKg)
      ? ex.defaultWeightKg
      : parseKg(ex.weight)
  const reps =
    ex.defaultReps != null && Number.isFinite(ex.defaultReps)
      ? ex.defaultReps
      : parseDefaultReps(ex.reps)
  const defaultSets = normalizeDefaultSets(ex.defaultSets, sets, weightKg, reps)
  const first = defaultSets[0]
  return {
    sets,
    weightKg: first?.weightKg ?? weightKg,
    reps: first?.reps ?? reps,
    defaultSets,
    weightLabel: ex.weight,
    repsLabel: ex.reps,
  }
}

/** True when the workout has no entered/saved set values to keep. */
export function loggedSetsAreUnset(sets: LoggedSet[]): boolean {
  if (!sets.length) return true
  return sets.every(
    (s) => !s.done && s.weightKg == null && s.reps == null && s.rpe == null,
  )
}

/** Build LoggedSet rows from defaults (all unmarked). Extra sets copy the last default. */
export function buildSetsFromDefaults(
  defaults: ExerciseDefaultValues,
  setCount = defaults.sets,
): LoggedSet[] {
  const count = Math.max(1, setCount)
  return Array.from({ length: count }, (_, i) => {
    const row = defaultSetAt(defaults, i)
    return {
      weightKg: row.weightKg,
      reps: row.reps,
      done: false,
      rpe: null,
    }
  })
}

/**
 * Dirty-check for the active-workout form: set count, weight, and reps
 * against the exercise's saved defaults. RPE / done are ignored.
 */
export function setsMatchDefaults(
  sets: LoggedSet[],
  defaults: ExerciseDefaultValues,
): boolean {
  const expected = buildSetsFromDefaults(defaults)
  if (sets.length !== expected.length) return false
  return sets.every(
    (s, i) =>
      sameOptionalNumber(s.weightKg, expected[i]!.weightKg) &&
      sameOptionalNumber(s.reps, expected[i]!.reps),
  )
}

export function setsValuesKey(sets: LoggedSet[]): string {
  return sets.map((s) => `${s.weightKg ?? ''}:${s.reps ?? ''}`).join('|')
}

/** Derive per-set defaults from the values currently entered in an active exercise. */
export function defaultsFromLoggedSets(sets: LoggedSet[]): ExerciseDefaultValues {
  const usable = sets.length ? sets : [{ weightKg: null, reps: null, done: false }]
  const defaultSets = usable.map((s, i) => ({
    setNumber: i + 1,
    weightKg: s.weightKg,
    reps: s.reps,
  }))
  const first = defaultSets[0]!
  return {
    sets: defaultSets.length,
    weightKg: first.weightKg,
    reps: first.reps,
    defaultSets,
    weightLabel: formatWeightLabel(first.weightKg),
    repsLabel: formatRepsLabel(first.reps),
  }
}

function labelFromDefaultSets(
  values: Array<number | null>,
  formatOne: (value: number | null) => string | undefined,
  fallback?: string,
): string | undefined {
  if (!values.length) return fallback
  if (allSameOptional(values)) return formatOne(values[0] ?? null) ?? fallback
  const joined = values.map((v) => (v == null ? '—' : String(v))).join(' / ')
  return joined
}

/** Patch to persist onto the Exercise definition in the program. */
export function exercisePatchFromDefaults(
  defaults: ExerciseDefaultValues,
): Pick<
  Exercise,
  'sets' | 'reps' | 'weight' | 'defaultWeightKg' | 'defaultReps' | 'defaultSets'
> {
  const defaultSets = (
    defaults.defaultSets.length
      ? defaults.defaultSets
      : replicateDefaultSets(defaults.sets, defaults.weightKg, defaults.reps)
  ).map((row, i) => ({ ...row, setNumber: i + 1 }))
  const first = defaultSets[0]
  const weightKg = first?.weightKg ?? defaults.weightKg
  const reps = first?.reps ?? defaults.reps
  const weightLabel = labelFromDefaultSets(
    defaultSets.map((s) => s.weightKg),
    (v) => formatWeightLabel(v),
    defaults.weightLabel,
  )
  const repsLabel =
    labelFromDefaultSets(
      defaultSets.map((s) => s.reps),
      (v) => (v != null ? String(v) : undefined),
      defaults.repsLabel,
    ) ?? formatRepsLabel(reps, defaults.repsLabel)
  return {
    sets: Math.max(1, defaults.sets, defaultSets.length),
    reps: repsLabel,
    weight: weightLabel,
    defaultWeightKg: weightKg,
    defaultReps: reps,
    defaultSets,
  }
}
