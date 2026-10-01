import type {
  ActivityLog,
  CustomHabit,
  FocusTrack,
  FoodLogEntry,
  HabitChecks,
  LifestyleLogs,
  Routine,
  SetLog,
  WeightEntry,
  WorkoutLog,
  WorkoutProgram,
  WorkoutTemplate,
} from './types'
import { workoutPerformedOn } from './caloriesBurned'

export type DynamicExportInput = {
  generatedAt?: string
  workoutLogs?: WorkoutLog[]
  workoutTemplates?: WorkoutTemplate[]
  workoutPrograms?: WorkoutProgram[]
  routines?: Routine[]
  focusTracks?: FocusTrack[]
  activityLogs?: ActivityLog[]
  setLogs?: SetLog[]
  foodLogs?: FoodLogEntry[]
  weightLogs?: WeightEntry[]
  habits?: CustomHabit[]
  habitChecks?: HabitChecks
  lifestyleLogs?: LifestyleLogs
  [extra: string]: unknown
}

type FlatRow = Record<string, string | number | boolean | null>

function scalar(value: unknown): string | number | boolean | null {
  if (value == null) return null
  if (typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === 'string' || typeof item === 'number')) {
      return value.map(String).join('|')
    }
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return null
    }
  }
  return String(value)
}

/** Flatten one record; nested objects become JSON strings so new fields export automatically. */
export function flattenRecord(
  entity: string,
  record: Record<string, unknown>,
): FlatRow {
  const row: FlatRow = { entity }
  for (const [key, value] of Object.entries(record)) {
    row[key] = scalar(value)
  }
  return row
}

function asRecords(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === 'object' && !Array.isArray(item),
  )
}

function explodeFocusCompletions(tracks: FocusTrack[]): Record<string, unknown>[] {
  return tracks.flatMap((track) =>
    track.completedDates.map((date) => ({
      trackId: track.id,
      trackName: track.name,
      date,
      estimatedCalories: track.estimatedCalories,
      weeklyTargetDays: track.weeklyTargetDays,
    })),
  )
}

function explodeHabitChecks(
  habits: CustomHabit[],
  checks: HabitChecks,
): Record<string, unknown>[] {
  const labels = new Map(habits.map((h) => [h.id, h.label]))
  return Object.entries(checks).flatMap(([date, ids]) =>
    (ids ?? []).map((id) => ({
      date,
      habitId: id,
      habitLabel: labels.get(id) ?? id,
    })),
  )
}

function explodeLifestyle(logs: LifestyleLogs): Record<string, unknown>[] {
  return Object.entries(logs).map(([date, entry]) => ({
    date,
    ...entry,
  }))
}

/**
 * Collect every known (and extra) collection into named entity tables.
 * Unknown array-of-object keys on the input are included automatically.
 */
export function collectExportEntities(
  input: DynamicExportInput,
): Record<string, Record<string, unknown>[]> {
  const workoutLogs = (input.workoutLogs ?? []).map((log) => ({
    ...log,
    performedOn: workoutPerformedOn(log),
    date: workoutPerformedOn(log),
    activityType: 'strength_workout',
    caloriesBurned: log.estimatedCalories ?? 0,
  }))
  const routines = (input.routines ?? []).map((row) => ({
    ...row,
    activityType: 'routine',
  }))
  const focusTracks = (input.focusTracks ?? []).map((row) => ({
    ...row,
    activityType: 'focus_track',
  }))

  const known: Record<string, Record<string, unknown>[]> = {
    workoutLogs,
    workoutTemplates: asRecords(input.workoutTemplates),
    workoutPrograms: asRecords(input.workoutPrograms),
    routines,
    focusTracks,
    focusTrackCompletions: explodeFocusCompletions(input.focusTracks ?? []),
    activityLogs: asRecords(input.activityLogs),
    setLogs: asRecords(input.setLogs),
    foodLogs: asRecords(input.foodLogs),
    weightLogs: asRecords(input.weightLogs),
    habits: asRecords(input.habits),
    habitChecks: explodeHabitChecks(input.habits ?? [], input.habitChecks ?? {}),
    lifestyleLogs: explodeLifestyle(input.lifestyleLogs ?? {}),
  }

  const reserved = new Set([
    ...Object.keys(known),
    'generatedAt',
    'habitChecks',
    'lifestyleLogs',
  ])
  for (const [key, value] of Object.entries(input)) {
    if (reserved.has(key) || known[key]) continue
    const rows = asRecords(value)
    if (rows.length) known[key] = rows
  }
  return known
}

export function entitiesToFlatRows(
  entities: Record<string, Record<string, unknown>[]>,
): FlatRow[] {
  return Object.entries(entities).flatMap(([entity, rows]) =>
    rows.map((row) => flattenRecord(entity, row)),
  )
}

export function rowsToCsv(rows: FlatRow[]): string {
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))]
  if (!keys.includes('entity')) keys.unshift('entity')
  const header = keys.map(csvEscape).join(',')
  const lines = rows.map((row) =>
    keys.map((key) => csvEscape(row[key] ?? '')).join(','),
  )
  return [header, ...lines].join('\n')
}

function csvEscape(value: string | number | boolean | null): string {
  const text = value == null ? '' : String(value)
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`
  return text
}

export function buildExportJson(input: DynamicExportInput): string {
  const generatedAt = input.generatedAt ?? new Date().toISOString()
  const entities = collectExportEntities(input)
  return JSON.stringify({ generatedAt, entities }, null, 2)
}

export function buildExportCsv(input: DynamicExportInput): string {
  return rowsToCsv(entitiesToFlatRows(collectExportEntities(input)))
}

export function downloadTextFile(
  filename: string,
  content: string,
  mime: string,
) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
