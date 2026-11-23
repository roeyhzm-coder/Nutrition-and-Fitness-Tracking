/**
 * Archived end-of-block strength benchmark reports ("סיום בלוק ומבדקי חוזק").
 * Stored on the skill tree state (`blockReports`, keyed by id, LWW per report)
 * next to the block settings they close — no separate store or table.
 */

export type BenchmarkKind = 'loaded' | 'bodyweight' | 'hold'

export type BenchmarkLoad = { weightKg: number | null; reps: number }

export type BenchmarkRow = {
  exerciseName: string
  kind: BenchmarkKind
  baseline: BenchmarkLoad | null
  peak: BenchmarkLoad | null
  /** True when the peak was entered as a fresh test result in the assessment. */
  tested: boolean
  /** Recommended start for the next block, e.g. "30 ק\"ג × 3" / "12 חזרות" / "25 שניות". */
  nextTarget: string
  /** Whether the recommendation was written into the plan. */
  applied: boolean
}

export type BlockReport = {
  id: string
  blockLabel: string
  blockTitle: string
  startDate: string
  endDate: string
  weeks: number
  closedAt: string
  rows: BenchmarkRow[]
  /** Skill Tree stages advanced when the block closed. */
  skillAdvances: string[]
  bodyFatStart: number | null
  bodyFatEnd: number | null
  waistEnd: number | null
  note: string
  updatedAt: string
  deleted?: boolean
}

const EPOCH = '1970-01-01T00:00:00.000Z'
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const KINDS: readonly BenchmarkKind[] = ['loaded', 'bodyweight', 'hold']

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function str(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : ''
}

function num(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  return value == null || value === '' || !Number.isFinite(n) ? null : n
}

function load(value: unknown): BenchmarkLoad | null {
  const o = obj(value)
  const reps = num(o.reps)
  if (reps == null || reps <= 0) return null
  const weight = num(o.weightKg)
  return { weightKg: weight != null && weight > 0 ? weight : null, reps }
}

function row(value: unknown): BenchmarkRow | null {
  const o = obj(value)
  const exerciseName = str(o.exerciseName, 200).trim()
  if (!exerciseName) return null
  return {
    exerciseName,
    kind: KINDS.includes(o.kind as BenchmarkKind) ? (o.kind as BenchmarkKind) : 'bodyweight',
    baseline: load(o.baseline),
    peak: load(o.peak),
    tested: o.tested === true,
    nextTarget: str(o.nextTarget, 120),
    applied: o.applied === true,
  }
}

function dateKey(value: unknown): string {
  const s = str(value, 10)
  return DATE_RE.test(s) ? s : ''
}

function iso(value: unknown): string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : EPOCH
}

export function normalizeBlockReport(value: unknown, key: string): BlockReport | null {
  const o = obj(value)
  const id = str(o.id, 80) || key
  const startDate = dateKey(o.startDate)
  if (!id || !startDate) return null
  return {
    id,
    blockLabel: str(o.blockLabel, 60),
    blockTitle: str(o.blockTitle, 120),
    startDate,
    endDate: dateKey(o.endDate) || startDate,
    weeks: Math.max(1, Math.round(num(o.weeks) ?? 1)),
    closedAt: iso(o.closedAt),
    rows: Array.isArray(o.rows) ? o.rows.map(row).filter((r): r is BenchmarkRow => !!r).slice(0, 80) : [],
    skillAdvances: Array.isArray(o.skillAdvances)
      ? o.skillAdvances.map((x) => str(x, 200)).filter(Boolean).slice(0, 20)
      : [],
    bodyFatStart: num(o.bodyFatStart),
    bodyFatEnd: num(o.bodyFatEnd),
    waistEnd: num(o.waistEnd),
    note: str(o.note, 500),
    updatedAt: iso(o.updatedAt),
    ...(o.deleted === true ? { deleted: true } : {}),
  }
}

export function normalizeBlockReports(value: unknown): Record<string, BlockReport> {
  const out: Record<string, BlockReport> = {}
  for (const [key, raw] of Object.entries(obj(value))) {
    const report = normalizeBlockReport(raw, key)
    if (report) out[report.id] = report
  }
  return out
}

export function liveBlockReports(reports: Record<string, BlockReport>): BlockReport[] {
  return Object.values(reports)
    .filter((r) => !r.deleted)
    .sort((a, b) => b.closedAt.localeCompare(a.closedAt))
}
