import type { WeightEntry } from './types'
import { localDateKey } from './types'

/**
 * Local calendar day (YYYY-MM-DD) of a weigh-in. Date-only and local
 * timestamps (`2026-10-22T12:00:00`) are read as written; UTC / offset
 * timestamps are converted to the device's local day.
 */
export function weightEntryDateKey(entry: Pick<WeightEntry, 'loggedAt'>): string {
  const raw = entry.loggedAt
  if (/(?:Z|[+-]\d{2}:?\d{2})$/.test(raw)) {
    const parsed = new Date(raw)
    if (!Number.isNaN(parsed.getTime())) return localDateKey(parsed)
  }
  return raw.slice(0, 10)
}

/** Newest first; same-day entries keep their logged order (latest first). */
export function sortWeightEntriesDesc(entries: WeightEntry[]): WeightEntry[] {
  return entries
    .map((entry, index) => ({ entry, index, day: weightEntryDateKey(entry) }))
    .sort((a, b) => b.day.localeCompare(a.day) || b.index - a.index)
    .map(({ entry }) => entry)
}

/** Latest weigh-in recorded on the given local day, if any. */
export function weightEntryOn(entries: WeightEntry[], day = localDateKey()) {
  return sortWeightEntriesDesc(entries).find(
    (e) => e.weightKg > 0 && weightEntryDateKey(e) === day,
  )
}
