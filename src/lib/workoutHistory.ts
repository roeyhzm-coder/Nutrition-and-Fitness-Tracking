import { getDeviceId, SHARED_OWNER_ID } from './appStateSync'
import { isSupabaseConfigured, supabase } from './supabase'
import { normalizeDefaultSets, parseOptionalNumber } from './exerciseDefaults'
import type { LoggedExercise, LoggedSet, WorkoutLog } from './types'

const PAGE_SIZE = 1000

export function deriveBlockNumber(
  programId: string,
  programName: string,
): number | null {
  const fromId = programId.match(/(?:block|בלוק)[-_ ]?(\d+)/i)
  if (fromId) return Number(fromId[1])
  const fromName = programName.match(/(\d+)/)
  if (fromName) return Number(fromName[1])
  return null
}

function asNumber(value: unknown): number | null {
  return parseOptionalNumber(value)
}

function normalizeSet(set: Partial<LoggedSet> | null | undefined): LoggedSet {
  return {
    weightKg: asNumber(set?.weightKg),
    reps: asNumber(set?.reps),
    done: set?.done !== false,
    rpe: asNumber(set?.rpe),
  }
}

function normalizeExercise(
  ex: Partial<LoggedExercise> | null | undefined,
): LoggedExercise | null {
  if (!ex) return null
  const name = typeof ex.name === 'string' ? ex.name.trim() : ''
  const sets = Array.isArray(ex.sets) ? ex.sets.map(normalizeSet) : []
  return {
    exerciseId: typeof ex.exerciseId === 'string' ? ex.exerciseId : '',
    name,
    targetSets: Number(ex.targetSets) || sets.length || 1,
    targetReps: typeof ex.targetReps === 'string' ? ex.targetReps : '',
    targetWeight: typeof ex.targetWeight === 'string' ? ex.targetWeight : undefined,
    defaultWeightKg: asNumber(ex.defaultWeightKg),
    defaultReps: asNumber(ex.defaultReps),
    defaultSets: normalizeDefaultSets(
      ex.defaultSets ?? (ex as { default_sets?: unknown }).default_sets,
      Number(ex.targetSets) || sets.length || 1,
      asNumber(ex.defaultWeightKg),
      asNumber(ex.defaultReps),
    ),
    rest: typeof ex.rest === 'string' ? ex.rest : undefined,
    imageUrl: typeof ex.imageUrl === 'string' ? ex.imageUrl : undefined,
    sets,
  }
}

export function normalizeWorkoutLog(
  log: Partial<WorkoutLog> & Pick<WorkoutLog, 'id'>,
): WorkoutLog {
  const programId = log.programId ?? ''
  const programName = log.programName ?? ''
  const exercises = Array.isArray(log.exercises)
    ? log.exercises
        .map(normalizeExercise)
        .filter((ex): ex is LoggedExercise => Boolean(ex && ex.name))
    : []
  return {
    id: log.id,
    programId,
    programName,
    blockNumber:
      asNumber(log.blockNumber) ?? deriveBlockNumber(programId, programName),
    dayId: log.dayId ?? '',
    dayNumber: Number(log.dayNumber) || 1,
    workoutName: log.workoutName ?? '',
    startedAt: log.startedAt ?? log.completedAt ?? new Date().toISOString(),
    completedAt: log.completedAt ?? log.startedAt ?? new Date().toISOString(),
    performedOn:
      typeof log.performedOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(log.performedOn)
        ? log.performedOn
        : undefined,
    estimatedCalories: asNumber(log.estimatedCalories),
    exercises,
  }
}

export function sortWorkoutLogs(logs: WorkoutLog[]) {
  return [...logs].sort((a, b) => a.completedAt.localeCompare(b.completedAt))
}

/** Union by id: keep every local-only log, prefer remote for shared ids. */
export function mergeWorkoutLogs(
  local: WorkoutLog[],
  remote: WorkoutLog[],
): { merged: WorkoutLog[]; localOnly: WorkoutLog[] } {
  const remoteNorm = remote.map(normalizeWorkoutLog)
  const localNorm = local.map(normalizeWorkoutLog)
  const remoteIds = new Set(remoteNorm.map((e) => e.id))
  const localOnly = localNorm.filter((e) => !remoteIds.has(e.id))
  return {
    merged: sortWorkoutLogs([...remoteNorm, ...localOnly]),
    localOnly,
  }
}

type WorkoutLogRow = {
  id: string
  device_id: string
  owner_id?: string
  program_id: string
  program_name: string
  block_number: number | null
  day_id: string
  day_number: number
  workout_name: string
  started_at: string
  completed_at: string
  exercises: LoggedExercise[]
  performed_on?: string | null
  estimated_calories?: number | null
}

function toRow(log: WorkoutLog, deviceId: string, withExtras = true) {
  const normalized = normalizeWorkoutLog(log)
  const base = {
    id: normalized.id,
    device_id: deviceId,
    owner_id: SHARED_OWNER_ID,
    program_id: normalized.programId,
    program_name: normalized.programName,
    block_number: normalized.blockNumber ?? null,
    day_id: normalized.dayId,
    day_number: normalized.dayNumber,
    workout_name: normalized.workoutName,
    started_at: normalized.startedAt,
    completed_at: normalized.completedAt,
    exercises: normalized.exercises,
  }
  if (!withExtras) {
    return {
      id: base.id,
      device_id: base.device_id,
      program_id: base.program_id,
      program_name: base.program_name,
      block_number: base.block_number,
      day_id: base.day_id,
      day_number: base.day_number,
      workout_name: base.workout_name,
      started_at: base.started_at,
      completed_at: base.completed_at,
      exercises: base.exercises,
    }
  }
  return {
    ...base,
    performed_on: normalized.performedOn ?? null,
    estimated_calories: normalized.estimatedCalories ?? null,
  }
}

function fromRow(row: WorkoutLogRow): WorkoutLog {
  return normalizeWorkoutLog({
    id: row.id,
    programId: row.program_id,
    programName: row.program_name,
    blockNumber: row.block_number,
    dayId: row.day_id,
    dayNumber: row.day_number,
    workoutName: row.workout_name,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    performedOn: row.performed_on ?? undefined,
    estimatedCalories: row.estimated_calories,
    exercises: row.exercises,
  })
}

async function fetchWorkoutLogPage(from: number, ownerOnly: boolean) {
  if (!supabase) return { data: null, error: true }
  let query = supabase
    .from('workout_logs')
    .select('*')
    .order('completed_at', { ascending: true })
    .range(from, from + PAGE_SIZE - 1)
  if (ownerOnly) query = query.eq('owner_id', SHARED_OWNER_ID)
  return query
}

/** Returns null when Supabase or the workout_logs table is unavailable. */
export async function pullWorkoutLogs(): Promise<WorkoutLog[] | null> {
  if (!isSupabaseConfigured || !supabase) return null
  const all: WorkoutLog[] = []
  let from = 0
  let ownerOnly = false

  while (true) {
    const { data, error } = await fetchWorkoutLogPage(from, ownerOnly)
    if (error || !data) {
      if (from === 0 && !ownerOnly) {
        ownerOnly = true
        continue
      }
      return from === 0 ? null : all
    }
    all.push(...(data as WorkoutLogRow[]).map(fromRow))
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return all
}

export async function pushWorkoutLogs(logs: WorkoutLog[]): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || logs.length === 0) return false
  const deviceId = getDeviceId()
  const { error } = await supabase
    .from('workout_logs')
    .upsert(
      logs.map((log) => toRow(log, deviceId, true)),
      { onConflict: 'id' },
    )
  if (!error) return true
  const retry = await supabase
    .from('workout_logs')
    .upsert(
      logs.map((log) => toRow(log, deviceId, false)),
      { onConflict: 'id' },
    )
  return !retry.error
}

export async function deleteRemoteWorkoutLog(id: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false
  const { error } = await supabase.from('workout_logs').delete().eq('id', id)
  return !error
}
