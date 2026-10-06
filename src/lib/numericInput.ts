/** Hard cap for every numeric field in the app. */
export const NUMERIC_MAX_DECIMALS = 2

/** Drafts while typing a decimal, e.g. "", "7", "75.", "75.5", "75.50". */
export const DECIMAL_DRAFT = /^\d*\.?\d{0,2}$/
export const INTEGER_DRAFT = /^\d*$/

export function clampDecimalPlaces(decimals?: number): number {
  if (decimals == null || !Number.isFinite(decimals)) return NUMERIC_MAX_DECIMALS
  return Math.min(NUMERIC_MAX_DECIMALS, Math.max(0, Math.round(decimals)))
}

export function safeInputValue(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'number') {
    return Number.isFinite(value) ? formatNiceNumber(value) : ''
  }
  const s = String(value)
  if (s === '' || s === 'NaN' || s === 'undefined' || s === 'null') return ''
  return s
}

/** Keep a single decimal separator; accept comma / Arabic separators while typing. */
export function normalizeNumericDraft(raw: string): string {
  const unified = raw.replace(/[٫,،·]/g, '.')
  let out = ''
  let seenDot = false
  for (const ch of unified) {
    if (ch >= '0' && ch <= '9') out += ch
    else if (ch === '.' && !seenDot) {
      out += '.'
      seenDot = true
    }
  }
  return out
}

export function isAllowedNumericDraft(raw: string, decimals = 2): boolean {
  if (raw === '') return true
  const places = clampDecimalPlaces(decimals)
  if (places <= 0) return INTEGER_DRAFT.test(raw)
  if (places === 2) return DECIMAL_DRAFT.test(raw)
  return new RegExp(`^\\d*\\.?\\d{0,${places}}$`).test(raw)
}

export function acceptNumericInput(
  raw: string,
  decimals = 2,
): string | null {
  const next = normalizeNumericDraft(raw)
  return isAllowedNumericDraft(next, clampDecimalPlaces(decimals)) ? next : null
}

export function isIncompleteNumericDraft(raw: string): boolean {
  const t = raw.trim()
  return t === '' || t === '.' || t.endsWith('.')
}

export function roundTo(value: number, digits = 2): number {
  if (!Number.isFinite(value)) return 0
  const places = Math.min(NUMERIC_MAX_DECIMALS, Math.max(0, digits))
  const f = 10 ** places
  return Math.round(value * f) / f
}

/** Clean display: 0.5 not 0.50 / 0.5000001. */
export function formatNiceNumber(value: number, maxDigits = 2): string {
  if (!Number.isFinite(value)) return ''
  return String(roundTo(value, Math.min(NUMERIC_MAX_DECIMALS, maxDigits)))
}

/** Parse only when committing to state/DB. Never returns NaN. */
export function parseDecimal(raw: string | number | null | undefined): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? roundTo(raw, NUMERIC_MAX_DECIMALS) : null
  }
  if (raw == null) return null
  const t = String(raw).trim().replace(/[٫,،·]/g, '.')
  if (t === '' || t === '.') return null
  const n = parseFloat(t)
  return Number.isFinite(n) ? roundTo(n, NUMERIC_MAX_DECIMALS) : null
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
  return formatNiceNumber(value, digits ?? 2)
}

export function formatKg(value: number | null | undefined, fallback = '—'): string {
  if (value == null || !Number.isFinite(value)) return fallback
  return formatNiceNumber(value, 2)
}

export function formatPct(value: number | null | undefined, fallback = '—'): string {
  if (value == null || !Number.isFinite(value)) return fallback
  return formatNiceNumber(value, 2)
}

/** Keep an in-progress draft ("75.") instead of snapping back to "75". */
export function syncNumericDraft(
  draft: string,
  value: number | null | undefined,
  digits = 2,
): string {
  if (isIncompleteNumericDraft(draft)) return draft
  const parsed = parseDecimal(draft)
  if (value == null) return parsed == null && draft === '' ? '' : draft
  if (parsed != null && roundTo(parsed, digits) === roundTo(value, digits)) {
    return draft
  }
  return displayDecimal(value, digits)
}
