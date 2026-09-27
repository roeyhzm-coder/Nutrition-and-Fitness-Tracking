/** Drafts while typing a decimal, e.g. "", "7", "75.", "75.5", "75.50". */
export const DECIMAL_DRAFT = /^\d*\.?\d{0,2}$/
export const INTEGER_DRAFT = /^\d*$/

export function safeInputValue(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : ''
  }
  const s = String(value).trim()
  if (s === '' || s === 'NaN' || s === 'undefined' || s === 'null') return ''
  return String(value)
}

export function normalizeNumericDraft(raw: string): string {
  return raw.replace(',', '.').replace(/[^\d.]/g, '')
}

export function isAllowedNumericDraft(raw: string, decimals = 2): boolean {
  if (raw === '') return true
  if (decimals <= 0) return INTEGER_DRAFT.test(raw)
  const pattern =
    decimals === 2 ? DECIMAL_DRAFT : new RegExp(`^\\d*\\.?\\d{0,${decimals}}$`)
  return pattern.test(raw)
}

export function acceptNumericInput(
  raw: string,
  decimals = 2,
): string | null {
  const next = normalizeNumericDraft(raw)
  return isAllowedNumericDraft(next, decimals) ? next : null
}

/** Parse only when committing to state/DB. Never returns NaN. */
export function parseDecimal(raw: string | number | null | undefined): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  if (raw == null) return null
  const t = String(raw).trim().replace(',', '.')
  if (t === '' || t === '.') return null
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : null
}

export function parsePositiveDecimal(
  raw: string | number | null | undefined,
): number | null {
  const n = parseDecimal(raw)
  return n != null && n > 0 ? n : null
}

export function parseInteger(raw: string | number | null | undefined): number | null {
  const n = parseDecimal(raw)
  if (n == null) return null
  return Number.isFinite(n) ? Math.round(n) : null
}

export function displayDecimal(
  value: number | null | undefined,
  digits?: number,
): string {
  if (value == null || !Number.isFinite(value)) return ''
  return digits != null ? value.toFixed(digits) : String(value)
}

export function formatKg(value: number | null | undefined, fallback = '—'): string {
  if (value == null || !Number.isFinite(value)) return fallback
  return value.toFixed(2)
}

export function formatPct(value: number | null | undefined, fallback = '—'): string {
  if (value == null || !Number.isFinite(value)) return fallback
  return value.toFixed(2)
}
