import { isHoldExercise } from './blockStrength'
import type {
  Exercise,
  ExerciseDefaultSet,
  ExerciseMetric,
  LoggedSet,
  WorkoutLog,
} from './types'

/**
 * Deterministic identity of an exercise across templates, weekdays and blocks.
 * Defaults are always matched by this key — never by array position.
 */
export function canonicalExerciseKey(name: string): string {
  return name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
}

const BLOCK_KEY_PREFIX = 'block:'

/** Key of a block-specific default (`blockId + canonicalExerciseKey`). */
export function blockExerciseKey(blockId: string, name: string): string {
  return `${BLOCK_KEY_PREFIX}${blockId}|${canonicalExerciseKey(name)}`
}

export function isBlockExerciseKey(key: string): boolean {
  return key.startsWith(BLOCK_KEY_PREFIX)
}

const PER_SET_PRESCRIPTION_RE =
  /סט\s*(\d+)\s*:\s*(\d+)(?:\s*[-–]\s*\d+)?\s*(?:\(\s*(\d+(?:\.\d+)?)\s*ק)?/g

/**
 * Per-set prescriptions written as free text, e.g.
 * `סט 1: 6 (17.5 ק"ג), סט 2: 4 (25 ק"ג), סט 3: 2-3 (32.5 ק"ג)`.
 * Returns null unless at least two sets are spelled out.
 */
export function parsePerSetPrescription(text?: string): ExerciseDefaultSet[] | null {
  if (!text?.trim()) return null
  const rows = [...text.matchAll(PER_SET_PRESCRIPTION_RE)].map((m) => ({
    setNumber: Number(m[1]),
    reps: Number(m[2]),
    weightKg: m[3] != null ? Number(m[3]) : null,
  }))
  if (rows.length < 2) return null
  return rows
    .sort((a, b) => a.setNumber - b.setNumber)
    .map((row, i) => ({ ...row, setNumber: i + 1 }))
}

/** Structured defaults used to seed active-workout sets. */
export type ExerciseDefaultValues = {
  sets: number
  weightKg: number | null
  reps: number | null
  defaultSets: ExerciseDefaultSet[]
  /** Reps vs. seconds; undefined keeps auto-detection. */
  metric?: ExerciseMetric
  /** Free-text labels stored on the Exercise definition. */
  weightLabel?: string
  repsLabel?: string
  /** Exercise notes carried alongside the defaults (persisted separately). */
  notes?: string
}

const DURATION_LABEL_RE = /שניות|seconds?|secs?\b|hold|isometric|תליי[הה]|החזקה/i

const DURATION_SUFFIX_RE = /\s*(שניות|שנ׳|seconds?|secs?)\s*$/i

/**
 * Timed / isometric work tracks duration (seconds) in the numeric `reps` field.
 * Detected from exercise name or prescribed reps label. Notes are coaching
 * cues ("ירידה איטית 3 שניות") and never switch a rep exercise to seconds.
 */
export function isDurationTrackedExercise(ex: {
  name?: string
  reps?: string
  targetReps?: string
  metric?: ExerciseMetric
}): boolean {
  if (ex.metric) return ex.metric === 'seconds'
  if (ex.name && isHoldExercise(ex.name)) return true
  const blob = [ex.reps, ex.targetReps].filter(Boolean).join(' ')
  return blob.length > 0 && DURATION_LABEL_RE.test(blob)
}

/** Explicit metric when set, otherwise auto-detected from name / labels. */
export function resolveExerciseMetric(
  ex: Parameters<typeof isDurationTrackedExercise>[0],
): ExerciseMetric {
  return isDurationTrackedExercise(ex) ? 'seconds' : 'reps'
}

export const METRIC_LABEL: Record<ExerciseMetric, string> = {
  reps: 'חזרות',
  seconds: 'שניות',
}

export type ExerciseDefaultsSource = Pick<
  Exercise,
  | 'sets'
  | 'reps'
  | 'weight'
  | 'defaultWeightKg'
  | 'defaultReps'
  | 'defaultSets'
  | 'default_sets'
> &
  Partial<Pick<Exercise, 'metric' | 'notes'>>

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
    reps: parseOptionalNumber(row.reps ?? row.seconds),
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

export function formatPerSetDefaultSummary(
  defaults: ExerciseDefaultValues,
  opts?: { durationSeconds?: boolean },
): string {
  const weights = defaults.defaultSets.map((s) => s.weightKg)
  const reps = defaults.defaultSets.map((s) => s.reps)
  if (opts?.durationSeconds) {
    return `${defaults.sets} סטים · ${formatJoinedNumbers(weights, ' ק״ג')} · ${formatJoinedNumbers(reps, ' שנ׳')}`
  }
  return `${defaults.sets} סטים · ${formatJoinedNumbers(weights, ' ק״ג')} · ${formatJoinedNumbers(reps, '')} חזרות`
}

/** Resolve defaults from an exercise definition (program / template). */
export function defaultsFromExercise(ex: ExerciseDefaultsSource): ExerciseDefaultValues {
  const sets = Math.max(1, ex.sets || 1)
  const explicitSets = ex.defaultSets ?? ex.default_sets
  // A spelled-out pyramid beats the single number pulled from the weight label
  // (which used to copy the first kg — e.g. 17.5 — onto every set).
  const prescribed = explicitSets?.length ? null : parsePerSetPrescription(ex.reps)
  const weightKg =
    ex.defaultWeightKg != null && Number.isFinite(ex.defaultWeightKg)
      ? ex.defaultWeightKg
      : (prescribed?.[0]?.weightKg ?? parseKg(ex.weight))
  const reps =
    ex.defaultReps != null && Number.isFinite(ex.defaultReps)
      ? ex.defaultReps
      : parseDefaultReps(ex.reps)
  const defaultSets = normalizeDefaultSets(
    explicitSets?.length ? explicitSets : prescribed,
    sets,
    weightKg,
    reps,
  )
  const first = defaultSets[0]
  return {
    sets,
    weightKg: first?.weightKg ?? weightKg,
    reps: first?.reps ?? reps,
    defaultSets,
    metric: ex.metric,
    weightLabel: ex.weight,
    repsLabel: ex.reps,
    notes: ex.notes,
  }
}

/** True when the workout has no entered/saved set values to keep. */
export function loggedSetsAreUnset(sets: LoggedSet[]): boolean {
  if (!sets.length) return true
  return sets.every((s) => !s.done && s.weightKg == null && s.reps == null)
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
export function defaultsFromLoggedSets(
  sets: LoggedSet[],
  metric?: ExerciseMetric,
): ExerciseDefaultValues {
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
    metric,
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
  | 'sets'
  | 'reps'
  | 'weight'
  | 'defaultWeightKg'
  | 'defaultReps'
  | 'defaultSets'
  | 'default_sets'
  | 'metric'
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
  const hasNumericReps = defaultSets.some((s) => s.reps != null)
  const rawRepsLabel =
    labelFromDefaultSets(
      defaultSets.map((s) => s.reps),
      (v) => (v != null ? String(v) : undefined),
      defaults.repsLabel,
    ) ?? formatRepsLabel(reps, defaults.repsLabel)
  // Numeric labels carry the unit for seconds and drop a stale "שניות" for reps.
  const repsLabel = !hasNumericReps
    ? rawRepsLabel
    : defaults.metric === 'seconds'
      ? `${rawRepsLabel.replace(DURATION_SUFFIX_RE, '').trim()} שניות`
      : defaults.metric === 'reps'
        ? rawRepsLabel.replace(DURATION_SUFFIX_RE, '').trim()
        : rawRepsLabel
  return {
    sets: Math.max(1, defaults.sets, defaultSets.length),
    reps: repsLabel,
    weight: weightLabel,
    defaultWeightKg: weightKg,
    defaultReps: reps,
    defaultSets,
    default_sets: defaultSets,
    ...(defaults.metric ? { metric: defaults.metric } : {}),
  }
}

/** The saved-default fields every stored row (global or block) carries. */
export type StoredDefaultsValues = {
  metric: ExerciseMetric
  sets: number
  defaultSets: ExerciseDefaultSet[]
  updatedAt: string
}

/** Exercise patch derived from a stored row; free-text labels fall back to `ex`. */
export function exercisePatchFromStoredValues(
  row: StoredDefaultsValues,
  ex?: Pick<Exercise, 'weight' | 'reps'>,
): Partial<Exercise> {
  const first = row.defaultSets[0]
  return {
    ...exercisePatchFromDefaults({
      sets: row.sets,
      weightKg: first?.weightKg ?? null,
      reps: first?.reps ?? null,
      defaultSets: row.defaultSets,
      metric: row.metric,
      weightLabel: ex?.weight,
      repsLabel: ex?.reps,
    }),
    metric: row.metric,
    defaultsUpdatedAt: row.updatedAt,
  }
}

/**
 * Per-set values from the most recent completed workout that logged this
 * exact exercise (matched by canonical key).
 */
export function defaultsFromHistory(
  logs: WorkoutLog[],
  exerciseName: string,
): { values: ExerciseDefaultValues; metric?: ExerciseMetric; completedAt: string } | null {
  const key = canonicalExerciseKey(exerciseName)
  let best: { log: WorkoutLog; sets: LoggedSet[]; metric?: ExerciseMetric } | null = null
  for (const log of logs) {
    if (best && log.completedAt <= best.log.completedAt) continue
    const logged = log.exercises.find((ex) => canonicalExerciseKey(ex.name) === key)
    const sets = logged?.sets.filter((s) => s.weightKg != null || s.reps != null) ?? []
    if (sets.length) best = { log, sets, metric: logged?.metric ?? logged?.defaultMetric }
  }
  if (!best) return null
  return {
    values: defaultsFromLoggedSets(best.sets, best.metric),
    metric: best.metric,
    completedAt: best.log.completedAt,
  }
}
