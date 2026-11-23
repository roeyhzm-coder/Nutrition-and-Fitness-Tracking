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
import { uid } from './types'

export { BODY_LOG_PAYLOAD_KEY } from './weeklyConsistency'

export const BODY_LOG_STORAGE_KEY = 'tn.bodyLog.v1'

export type BodyLogField =
  | 'bodyFatPct'
  | 'waistCm'
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
  chestCm: number | null
  armCm: number | null
  shouldersCm: number | null
  thighCm: number | null
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
  return { bodyFatPct: null, waistCm: null, chestCm: null, armCm: null, shouldersCm: null, thighCm: null }
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

export type BodyLogInput = Pick<BodyLogEntry, BodyLogField | 'date' | 'note'>

/** Insert or replace an entry (stamps updatedAt; derived ids become stored entries). */
export function upsertBodyLogEntry(state: BodyLogState, input: BodyLogInput & { id?: string }): BodyLogState {
  const id = input.id ?? `bl-${uid()}`
  const entry: BodyLogEntry = {
    id,
    date: input.date,
    bodyFatPct: input.bodyFatPct,
    waistCm: input.waistCm,
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
      bodyFatPct: SEED_CURRENT_FAT,
      note: 'מדידה נוכחית',
      updatedAt: EPOCH,
      source: 'seed',
    })
  }

  return [...live, ...derived].sort(
    (a, b) => a.date.localeCompare(b.date) || a.updatedAt.localeCompare(b.updatedAt),
  )
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

/** AI export section: chronological monthly readings with deltas. */
export function formatBodyLogSection(history: BodyLogEntry[]): string {
  if (!history.length) return ''
  const deltas = bodyLogDeltas(history)
  const lines = history.map((entry) => {
    const row = deltas.get(entry.id) ?? {}
    const parts = BODY_LOG_FIELDS.flatMap((f) => {
      const d = row[f.key]
      if (!d) return []
      const change = d.vsPrevious == null ? '' : ` (${formatSigned(d.vsPrevious, f.unit)} מהקודם)`
      return [`${f.short}: ${formatMeasure(d.value, f.unit)}${change}`]
    })
    return `- ${entry.date} | ${parts.join(' | ')}${entry.note ? ` | הערה: ${entry.note}` : ''}`
  })
  const stats = latestBodyStats(history)
  const fatTrend =
    stats.baselineFatPct != null && stats.bodyFatPct != null
      ? `- מגמת שומן מהבסיס: ${formatMeasure(stats.baselineFatPct, '%')} ➔ ${formatMeasure(stats.bodyFatPct, '%')} (${formatSigned(Math.round((stats.bodyFatPct - stats.baselineFatPct) * 100) / 100, '%')})`
      : ''
  return ['## מעקב אחוזי שומן והיקפים חודשי', fatTrend, ...lines].filter(Boolean).join('\n')
}
