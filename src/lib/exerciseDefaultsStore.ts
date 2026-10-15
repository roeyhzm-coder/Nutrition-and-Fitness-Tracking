import { SHARED_OWNER_ALIASES, SHARED_OWNER_ID } from './appStateSync'
import {
  exercisePatchFromDefaults,
  normalizeDefaultSets,
  parseOptionalNumber,
  type ExerciseDefaultValues,
} from './exerciseDefaults'
import { isSupabaseConfigured, supabase } from './supabase'
import type {
  Exercise,
  ExerciseDefaultSet,
  ExerciseMetric,
  WorkoutProgram,
  WorkoutTemplate,
} from './types'

/**
 * Per-exercise defaults, keyed by normalized exercise name.
 * Source of truth for "save as default": one Supabase row per exercise
 * (`public.exercise_defaults`), mirrored into program/template JSON for display.
 */
export type StoredExerciseDefaults = {
  exerciseKey: string
  exerciseName: string
  metric: ExerciseMetric
  sets: number
  defaultSets: ExerciseDefaultSet[]
  updatedAt: string
}

export type ExerciseDefaultsMap = Record<string, StoredExerciseDefaults>

export type ExerciseDefaultsWriteResult = { ok: true } | { ok: false; error: string }

const TABLE = 'exercise_defaults'
const MAX_ROWS = 500
const MAX_SETS = 20

export function exerciseDefaultsKey(name: string): string {
  return name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
}

function isMetric(value: unknown): value is ExerciseMetric {
  return value === 'reps' || value === 'seconds'
}

function clampSets(value: unknown, fallback: number): number {
  const n = parseOptionalNumber(value)
  if (n == null) return fallback
  return Math.min(MAX_SETS, Math.max(1, Math.round(n)))
}

function normalizeRow(raw: unknown): StoredExerciseDefaults | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const name = typeof row.exercise_name === 'string' ? row.exercise_name.trim() : ''
  if (!name) return null
  const rawSets = Array.isArray(row.default_sets) ? row.default_sets : []
  const sets = clampSets(row.sets, Math.max(1, rawSets.length))
  const updatedAt =
    typeof row.updated_at === 'string' && !Number.isNaN(Date.parse(row.updated_at))
      ? new Date(row.updated_at).toISOString()
      : new Date(0).toISOString()
  return {
    exerciseKey: exerciseDefaultsKey(name),
    exerciseName: name,
    metric: isMetric(row.metric) ? row.metric : 'reps',
    sets,
    defaultSets: normalizeDefaultSets(rawSets, sets, null, null),
    updatedAt,
  }
}

function isNewer(a: StoredExerciseDefaults, b: StoredExerciseDefaults | undefined) {
  return !b || a.updatedAt > b.updatedAt
}

/** Per key, the most recently updated row wins. */
export function mergeExerciseDefaults(
  local: ExerciseDefaultsMap,
  remote: ExerciseDefaultsMap,
): ExerciseDefaultsMap {
  let changed = false
  const next = { ...local }
  for (const [key, row] of Object.entries(remote)) {
    if (isNewer(row, next[key])) {
      next[key] = row
      changed = true
    }
  }
  return changed ? next : local
}

export function storedDefaultsFromValues(
  exerciseName: string,
  values: ExerciseDefaultValues,
  updatedAt = new Date().toISOString(),
): StoredExerciseDefaults {
  const sets = clampSets(values.sets, Math.max(1, values.defaultSets.length))
  return {
    exerciseKey: exerciseDefaultsKey(exerciseName),
    exerciseName: exerciseName.trim(),
    metric: values.metric ?? 'reps',
    sets,
    defaultSets: normalizeDefaultSets(
      values.defaultSets,
      sets,
      values.weightKg,
      values.reps,
    ),
    updatedAt,
  }
}

export async function pullExerciseDefaults(): Promise<ExerciseDefaultsMap | null> {
  if (!isSupabaseConfigured || !supabase) return null
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('exercise_key, exercise_name, metric, sets, default_sets, updated_at')
      .in('owner_id', [...SHARED_OWNER_ALIASES])
      .order('updated_at', { ascending: false })
      .limit(MAX_ROWS)
    if (error) {
      console.error('[exerciseDefaults] pull failed', error)
      return null
    }
    const map: ExerciseDefaultsMap = {}
    for (const raw of data ?? []) {
      const row = normalizeRow(raw)
      if (row && isNewer(row, map[row.exerciseKey])) map[row.exerciseKey] = row
    }
    return map
  } catch (err) {
    console.error('[exerciseDefaults] pull threw', err)
    return null
  }
}

export async function pushExerciseDefaults(
  row: StoredExerciseDefaults,
): Promise<ExerciseDefaultsWriteResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: 'Supabase אינו מוגדר' }
  }
  try {
    const { error } = await supabase.from(TABLE).upsert(
      {
        owner_id: SHARED_OWNER_ID,
        exercise_key: row.exerciseKey,
        exercise_name: row.exerciseName,
        metric: row.metric,
        sets: row.sets,
        default_sets: row.defaultSets,
        updated_at: row.updatedAt,
      },
      { onConflict: 'owner_id,exercise_key' },
    )
    if (error) {
      console.error('[exerciseDefaults] upsert failed', error)
      const denied = error.code === '42501' || /row-level security|permission/i.test(error.message)
      return {
        ok: false,
        error: denied ? 'אין הרשאה לשמור ברירת מחדל (RLS)' : `שגיאת שמירה: ${error.message}`,
      }
    }
    return { ok: true }
  } catch (err) {
    console.error('[exerciseDefaults] upsert threw', err)
    return { ok: false, error: 'שגיאת רשת — ברירת המחדל לא נשמרה בענן' }
  }
}

/** Exercise patch derived from a stored row; free-text labels fall back to `ex`. */
export function exercisePatchFromStored(
  row: StoredExerciseDefaults,
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
 * Overlay the stored defaults for this exercise name, unless the definition
 * itself was edited more recently (e.g. in the program editor).
 */
export function withStoredDefaults<T extends Exercise>(
  ex: T,
  map: ExerciseDefaultsMap,
): T {
  const row = map[exerciseDefaultsKey(ex.name)]
  if (!row) return ex
  if (ex.defaultsUpdatedAt && ex.defaultsUpdatedAt >= row.updatedAt) return ex
  return { ...ex, ...exercisePatchFromStored(row, ex) }
}

function overlayList(exercises: Exercise[], map: ExerciseDefaultsMap) {
  let changed = false
  const next = exercises.map((ex) => {
    const patched = withStoredDefaults(ex, map)
    if (patched !== ex) changed = true
    return patched
  })
  return { exercises: changed ? next : exercises, changed }
}

/** Apply stored defaults to every matching exercise in every program day. */
export function applyStoredDefaultsToPrograms(
  programs: WorkoutProgram[],
  map: ExerciseDefaultsMap,
): { programs: WorkoutProgram[]; changed: boolean } {
  if (!Object.keys(map).length) return { programs, changed: false }
  let changed = false
  const next = programs.map((program) => {
    let programChanged = false
    const days = program.days.map((day) => {
      let dayChanged = false
      const sessions = (day.sessions ?? []).map((session) => {
        const res = overlayList(session.exercises, map)
        if (!res.changed) return session
        dayChanged = true
        return { ...session, exercises: res.exercises }
      })
      const standalone = overlayList(day.exercises ?? [], map)
      if (standalone.changed) dayChanged = true
      if (!dayChanged) return day
      programChanged = true
      return { ...day, sessions, exercises: standalone.exercises }
    })
    if (!programChanged) return program
    changed = true
    return { ...program, days, updatedAt: new Date().toISOString() }
  })
  return { programs: changed ? next : programs, changed }
}

export function applyStoredDefaultsToTemplates(
  templates: WorkoutTemplate[],
  map: ExerciseDefaultsMap,
): { templates: WorkoutTemplate[]; changed: boolean } {
  if (!Object.keys(map).length) return { templates, changed: false }
  let changed = false
  const next = templates.map((template) => {
    const res = overlayList(template.exercises, map)
    if (!res.changed) return template
    changed = true
    return { ...template, exercises: res.exercises, updatedAt: new Date().toISOString() }
  })
  return { templates: changed ? next : templates, changed }
}
