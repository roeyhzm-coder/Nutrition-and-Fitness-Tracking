import type { SetLog } from './types'

export type DaySlot = {
  date: string
  weekday: string
  done: boolean
  fromLog: boolean
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
}

/** Manual overrides: date (YYYY-MM-DD) → workout completed that day */
export type ConsistencyDayMarks = Record<string, boolean>

const WEEKDAY_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

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
): { done: boolean; fromLog: boolean } {
  const fromLog = logDates.has(date)
  if (Object.prototype.hasOwnProperty.call(marks, date)) {
    return { done: marks[date] === true, fromLog }
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
  },
): WeekConsistency[] {
  const target = options?.target ?? 5
  const marks = options?.dayMarks ?? {}
  const phaseStart = parseDateOnly(phaseStartDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const currentWeekIndex = Math.max(
    0,
    Math.floor((today.getTime() - phaseStart.getTime()) / 86400000 / 7),
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

    const start = new Date(phaseStart)
    start.setDate(phaseStart.getDate() + weekIndex * 7)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)

    const slots: DaySlot[] = []
    for (let d = 0; d < 7; d++) {
      const day = new Date(start)
      day.setDate(start.getDate() + d)
      const date = toKey(day)
      const { done, fromLog } = isDayDone(date, logDates, marks)
      slots.push({
        date,
        weekday: WEEKDAY_HE[day.getDay()],
        done,
        fromLog,
      })
    }

    const dates = slots.filter((s) => s.done).map((s) => s.date)

    weeks.push({
      weekKey: `${phaseStartDate}-w${weekIndex + 1}`,
      weekNumber: weekIndex + 1,
      start,
      end,
      completed: dates.length,
      target,
      dates,
      daySlots: slots,
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
    next[date] = i < n
  })
  return next
}

export function weekTone(completed: number, target = 5) {
  if (completed >= target) return 'blue' as const
  if (completed === target - 1) return 'green' as const
  return 'amber' as const
}
