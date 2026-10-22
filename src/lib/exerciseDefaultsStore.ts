import { withDefaultNote } from '../data/exerciseNotes'
import { SHARED_OWNER_ALIASES, SHARED_OWNER_ID } from './appStateSync'
import {
  blockExerciseKey,
  canonicalExerciseKey,
  exercisePatchFromStoredValues,
  isBlockExerciseKey,
  normalizeDefaultSets,
  parseOptionalNumber,
  replicateDefaultSets,
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
  /** True when the row only carries a note (no saved set defaults yet). */
  notesOnly?: boolean
  /** User-edited notes; '' = deliberately cleared. Undefined = never edited. */
  notes?: string
  notesUpdatedAt?: string
}

export type ExerciseDefaultsMap = Record<string, StoredExerciseDefaults>

export type ExerciseDefaultsWriteResult = { ok: true } | { ok: false; error: string }

const TABLE = 'exercise_defaults'
const MAX_ROWS = 500
const MAX_SETS = 20
const MAX_NOTES_LENGTH = 2000
const BASE_COLUMNS = 'exercise_key, exercise_name, metric, sets, default_sets, updated_at'
const NOTES_COLUMNS = `${BASE_COLUMNS}, notes, notes_updated_at`

/** Global key of an exercise's saved defaults (see canonicalExerciseKey). */
export const exerciseDefaultsKey = canonicalExerciseKey

function isoOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
    ? new Date(value).toISOString()
    : undefined
}

export function clampNotes(notes: string): string {
  return notes.trim().slice(0, MAX_NOTES_LENGTH)
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
  const updatedAt = isoOrUndefined(row.updated_at) ?? new Date(0).toISOString()
  const notesUpdatedAt = isoOrUndefined(row.notes_updated_at)
  const hasNotes = typeof row.notes === 'string' && notesUpdatedAt != null
  // Block-specific rows keep their composite key; global rows re-derive it.
  const exerciseKey =
    typeof row.exercise_key === 'string' && isBlockExerciseKey(row.exercise_key)
      ? row.exercise_key
      : exerciseDefaultsKey(name)
  return {
    exerciseKey,
    exerciseName: name,
    metric: isMetric(row.metric) ? row.metric : 'reps',
    sets,
    defaultSets: normalizeDefaultSets(rawSets, sets, null, null),
    updatedAt,
    // A row inserted by a note save has no default_sets — never overlay its placeholder set.
    ...(rawSets.length === 0 ? { notesOnly: true } : {}),
    ...(hasNotes ? { notes: row.notes as string, notesUpdatedAt } : {}),
  }
}

function newerNotes(a: StoredExerciseDefaults, b: StoredExerciseDefaults | undefined) {
  return (a.notesUpdatedAt ?? '') > (b?.notesUpdatedAt ?? '')
}

/**
 * Field-wise merge: set defaults follow `updatedAt` (a note-only row never
 * replaces real defaults) and notes follow `notesUpdatedAt`.
 */
export function mergeExerciseRow(
  current: StoredExerciseDefaults | undefined,
  incoming: StoredExerciseDefaults,
): StoredExerciseDefaults {
  if (!current) return incoming
  const setsFrom =
    incoming.notesOnly && !current.notesOnly
      ? current
      : current.notesOnly && !incoming.notesOnly
        ? incoming
        : incoming.updatedAt > current.updatedAt
          ? incoming
          : current
  const notesFrom = newerNotes(incoming, current) ? incoming : current
  const setsPart: StoredExerciseDefaults = {
    exerciseKey: setsFrom.exerciseKey,
    exerciseName: setsFrom.exerciseName,
    metric: setsFrom.metric,
    sets: setsFrom.sets,
    defaultSets: setsFrom.defaultSets,
    updatedAt: setsFrom.updatedAt,
  }
  return {
    ...setsPart,
    ...(current.notesOnly && incoming.notesOnly ? { notesOnly: true } : {}),
    ...(notesFrom.notesUpdatedAt != null
      ? { notes: notesFrom.notes ?? '', notesUpdatedAt: notesFrom.notesUpdatedAt }
      : {}),
  }
}

function sameRow(a: StoredExerciseDefaults, b: StoredExerciseDefaults) {
  return (
    a.updatedAt === b.updatedAt &&
    !!a.notesOnly === !!b.notesOnly &&
    a.notesUpdatedAt === b.notesUpdatedAt &&
    a.notes === b.notes
  )
}

/** Per key, newest set defaults and newest notes win independently. */
export function mergeExerciseDefaults(
  local: ExerciseDefaultsMap,
  remote: ExerciseDefaultsMap,
): ExerciseDefaultsMap {
  let changed = false
  const next = { ...local }
  for (const [key, row] of Object.entries(remote)) {
    const prev = next[key]
    const merged = mergeExerciseRow(prev, row)
    if (!prev || !sameRow(merged, prev)) {
      next[key] = merged
      changed = true
    }
  }
  return changed ? next : local
}

/** Row recording a note edit; keeps any set defaults already stored for the exercise. */
export function storedNotesRow(
  exerciseName: string,
  notes: string,
  existing: StoredExerciseDefaults | undefined,
  notesUpdatedAt = new Date().toISOString(),
): StoredExerciseDefaults {
  const base: StoredExerciseDefaults = existing ?? {
    exerciseKey: exerciseDefaultsKey(exerciseName),
    exerciseName: exerciseName.trim(),
    metric: 'reps',
    sets: 1,
    defaultSets: replicateDefaultSets(1, null, null),
    updatedAt: new Date(0).toISOString(),
    notesOnly: true,
  }
  return { ...base, notes: clampNotes(notes), notesUpdatedAt }
}

export function storedDefaultsFromValues(
  exerciseName: string,
  values: ExerciseDefaultValues,
  updatedAt = new Date().toISOString(),
  blockId?: string | null,
): StoredExerciseDefaults {
  const sets = clampSets(values.sets, Math.max(1, values.defaultSets.length))
  return {
    exerciseKey: blockId
      ? blockExerciseKey(blockId, exerciseName)
      : exerciseDefaultsKey(exerciseName),
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
    const client = supabase
    const query = (columns: string) =>
      client
        .from(TABLE)
        .select(columns)
        .in('owner_id', [...SHARED_OWNER_ALIASES])
        .order('updated_at', { ascending: false })
        .limit(MAX_ROWS)
    let { data, error } = await query(NOTES_COLUMNS)
    // Notes columns not migrated yet: still pull the set defaults.
    if (error && (error.code === '42703' || /notes/i.test(error.message))) {
      console.warn('[exerciseDefaults] notes columns missing; pulling defaults only')
      ;({ data, error } = await query(BASE_COLUMNS))
    }
    if (error) {
      console.error('[exerciseDefaults] pull failed', error)
      return null
    }
    const map: ExerciseDefaultsMap = {}
    for (const raw of (data ?? []) as unknown[]) {
      const row = normalizeRow(raw)
      if (row) map[row.exerciseKey] = mergeExerciseRow(map[row.exerciseKey], row)
    }
    return map
  } catch (err) {
    console.error('[exerciseDefaults] pull threw', err)
    return null
  }
}

/** Row with each set's weight, reps and (for timed work) seconds spelled out. */
function defaultSetsPayload(row: StoredExerciseDefaults) {
  return row.defaultSets.map((s) => ({
    ...s,
    seconds: row.metric === 'seconds' ? s.reps : null,
  }))
}

/** Upsert one or more rows (e.g. a block-specific + global pair) in one request. */
export async function pushExerciseDefaults(
  rows: StoredExerciseDefaults | StoredExerciseDefaults[],
): Promise<ExerciseDefaultsWriteResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: 'Supabase אינו מוגדר' }
  }
  const list = Array.isArray(rows) ? rows : [rows]
  try {
    const { error } = await supabase.from(TABLE).upsert(
      list.map((row) => ({
        owner_id: SHARED_OWNER_ID,
        exercise_key: row.exerciseKey,
        exercise_name: row.exerciseName,
        metric: row.metric,
        sets: row.sets,
        default_sets: defaultSetsPayload(row),
        updated_at: row.updatedAt,
      })),
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

/**
 * Upsert only the note columns, so a note save never touches the exercise's
 * set defaults (a new row gets the table's empty defaults → note-only).
 */
export async function pushExerciseNotes(
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
        notes: row.notes ?? '',
        notes_updated_at: row.notesUpdatedAt ?? new Date().toISOString(),
      },
      { onConflict: 'owner_id,exercise_key' },
    )
    if (error) {
      console.error('[exerciseDefaults] notes upsert failed', error)
      const denied = error.code === '42501' || /row-level security|permission/i.test(error.message)
      return {
        ok: false,
        error: denied ? 'אין הרשאה לשמור הערה (RLS)' : `שגיאת שמירת הערה: ${error.message}`,
      }
    }
    return { ok: true }
  } catch (err) {
    console.error('[exerciseDefaults] notes upsert threw', err)
    return { ok: false, error: 'שגיאת רשת — ההערה לא נשמרה בענן' }
  }
}

/** Exercise patch derived from a stored row; free-text labels fall back to `ex`. */
export const exercisePatchFromStored = exercisePatchFromStoredValues

/**
 * Overlay the stored defaults for this exercise. A block-specific row for
 * lockId always wins; otherwise the global row applies unless the
 * definition itself was edited more recently (e.g. in the program editor).
 */
export function withStoredDefaults<T extends Exercise>(
  ex: T,
  map: ExerciseDefaultsMap,
  blockId?: string | null,
): T {
  const block = blockId ? map[blockExerciseKey(blockId, ex.name)] : undefined
  if (block && !block.notesOnly) {
    const withBlock =
      ex.defaultsUpdatedAt === block.updatedAt
        ? ex
        : { ...ex, ...exercisePatchFromStored(block, ex) }
    return withStoredNotes(withBlock, map)
  }
  const row = map[exerciseDefaultsKey(ex.name)]
  if (!row) return ex
  const withSets =
    row.notesOnly || (ex.defaultsUpdatedAt && ex.defaultsUpdatedAt >= row.updatedAt)
      ? ex
      : { ...ex, ...exercisePatchFromStored(row, ex) }
  return withStoredNotes(withSets, map)
}

/** Overlay the user's saved note for this exercise name when it is newer. */
export function withStoredNotes<T extends Exercise>(ex: T, map: ExerciseDefaultsMap): T {
  const row = map[exerciseDefaultsKey(ex.name)]
  if (!row?.notesUpdatedAt) return ex
  if (ex.notesUpdatedAt && ex.notesUpdatedAt >= row.notesUpdatedAt) return ex
  return { ...ex, notes: row.notes || undefined, notesUpdatedAt: row.notesUpdatedAt }
}

type ExerciseOverlay = (ex: Exercise, blockId?: string) => Exercise

/** Program-seeded note first, then the user's saved defaults / note. */
const fullOverlay =
  (map: ExerciseDefaultsMap): ExerciseOverlay =>
  (ex, blockId) =>
    withStoredDefaults(withDefaultNote(ex), map, blockId)

const notesOverlay =
  (map: ExerciseDefaultsMap): ExerciseOverlay =>
  (ex) =>
    withStoredNotes(withDefaultNote(ex), map)

function overlayList(exercises: Exercise[], overlay: ExerciseOverlay, blockId?: string) {
  let changed = false
  const next = exercises.map((ex) => {
    const patched = overlay(ex, blockId)
    if (patched !== ex) changed = true
    return patched
  })
  return { exercises: changed ? next : exercises, changed }
}

/** Apply stored defaults + notes to every matching exercise in every program day. */
export function applyStoredDefaultsToPrograms(
  programs: WorkoutProgram[],
  map: ExerciseDefaultsMap,
): { programs: WorkoutProgram[]; changed: boolean } {
  return overlayPrograms(programs, fullOverlay(map))
}

/** Seed program notes and apply saved notes only (set defaults untouched). */
export function applyExerciseNotesToPrograms(
  programs: WorkoutProgram[],
  map: ExerciseDefaultsMap,
): { programs: WorkoutProgram[]; changed: boolean } {
  return overlayPrograms(programs, notesOverlay(map))
}

function overlayPrograms(
  programs: WorkoutProgram[],
  overlay: ExerciseOverlay,
): { programs: WorkoutProgram[]; changed: boolean } {
  let changed = false
  const next = programs.map((program) => {
    let programChanged = false
    const days = program.days.map((day) => {
      let dayChanged = false
      const sessions = (day.sessions ?? []).map((session) => {
        const res = overlayList(session.exercises, overlay, program.id)
        if (!res.changed) return session
        dayChanged = true
        return { ...session, exercises: res.exercises }
      })
      const standalone = overlayList(day.exercises ?? [], overlay, program.id)
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
  return overlayTemplates(templates, fullOverlay(map))
}

export function applyExerciseNotesToTemplates(
  templates: WorkoutTemplate[],
  map: ExerciseDefaultsMap,
): { templates: WorkoutTemplate[]; changed: boolean } {
  return overlayTemplates(templates, notesOverlay(map))
}

function overlayTemplates(
  templates: WorkoutTemplate[],
  overlay: ExerciseOverlay,
): { templates: WorkoutTemplate[]; changed: boolean } {
  let changed = false
  const next = templates.map((template) => {
    const res = overlayList(template.exercises, overlay)
    if (!res.changed) return template
    changed = true
    return { ...template, exercises: res.exercises, updatedAt: new Date().toISOString() }
  })
  return { templates: changed ? next : templates, changed }
}
