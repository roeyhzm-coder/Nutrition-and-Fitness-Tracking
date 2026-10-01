import {
  localDateKey,
  parseLocalDateKey,
  uid,
  type FocusTrack,
  type FocusTrackTimeframe,
} from './types'
import { calendarDaysInclusive, uniqueSortedDates } from './routines'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const SEED_ID = 'focus-splits-flexibility'

export const FOCUS_DURATION_MONTH_PRESETS = [1, 3, 6, 12] as const

export function addCalendarMonths(dateKey: string, months: number): string {
  const date = parseLocalDateKey(dateKey)
  const day = date.getDate()
  date.setMonth(date.getMonth() + months)
  if (date.getDate() !== day) date.setDate(0)
  return localDateKey(date)
}

export function createDefaultSplitsTrack(today = localDateKey()): FocusTrack {
  const startsOn = today
  const endsOn = addCalendarMonths(startsOn, 6)
  return {
    id: SEED_ID,
    name: 'שפגאט וגמישות',
    weeklyTargetDays: 5,
    estimatedCalories: 150,
    timeframe: 'period',
    durationMonths: 6,
    startsOn,
    endsOn,
    completedDates: [],
    archivedAt: null,
    createdAt: new Date().toISOString(),
  }
}

export const DEFAULT_FOCUS_TRACKS: FocusTrack[] = [createDefaultSplitsTrack()]

function asDateKey(value: unknown, fallback: string): string {
  if (typeof value === 'string' && DATE_RE.test(value.slice(0, 10))) {
    return value.slice(0, 10)
  }
  return fallback
}

export function resolveFocusTimeframe(input: {
  timeframe?: unknown
  startsOn?: unknown
  endsOn?: unknown
  durationMonths?: unknown
  createdAt?: unknown
}): Pick<FocusTrack, 'timeframe' | 'startsOn' | 'endsOn' | 'durationMonths'> {
  const createdFallback =
    typeof input.createdAt === 'string' && input.createdAt
      ? asDateKey(input.createdAt, localDateKey())
      : localDateKey()
  const startsOn = asDateKey(input.startsOn, createdFallback)
  const timeframe: FocusTrackTimeframe =
    input.timeframe === 'period' ? 'period' : 'forever'

  if (timeframe !== 'period') {
    return { timeframe: 'forever', startsOn, endsOn: null, durationMonths: null }
  }

  const rawMonths = Math.round(Number(input.durationMonths))
  const durationMonths =
    Number.isFinite(rawMonths) && rawMonths > 0 ? rawMonths : 6
  const endsOnRaw =
    typeof input.endsOn === 'string' && DATE_RE.test(input.endsOn.slice(0, 10))
      ? input.endsOn.slice(0, 10)
      : null
  const endsOn = endsOnRaw ?? addCalendarMonths(startsOn, durationMonths)
  return {
    timeframe: 'period',
    startsOn,
    endsOn: endsOn < startsOn ? startsOn : endsOn,
    durationMonths,
  }
}

export function normalizeFocusTrack(
  raw: Partial<FocusTrack> | null | undefined,
): FocusTrack | null {
  if (!raw || typeof raw.id !== 'string' || !raw.id) return null
  const name = raw.name?.trim()
  if (!name) return null
  const weekly = Math.round(Number(raw.weeklyTargetDays))
  const calories = Math.round(Number(raw.estimatedCalories))
  const timeframe = resolveFocusTimeframe(raw)
  return {
    id: raw.id,
    name,
    weeklyTargetDays:
      Number.isFinite(weekly) && weekly >= 1 ? Math.min(7, weekly) : 5,
    estimatedCalories:
      Number.isFinite(calories) && calories > 0 ? calories : 0,
    completedDates: uniqueSortedDates(
      Array.isArray(raw.completedDates) ? raw.completedDates : [],
    ),
    createdAt: raw.createdAt || new Date().toISOString(),
    archivedAt:
      typeof raw.archivedAt === 'string' && raw.archivedAt.trim()
        ? raw.archivedAt
        : null,
    ...timeframe,
  }
}

export function sortFocusTracks(tracks: FocusTrack[]) {
  return [...tracks].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function mergeDefaultFocusTracks(existing: FocusTrack[]): FocusTrack[] {
  const normalized = existing
    .map(normalizeFocusTrack)
    .filter((row): row is FocusTrack => Boolean(row))
  const byId = new Map(normalized.map((row) => [row.id, row]))
  if (!byId.has(SEED_ID)) byId.set(SEED_ID, createDefaultSplitsTrack())
  return sortFocusTracks([...byId.values()])
}

export function mergeFocusTracks(local: FocusTrack[], remote: FocusTrack[]) {
  const remoteNorm = remote
    .map(normalizeFocusTrack)
    .filter((row): row is FocusTrack => Boolean(row))
  const localNorm = local
    .map(normalizeFocusTrack)
    .filter((row): row is FocusTrack => Boolean(row))
  const byId = new Map(remoteNorm.map((row) => [row.id, row]))
  for (const row of localNorm) {
    const existing = byId.get(row.id)
    if (!existing) {
      byId.set(row.id, row)
      continue
    }
    byId.set(row.id, {
      ...row,
      completedDates: uniqueSortedDates([
        ...existing.completedDates,
        ...row.completedDates,
      ]),
    })
  }
  return sortFocusTracks(mergeDefaultFocusTracks([...byId.values()]))
}

export function newFocusTrack(
  input: Omit<FocusTrack, 'id' | 'createdAt' | 'completedDates' | 'archivedAt'> & {
    archivedAt?: string | null
  },
): FocusTrack {
  const created: FocusTrack = {
    ...input,
    id: uid(),
    completedDates: [],
    archivedAt: input.archivedAt ?? null,
    createdAt: new Date().toISOString(),
  }
  return normalizeFocusTrack(created) ?? created
}

export type FocusTrackPeriodStatus =
  | { kind: 'forever' }
  | { kind: 'active'; months: number; endsOn: string; remainingDays: number }
  | { kind: 'completed'; months: number; endsOn: string }

export function focusTrackPeriodStatus(
  track: FocusTrack,
  today = localDateKey(),
): FocusTrackPeriodStatus {
  if (track.timeframe !== 'period' || !track.endsOn) return { kind: 'forever' }
  if (today > track.endsOn) {
    return {
      kind: 'completed',
      months: track.durationMonths ?? 0,
      endsOn: track.endsOn,
    }
  }
  return {
    kind: 'active',
    months: track.durationMonths ?? 0,
    endsOn: track.endsOn,
    remainingDays: Math.max(0, calendarDaysInclusive(today, track.endsOn) - 1),
  }
}
