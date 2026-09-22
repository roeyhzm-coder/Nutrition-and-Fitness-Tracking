import type { SetLog } from './types'

export type WeekConsistency = {
  weekKey: string
  weekNumber: number
  start: Date
  end: Date
  completed: number
  target: number
  dates: string[]
}

function parseDateOnly(iso: string) {
  const d = new Date(iso)
  d.setHours(0, 0, 0, 0)
  return d
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

export function buildRelativeWeeklyConsistency(
  setLogs: SetLog[],
  phaseStartDate: string,
  options?: { weeksBack?: number | 'all'; target?: number },
): WeekConsistency[] {
  const target = options?.target ?? 5
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
      weekKey: `${phaseStartDate}-w${weekIndex + 1}`,
      weekNumber: weekIndex + 1,
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
