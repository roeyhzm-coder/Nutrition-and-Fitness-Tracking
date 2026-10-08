import type {
  LoggedSet,
  SetLog,
  WorkoutDay,
  WorkoutLog,
} from './types'

export type StrengthKind = 'loaded' | 'bodyweight' | 'hold'

export type BlockStrengthRow = {
  exerciseName: string
  label: string
  sessionName: string
  firstWeightKg: number | null
  firstReps: number
  lastWeightKg: number | null
  lastReps: number
  weightDelta: number
  repsDelta: number
  e1rm: number | null
  kind: StrengthKind
  hasLogged: boolean
  prescribedWeight?: string
  prescribedReps?: string
}

type BestLoad = { weightKg: number | null; reps: number }

type StrengthAcc = {
  first: BestLoad
  last: BestLoad
}

export type ProgramExerciseSlot = {
  key: string
  label: string
  sessionName: string
  focus: string
  exerciseName: string
  prescribedWeight: string
  prescribedReps: string
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

function normalizeName(name: string) {
  return name.trim().toLocaleLowerCase('he')
}

function slotKey(sessionName: string, exerciseName: string) {
  return `${normalizeName(sessionName)}::${normalizeName(exerciseName)}`
}

export function collectProgramExerciseSlots(
  days: WorkoutDay[] | null | undefined,
): ProgramExerciseSlot[] {
  if (!days?.length) return []
  const seen = new Set<string>()
  const slots: ProgramExerciseSlot[] = []
  for (const day of days) {
    if (day.isRest) continue
    const focus = day.focus?.trim() ?? ''
    const sessions =
      (day.sessions ?? []).length > 0
        ? day.sessions ?? []
        : (day.exercises ?? []).length > 0
          ? [{ name: focus || day.title, exercises: day.exercises ?? [] }]
          : []
    for (const session of sessions) {
      const sessionName = session.name?.trim() || focus || day.title
      for (const ex of session.exercises ?? []) {
        const exerciseName = ex.name.trim()
        if (!exerciseName) continue
        const key = slotKey(sessionName, exerciseName)
        if (seen.has(key)) continue
        seen.add(key)
        slots.push({
          key,
          label: `${sessionName} · ${exerciseName}`,
          sessionName,
          focus,
          exerciseName,
          prescribedWeight: ex.weight?.trim() || 'משקל גוף',
          prescribedReps: ex.reps?.trim() || '',
        })
      }
    }
  }
  return slots
}

function sessionNamesFromDays(days: WorkoutDay[] | null | undefined) {
  return new Set(
    collectProgramExerciseSlots(days).map((slot) => normalizeName(slot.sessionName)),
  )
}

function belongsToActiveBlock(
  log: WorkoutLog,
  activeProgramId: string,
  activeProgramName: string,
  days?: WorkoutDay[] | null,
): boolean {
  if (activeProgramId && log.programId === activeProgramId) return true
  if (activeProgramName && log.programName === activeProgramName) return true
  const sessionNames = sessionNamesFromDays(days)
  if (sessionNames.size && sessionNames.has(normalizeName(log.workoutName))) {
    return true
  }
  return false
}

export function logsForActiveBlock(
  logs: WorkoutLog[],
  activeProgramId: string,
  activeProgramName: string,
  days?: WorkoutDay[] | null,
): WorkoutLog[] {
  if (!activeProgramId && !activeProgramName.trim() && !days?.length) return logs
  return logs.filter((log) =>
    belongsToActiveBlock(log, activeProgramId, activeProgramName, days),
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

function recordBest(
  map: Map<string, StrengthAcc>,
  key: string,
  best: BestLoad,
) {
  const prev = map.get(key)
  if (!prev) map.set(key, { first: best, last: best })
  else prev.last = best
}

function accFromLogs(blockLogs: WorkoutLog[]) {
  const bySlot = new Map<string, StrengthAcc>()
  const byName = new Map<string, StrengthAcc>()
  for (const log of blockLogs) {
    const sessionName = log.workoutName.trim()
    for (const ex of log.exercises) {
      const best = pickBestSet(ex.sets)
      if (!best) continue
      const name = ex.name.trim()
      if (!name) continue
      recordBest(bySlot, slotKey(sessionName, name), best)
      recordBest(byName, normalizeName(name), best)
    }
  }
  return { bySlot, byName }
}

function accFromSetLogs(
  setLogs: SetLog[] | undefined,
  days: WorkoutDay[] | null | undefined,
) {
  const bySlot = new Map<string, StrengthAcc>()
  const byName = new Map<string, StrengthAcc>()
  if (!setLogs?.length) return { bySlot, byName }

  const dayById = new Map((days ?? []).map((day) => [day.id, day]))
  const grouped = new Map<string, LoggedSet[]>()
  const meta = new Map<string, { sessionName: string; exerciseName: string; loggedAt: string }>()

  for (const log of [...setLogs].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))) {
    const exerciseName = log.exerciseName.trim()
    if (!exerciseName) continue
    const day = dayById.get(log.dayId)
    const session =
      day?.sessions?.find((s) =>
        s.exercises.some((ex) => normalizeName(ex.name) === normalizeName(exerciseName)),
      ) ?? day?.sessions?.[0]
    const sessionName = session?.name?.trim() || day?.focus?.trim() || ''
    const groupKey = `${log.loggedAt.slice(0, 10)}::${slotKey(sessionName, exerciseName)}`
    const sets = grouped.get(groupKey) ?? []
    sets.push({
      weightKg: log.weightKg,
      reps: log.reps,
      done: true,
      rpe: log.rpe,
    })
    grouped.set(groupKey, sets)
    meta.set(groupKey, { sessionName, exerciseName, loggedAt: log.loggedAt })
  }

  const ordered = [...grouped.entries()].sort((a, b) =>
    (meta.get(a[0])?.loggedAt ?? '').localeCompare(meta.get(b[0])?.loggedAt ?? ''),
  )
  for (const [groupKey, sets] of ordered) {
    const info = meta.get(groupKey)
    const best = pickBestSet(sets)
    if (!info || !best) continue
    if (info.sessionName) {
      recordBest(bySlot, slotKey(info.sessionName, info.exerciseName), best)
    }
    recordBest(byName, normalizeName(info.exerciseName), best)
  }
  return { bySlot, byName }
}

function pickAcc(
  slot: ProgramExerciseSlot,
  primary: ReturnType<typeof accFromLogs>,
  fallback: ReturnType<typeof accFromSetLogs>,
): StrengthAcc | undefined {
  const keys = [slot.key, slotKey(slot.focus, slot.exerciseName)]
  for (const key of keys) {
    const hit = primary.bySlot.get(key) ?? fallback.bySlot.get(key)
    if (hit) return hit
  }
  return undefined
}

function rowFromAcc(
  exerciseName: string,
  label: string,
  sessionName: string,
  acc: StrengthAcc,
  extra?: Partial<BlockStrengthRow>,
): BlockStrengthRow {
  const kind = strengthKind(exerciseName, acc.first.weightKg, acc.last.weightKg)
  const firstW = acc.first.weightKg
  const lastW = acc.last.weightKg
  return {
    exerciseName,
    label,
    sessionName,
    firstWeightKg: firstW,
    firstReps: acc.first.reps,
    lastWeightKg: lastW,
    lastReps: acc.last.reps,
    weightDelta: (lastW ?? 0) - (firstW ?? 0),
    repsDelta: acc.last.reps - acc.first.reps,
    e1rm:
      kind === 'loaded' && !isBodyweightLoad(lastW)
        ? estimated1Rm(lastW ?? 0, acc.last.reps)
        : null,
    kind,
    hasLogged: true,
    ...extra,
  }
}

function unloggedRow(slot: ProgramExerciseSlot): BlockStrengthRow {
  const kind = isHoldExercise(slot.exerciseName) ? 'hold' : 'bodyweight'
  return {
    exerciseName: slot.exerciseName,
    label: slot.label,
    sessionName: slot.sessionName,
    firstWeightKg: null,
    firstReps: 0,
    lastWeightKg: null,
    lastReps: 0,
    weightDelta: 0,
    repsDelta: 0,
    e1rm: null,
    kind,
    hasLogged: false,
    prescribedWeight: slot.prescribedWeight,
    prescribedReps: slot.prescribedReps,
  }
}

export function buildBlockStrengthRows(
  logs: WorkoutLog[],
  activeProgramId: string,
  activeProgramName = '',
  days?: WorkoutDay[] | null,
  setLogs?: SetLog[],
): BlockStrengthRow[] {
  const scoped = logsForActiveBlock(logs, activeProgramId, activeProgramName, days)
  const blockLogs = [...scoped].sort((a, b) =>
    a.completedAt.localeCompare(b.completedAt),
  )
  return mergeProgramAndLogRows(blockLogs, days, setLogs)
}

export function buildStrengthRowsFromLogs(logs: WorkoutLog[]): BlockStrengthRow[] {
  return mergeProgramAndLogRows(
    [...logs].sort((a, b) => a.completedAt.localeCompare(b.completedAt)),
    null,
    undefined,
  )
}

export function buildActiveBlockStrengthRows(input: {
  logs: WorkoutLog[]
  days?: WorkoutDay[] | null
  setLogs?: SetLog[]
  activeProgramId?: string
  activeProgramName?: string
}): BlockStrengthRow[] {
  return buildBlockStrengthRows(
    input.logs,
    input.activeProgramId ?? '',
    input.activeProgramName ?? '',
    input.days,
    input.setLogs,
  )
}

function mergeProgramAndLogRows(
  blockLogs: WorkoutLog[],
  days: WorkoutDay[] | null | undefined,
  setLogs: SetLog[] | undefined,
): BlockStrengthRow[] {
  const fromLogs = accFromLogs(blockLogs)
  const fromSets = accFromSetLogs(setLogs, days)
  const slots = collectProgramExerciseSlots(days)
  const used = new Set<string>()
  const rows: BlockStrengthRow[] = []

  for (const slot of slots) {
    const acc = pickAcc(slot, fromLogs, fromSets)
    if (acc) {
      used.add(slot.key)
      rows.push(
        rowFromAcc(slot.exerciseName, slot.label, slot.sessionName, acc, {
          prescribedWeight: slot.prescribedWeight,
          prescribedReps: slot.prescribedReps,
        }),
      )
    } else {
      rows.push(unloggedRow(slot))
    }
  }

  const extras = new Map<string, { name: string; session: string; acc: StrengthAcc }>()
  for (const log of blockLogs) {
    const sessionName = log.workoutName.trim()
    for (const ex of log.exercises) {
      const name = ex.name.trim()
      if (!name) continue
      const key = slotKey(sessionName, name)
      if (used.has(key)) continue
      const acc = fromLogs.bySlot.get(key) ?? fromLogs.byName.get(normalizeName(name))
      if (!acc) continue
      extras.set(key, { name, session: sessionName, acc })
    }
  }
  for (const extra of extras.values()) {
    const label = extra.session ? `${extra.session} · ${extra.name}` : extra.name
    rows.push(rowFromAcc(extra.name, label, extra.session, extra.acc))
  }

  if (rows.length) return rows
  return [...fromLogs.byName.entries()]
    .map(([name, acc]) => rowFromAcc(name, name, '', acc))
    .sort((a, b) => a.label.localeCompare(b.label, 'he'))
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
  if (!row.hasLogged) return null
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
  if (!row.hasLogged) return '—'
  if (row.kind === 'hold') return fmtSignedQty(row.repsDelta, 'שניות')
  if (row.kind === 'bodyweight') return fmtSignedQty(row.repsDelta, 'חזרות')
  if (row.weightDelta) return fmtSignedQty(row.weightDelta, 'ק״ג')
  if (row.repsDelta) return fmtSignedQty(row.repsDelta, 'חזרות')
  return '0 ק״ג'
}

function formatE1rm(row: BlockStrengthRow) {
  if (!row.hasLogged) return '—'
  if (row.kind !== 'loaded' || row.e1rm == null || row.e1rm <= 0) return 'BW'
  return `${fmtKg(row.e1rm)} ק״ג`
}

function formatOpening(row: BlockStrengthRow) {
  if (row.hasLogged) {
    return formatLoadCell(row.firstWeightKg, row.firstReps, row.kind)
  }
  const load = row.prescribedWeight?.trim() || 'משקל גוף (BW)'
  const reps = row.prescribedReps?.trim() || '—'
  return `${load} × ${reps}`
}

function formatCurrent(row: BlockStrengthRow) {
  if (!row.hasLogged) return 'אין ביצוע'
  return formatLoadCell(row.lastWeightKg, row.lastReps, row.kind)
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
        `| ${row.label || row.exerciseName} | ${formatOpening(row)} | ${formatCurrent(row)} | ${formatTableDelta(row)} | ${formatE1rm(row)} |`,
    ),
  ]
  return `${header}\n\n${table.join('\n')}`
}
