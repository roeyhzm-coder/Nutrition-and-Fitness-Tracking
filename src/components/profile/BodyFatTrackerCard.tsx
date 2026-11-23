import { useMemo, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import {
  BODY_LOG_FIELDS,
  bodyLogDeltas,
  deleteBodyLogEntry,
  formatMeasure,
  formatSigned,
  hasAnyMeasure,
  upsertBodyLogEntry,
  type BodyLogEntry,
  type BodyLogField,
} from '../../lib/bodyLog'
import { parsePositiveDecimal } from '../../lib/numericInput'
import { todayKey } from '../../lib/types'
import { Button } from '../ui/button'
import { Card } from '../ui/Card'
import { NumericInput } from '../ui/NumericInput'

type Form = Record<BodyLogField, string> & { date: string; note: string }

const EMPTY_FORM = (): Form => ({
  date: todayKey(),
  note: '',
  bodyFatPct: '',
  waistCm: '',
  chestCm: '',
  armCm: '',
  shouldersCm: '',
  thighCm: '',
})

function toForm(entry: BodyLogEntry): Form {
  const form = EMPTY_FORM()
  form.date = entry.date
  form.note = entry.note
  for (const f of BODY_LOG_FIELDS) form[f.key] = entry[f.key] != null ? String(entry[f.key]) : ''
  return form
}

function deltaTone(value: number, lowerIsBetter: boolean): string {
  if (value === 0) return 'bg-slate-100 text-slate-600'
  const good = lowerIsBetter ? value < 0 : value > 0
  return good ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
}

function fmtDate(date: string) {
  const [y, m, d] = date.split('-')
  return `${Number(d)}.${Number(m)}.${y?.slice(2)}`
}

/** "מעקב אחוזי שומן והיקפים חודשי": monthly body fat % + circumferences with deltas. */
export function BodyFatTrackerCard() {
  const { bodyLog, bodyLogHistory, latestBody, updateBodyLog, profile, setProfile } = useAppData()
  const [form, setForm] = useState<Form>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deltas = useMemo(() => bodyLogDeltas(bodyLogHistory), [bodyLogHistory])
  const newestFirst = useMemo(() => [...bodyLogHistory].reverse(), [bodyLogHistory])
  const trend =
    latestBody.baselineFatPct != null && latestBody.bodyFatPct != null
      ? Math.round((latestBody.bodyFatPct - latestBody.baselineFatPct) * 100) / 100
      : null

  function reset() {
    setForm(EMPTY_FORM())
    setEditingId(null)
    setError(null)
  }

  function submit() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      setError('בחר תאריך תקין')
      return
    }
    const values = {} as Record<BodyLogField, number | null>
    for (const f of BODY_LOG_FIELDS) {
      const raw = form[f.key].trim()
      const n = raw ? parsePositiveDecimal(raw) : null
      if (raw && (n == null || n >= f.max)) {
        setError(`ערך לא תקין: ${f.label}`)
        return
      }
      values[f.key] = n
    }
    if (!hasAnyMeasure(values)) {
      setError('הזן לפחות מדד אחד')
      return
    }
    const input = { ...values, date: form.date, note: form.note }
    updateBodyLog((prev) => upsertBodyLogEntry(prev, editingId ? { ...input, id: editingId } : input))
    // The newest waist reading also becomes the profile's waist (profile summary + Navy estimate).
    const newestOther = bodyLogHistory
      .filter((e) => e.id !== editingId && e.waistCm != null)
      .at(-1)
    if (values.waistCm != null && (!newestOther || form.date >= newestOther.date)) {
      setProfile({ ...profile, waistCircumferenceCm: values.waistCm })
    }
    reset()
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Card title="מעקב אחוזי שומן והיקפים חודשי">
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5">
        <p className="font-display text-lg font-extrabold tabular-nums text-text" dir="ltr">
          {latestBody.baselineFatPct != null && latestBody.bodyFatPct != null
            ? `${formatMeasure(latestBody.baselineFatPct, '%')} ➔ ${formatMeasure(latestBody.bodyFatPct, '%')}`
            : formatMeasure(latestBody.bodyFatPct, '%')}
        </p>
        {trend != null ? (
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${deltaTone(trend, true)}`} dir="ltr">
            {formatSigned(trend, '%')}
          </span>
        ) : null}
        <p className="w-full text-[11px] text-muted">
          מגמת שומן מתחילת הבלוק
          {latestBody.waistCm != null ? ` · מותן אחרון: ${formatMeasure(latestBody.waistCm, 'ס"מ')}` : ''}
        </p>
      </div>

      <form
        className="mb-4 space-y-2"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <label className="block text-xs text-muted">
          תאריך מדידה
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
            className="mt-1 field"
            required
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          {BODY_LOG_FIELDS.map((f) => (
            <label key={f.key} className="block text-xs text-muted">
              {f.label}
              <NumericInput
                decimals={f.key === 'bodyFatPct' ? 2 : 1}
                value={form[f.key]}
                onChange={(v) => {
                  setError(null)
                  setForm((p) => ({ ...p, [f.key]: v }))
                }}
                placeholder="—"
              />
            </label>
          ))}
        </div>
        <label className="block text-xs text-muted">
          הערה
          <input
            value={form.note}
            maxLength={200}
            onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
            className="mt-1 field"
            placeholder="למשל: בבוקר, בצום"
          />
        </label>
        {error ? (
          <p className="text-xs text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button type="submit" variant="accent" className="flex-1">
            {saved ? 'נשמר ✓' : editingId ? 'עדכן מדידה' : 'שמור מדידה חודשית'}
          </Button>
          {editingId ? (
            <Button type="button" variant="surface" onClick={reset}>
              ביטול
            </Button>
          ) : null}
        </div>
      </form>

      {newestFirst.length === 0 ? (
        <p className="text-sm text-muted">אין מדידות עדיין.</p>
      ) : (
        <ol className="space-y-2" aria-label="היסטוריית מדידות">
          {newestFirst.map((entry) => {
            const row = deltas.get(entry.id) ?? {}
            return (
              <li key={entry.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold tabular-nums text-text">
                    {fmtDate(entry.date)}
                    {entry.note ? <span className="ms-2 text-xs font-normal text-muted">{entry.note}</span> : null}
                  </p>
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      aria-label="עריכת מדידה"
                      onClick={() => {
                        setForm(toForm(entry))
                        setEditingId(entry.id)
                        setError(null)
                      }}
                      className="flex size-9 items-center justify-center rounded-xl text-muted transition hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Pencil className="size-3.5" strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      aria-label="מחיקת מדידה"
                      onClick={() => {
                        updateBodyLog((prev) => deleteBodyLogEntry(prev, bodyLog[entry.id] ?? entry))
                        if (editingId === entry.id) reset()
                      }}
                      className="flex size-9 items-center justify-center rounded-xl text-muted transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="size-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {BODY_LOG_FIELDS.map((f) => {
                    const d = row[f.key]
                    if (!d) return null
                    return (
                      <li key={f.key} className="rounded-xl bg-slate-50 px-2 py-1 text-[11px]">
                        <span className="text-muted">{f.short} </span>
                        <span className="font-bold tabular-nums text-text">{formatMeasure(d.value, f.unit)}</span>
                        {d.vsPrevious != null ? (
                          <span
                            className={`ms-1 rounded-full px-1.5 font-bold tabular-nums ${deltaTone(d.vsPrevious, f.lowerIsBetter)}`}
                            dir="ltr"
                          >
                            {formatSigned(d.vsPrevious, f.unit)}
                          </span>
                        ) : null}
                        {d.vsBaseline != null && d.vsBaseline !== d.vsPrevious ? (
                          <span className="ms-1 text-[10px] text-muted" dir="rtl">
                            (מהבסיס <span dir="ltr">{formatSigned(d.vsBaseline, f.unit)}</span>)
                          </span>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              </li>
            )
          })}
        </ol>
      )}
    </Card>
  )
}
