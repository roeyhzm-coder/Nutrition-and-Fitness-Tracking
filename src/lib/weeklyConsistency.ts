import type { SetLog } from './types'

export type WeekConsistency = {
  weekKey: string
  weekNumber: number
  year: number
  start: Date
  end: Date
  completed: number
  target: number
  dates: string[]
}

function startOfWeek(d: Date) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function isoWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function buildWeeklyConsistency(
  setLogs: SetLog[],
  weeksBack = 8,
  target = 5,
): WeekConsistency[] {
  const today = startOfWeek(new Date())
  const weeks: WeekConsistency[] = []

  for (let i = 0; i < weeksBack; i++) {
    const start = new Date(today)
    start.setDate(today.getDate() - i * 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)

    const dates = [
      ...new Set(
        setLogs
          .filter((s) => {
            const t = new Date(s.loggedAt)
            return t >= start && t <= end
          })
          .map((s) => s.loggedAt.slice(0, 10)),
      ),
    ].sort()

    weeks.push({
      weekKey: start.toISOString().slice(0, 10),
      weekNumber: isoWeekNumber(start),
      year: start.getFullYear(),
      start,
      end,
      completed: dates.length,
      target,
      dates,
    })
  }

  return weeks
}

export function weekTone(completed: number, target = 5) {
  if (completed >= target) return 'blue' as const
  if (completed === target - 1) return 'green' as const
  return 'amber' as const
}
