import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
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
  weightOnDate,
  type BodyLogEntry,
  type BodyLogField,
  type BodyLogInput,
} from '../../lib/bodyLog'
import { parsePositiveDecimal } from '../../lib/numericInput'
import { todayKey } from '../../lib/types'
import { Button } from '../ui/button'
import { Modal } from '../ui/Modal'
import { NumericInput } from '../ui/NumericInput'

type Form = Record<BodyLogField, string> & { date: string; note: string }

function emptyForm(): Form {
  return { date: todayKey(), note: '', bodyFatPct: '', waistCm: '', chestCm: '', armCm: '', shouldersCm: '', thighCm: '' }
}

function toForm(entry: BodyLogEntry): Form {
  const form = emptyForm()
  form.date = entry.date
  form.note = entry.note
  for (const f of BODY_LOG_FIELDS) form[f.key] = entry[f.key] != null ? String(entry[f.key]) : ''
  return form
}

export function formatDayHe(date: string): string {
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y}`
}

/** Green when the change goes the desired way, amber otherwise. */
export function deltaTone(value: number, lowerIsBetter: boolean): string {
  if (value === 0) return 'bg-slate-100 text-slate-600'
  const good = lowerIsBetter ? value < 0 : value > 0
  return good ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
}

/**
 * Single write path for the monthly body log: a new entry (or an edit by id).
 * A date never overwrites another date. The newest waist also updates the profile.
 */
export function useBodyLogSaver() {
  const { bodyLog, bodyLogHistory, updateBodyLog, profile, setProfile } = useAppData()
  return {
    save(input: BodyLogInput, id?: string | null) {
      updateBodyLog((prev) => upsertBodyLogEntry(prev, id ? { ...input, id } : input))
      const newerWaist = bodyLogHistory.some((e) => e.id !== id && e.waistCm != null && e.date > input.date)
      if (input.waistCm != null && !newerWaist && input.waistCm !== profile.waistCircumferenceCm) {
        setProfile({ ...profile, waistCircumferenceCm: input.waistCm })
      }
    },
    /** Merge fields into that day's entry (create it if missing); other days stay untouched. */
    mergeDay(date: string, patch: Partial<Pick<BodyLogEntry, BodyLogField>>, note: string) {
      const sameDay = [...bodyLogHistory].reverse().find((e) => e.date === date) ?? null
      const base = sameDay ? { ...sameDay } : null
      const input: BodyLogInput = {
        date,
        note: base?.note || note,
        bodyFatPct: patch.bodyFatPct ?? base?.bodyFatPct ?? null,
        waistCm: patch.waistCm ?? base?.waistCm ?? null,
        chestCm: patch.chestCm ?? base?.chestCm ?? null,
        armCm: patch.armCm ?? base?.armCm ?? null,
        shouldersCm: patch.shouldersCm ?? base?.shouldersCm ?? null,
        thighCm: patch.thighCm ?? base?.thighCm ?? null,
      }
      if (!hasAnyMeasure(input)) return
      updateBodyLog((prev) => upsertBodyLogEntry(prev, sameDay ? { ...input, id: sameDay.id } : input))
    },
    remove(entry: BodyLogEntry) {
      updateBodyLog((prev) => deleteBodyLogEntry(prev, bodyLog[entry.id] ?? entry))
    },
  }
}

/** Date + body fat % + 5 circumferences + note. New entry, or edit when `entry` is given. */
export function BodyLogForm({
  entry,
  onDone,
  onCancel,
}: {
  entry?: BodyLogEntry | null
  onDone?: () => void
  onCancel?: () => void
}) {
  const { save } = useBodyLogSaver()
  const [form, setForm] = useState<Form>(() => (entry ? toForm(entry) : emptyForm()))
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

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
    save({ ...values, date: form.date, note: form.note }, entry?.id)
    if (!entry) setForm(emptyForm())
    setError(null)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
    onDone?.()
  }

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault()
        // May render inside another form's subtree (Profile card): never submit that one.
        e.stopPropagation()
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
          {saved ? 'נשמר ✓' : entry ? 'עדכן מדידה' : 'שמור מדידה חודשית'}
        </Button>
        {onCancel ? (
          <Button type="button" variant="surface" onClick={onCancel}>
            ביטול
          </Button>
        ) : null}
      </div>
    </form>
  )
}

/** Chronological (newest first) table of every body-log entry with edit / delete. */
function BodyLogHistoryTable({ onEdit }: { onEdit: (entry: BodyLogEntry) => void }) {
  const { bodyLogHistory, weightLogs } = useAppData()
  const { remove } = useBodyLogSaver()
  const deltas = useMemo(() => bodyLogDeltas(bodyLogHistory), [bodyLogHistory])
  const rows = useMemo(() => [...bodyLogHistory].reverse(), [bodyLogHistory])
  const circumferences = BODY_LOG_FIELDS.filter((f) => f.key !== 'bodyFatPct')

  if (!rows.length) return <p className="text-sm text-muted">אין מדידות עדיין.</p>

  return (
    <div className="no-scrollbar -mx-1 overflow-x-auto">
      <table className="w-full min-w-[460px] text-right text-xs">
        <thead>
          <tr className="border-b border-slate-200 text-[11px] text-muted">
            <th className="px-1.5 py-2 font-medium">תאריך</th>
            <th className="px-1.5 py-2 font-medium">אחוז שומן</th>
            <th className="px-1.5 py-2 font-medium">משקל</th>
            <th className="px-1.5 py-2 font-medium">היקפים (ס"מ)</th>
            <th className="px-1.5 py-2 font-medium">
              <span className="sr-only">פעולות</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((entry) => {
            const fat = deltas.get(entry.id)?.bodyFatPct
            const weight = weightOnDate(weightLogs, entry.date)
            const circ = circumferences.filter((f) => entry[f.key] != null)
            return (
              <tr key={entry.id} className="border-b border-slate-100 align-top">
                <td className="whitespace-nowrap px-1.5 py-2.5 font-semibold tabular-nums text-text">
                  {formatDayHe(entry.date)}
                  {entry.note ? <p className="mt-0.5 max-w-24 text-[10px] font-normal text-muted">{entry.note}</p> : null}
                </td>
                <td className="whitespace-nowrap px-1.5 py-2.5">
                  <span className="font-display font-bold tabular-nums text-text">
                    {formatMeasure(entry.bodyFatPct, '%')}
                  </span>
                  {fat?.vsPrevious != null ? (
                    <span
                      className={`ms-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${deltaTone(fat.vsPrevious, true)}`}
                      dir="ltr"
                    >
                      {formatSigned(fat.vsPrevious, '%')}
                    </span>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-1.5 py-2.5 tabular-nums text-muted">
                  {weight != null ? `${weight} ק"ג` : '—'}
                </td>
                <td className="px-1.5 py-2.5 text-[11px] leading-relaxed text-slate-700">
                  {circ.length
                    ? circ.map((f) => `${f.short} ${formatMeasure(entry[f.key], '').trim()}`).join(' · ')
                    : '—'}
                </td>
                <td className="whitespace-nowrap px-0.5 py-1.5">
                  <button
                    type="button"
                    aria-label={`עריכת מדידה ${formatDayHe(entry.date)}`}
                    onClick={() => onEdit(entry)}
                    className="inline-flex size-9 items-center justify-center rounded-xl text-muted transition hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Pencil className="size-3.5" strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    aria-label={`מחיקת מדידה ${formatDayHe(entry.date)}`}
                    onClick={() => {
                      if (window.confirm(`למחוק את המדידה מ-${formatDayHe(entry.date)}?`)) remove(entry)
                    }}
                    className="inline-flex size-9 items-center justify-center rounded-xl text-muted transition hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.75} />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** "📊 טבלת היסטוריית אחוזי שומן ומדדים": button + modal (table ⇄ edit form). */
export function BodyLogHistoryButton({ className = '' }: { className?: string }) {
  const { bodyLogHistory } = useAppData()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<BodyLogEntry | null>(null)
  const close = () => {
    setOpen(false)
    setEditing(null)
  }
  return (
    <>
      <Button type="button" variant="surface" className={`w-full ${className}`} onClick={() => setOpen(true)}>
        📊 טבלת היסטוריית אחוזי שומן ומדדים
        <span className="rounded-full bg-white px-1.5 text-[11px] tabular-nums text-muted">{bodyLogHistory.length}</span>
      </Button>
      {createPortal(
      <Modal
        open={open}
        title={editing ? `עריכת מדידה · ${formatDayHe(editing.date)}` : 'היסטוריית אחוזי שומן ומדדים'}
        onClose={close}
        wide
      >
        <div dir="rtl">
          {editing ? (
            <BodyLogForm key={editing.id} entry={editing} onDone={() => setEditing(null)} onCancel={() => setEditing(null)} />
          ) : (
            <BodyLogHistoryTable onEdit={setEditing} />
          )}
        </div>
      </Modal>,
        document.body,
      )}
    </>
  )
}
