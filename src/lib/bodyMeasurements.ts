import { isSupabaseConfigured, supabase } from './supabase'
import { uid } from './types'

const SHARED_OWNER_ID = 'primary'
const SHARED_OWNER_ALIASES = ['primary', 'primary_user'] as const

export type BodyMeasurement = {
  id: string
  userId: string
  recordedAt: string
  weightKg: number | null
  waistCircumferenceCm: number | null
  neckCircumferenceCm: number | null
  bodyFatPercentage: number | null
}

export type BodyMeasurementExportRow = {
  id: string
  user_id: string
  recorded_at: string
  weight: number | null
  waist_circumference: number | null
  neck_circumference: number | null
  body_fat_percentage: number | null
}

function nullableNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function asIso(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return d.toISOString()
  }
  return new Date().toISOString()
}

export function measurementFingerprint(row: BodyMeasurement): string {
  return [
    row.recordedAt,
    row.weightKg ?? '',
    row.waistCircumferenceCm ?? '',
    row.neckCircumferenceCm ?? '',
    row.bodyFatPercentage ?? '',
  ].join('|')
}

export function toBodyMeasurementExportRow(
  row: BodyMeasurement,
): BodyMeasurementExportRow {
  return {
    id: row.id,
    user_id: row.userId,
    recorded_at: row.recordedAt,
    weight: row.weightKg,
    waist_circumference: row.waistCircumferenceCm,
    neck_circumference: row.neckCircumferenceCm,
    body_fat_percentage: row.bodyFatPercentage,
  }
}

export function normalizeBodyMeasurement(
  raw: Partial<BodyMeasurement> &
    Partial<BodyMeasurementExportRow> &
    Record<string, unknown>,
): BodyMeasurement | null {
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id : uid()
  const userId =
    (typeof raw.userId === 'string' && raw.userId.trim()) ||
    (typeof raw.user_id === 'string' && raw.user_id.trim()) ||
    SHARED_OWNER_ID
  const recordedAt = asIso(raw.recordedAt ?? raw.recorded_at)
  const weightKg = nullableNumber(raw.weightKg ?? raw.weight)
  const waistCircumferenceCm = nullableNumber(
    raw.waistCircumferenceCm ?? raw.waist_circumference,
  )
  const neckCircumferenceCm = nullableNumber(
    raw.neckCircumferenceCm ?? raw.neck_circumference,
  )
  const bodyFatPercentage = nullableNumber(
    raw.bodyFatPercentage ?? raw.body_fat_percentage,
  )
  if (
    weightKg == null &&
    waistCircumferenceCm == null &&
    neckCircumferenceCm == null &&
    bodyFatPercentage == null
  ) {
    return null
  }
  return {
    id,
    userId,
    recordedAt,
    weightKg,
    waistCircumferenceCm,
    neckCircumferenceCm,
    bodyFatPercentage,
  }
}

export function sortBodyMeasurements(rows: BodyMeasurement[]) {
  return [...rows].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
}

export function unionBodyMeasurements(
  ...lists: Array<BodyMeasurement[] | null | undefined>
): BodyMeasurement[] {
  const byId = new Map<string, BodyMeasurement>()
  const fingerprints = new Set<string>()
  for (const list of lists) {
    for (const item of list ?? []) {
      const row = normalizeBodyMeasurement(item)
      if (!row) continue
      const fp = measurementFingerprint(row)
      if (byId.has(row.id) || fingerprints.has(fp)) continue
      byId.set(row.id, row)
      fingerprints.add(fp)
    }
  }
  return sortBodyMeasurements([...byId.values()])
}

export function extractBodyMeasurementsHistory(data: unknown): BodyMeasurement[] {
  if (!data || typeof data !== 'object') return []
  const root = data as Record<string, unknown>
  const entities =
    root.entities && typeof root.entities === 'object'
      ? (root.entities as Record<string, unknown>)
      : {}
  const buckets = [
    root.body_measurements_history,
    entities.body_measurements_history,
    root.bodyMeasurements,
    entities.bodyMeasurements,
  ]
  const rows: BodyMeasurement[] = []
  for (const bucket of buckets) {
    if (!Array.isArray(bucket)) continue
    for (const item of bucket) {
      if (!item || typeof item !== 'object') continue
      const row = normalizeBodyMeasurement(
        item as Partial<BodyMeasurement> & Partial<BodyMeasurementExportRow>,
      )
      if (row) rows.push(row)
    }
  }
  return unionBodyMeasurements(rows)
}

export function createBodyMeasurement(input: {
  weightKg?: number | null
  waistCircumferenceCm?: number | null
  neckCircumferenceCm?: number | null
  bodyFatPercentage?: number | null
  recordedAt?: string
  userId?: string
}): BodyMeasurement | null {
  return normalizeBodyMeasurement({
    id: uid(),
    userId: input.userId ?? SHARED_OWNER_ID,
    recordedAt: input.recordedAt ?? new Date().toISOString(),
    weightKg: input.weightKg ?? null,
    waistCircumferenceCm: input.waistCircumferenceCm ?? null,
    neckCircumferenceCm: input.neckCircumferenceCm ?? null,
    bodyFatPercentage: input.bodyFatPercentage ?? null,
  })
}

type BodyMeasurementRow = {
  id: string
  user_id: string
  recorded_at: string
  weight: number | string | null
  waist_circumference: number | string | null
  neck_circumference: number | string | null
  body_fat_percentage: number | string | null
}

function toRow(entry: BodyMeasurement): BodyMeasurementRow {
  return {
    id: entry.id,
    user_id: entry.userId,
    recorded_at: entry.recordedAt,
    weight: entry.weightKg,
    waist_circumference: entry.waistCircumferenceCm,
    neck_circumference: entry.neckCircumferenceCm,
    body_fat_percentage: entry.bodyFatPercentage,
  }
}

function fromRow(row: BodyMeasurementRow): BodyMeasurement | null {
  return normalizeBodyMeasurement({
    id: row.id,
    user_id: row.user_id,
    recorded_at: row.recorded_at,
    weight: nullableNumber(row.weight),
    waist_circumference: nullableNumber(row.waist_circumference),
    neck_circumference: nullableNumber(row.neck_circumference),
    body_fat_percentage: nullableNumber(row.body_fat_percentage),
  })
}

export async function pullBodyMeasurements(): Promise<BodyMeasurement[] | null> {
  if (!isSupabaseConfigured || !supabase) return null
  for (const owner of SHARED_OWNER_ALIASES) {
    const { data, error } = await supabase
      .from('body_measurements')
      .select(
        'id, user_id, recorded_at, weight, waist_circumference, neck_circumference, body_fat_percentage',
      )
      .eq('user_id', owner)
      .order('recorded_at', { ascending: true })
    if (error) {
      console.error('[bodyMeasurements] pull failed', error.message)
      return null
    }
    if (data?.length) {
      return unionBodyMeasurements(
        (data as BodyMeasurementRow[]).map(fromRow).filter(Boolean) as BodyMeasurement[],
      )
    }
  }
  const { data, error } = await supabase
    .from('body_measurements')
    .select(
      'id, user_id, recorded_at, weight, waist_circumference, neck_circumference, body_fat_percentage',
    )
    .order('recorded_at', { ascending: true })
  if (error || !data) return error ? null : []
  return unionBodyMeasurements(
    (data as BodyMeasurementRow[]).map(fromRow).filter(Boolean) as BodyMeasurement[],
  )
}

export async function pushBodyMeasurements(
  entries: BodyMeasurement[],
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || entries.length === 0) return false
  const { error } = await supabase
    .from('body_measurements')
    .upsert(entries.map(toRow), { onConflict: 'id' })
  if (error) {
    console.error('[bodyMeasurements] upsert failed', error.message)
    return false
  }
  return true
}
