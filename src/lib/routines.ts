import { getDeviceId } from './appStateSync'
import { isSupabaseConfigured, supabase } from './supabase'
import {
  isRoutineTime,
  localDateKey,
  type Routine,
  WEEKDAY_SHORT,
} from './types'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function sundayOfWeek(d = new Date()) {
  const start = new Date(d)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - start.getDay())
  return start
}

/** Sunday–Saturday date keys for the week containing `d`. */
export function currentWeekDates(d = new Date()): string[] {
  const start = sundayOfWeek(d)
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start)
    day.setDate(start.getDate() + i)
    return localDateKey(day)
  })
}

export function weekDayCells(d = new Date()) {
  return currentWeekDates(d).map((date, i) => ({
    date,
    label: WEEKDAY_SHORT[i],
  }))
}

export function uniqueSortedDates(dates: string[]) {
  return [...new Set(dates.filter((day) => DATE_RE.test(day)))].sort()
}

export function toggleCompletedDate(dates: string[], date: string) {
  const set = new Set(uniqueSortedDates(dates))
  if (set.has(date)) set.delete(date)
  else if (DATE_RE.test(date)) set.add(date)
  return [...set].sort()
}

export function completedInWeek(routine: Routine, weekDates: string[]) {
  const done = new Set(routine.completedDates)
  return weekDates.filter((day) => done.has(day)).length
}

export function normalizeRoutine(
  raw: Partial<Routine> | null | undefined,
): Routine | null {
  if (!raw || typeof raw.id !== 'string' || !raw.id) return null
  const title = raw.title?.trim()
  if (!title) return null
  const weekly = Math.round(Number(raw.weeklyTargetDays))
  const minutes = Math.round(Number(raw.targetMinutes))
  return {
    id: raw.id,
    title,
    targetMinutes: Number.isFinite(minutes) && minutes > 0 ? minutes : 30,
    weeklyTargetDays:
      Number.isFinite(weekly) && weekly >= 1 ? Math.min(7, weekly) : 4,
    timeOfDay: isRoutineTime(raw.timeOfDay) ? raw.timeOfDay : 'anytime',
    completedDates: uniqueSortedDates(
      Array.isArray(raw.completedDates) ? raw.completedDates : [],
    ),
    createdAt: raw.createdAt || new Date().toISOString(),
  }
}

export function sortRoutines(routines: Routine[]) {
  return [...routines].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/** Union by id: keep local-only rows, union completed dates, keep local metadata. */
export function mergeRoutines(local: Routine[], remote: Routine[]) {
  const remoteNorm = remote
    .map(normalizeRoutine)
    .filter((r): r is Routine => Boolean(r))
  const localNorm = local
    .map(normalizeRoutine)
    .filter((r): r is Routine => Boolean(r))
  const remoteById = new Map(remoteNorm.map((r) => [r.id, r]))
  const byId = new Map(remoteById)
  const localOnly: Routine[] = []
  const dateUpdates: Routine[] = []

  for (const row of localNorm) {
    const existing = byId.get(row.id)
    if (!existing) {
      byId.set(row.id, row)
      localOnly.push(row)
      continue
    }
    const completedDates = uniqueSortedDates([
      ...existing.completedDates,
      ...row.completedDates,
    ])
    const merged: Routine = { ...row, completedDates }
    byId.set(row.id, merged)
    if (completedDates.length > existing.completedDates.length) {
      dateUpdates.push(merged)
    }
  }

  return {
    merged: sortRoutines([...byId.values()]),
    toPush: [...localOnly, ...dateUpdates],
  }
}

type RoutineRow = {
  id: string
  device_id: string
  title: string
  target_minutes: number
  weekly_target_days: number
  time_of_day: string
  completed_dates: string[]
  created_at: string
}

function toRow(routine: Routine, deviceId: string): RoutineRow {
  const normalized = normalizeRoutine(routine)
  const row = normalized ?? routine
  return {
    id: row.id,
    device_id: deviceId,
    title: row.title,
    target_minutes: row.targetMinutes,
    weekly_target_days: row.weeklyTargetDays,
    time_of_day: row.timeOfDay,
    completed_dates: row.completedDates,
    created_at: row.createdAt,
  }
}

function fromRow(row: RoutineRow): Routine | null {
  return normalizeRoutine({
    id: row.id,
    title: row.title,
    targetMinutes: row.target_minutes,
    weeklyTargetDays: row.weekly_target_days,
    timeOfDay: row.time_of_day as Routine['timeOfDay'],
    completedDates: row.completed_dates,
    createdAt: row.created_at,
  })
}

export async function pullRoutines(): Promise<Routine[] | null> {
  if (!isSupabaseConfigured || !supabase) return null
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .eq('device_id', getDeviceId())
  if (error || !data) return null
  return (data as RoutineRow[])
    .map(fromRow)
    .filter((r): r is Routine => Boolean(r))
}

export async function pushRoutines(routines: Routine[]): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || routines.length === 0) return false
  const deviceId = getDeviceId()
  const { error } = await supabase
    .from('routines')
    .upsert(
      routines.map((r) => toRow(r, deviceId)),
      { onConflict: 'id' },
    )
  return !error
}

export async function deleteRemoteRoutine(id: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false
  const { error } = await supabase
    .from('routines')
    .delete()
    .eq('id', id)
    .eq('device_id', getDeviceId())
  return !error
}
