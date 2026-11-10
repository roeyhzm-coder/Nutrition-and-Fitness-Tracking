import type { SetLog } from './types'

export type ConsistencyDayAssignment = {
  done: boolean
  workoutId?: string
  workoutName?: string
}

/** Manual overrides: date (YYYY-MM-DD) → completed + optional workout type */
export type ConsistencyDayMark = boolean | ConsistencyDayAssignment

export type DaySlot = {
  date: string
  weekday: string
  done: boolean
  fromLog: boolean
  workoutId?: string
  workoutName?: string
}

export type WeekConsistency = {
  weekKey: string
  weekNumber: number
  start: Date
  end: Date
  completed: number
  target: number
  dates: string[]
  daySlots: DaySlot[]
  /** Storage key for this week's note (an existing note's key, else the week-start date). */
  noteKey: string
  /** Free-text memo for the week (e.g. why it deviated from the target). */
  note?: string
}

export type ConsistencyDayMarks = Record<string, ConsistencyDayMark>

/** A per-week memo. Empty `text` is a tombstone so deletions sync across devices. */
export type WeekNote = { text: string; updatedAt: string }

/** Week-start date (YYYY-MM-DD) → note. */
export type ConsistencyWeekNotes = Record<string, WeekNote>

export const WEEK_NOTE_MAX_LENGTH = 500

/**
 * Week notes ride inside the existing `consistency_day_marks` JSON column under
 * this reserved (non-date) key, so no schema migration or RLS change is needed.
 */
export const WEEK_NOTES_MARKS_KEY = '__weekNotes'

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/

export function parseWeekNotes(raw: unknown): ConsistencyWeekNotes {
  const out: ConsistencyWeekNotes = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!DATE_KEY_RE.test(key) || !value || typeof value !== 'object') continue
    const { text, updatedAt } = value as { text?: unknown; updatedAt?: unknown }
    if (typeof text !== 'string' || typeof updatedAt !== 'string') continue
    out[key] = { text: text.slice(0, WEEK_NOTE_MAX_LENGTH), updatedAt }
  }
  return out
}

/** Split a raw `consistency_day_marks` payload into day marks and week notes. */
export function splitConsistencyPayload(raw: unknown): {
  marks: ConsistencyDayMarks
  notes: ConsistencyWeekNotes | undefined
} {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { marks: {}, notes: undefined }
  }
  const { [WEEK_NOTES_MARKS_KEY]: rawNotes, ...marks } = raw as Record<
    string,
    unknown
  >
  return {
    marks: marks as ConsistencyDayMarks,
    notes: rawNotes === undefined ? undefined : parseWeekNotes(rawNotes),
  }
}

/** Per-key last-write-wins merge (tombstones included). */
export function mergeWeekNotes(
  local: ConsistencyWeekNotes,
  remote: ConsistencyWeekNotes,
): ConsistencyWeekNotes {
  const next: ConsistencyWeekNotes = { ...local }
  for (const [key, note] of Object.entries(remote)) {
    const mine = next[key]
    if (!mine || note.updatedAt > mine.updatedAt) next[key] = note
  }
  return next
}

export function parseDayMark(
  mark: ConsistencyDayMark | undefined,
): ConsistencyDayAssignment | undefined {
  if (mark === undefined) return undefined
  if (typeof mark === 'boolean') return { done: mark }
  if (mark && typeof mark === 'object') {
    return {
      done: mark.done === true,
      workoutId: mark.workoutId,
      workoutName: mark.workoutName,
    }
  }
  return undefined
}

/** JS `Date.getDay()`: 0 = Sunday … 6 = Saturday */
export type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6

const WEEKDAY_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

export const WEEK_START_OPTIONS: { day: WeekStartDay; short: string; label: string }[] =
  [
    { day: 0, short: 'א׳', label: 'ראשון' },
    { day: 1, short: 'ב׳', label: 'שני' },
    { day: 2, short: 'ג׳', label: 'שלישי' },
    { day: 3, short: 'ד׳', label: 'רביעי' },
    { day: 4, short: 'ה׳', label: 'חמישי' },
    { day: 5, short: 'ו׳', label: 'שישי' },
    { day: 6, short: 'ש׳', label: 'שבת' },
  ]

export const WEEK_START_STORAGE_KEY = 'tn.weekStartsOn.v1'

export function parseWeekStartDay(value: unknown): WeekStartDay {
  const n = typeof value === 'string' ? Number(value) : value
  if (n === 0 || n === 1 || n === 2 || n === 3 || n === 4 || n === 5 || n === 6) {
    return n
  }
  return 0
}

export function startOfCalendarWeek(
  date: Date,
  weekStartsOn: WeekStartDay = 0,
): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const diff = (d.getDay() - weekStartsOn + 7) % 7
  d.setDate(d.getDate() - diff)
  return d
}

function parseDateOnly(iso: string) {
  const d = new Date(iso)
  d.setHours(0, 0, 0, 0)
  return d
}

function toKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Relative week index (1-based) from phase start date */
export function relativeWeekNumber(phaseStartDate: string, date = new Date()) {
  const start = parseDateOnly(phaseStartDate)
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const diff = Math.floor((d.getTime() - start.getTime()) / 86400000)
  if (diff < 0) return 1
  return Math.floor(diff / 7) + 1
}

export function weekDates(start: Date): string[] {
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    dates.push(toKey(d))
  }
  return dates
}

function isDayDone(
  date: string,
  logDates: Set<string>,
  marks: ConsistencyDayMarks,
): {
  done: boolean
  fromLog: boolean
  workoutId?: string
  workoutName?: string
} {
  const fromLog = logDates.has(date)
  const parsed = parseDayMark(marks[date])
  if (parsed) {
    return {
      done: parsed.done,
      fromLog,
      workoutId: parsed.workoutId,
      workoutName: parsed.workoutName,
    }
  }
  return { done: fromLog, fromLog }
}

export function buildRelativeWeeklyConsistency(
  setLogs: SetLog[],
  phaseStartDate: string,
  options?: {
    weeksBack?: number | 'all'
    target?: number
    dayMarks?: ConsistencyDayMarks
    weekStartsOn?: WeekStartDay
    weekNotes?: ConsistencyWeekNotes
  },
): WeekConsistency[] {
  const target = options?.target ?? 5
  const marks = options?.dayMarks ?? {}
  const notes = options?.weekNotes ?? {}
  const weekStartsOn = parseWeekStartDay(options?.weekStartsOn ?? 0)
  const phaseStart = parseDateOnly(phaseStartDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const firstWeekStart = startOfCalendarWeek(phaseStart, weekStartsOn)
  const currentWeekStart = startOfCalendarWeek(today, weekStartsOn)
  const currentWeekIndex = Math.max(
    0,
    Math.round(
      (currentWeekStart.getTime() - firstWeekStart.getTime()) / 86400000 / 7,
    ),
  )

  const weeksBack =
    options?.weeksBack === 'all'
      ? currentWeekIndex + 1
      : Math.min(options?.weeksBack ?? 3, currentWeekIndex + 1)

  const logDates = new Set(setLogs.map((s) => s.loggedAt.slice(0, 10)))
  const weeks: WeekConsistency[] = []

  for (let i = 0; i < weeksBack; i++) {
    const weekIndex = currentWeekIndex - i
    if (weekIndex < 0) break

    const start = new Date(currentWeekStart)
    start.setDate(currentWeekStart.getDate() - i * 7)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)

    const slots: DaySlot[] = []
    for (let d = 0; d < 7; d++) {
      const day = new Date(start)
      day.setDate(start.getDate() + d)
      const date = toKey(day)
      const { done, fromLog, workoutId, workoutName } = isDayDone(
        date,
        logDates,
        marks,
      )
      slots.push({
        date,
        weekday: WEEKDAY_HE[day.getDay()],
        done,
        fromLog,
        workoutId,
        workoutName,
      })
    }

    const dates = slots.filter((s) => s.done).map((s) => s.date)

    // Notes are anchored to a date, so changing the week-start day keeps them
    // attached to the week that now contains that date.
    const startKey = toKey(start)
    const noteKey =
      (notes[startKey]?.text ? startKey : undefined) ??
      slots.map((s) => s.date).find((date) => notes[date]?.text) ??
      startKey
    const note = notes[noteKey]?.text || undefined

    weeks.push({
      weekKey: `${phaseStartDate}-w${weekIndex + 1}`,
      weekNumber: weekIndex + 1,
      start,
      end,
      completed: dates.length,
      target,
      dates,
      daySlots: slots,
      noteKey,
      note,
    })
  }

  return weeks
}

/** Set exactly `count` workout days in a week (fills from start). */
export function marksForWeekCount(
  weekStart: Date,
  count: number,
  prev: ConsistencyDayMarks,
): ConsistencyDayMarks {
  const next = { ...prev }
  const dates = weekDates(weekStart)
  const n = Math.max(0, Math.min(7, Math.round(count)))
  dates.forEach((date, i) => {
    const shouldDone = i < n
    const prevMark = parseDayMark(prev[date])
    next[date] = {
      done: shouldDone,
      workoutId: shouldDone ? prevMark?.workoutId : undefined,
      workoutName: shouldDone ? prevMark?.workoutName : undefined,
    }
  })
  return next
}

export function weekTone(completed: number, target = 5) {
  if (completed >= target) return 'blue' as const
  if (completed === target - 1) return 'green' as const
  return 'amber' as const
}
