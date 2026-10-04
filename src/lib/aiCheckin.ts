import { localDateKey, parseLocalDateKey } from './types'

export const AI_CHECKIN_INTERVAL_DAYS = 28
export const LAST_AI_EXPORT_KEY = 'tn.lastAiExportAt.v1'

function dateKey(value: string | null | undefined): string | null {
  if (!value) return null
  const key = value.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null
}

export function latestDateKey(
  ...values: Array<string | null | undefined>
): string | null {
  const keys = values.map(dateKey).filter((key): key is string => key != null)
  if (keys.length === 0) return null
  return keys.sort()[keys.length - 1] ?? null
}

export function daysBetween(fromKey: string, toKey: string): number {
  const from = parseLocalDateKey(fromKey)
  const to = parseLocalDateKey(toKey)
  return Math.round((to.getTime() - from.getTime()) / 86400000)
}

/** Days left until the next recommended AI check-in. ≤ 0 means due today. */
export function daysUntilAiCheckin(
  lastExportAt: string | null | undefined,
  phaseStartDate: string | null | undefined,
  today = localDateKey(),
): number {
  const reference = latestDateKey(lastExportAt, phaseStartDate)
  if (!reference) return 0
  return AI_CHECKIN_INTERVAL_DAYS - daysBetween(reference, today)
}

export function aiCheckinLabel(daysRemaining: number): string {
  if (daysRemaining <= 0) return 'מומלץ לבצע עדכון AI היום'
  return `עדכון AI מומלץ בעוד ${daysRemaining} ימים`
}

export function readLastAiExportAt(): string | null {
  try {
    const raw = localStorage.getItem(LAST_AI_EXPORT_KEY)
    if (raw == null) return null
    const parsed = JSON.parse(raw) as unknown
    return dateKey(typeof parsed === 'string' ? parsed : null)
  } catch {
    return dateKey(localStorage.getItem(LAST_AI_EXPORT_KEY))
  }
}

export function writeLastAiExportAt(iso = localDateKey()): string {
  const key = dateKey(iso) ?? localDateKey()
  localStorage.setItem(LAST_AI_EXPORT_KEY, JSON.stringify(key))
  return key
}

export function mergeLastAiExportAt(existing: string | null | undefined): string | null {
  return latestDateKey(existing, readLastAiExportAt())
}
