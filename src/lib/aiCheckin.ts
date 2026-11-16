import { localDateKey, parseLocalDateKey } from './types'

export const AI_CHECKIN_INTERVAL_DAYS = 28
/** Legacy device-local copy of the anchor (pre cycle-sync builds). Read-only fallback. */
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

export function clampIntervalDays(value: number, fallback = AI_CHECKIN_INTERVAL_DAYS): number {
  const n = Math.round(value)
  return Number.isFinite(n) && n >= 1 ? Math.min(365, n) : fallback
}

/**
 * Days left in an AI review cycle: `intervalDays − (today − anchor)`.
 * The anchor only moves when the user explicitly resets/edits the cycle, so the
 * value counts down by one every calendar day. ≤ 0 means a review is due.
 */
export function daysUntilReview(
  anchorDate: string | null | undefined,
  intervalDays: number,
  today = localDateKey(),
): number {
  const anchor = dateKey(anchorDate)
  if (!anchor) return 0
  return clampIntervalDays(intervalDays) - daysBetween(anchor, today)
}

export function aiCheckinLabel(daysRemaining: number): string {
  if (daysRemaining <= 0) return 'הגיע הזמן לעדכון AI! לחץ לבדיקה'
  if (daysRemaining === 1) return 'עדכון AI מומלץ מחר'
  return `עדכון AI מומלץ בעוד ${daysRemaining} ימים`
}

export function readLastAiExportAt(): string | null {
  try {
    const raw = localStorage.getItem(LAST_AI_EXPORT_KEY)
    if (raw == null) return null
    const parsed = JSON.parse(raw) as unknown
    return dateKey(typeof parsed === 'string' ? parsed : null)
  } catch {
    try {
      return dateKey(localStorage.getItem(LAST_AI_EXPORT_KEY))
    } catch {
      return null
    }
  }
}

export function shiftDateKey(key: string, days: number): string {
  const date = parseLocalDateKey(key)
  date.setDate(date.getDate() + days)
  return localDateKey(date)
}
