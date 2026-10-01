import type { LoggedSet, WorkoutLog } from './types'

export type BlockStrengthRow = {
  exerciseName: string
  firstWeightKg: number
  firstReps: number
  lastWeightKg: number
  lastReps: number
  weightDelta: number
  e1rm: number
}

/** Epley estimated 1-rep max. */
export function estimated1Rm(weightKg: number, reps: number): number {
  if (!Number.isFinite(weightKg) || !Number.isFinite(reps) || reps <= 0) return 0
  if (reps === 1) return weightKg
  return weightKg * (1 + reps / 30)
}

function setScore(set: LoggedSet): number {
  const weight = set.weightKg ?? 0
  const reps = set.reps ?? 0
  return estimated1Rm(weight, reps) || reps
}

export function pickBestSet(
  sets: LoggedSet[],
): { weightKg: number; reps: number } | null {
  const usable = sets.filter(
    (s) => s.done !== false && s.reps != null && s.reps > 0 && s.weightKg != null,
  )
  if (!usable.length) return null
  const best = usable.reduce((a, b) => (setScore(b) > setScore(a) ? b : a))
  return { weightKg: best.weightKg ?? 0, reps: best.reps ?? 0 }
}

function belongsToActiveBlock(
  log: WorkoutLog,
  activeProgramId: string,
  activeProgramName: string,
): boolean {
  if (activeProgramId && log.programId === activeProgramId) return true
  if (activeProgramName && log.programName === activeProgramName) return true
  return false
}

export function buildBlockStrengthRows(
  logs: WorkoutLog[],
  activeProgramId: string,
  activeProgramName = '',
): BlockStrengthRow[] {
  const blockLogs = [...logs]
    .filter((log) => belongsToActiveBlock(log, activeProgramId, activeProgramName))
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt))

  type Acc = {
    first: { weightKg: number; reps: number }
    last: { weightKg: number; reps: number }
  }
  const byName = new Map<string, Acc>()

  for (const log of blockLogs) {
    for (const ex of log.exercises) {
      const best = pickBestSet(ex.sets)
      if (!best) continue
      const name = ex.name.trim()
      if (!name) continue
      const prev = byName.get(name)
      if (!prev) {
        byName.set(name, { first: best, last: best })
      } else {
        prev.last = best
      }
    }
  }

  return [...byName.entries()]
    .map(([exerciseName, { first, last }]) => ({
      exerciseName,
      firstWeightKg: first.weightKg,
      firstReps: first.reps,
      lastWeightKg: last.weightKg,
      lastReps: last.reps,
      weightDelta: last.weightKg - first.weightKg,
      e1rm: estimated1Rm(last.weightKg, last.reps),
    }))
    .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName, 'he'))
}

function fmtKg(value: number) {
  if (!Number.isFinite(value)) return '0'
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function fmtDelta(value: number) {
  const body = `${fmtKg(value)} ק״ג`
  if (value > 0) return `+${body}`
  return body
}

export function formatBlockStrengthMarkdown(
  rows: BlockStrengthRow[],
  blockLabel: string,
): string {
  const header = `## התקדמות כוח בבלוק הנוכחי (Block Strength Delta)\n- בלוק פעיל: ${blockLabel}`
  if (!rows.length) {
    return `${header}\n- אין עדיין אימונים מתועדים עבור הבלוק הפעיל`
  }
  const table = [
    '| תרגיל | ביצוע פתיחה (משקל x חזרות) | ביצוע נוכחי (משקל x חזרות) | שינוי משקל (Delta) | 1RM משוער (e1RM) |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map(
      (row) =>
        `| ${row.exerciseName} | ${fmtKg(row.firstWeightKg)} × ${row.firstReps} | ${fmtKg(row.lastWeightKg)} × ${row.lastReps} | ${fmtDelta(row.weightDelta)} | ${fmtKg(row.e1rm)} ק״ג |`,
    ),
  ]
  return `${header}\n\n${table.join('\n')}`
}
