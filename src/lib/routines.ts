import { getDeviceId } from './appStateSync'
import { isSupabaseConfigured, supabase } from './supabase'
import {
  isRoutineTime,
  isRoutineTimeframe,
  localDateKey,
  parseLocalDateKey,
  type Routine,
  type RoutineTimeframe,
  WEEKDAY_SHORT,
} from './types'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const ROUTINE_DURATION_PRESETS = [21, 30, 60, 90] as const

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

function asDateKey(value: unknown, fallback: string): string {
  if (typeof value === 'string' && DATE_RE.test(value.slice(0, 10))) {
    return value.slice(0, 10)
  }
  return fallback
}

export function addCalendarDays(dateKey: string, days: number): string {
  const date = parseLocalDateKey(dateKey)
  date.setDate(date.getDate() + days)
  return localDateKey(date)
}

/** Inclusive day count between two YYYY-MM-DD keys. */
export function calendarDaysInclusive(from: string, to: string): number {
  const start = parseLocalDateKey(from).getTime()
  const end = parseLocalDateKey(to).getTime()
  return Math.floor((end - start) / 86_400_000) + 1
}

export function endsOnFromDuration(startsOn: string, durationDays: number): string {
  return addCalendarDays(startsOn, Math.max(1, durationDays) - 1)
}

export function durationFromRange(startsOn: string, endsOn: string): number {
  return Math.max(1, calendarDaysInclusive(startsOn, endsOn))
}

export function resolveRoutineTimeframe(input: {
  timeframe?: unknown
  startsOn?: unknown
  endsOn?: unknown
  durationDays?: unknown
  createdAt?: unknown
}): Pick<Routine, 'timeframe' | 'startsOn' | 'endsOn' | 'durationDays'> {
  const createdFallback =
    typeof input.createdAt === 'string' && input.createdAt
      ? asDateKey(input.createdAt, localDateKey())
      : localDateKey()
  const startsOn = asDateKey(input.startsOn, createdFallback)
  const timeframe: RoutineTimeframe = isRoutineTimeframe(input.timeframe)
    ? input.timeframe
    : 'forever'

  if (timeframe !== 'period') {
    return {
      timeframe: 'forever',
      startsOn,
      endsOn: null,
      durationDays: null,
    }
  }

  const rawDuration = Math.round(Number(input.durationDays))
  const endsOnRaw =
    typeof input.endsOn === 'string' && DATE_RE.test(input.endsOn.slice(0, 10))
      ? input.endsOn.slice(0, 10)
      : null

  let durationDays =
    Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : null
  let endsOn = endsOnRaw

  if (durationDays && !endsOn) {
    endsOn = endsOnFromDuration(startsOn, durationDays)
  } else if (endsOn && !durationDays) {
    durationDays = durationFromRange(startsOn, endsOn)
  } else if (!durationDays && !endsOn) {
    durationDays = 30
    endsOn = endsOnFromDuration(startsOn, durationDays)
  } else if (durationDays && endsOn && endsOn < startsOn) {
    endsOn = endsOnFromDuration(startsOn, durationDays)
  }

  const safeDuration = durationDays ?? durationFromRange(startsOn, endsOn ?? startsOn)
  const safeEnd = endsOn ?? endsOnFromDuration(startsOn, safeDuration)
  return {
    timeframe: 'period',
    startsOn,
    endsOn: safeEnd < startsOn ? startsOn : safeEnd,
    durationDays: Math.max(1, safeDuration),
  }
}

export type RoutinePeriodStatus =
  | { kind: 'forever' }
  | {
      kind: 'upcoming'
      startsOn: string
      endsOn: string
      durationDays: number
    }
  | {
      kind: 'active'
      dayNumber: number
      durationDays: number
      remainingDays: number
      endsOn: string
    }
  | {
      kind: 'completed'
      durationDays: number
      endsOn: string
    }

export function routinePeriodStatus(
  routine: Routine,
  today = localDateKey(),
): RoutinePeriodStatus {
  if (routine.timeframe !== 'period') return { kind: 'forever' }
  const resolved = resolveRoutineTimeframe(routine)
  const startsOn = resolved.startsOn
  const endsOn = resolved.endsOn ?? endsOnFromDuration(startsOn, resolved.durationDays ?? 30)
  const durationDays = resolved.durationDays ?? durationFromRange(startsOn, endsOn)

  if (today < startsOn) {
    return { kind: 'upcoming', startsOn, endsOn, durationDays }
  }
  if (today > endsOn) {
    return { kind: 'completed', durationDays, endsOn }
  }
  const dayNumber = Math.min(durationDays, Math.max(1, calendarDaysInclusive(startsOn, today)))
  return {
    kind: 'active',
    dayNumber,
    durationDays,
    remainingDays: Math.max(0, durationDays - dayNumber),
    endsOn,
  }
}

export function extendRoutinePeriod(routine: Routine, extraDays?: number) {
  const today = localDateKey()
  const current = resolveRoutineTimeframe({
    ...routine,
    timeframe: 'period',
  })
  const extra = Math.max(
    1,
    extraDays ?? current.durationDays ?? 30,
  )
  const currentEnd = current.endsOn ?? today
  const from = currentEnd >= today ? currentEnd : today
  const endsOn = addCalendarDays(from, extra)
  const startsOn = current.startsOn
  return {
    timeframe: 'period' as const,
    startsOn,
    endsOn,
    durationDays: durationFromRange(startsOn, endsOn),
    archivedAt: null as string | null,
  }
}

export function normalizeRoutine(
  raw: Partial<Routine> | null | undefined,
): Routine | null {
  if (!raw || typeof raw.id !== 'string' || !raw.id) return null
  const title = raw.title?.trim()
  if (!title) return null
  const weekly = Math.round(Number(raw.weeklyTargetDays))
  const minutes = Math.round(Number(raw.targetMinutes))
  const timeframe = resolveRoutineTimeframe(raw)
  const archivedAt =
    typeof raw.archivedAt === 'string' && raw.archivedAt.trim()
      ? raw.archivedAt
      : null
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
    ...timeframe,
    archivedAt,
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
  timeframe?: string | null
  starts_on?: string | null
  ends_on?: string | null
  duration_days?: number | null
  archived_at?: string | null
}

type RoutineRowLegacy = Omit<
  RoutineRow,
  'timeframe' | 'starts_on' | 'ends_on' | 'duration_days' | 'archived_at'
>

function toRow(routine: Routine, deviceId: string, withTimeframe = true): RoutineRow | RoutineRowLegacy {
  const normalized = normalizeRoutine(routine)
  const row = normalized ?? routine
  const base: RoutineRowLegacy = {
    id: row.id,
    device_id: deviceId,
    title: row.title,
    target_minutes: row.targetMinutes,
    weekly_target_days: row.weeklyTargetDays,
    time_of_day: row.timeOfDay,
    completed_dates: row.completedDates,
    created_at: row.createdAt,
  }
  if (!withTimeframe) return base
  return {
    ...base,
    timeframe: row.timeframe,
    starts_on: row.startsOn,
    ends_on: row.endsOn,
    duration_days: row.durationDays,
    archived_at: row.archivedAt,
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
    timeframe: row.timeframe as Routine['timeframe'],
    startsOn: row.starts_on ?? undefined,
    endsOn: row.ends_on ?? null,
    durationDays: row.duration_days ?? null,
    archivedAt: row.archived_at ?? null,
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
  const fullRows = routines.map((r) => toRow(r, deviceId, true))
  const { error } = await supabase
    .from('routines')
    .upsert(fullRows, { onConflict: 'id' })
  if (!error) return true
  const legacyRows = routines.map((r) => toRow(r, deviceId, false))
  const retry = await supabase
    .from('routines')
    .upsert(legacyRows, { onConflict: 'id' })
  return !retry.error
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
