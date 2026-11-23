/**
 * Block cycle: timeline (start / end / days left), end-of-block strength
 * benchmark (start-of-block baseline vs in-block peak, optionally overridden
 * by a fresh test), next-block load calibration and the AI export section.
 *
 * Block settings live on the skill tree state (blockLabel / blockTitle /
 * blockStartDate / blockWeeks / deloadWeeks) — the single source of truth for
 * the Workouts block card, the dashboard pill and the Skill Tree header.
 */

import { collectProgramExerciseSlots, estimated1Rm, isHoldExercise } from './blockStrength'
import type { BenchmarkKind, BenchmarkLoad, BenchmarkRow, BlockReport } from './blockReport'
import { liveBlockReports } from './blockReport'
import type { SkillTreeState } from './skillTree'
import { localDateKey, parseLocalDateKey } from './types'
import type { Exercise, ExerciseDefaultSet, SetLog, WorkoutDay, WorkoutLog } from './types'

const DAY_MS = 86_400_000

function addDays(dateKey: string, days: number): string {
  const d = parseLocalDateKey(dateKey)
  d.setDate(d.getDate() + days)
  return localDateKey(d)
}

function diffDays(from: string, to: string): number {
  return Math.round((parseLocalDateKey(to).getTime() - parseLocalDateKey(from).getTime()) / DAY_MS)
}

/** Last day of the block (start + weeks × 7 − 1). */
export function blockEndDate(startDate: string, weeks: number): string {
  return addDays(startDate, Math.max(1, weeks) * 7 - 1)
}

/** Whole weeks that cover start → end (inclusive), for an end date typed by hand. */
export function weeksBetween(startDate: string, endDate: string): number {
  return Math.max(1, Math.ceil((diffDays(startDate, endDate) + 1) / 7))
}

export type BlockTimeline = {
  label: string
  title: string
  name: string
  startDate: string
  endDate: string
  weeks: number
  /** 1-based, clamped to 1…weeks. */
  week: number
  started: boolean
  /** Days until the block's last day (0 = today is the last day, < 0 = over). */
  daysLeft: number
  /** Time to run the benchmarks and build the next block. */
  due: boolean
  isDeload: boolean
  isBenchmark: boolean
  progress: number
}

export function blockTimeline(state: SkillTreeState, today = localDateKey()): BlockTimeline {
  const endDate = blockEndDate(state.blockStartDate, state.blockWeeks)
  const elapsed = diffDays(state.blockStartDate, today)
  const rawWeek = Math.floor(elapsed / 7) + 1
  const week = Math.min(state.blockWeeks, Math.max(1, rawWeek))
  const daysLeft = diffDays(today, endDate)
  const total = state.blockWeeks * 7
  return {
    label: state.blockLabel,
    title: state.blockTitle,
    name: state.blockTitle ? `${state.blockLabel} • ${state.blockTitle}` : state.blockLabel,
    startDate: state.blockStartDate,
    endDate,
    weeks: state.blockWeeks,
    week,
    started: elapsed >= 0,
    daysLeft,
    due: daysLeft <= 0,
    isDeload: elapsed >= 0 && state.deloadWeeks.includes(rawWeek),
    isBenchmark: elapsed >= 0 && rawWeek === state.benchmarkWeek,
    progress: Math.max(0, Math.min(1, (elapsed + 1) / Math.max(1, total))),
  }
}

export function formatDateHe(dateKey: string): string {
  return parseLocalDateKey(dateKey).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' })
}

/** "עוד X ימים לבניית בלוק חדש" / due message. */
export function countdownLabel(t: BlockTimeline): string {
  if (t.due) return 'הגיע הזמן למבדקי סיום ובניית בלוק חדש!'
  return t.daysLeft === 1 ? 'עוד יום אחד לבניית בלוק חדש' : `עוד ${t.daysLeft} ימים לבניית בלוק חדש`
}

/** "בלוק 3" → "בלוק 4" (anything else keeps its name). */
export function nextBlockLabel(label: string): string {
  const m = label.match(/^(.*?)(\d+)(\D*)$/)
  return m ? `${m[1]}${Number(m[2]) + 1}${m[3]}` : label
}

// ---------------------------------------------------------------------------
// Benchmark: baseline (first session in the block) vs peak (best in the block)
// ---------------------------------------------------------------------------

function norm(name: string): string {
  return name
    .normalize('NFKC')
    .toLocaleLowerCase('he')
    .replace(/["'״׳]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function score(load: BenchmarkLoad, kind: BenchmarkKind): number {
  if (kind === 'loaded' && load.weightKg != null && load.weightKg > 0) {
    return estimated1Rm(load.weightKg, load.reps)
  }
  return load.reps
}

type Session = { date: string; sets: BenchmarkLoad[] }

export type BenchmarkCandidate = {
  exerciseName: string
  kind: BenchmarkKind
  baseline: BenchmarkLoad | null
  peak: BenchmarkLoad | null
  sessions: number
}

function best(sets: BenchmarkLoad[], kind: BenchmarkKind): BenchmarkLoad | null {
  if (!sets.length) return null
  return sets.reduce((a, b) => (score(b, kind) > score(a, kind) ? b : a))
}

function logDate(log: WorkoutLog): string {
  if (log.performedOn && /^\d{4}-\d{2}-\d{2}$/.test(log.performedOn)) return log.performedOn
  const d = new Date(log.completedAt)
  return Number.isNaN(d.getTime()) ? '' : localDateKey(d)
}

/** Every key exercise of the block (plan + extra names), baseline vs peak from the logs. */
export function buildBenchmarkCandidates(input: {
  days: WorkoutDay[]
  workoutLogs: WorkoutLog[]
  setLogs: SetLog[]
  since: string
  extraExercises?: Pick<Exercise, 'name' | 'metric'>[]
}): BenchmarkCandidate[] {
  const names: { name: string; seconds: boolean }[] = []
  const seen = new Set<string>()
  const add = (name: string, seconds: boolean) => {
    const key = norm(name)
    if (!key || seen.has(key)) return
    seen.add(key)
    names.push({ name: name.trim(), seconds })
  }
  for (const ex of input.extraExercises ?? []) add(ex.name, ex.metric === 'seconds')
  const metricByName = new Map<string, boolean>()
  for (const day of input.days) {
    for (const session of day.sessions ?? []) {
      for (const ex of session.exercises) metricByName.set(norm(ex.name), ex.metric === 'seconds')
    }
    for (const ex of day.exercises ?? []) metricByName.set(norm(ex.name), ex.metric === 'seconds')
  }
  for (const slot of collectProgramExerciseSlots(input.days)) {
    add(slot.exerciseName, metricByName.get(norm(slot.exerciseName)) ?? false)
  }

  const sessions = new Map<string, Map<string, BenchmarkLoad[]>>()
  const push = (name: string, date: string, set: BenchmarkLoad) => {
    if (!date || date < input.since) return
    const key = norm(name)
    if (!seen.has(key)) return
    const byDate = sessions.get(key) ?? new Map<string, BenchmarkLoad[]>()
    byDate.set(date, [...(byDate.get(date) ?? []), set])
    sessions.set(key, byDate)
  }
  for (const log of input.workoutLogs) {
    const date = logDate(log)
    for (const ex of log.exercises) {
      for (const s of ex.sets) {
        if (s.done === false || s.reps == null || !(s.reps > 0)) continue
        push(ex.name, date, { weightKg: s.weightKg != null && s.weightKg > 0 ? s.weightKg : null, reps: s.reps })
      }
    }
  }
  for (const s of input.setLogs) {
    if (!(s.reps > 0)) continue
    const d = new Date(s.loggedAt)
    if (Number.isNaN(d.getTime())) continue
    push(s.exerciseName, localDateKey(d), { weightKg: s.weightKg > 0 ? s.weightKg : null, reps: s.reps })
  }

  return names.map(({ name, seconds }) => {
    const byDate = sessions.get(norm(name))
    const ordered: Session[] = [...(byDate?.entries() ?? [])]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, sets]) => ({ date, sets }))
    const loaded = ordered.some((s) => s.sets.some((x) => x.weightKg != null))
    const kind: BenchmarkKind = seconds || (!loaded && isHoldExercise(name)) ? 'hold' : loaded ? 'loaded' : 'bodyweight'
    const baseline = ordered[0] ? best(ordered[0].sets, kind) : null
    const peak = best(ordered.flatMap((s) => s.sets), kind)
    return { exerciseName: name, kind, baseline, peak, sessions: ordered.length }
  })
}

export type BenchmarkDelta = {
  weightDelta: number
  repsDelta: number
  pct: number | null
  /** e.g. ["+5 ק\"ג", "+2 חזרות", "+15% התחזקות"] or ["סטטי"]. */
  parts: string[]
  trend: 'up' | 'down' | 'static' | 'none'
}

function signed(value: number, unit: string): string {
  const r = Math.round(value * 10) / 10
  const body = Number.isInteger(r) ? String(Math.abs(r)) : Math.abs(r).toFixed(1)
  return `${r > 0 ? '+' : '-'}${body} ${unit}`
}

export function benchmarkDelta(
  kind: BenchmarkKind,
  baseline: BenchmarkLoad | null,
  peak: BenchmarkLoad | null,
): BenchmarkDelta {
  if (!baseline || !peak) return { weightDelta: 0, repsDelta: 0, pct: null, parts: [], trend: 'none' }
  const weightDelta = kind === 'loaded' ? (peak.weightKg ?? 0) - (baseline.weightKg ?? 0) : 0
  const repsDelta = peak.reps - baseline.reps
  const base = score(baseline, kind)
  const pct = base > 0 ? ((score(peak, kind) - base) / base) * 100 : null
  const parts: string[] = []
  if (Math.abs(weightDelta) >= 0.05) parts.push(signed(weightDelta, 'ק"ג'))
  if (repsDelta !== 0) parts.push(signed(repsDelta, kind === 'hold' ? 'שניות' : 'חזרות'))
  const pctRounded = pct == null ? null : Math.round(pct)
  if (pctRounded != null && pctRounded !== 0) {
    parts.push(`${pctRounded > 0 ? '+' : '-'}${Math.abs(pctRounded)}% ${pctRounded > 0 ? 'התחזקות' : 'ירידה'}`)
  }
  const trend = pctRounded == null || (pctRounded === 0 && !parts.length) ? 'static' : pctRounded > 0 ? 'up' : pctRounded < 0 ? 'down' : 'static'
  return { weightDelta, repsDelta, pct, parts: parts.length ? parts : ['סטטי'], trend }
}

export function formatLoad(load: BenchmarkLoad | null, kind: BenchmarkKind): string {
  if (!load) return '—'
  if (kind === 'hold') return `${load.reps} שניות`
  const w = load.weightKg != null && load.weightKg > 0 ? `${fmtKg(load.weightKg)} ק"ג` : 'משקל גוף'
  return `${w} × ${load.reps}`
}

function fmtKg(value: number): string {
  return String(Math.round(value * 100) / 100)
}

// ---------------------------------------------------------------------------
// Next-block calibration (progressive overload)
// ---------------------------------------------------------------------------

export type Calibration = {
  /** Change written into the plan: kg for loaded, reps / seconds otherwise. */
  delta: number
  unit: 'kg' | 'reps' | 'seconds'
  /** Recommended starting point for the next block. */
  target: string
  reason: string
}

const LOAD_STEP = 2.5

/**
 * Improved → +2.5 kg (weighted), +1 rep (+2 from 10 reps up) on bodyweight
 * work, +5 s on holds. Static / regressed → repeat the peak (no change).
 */
export function calibrate(kind: BenchmarkKind, peak: BenchmarkLoad | null, delta: BenchmarkDelta): Calibration | null {
  if (!peak) return null
  const improved = delta.trend === 'up'
  if (kind === 'loaded' && peak.weightKg != null) {
    const step = improved ? LOAD_STEP : 0
    const w = Math.round((peak.weightKg + step) / LOAD_STEP) * LOAD_STEP
    return {
      delta: step,
      unit: 'kg',
      target: `${fmtKg(w)} ק"ג × ${peak.reps}`,
      reason: improved ? 'התחזקות — עומס +2.5 ק"ג' : 'ללא שיפור — חזרה על השיא',
    }
  }
  if (kind === 'hold') {
    const step = improved ? 5 : 0
    return {
      delta: step,
      unit: 'seconds',
      target: `${peak.reps + step} שניות`,
      reason: improved ? 'שיפור — +5 שניות' : 'ללא שיפור — חזרה על השיא',
    }
  }
  const step = improved ? (peak.reps >= 10 ? 2 : 1) : 0
  return {
    delta: step,
    unit: 'reps',
    target: `${peak.reps + step} חזרות`,
    reason: improved ? `שיפור — +${step} ${step === 1 ? 'חזרה' : 'חזרות'}` : 'ללא שיפור — חזרה על השיא',
  }
}

function bumpNumbers(text: string, delta: number): string {
  return text.replace(/\d+(?:\.\d+)?/g, (m) => String(Math.round((Number(m) + delta) * 100) / 100))
}

/** Plan patch for one exercise (null = nothing safe to change). */
export function calibrationPatch(ex: Exercise, cal: Calibration): Partial<Exercise> | null {
  if (!(cal.delta > 0)) return null
  const sets: ExerciseDefaultSet[] = (ex.defaultSets ?? []).map((s) => ({ ...s }))
  if (cal.unit === 'kg') {
    const nextSets = sets.map((s) =>
      s.weightKg != null && s.weightKg > 0 ? { ...s, weightKg: Math.round((s.weightKg + cal.delta) * 100) / 100 } : s,
    )
    const weight = ex.weight && /\d/.test(ex.weight) ? bumpNumbers(ex.weight, cal.delta) : ex.weight
    return {
      ...(weight !== ex.weight ? { weight } : {}),
      ...(nextSets.length ? { defaultSets: nextSets } : {}),
      ...(ex.defaultWeightKg != null && ex.defaultWeightKg > 0
        ? { defaultWeightKg: Math.round((ex.defaultWeightKg + cal.delta) * 100) / 100 }
        : {}),
      defaultsUpdatedAt: new Date().toISOString(),
    }
  }
  const nextSets = sets.map((s) => (s.reps != null && s.reps > 0 ? { ...s, reps: s.reps + cal.delta } : s))
  // Only plain prescriptions ("6-8", "15-20 שניות לכל יד") are bumped as text.
  const simple = /^[\d\s\-–]+(שניות|חזרות)?[^\d]*$/.test(ex.reps.trim()) && !/סט|ק"ג|\+/.test(ex.reps)
  const reps = simple ? bumpNumbers(ex.reps, cal.delta) : ex.reps
  return {
    ...(reps !== ex.reps ? { reps } : {}),
    ...(nextSets.length ? { defaultSets: nextSets } : {}),
    ...(ex.defaultReps != null && ex.defaultReps > 0 ? { defaultReps: ex.defaultReps + cal.delta } : {}),
    defaultsUpdatedAt: new Date().toISOString(),
  }
}

/** Plan exercises (day id + exercise) with this name in the active program. */
export function planExercisesNamed(days: WorkoutDay[], name: string): { dayId: string; exercise: Exercise }[] {
  const key = norm(name)
  const out: { dayId: string; exercise: Exercise }[] = []
  for (const day of days) {
    for (const session of day.sessions ?? []) {
      for (const ex of session.exercises) if (norm(ex.name) === key) out.push({ dayId: day.id, exercise: ex })
    }
    for (const ex of day.exercises ?? []) if (norm(ex.name) === key) out.push({ dayId: day.id, exercise: ex })
  }
  return out
}

// ---------------------------------------------------------------------------
// AI export
// ---------------------------------------------------------------------------

function rowLine(row: Pick<BenchmarkRow, 'exerciseName' | 'kind' | 'baseline' | 'peak' | 'tested' | 'nextTarget'>): string {
  const d = benchmarkDelta(row.kind, row.baseline, row.peak)
  const change = d.trend === 'none' ? 'אין נתונים' : d.parts.join(' / ')
  return `| ${row.exerciseName} | ${formatLoad(row.baseline, row.kind)} | ${formatLoad(row.peak, row.kind)}${row.tested ? ' (מבדק)' : ''} | ${change} | ${row.nextTarget || '—'} |`
}

const TABLE_HEAD = [
  '| תרגיל | בסיס תחילת בלוק | שיא בבלוק | שינוי | יעד פתיחה לבלוק הבא |',
  '| --- | --- | --- | --- | --- |',
]

/** `=== סיכום מבדקי חוזק וסיום בלוק ===`: live block status + archived reports. */
export function formatBlockBenchmarkSection(input: {
  tree: SkillTreeState
  candidates: BenchmarkCandidate[]
  today?: string
}): string {
  const t = blockTimeline(input.tree, input.today)
  const logged = input.candidates.filter((c) => c.peak)
  const lines: string[] = [
    '=== סיכום מבדקי חוזק וסיום בלוק ===',
    `- בלוק נוכחי: ${t.name} | ${t.startDate} עד ${t.endDate} | שבוע ${t.week} מתוך ${t.weeks} | ${countdownLabel(t)}`,
  ]
  if (logged.length) {
    lines.push('', '### מצב נוכחי בבלוק (בסיס מול שיא עד היום)', ...TABLE_HEAD)
    for (const c of logged) {
      const cal = calibrate(c.kind, c.peak, benchmarkDelta(c.kind, c.baseline, c.peak))
      lines.push(rowLine({ ...c, tested: false, nextTarget: cal?.target ?? '' }))
    }
  } else {
    lines.push('- אין עדיין סטים מתועדים בבלוק הנוכחי.')
  }
  const reports: BlockReport[] = liveBlockReports(input.tree.blockReports).slice(0, 3)
  for (const r of reports) {
    lines.push(
      '',
      `### דו"ח סיום: ${r.blockTitle ? `${r.blockLabel} • ${r.blockTitle}` : r.blockLabel} (${r.startDate} עד ${r.endDate}, ${r.weeks} שבועות · נסגר ${r.closedAt.slice(0, 10)})`,
      ...TABLE_HEAD,
      ...r.rows.map(rowLine),
    )
    if (r.skillAdvances.length) lines.push(`- שלבי עץ מיומנויות שקודמו: ${r.skillAdvances.join(' | ')}`)
    if (r.bodyFatStart != null || r.bodyFatEnd != null) {
      lines.push(
        `- אחוז שומן: ${r.bodyFatStart ?? '—'}% ➔ ${r.bodyFatEnd ?? '—'}%${r.waistEnd != null ? ` | מותן בסיום: ${r.waistEnd} ס"מ` : ''}`,
      )
    }
    if (r.note) lines.push(`- הערה: ${r.note}`)
  }
  lines.push(
    '',
    'הנחיה: השתמש בטבלאות אלו כדי לתכנן את הבלוק הבא — עומסי פתיחה, טווחי חזרות והתקדמות סקילים לפי השיפור בפועל.',
  )
  return lines.join('\n')
}
