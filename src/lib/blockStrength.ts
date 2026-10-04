import type { LoggedSet, WorkoutLog } from './types'

export type StrengthKind = 'loaded' | 'bodyweight' | 'hold'

export type BlockStrengthRow = {
  exerciseName: string
  firstWeightKg: number | null
  firstReps: number
  lastWeightKg: number | null
  lastReps: number
  weightDelta: number
  repsDelta: number
  e1rm: number | null
  kind: StrengthKind
}

const HOLD_RE =
  /תלייה|תליה|החזקה|plank|hold|hang|isometric|שניות|dead hang|l-sit|lsit/i

export function isHoldExercise(name: string) {
  return HOLD_RE.test(name)
}

export function isBodyweightLoad(weightKg: number | null | undefined) {
  return weightKg == null || !Number.isFinite(weightKg) || weightKg <= 0
}

/** Epley estimated 1-rep max. Bodyweight loads do not produce a kg estimate. */
export function estimated1Rm(weightKg: number, reps: number): number {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return 0
  if (!Number.isFinite(reps) || reps <= 0) return 0
  if (reps === 1) return weightKg
  return weightKg * (1 + reps / 30)
}

function setScore(set: LoggedSet): number {
  const weight = set.weightKg
  const reps = set.reps ?? 0
  if (isBodyweightLoad(weight)) return reps
  return estimated1Rm(weight ?? 0, reps) || reps
}

export function pickBestSet(
  sets: LoggedSet[],
): { weightKg: number | null; reps: number } | null {
  const usable = sets.filter(
    (s) => s.done !== false && s.reps != null && s.reps > 0,
  )
  if (!usable.length) return null
  const best = usable.reduce((a, b) => (setScore(b) > setScore(a) ? b : a))
  return {
    weightKg: isBodyweightLoad(best.weightKg) ? 0 : (best.weightKg ?? 0),
    reps: best.reps ?? 0,
  }
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

export function logsForActiveBlock(
  logs: WorkoutLog[],
  activeProgramId: string,
  activeProgramName: string,
): WorkoutLog[] {
  if (!activeProgramId && !activeProgramName.trim()) return logs
  return logs.filter((log) =>
    belongsToActiveBlock(log, activeProgramId, activeProgramName),
  )
}

function strengthKind(
  name: string,
  firstWeightKg: number | null,
  lastWeightKg: number | null,
): StrengthKind {
  const firstBw = isBodyweightLoad(firstWeightKg)
  const lastBw = isBodyweightLoad(lastWeightKg)
  if (firstBw && lastBw && isHoldExercise(name)) return 'hold'
  if (firstBw && lastBw) return 'bodyweight'
  return 'loaded'
}

export function buildBlockStrengthRows(
  logs: WorkoutLog[],
  activeProgramId: string,
  activeProgramName = '',
): BlockStrengthRow[] {
  const scoped =
    activeProgramId || activeProgramName.trim()
      ? logs.filter((log) =>
          belongsToActiveBlock(log, activeProgramId, activeProgramName),
        )
      : logs
  const blockLogs = [...scoped].sort((a, b) =>
    a.completedAt.localeCompare(b.completedAt),
  )

  return rowsFromLogs(blockLogs)
}

export function buildStrengthRowsFromLogs(logs: WorkoutLog[]): BlockStrengthRow[] {
  return rowsFromLogs(
    [...logs].sort((a, b) => a.completedAt.localeCompare(b.completedAt)),
  )
}

function rowsFromLogs(blockLogs: WorkoutLog[]): BlockStrengthRow[] {
  type Acc = {
    first: { weightKg: number | null; reps: number }
    last: { weightKg: number | null; reps: number }
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
    .map(([exerciseName, { first, last }]) => {
      const kind = strengthKind(exerciseName, first.weightKg, last.weightKg)
      const firstW = first.weightKg
      const lastW = last.weightKg
      return {
        exerciseName,
        firstWeightKg: firstW,
        firstReps: first.reps,
        lastWeightKg: lastW,
        lastReps: last.reps,
        weightDelta: (lastW ?? 0) - (firstW ?? 0),
        repsDelta: last.reps - first.reps,
        e1rm:
          kind === 'loaded' && !isBodyweightLoad(lastW)
            ? estimated1Rm(lastW ?? 0, last.reps)
            : null,
        kind,
      }
    })
    .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName, 'he'))
}

function fmtKg(value: number) {
  if (!Number.isFinite(value)) return '0'
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function fmtSignedQty(value: number, unit: string) {
  const rounded = Math.round(value * 10) / 10
  const body = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  const sign = rounded > 0 ? '+' : ''
  return `${sign}${body} ${unit}`
}

function formatReps(reps: number, kind: StrengthKind) {
  return kind === 'hold' ? `${reps}ש׳` : String(reps)
}

function formatLoadCell(
  weightKg: number | null,
  reps: number,
  kind: StrengthKind,
) {
  const load =
    kind !== 'loaded' || isBodyweightLoad(weightKg)
      ? 'משקל גוף (BW)'
      : fmtKg(weightKg ?? 0)
  return `${load} × ${formatReps(reps, kind)}`
}

export function formatStrengthDelta(row: BlockStrengthRow): string | null {
  if (row.kind === 'hold') {
    if (row.repsDelta === 0) return null
    return `${row.exerciseName} (${fmtSignedQty(row.repsDelta, 'שניות')})`
  }
  if (row.kind === 'bodyweight') {
    if (row.repsDelta === 0) return null
    return `${row.exerciseName} (${fmtSignedQty(row.repsDelta, 'חזרות')})`
  }
  const parts: string[] = []
  if (row.weightDelta) parts.push(fmtSignedQty(row.weightDelta, 'ק״ג'))
  if (row.repsDelta) parts.push(fmtSignedQty(row.repsDelta, 'חזרות'))
  if (!parts.length) return null
  return `${row.exerciseName} (${parts.join('/')})`
}

function formatTableDelta(row: BlockStrengthRow) {
  if (row.kind === 'hold') return fmtSignedQty(row.repsDelta, 'שניות')
  if (row.kind === 'bodyweight') return fmtSignedQty(row.repsDelta, 'חזרות')
  if (row.weightDelta) return fmtSignedQty(row.weightDelta, 'ק״ג')
  if (row.repsDelta) return fmtSignedQty(row.repsDelta, 'חזרות')
  return '0 ק״ג'
}

function formatE1rm(row: BlockStrengthRow) {
  if (row.kind !== 'loaded' || row.e1rm == null || row.e1rm <= 0) return 'BW'
  return `${fmtKg(row.e1rm)} ק״ג`
}

export function formatBlockStrengthMarkdown(
  rows: BlockStrengthRow[],
  blockLabel: string,
): string {
  if (!rows.length) return ''
  const header = `## התקדמות כוח בבלוק הנוכחי (Block Strength Delta)\n- בלוק פעיל: ${blockLabel}`
  const table = [
    '| תרגיל | ביצוע פתיחה (משקל x חזרות) | ביצוע נוכחי (משקל x חזרות) | שינוי (Delta) | 1RM משוער (e1RM) |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map(
      (row) =>
        `| ${row.exerciseName} | ${formatLoadCell(row.firstWeightKg, row.firstReps, row.kind)} | ${formatLoadCell(row.lastWeightKg, row.lastReps, row.kind)} | ${formatTableDelta(row)} | ${formatE1rm(row)} |`,
    ),
  ]
  return `${header}\n\n${table.join('\n')}`
}
