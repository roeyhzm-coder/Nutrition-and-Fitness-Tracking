/**
 * Monthly body-fat & circumference log ("מעקב אחוזי שומן והיקפים חודשי").
 *
 * Synced inside the `consistency_day_marks` JSON under BODY_LOG_PAYLOAD_KEY
 * (no Supabase table / migration), per-entry last-write-wins with tombstones.
 * Legacy body-fat readings that live on weigh-in entries and two deterministic
 * seed readings are derived at read time, so every device shows the same
 * history without writing anything until the user edits an entry.
 */

import type { WeightEntry } from './types'
import { localDateKey, uid } from './types'

export { BODY_LOG_PAYLOAD_KEY } from './weeklyConsistency'

export const BODY_LOG_STORAGE_KEY = 'tn.bodyLog.v1'

export type BodyLogField =
  | 'bodyFatPct'
  | 'waistCm'
  | 'neckCm'
  | 'chestCm'
  | 'armCm'
  | 'shouldersCm'
  | 'thighCm'

export type BodyLogEntry = {
  id: string
  /** YYYY-MM-DD */
  date: string
  bodyFatPct: number | null
  waistCm: number | null
  neckCm: number | null
  chestCm: number | null
  armCm: number | null
  shouldersCm: number | null
  thighCm: number | null
  /** U.S. Navy formula estimate (waist / neck / height) from the profile calculator. */
  navyFatPct: number | null
  /** Body weight measured with this entry (falls back to that day's weigh-in). */
  weightKg: number | null
  note: string
  updatedAt: string
  /** Derived (seed / legacy weigh-in) — not stored until edited. */
  source?: 'seed' | 'legacy'
  deleted?: boolean
}

export type BodyLogState = Record<string, BodyLogEntry>

export const BODY_LOG_FIELDS: readonly {
  key: BodyLogField
  label: string
  short: string
  unit: '%' | 'ס"מ'
  /** Lower is the desired direction (fat, waist). */
  lowerIsBetter: boolean
  max: number
}[] = [
  { key: 'bodyFatPct', label: 'אחוז שומן (%)', short: 'שומן', unit: '%', lowerIsBetter: true, max: 70 },
  { key: 'waistCm', label: 'היקף מותן (ס"מ)', short: 'מותן', unit: 'ס"מ', lowerIsBetter: true, max: 250 },
  { key: 'neckCm', label: 'היקף צוואר (ס"מ)', short: 'צוואר', unit: 'ס"מ', lowerIsBetter: false, max: 80 },
  { key: 'chestCm', label: 'היקף חזה (ס"מ)', short: 'חזה', unit: 'ס"מ', lowerIsBetter: false, max: 250 },
  { key: 'armCm', label: 'היקף זרוע (ס"מ)', short: 'זרוע', unit: 'ס"מ', lowerIsBetter: false, max: 100 },
  { key: 'shouldersCm', label: 'היקף כתפיים (ס"מ)', short: 'כתפיים', unit: 'ס"מ', lowerIsBetter: false, max: 250 },
  { key: 'thighCm', label: 'היקף ירך (ס"מ)', short: 'ירך', unit: 'ס"מ', lowerIsBetter: false, max: 150 },
]

/** Block-start baseline (13.5%) and the current reading (13.0%) seeded on every device. */
export const BODY_LOG_SEED_BASELINE_ID = 'bodylog-seed-baseline'
export const BODY_LOG_SEED_CURRENT_ID = 'bodylog-seed-current'
const SEED_BASELINE_FAT = 13.5
const SEED_CURRENT_FAT = 13.0
const SEED_CURRENT_DATE = '2026-11-23'
const EPOCH = '1970-01-01T00:00:00.000Z'
const LEGACY_PREFIX = 'legacy-wl-'
const FOLD_PREFIX = 'bm-'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function measure(value: unknown, max: number): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  if (value == null || value === '' || !Number.isFinite(n) || n <= 0 || n > max) return null
  return Math.round(n * 100) / 100
}

function iso(value: unknown): string {
  return typeof value === 'string' && value.length >= 10 && !Number.isNaN(Date.parse(value))
    ? value
    : EPOCH
}

function emptyMeasures(): Pick<BodyLogEntry, BodyLogField> {
  return { bodyFatPct: null, waistCm: null, neckCm: null, chestCm: null, armCm: null, shouldersCm: null, thighCm: null }
}

function noExtras(): Pick<BodyLogEntry, 'navyFatPct' | 'weightKg'> {
  return { navyFatPct: null, weightKg: null }
}

export function hasAnyMeasure(entry: Pick<BodyLogEntry, BodyLogField>): boolean {
  return BODY_LOG_FIELDS.some((f) => entry[f.key] != null)
}

function normalizeEntry(raw: unknown, key: string): BodyLogEntry | null {
  const o = obj(raw)
  const id = typeof o.id === 'string' && o.id.trim() ? o.id : key
  if (!id) return null
  const date = typeof o.date === 'string' ? o.date.slice(0, 10) : ''
  if (!DATE_RE.test(date)) return null
  const measures = emptyMeasures()
  for (const f of BODY_LOG_FIELDS) measures[f.key] = measure(o[f.key], f.max)
  const entry: BodyLogEntry = {
    id,
    date,
    ...measures,
    navyFatPct: measure(o.navyFatPct, 70),
    weightKg: measure(o.weightKg, 400),
    note: typeof o.note === 'string' ? o.note.slice(0, 200) : '',
    updatedAt: iso(o.updatedAt),
    ...(o.deleted === true ? { deleted: true } : {}),
  }
  if (!entry.deleted && !hasAnyMeasure(entry)) return null
  return entry
}

export function normalizeBodyLog(raw: unknown): BodyLogState {
  const out: BodyLogState = {}
  for (const [key, value] of Object.entries(obj(raw))) {
    const entry = normalizeEntry(value, key)
    if (entry) out[entry.id] = entry
  }
  return out
}

export function mergeBodyLog(local: BodyLogState, remote: BodyLogState): BodyLogState {
  const out: BodyLogState = { ...local }
  for (const [id, r] of Object.entries(remote)) {
    const l = out[id]
    if (!l || r.updatedAt > l.updatedAt) out[id] = r
  }
  return out
}

export type BodyLogInput = Pick<BodyLogEntry, BodyLogField | 'date' | 'note'> &
  Partial<Pick<BodyLogEntry, 'navyFatPct' | 'weightKg'>>

/** Insert or replace an entry (stamps updatedAt; derived ids become stored entries). */
export function upsertBodyLogEntry(state: BodyLogState, input: BodyLogInput & { id?: string }): BodyLogState {
  const id = input.id ?? `bl-${uid()}`
  const prev = state[id]
  const entry: BodyLogEntry = {
    id,
    date: input.date,
    bodyFatPct: input.bodyFatPct,
    waistCm: input.waistCm,
    neckCm: input.neckCm,
    // The edit form has no Navy / weight inputs: keep what the entry already holds.
    navyFatPct: input.navyFatPct !== undefined ? input.navyFatPct : (prev?.navyFatPct ?? null),
    weightKg: input.weightKg !== undefined ? input.weightKg : (prev?.weightKg ?? null),
    chestCm: input.chestCm,
    armCm: input.armCm,
    shouldersCm: input.shouldersCm,
    thighCm: input.thighCm,
    note: input.note.trim().slice(0, 200),
    updatedAt: new Date().toISOString(),
  }
  return { ...state, [id]: entry }
}

export function deleteBodyLogEntry(state: BodyLogState, entry: BodyLogEntry): BodyLogState {
  return {
    ...state,
    [entry.id]: { ...entry, source: undefined, deleted: true, updatedAt: new Date().toISOString() },
  }
}

/**
 * Stored entries + derived ones (legacy weigh-in body-fat readings and the two
 * seeds), oldest first. Derived entries hide behind a stored entry of the same
 * id (edited / deleted) and legacy readings behind a stored entry of the same day.
 */
export function bodyLogHistory(
  state: BodyLogState,
  ctx: { weightLogs: WeightEntry[]; blockStartDate: string },
): BodyLogEntry[] {
  const stored = Object.values(state)
  const live = stored.filter((e) => !e.deleted)
  const known = new Set(stored.map((e) => e.id))
  const fatDays = new Set(live.filter((e) => e.bodyFatPct != null).map((e) => e.date))
  const derived: BodyLogEntry[] = []

  for (const w of ctx.weightLogs) {
    if (w.bodyFatPct == null || !(w.bodyFatPct > 0)) continue
    const id = `${LEGACY_PREFIX}${w.id}`
    const date = w.loggedAt.slice(0, 10)
    if (known.has(id) || fatDays.has(date) || !DATE_RE.test(date)) continue
    fatDays.add(date)
    derived.push({
      id,
      date,
      ...emptyMeasures(),
      ...noExtras(),
      bodyFatPct: Math.round(w.bodyFatPct * 100) / 100,
      note: '',
      updatedAt: EPOCH,
      source: 'legacy',
    })
  }

  // Block-start baseline, but never after the earliest real reading (the trend reads baseline ➔ latest).
  const blockStart = DATE_RE.test(ctx.blockStartDate) ? ctx.blockStartDate : SEED_CURRENT_DATE
  const earliest = [...live, ...derived]
    .filter((e) => e.bodyFatPct != null)
    .reduce<string | null>((min, e) => (min == null || e.date < min ? e.date : min), null)
  const baselineDate = earliest != null && earliest < blockStart ? earliest : blockStart
  if (!known.has(BODY_LOG_SEED_BASELINE_ID)) {
    derived.push({
      id: BODY_LOG_SEED_BASELINE_ID,
      date: baselineDate,
      ...emptyMeasures(),
      ...noExtras(),
      bodyFatPct: SEED_BASELINE_FAT,
      note: 'בסיס תחילת בלוק',
      updatedAt: EPOCH,
      source: 'seed',
    })
  }
  // The 13.0% reading is a seed for the current measurement: it yields only to
  // a real legacy weigh-in reading (that *is* the current reading), never to
  // entries added later — otherwise logging a new month would erase it.
  const legacyFat = derived.some((e) => e.source === 'legacy')
  if (!known.has(BODY_LOG_SEED_CURRENT_ID) && !legacyFat) {
    derived.push({
      id: BODY_LOG_SEED_CURRENT_ID,
      date: SEED_CURRENT_DATE > baselineDate ? SEED_CURRENT_DATE : baselineDate,
      ...emptyMeasures(),
      ...noExtras(),
      bodyFatPct: SEED_CURRENT_FAT,
      note: 'מדידה נוכחית',
      updatedAt: EPOCH,
      source: 'seed',
    })
  }

  // One row per date: a seed never sits next to a real reading of the same day.
  const realDays = new Set([...live, ...derived.filter((e) => e.source === 'legacy')].map((e) => e.date))
  const visible = derived.filter((e) => e.source !== 'seed' || !realDays.has(e.date))
  // A folded profile measurement (`bm-<date>`) yields to another real entry of
  // that day (e.g. one that arrived from another device); the fold fills that one.
  const ownDays = new Set(live.filter((e) => !e.id.startsWith(FOLD_PREFIX)).map((e) => e.date))
  const liveVisible = live.filter((e) => !e.id.startsWith(FOLD_PREFIX) || !ownDays.has(e.date))
  return [...liveVisible, ...visible].sort(
    (a, b) => a.date.localeCompare(b.date) || a.updatedAt.localeCompare(b.updatedAt),
  )
}

/** Minimal shape of a profile body-measurement row (lib/bodyMeasurements). */
export type BodyMeasurementLike = {
  recordedAt: string
  weightKg: number | null
  waistCircumferenceCm: number | null
  neckCircumferenceCm: number | null
  bodyFatPercentage: number | null
}

const round2 = (v: number | null | undefined) =>
  v != null && Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : null

/**
 * Single source of truth: fold the profile's body-measurement rows (weight /
 * waist / neck / Navy body fat) into the body log, one entry per date. Only
 * empty fields are filled (never overwrites a value the user entered), ids are
 * deterministic (`bm-<date>`, or the existing entry of that day), so every
 * device converges on the same result. Returns null when nothing changes.
 */
export function foldBodyMeasurements(
  state: BodyLogState,
  history: BodyLogEntry[],
  measurements: BodyMeasurementLike[],
): BodyLogState | null {
  const byDate = new Map<string, BodyMeasurementLike>()
  for (const m of [...measurements].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))) {
    const d = new Date(m.recordedAt)
    if (Number.isNaN(d.getTime())) continue
    byDate.set(localDateKey(d), m)
  }
  let next: BodyLogState | null = null
  const now = new Date().toISOString()
  for (const [date, m] of byDate) {
    const fat = round2(m.bodyFatPercentage)
    const incoming = {
      waistCm: round2(m.waistCircumferenceCm),
      neckCm: round2(m.neckCircumferenceCm),
      weightKg: round2(m.weightKg),
      navyFatPct: fat,
    }
    const sameDay = history.filter((e) => e.date === date)
    const target = sameDay.find((e) => !e.source) ?? sameDay.find((e) => e.source === 'legacy') ?? sameDay[0] ?? null
    if (target) {
      const patch: Partial<BodyLogEntry> = {}
      for (const key of ['waistCm', 'neckCm', 'weightKg', 'navyFatPct'] as const) {
        if (target[key] == null && incoming[key] != null) patch[key] = incoming[key]
      }
      if (target.bodyFatPct == null && fat != null) patch.bodyFatPct = fat
      if (!Object.keys(patch).length) continue
      const { source: _source, ...base } = target
      next = { ...(next ?? state), [target.id]: { ...base, ...patch, updatedAt: now } }
      continue
    }
    const id = `${FOLD_PREFIX}${date}`
    if (state[id]) continue // deleted by the user (tombstone): never resurrect
    const entry: BodyLogEntry = {
      id,
      date,
      ...emptyMeasures(),
      bodyFatPct: fat,
      waistCm: incoming.waistCm,
      neckCm: incoming.neckCm,
      navyFatPct: fat,
      weightKg: incoming.weightKg,
      note: 'מדידת פרופיל (חיל הים)',
      updatedAt: now,
    }
    if (!hasAnyMeasure(entry)) continue
    next = { ...(next ?? state), [id]: entry }
  }
  return next
}

export type BodyLogDelta = { value: number; vsPrevious: number | null; vsBaseline: number | null }

/** Per field: the entry's value and its change vs the previous / first reading of that field. */
export function bodyLogDeltas(history: BodyLogEntry[]): Map<string, Partial<Record<BodyLogField, BodyLogDelta>>> {
  const out = new Map<string, Partial<Record<BodyLogField, BodyLogDelta>>>()
  const first: Partial<Record<BodyLogField, number>> = {}
  const prev: Partial<Record<BodyLogField, number>> = {}
  for (const entry of history) {
    const row: Partial<Record<BodyLogField, BodyLogDelta>> = {}
    for (const f of BODY_LOG_FIELDS) {
      const value = entry[f.key]
      if (value == null) continue
      const p = prev[f.key]
      const b = first[f.key]
      row[f.key] = {
        value,
        vsPrevious: p == null ? null : Math.round((value - p) * 100) / 100,
        vsBaseline: b == null ? null : Math.round((value - b) * 100) / 100,
      }
      if (b == null) first[f.key] = value
      prev[f.key] = value
    }
    out.set(entry.id, row)
  }
  return out
}

export type LatestBodyStats = {
  bodyFatPct: number | null
  bodyFatDate: string | null
  baselineFatPct: number | null
  waistCm: number | null
  waistDate: string | null
}

export function latestBodyStats(history: BodyLogEntry[]): LatestBodyStats {
  const withFat = history.filter((e) => e.bodyFatPct != null)
  const withWaist = history.filter((e) => e.waistCm != null)
  const lastFat = withFat.at(-1) ?? null
  const lastWaist = withWaist.at(-1) ?? null
  return {
    bodyFatPct: lastFat?.bodyFatPct ?? null,
    bodyFatDate: lastFat?.date ?? null,
    baselineFatPct: withFat[0]?.bodyFatPct ?? null,
    waistCm: lastWaist?.waistCm ?? null,
    waistDate: lastWaist?.date ?? null,
  }
}

function fmt(value: number): string {
  const r = Math.round(value * 100) / 100
  if (Number.isInteger(r)) return r.toFixed(1)
  return String(r)
}

export function formatSigned(value: number, unit: string): string {
  if (value === 0) return 'ללא שינוי'
  return `${value > 0 ? '+' : '-'}${fmt(Math.abs(value))}${unit === '%' ? '%' : ` ${unit}`}`
}

export function formatMeasure(value: number | null, unit: string): string {
  if (value == null) return '—'
  return unit === '%' ? `${fmt(value)}%` : `${fmt(value)} ${unit}`
}

/** Body weight logged on that day (latest weigh-in of the day), if any. */
export function weightOnDate(weightLogs: WeightEntry[], date: string): number | null {
  const hit = [...weightLogs]
    .filter((w) => w.weightKg > 0 && w.loggedAt.slice(0, 10) === date)
    .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
    .at(-1)
  return hit ? Math.round(hit.weightKg * 100) / 100 : null
}

/** Body fat cell: "13.0% / 12.99% (חיל הים)" when both a reading and a Navy estimate exist. */
export function formatFatWithNavy(entry: Pick<BodyLogEntry, 'bodyFatPct' | 'navyFatPct'>): string {
  const main = formatMeasure(entry.bodyFatPct, '%')
  if (entry.navyFatPct == null || entry.bodyFatPct == null || entry.navyFatPct === entry.bodyFatPct) return main
  return `${main} / ${formatMeasure(entry.navyFatPct, '%')} (חיל הים)`
}

/** AI export: ONE unified chronological table (newest first) of body fat + weight + every circumference. */
export function formatBodyLogSection(history: BodyLogEntry[], weightLogs: WeightEntry[] = []): string {
  if (!history.length) return ''
  const deltas = bodyLogDeltas(history)
  const stats = latestBodyStats(history)
  const fatTrend =
    stats.baselineFatPct != null && stats.bodyFatPct != null
      ? `- מגמת שומן מהבסיס: ${formatMeasure(stats.baselineFatPct, '%')} ➔ ${formatMeasure(stats.bodyFatPct, '%')} (${formatSigned(Math.round((stats.bodyFatPct - stats.baselineFatPct) * 100) / 100, '%')})`
      : ''
  const cell = (entry: BodyLogEntry, key: BodyLogField, unit: string) => {
    const d = deltas.get(entry.id)?.[key]
    if (!d) return '—'
    return d.vsPrevious == null ? formatMeasure(d.value, unit) : `${formatMeasure(d.value, unit)} (${formatSigned(d.vsPrevious, unit)})`
  }
  const fatCell = (entry: BodyLogEntry) => {
    const base = cell(entry, 'bodyFatPct', '%')
    return entry.navyFatPct != null && entry.navyFatPct !== entry.bodyFatPct
      ? `${base} / ${formatMeasure(entry.navyFatPct, '%')} (חיל הים)`
      : base
  }
  const rows = [...history].reverse().map((entry) => {
    const weight = entry.weightKg ?? weightOnDate(weightLogs, entry.date)
    return `| ${entry.date} | ${fatCell(entry)} | ${weight != null ? `${weight} ק"ג` : '—'} | ${cell(entry, 'waistCm', 'ס"מ')} | ${cell(entry, 'neckCm', 'ס"מ')} | ${cell(entry, 'chestCm', 'ס"מ')} | ${cell(entry, 'armCm', 'ס"מ')} | ${cell(entry, 'shouldersCm', 'ס"מ')} | ${cell(entry, 'thighCm', 'ס"מ')} | ${entry.note || '—'} |`
  })
  return [
    '## היסטוריית מדידות גוף ואחוזי שומן (טבלה מאוחדת — מקור אמת יחיד)',
    fatTrend,
    '| תאריך | אחוז שומן (שינוי מהקודם) | משקל | מותן | צוואר | חזה | זרוע | כתפיים | ירך | הערה |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows,
  ]
    .filter(Boolean)
    .join('\n')
}
