import { useEffect, useRef, useState } from 'react'
import { Check, Pencil, Trash2, Undo2, X } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { displayDecimal, formatKg, formatPct, parsePositiveDecimal } from '../../lib/numericInput'
import type { WeightEntry } from '../../lib/types'
import { localDateKey, parseLocalDateKey } from '../../lib/types'
import { sortWeightEntriesDesc, weightEntryDateKey } from '../../lib/weightLog'
import { Accordion, AccordionContent, AccordionItem } from '../ui/accordion'
import { Card } from '../ui/Card'
import { NumericInput } from '../ui/NumericInput'

const VISIBLE_COUNT = 5
const UNDO_MS = 6000

type WeightTrackerProps = {
  entries: WeightEntry[]
}

function dateLabel(entry: WeightEntry) {
  return parseLocalDateKey(weightEntryDateKey(entry)).toLocaleDateString('he-IL')
}

type WeightPatch = { weightKg: number; loggedAt: string }

/** Mounted only while editing, so drafts always start from the entry. */
function WeightEditRow({
  entry,
  onCancel,
  onSave,
}: {
  entry: WeightEntry
  onCancel: () => void
  onSave: (patch: WeightPatch) => void
}) {
  const [weight, setWeight] = useState(() => displayDecimal(entry.weightKg, 2))
  const [date, setDate] = useState(() => weightEntryDateKey(entry))
  const parsed = parsePositiveDecimal(weight)

  return (
    <li className="rounded-2xl border border-blue-200 bg-blue-50/60 px-3 py-2.5">
      <form
        className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_2.75rem_2.75rem] items-end gap-1.5"
        onSubmit={(e) => {
          e.preventDefault()
          if (parsed == null || !date) return
          onSave({ weightKg: parsed, loggedAt: date })
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel()
        }}
      >
        <label className="block text-[11px] text-muted">
          תאריך
          <input
            type="date"
            value={date}
            max={localDateKey()}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 field"
            required
          />
        </label>
        <label className="block text-[11px] text-muted">
          ק״ג
          <NumericInput value={weight} onChange={setWeight} aria-label="משקל" required />
        </label>
        <button
          type="submit"
          disabled={parsed == null || !date}
          aria-label="שמור שינוי"
          className="flex size-11 items-center justify-center rounded-2xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Check className="size-4" strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={onCancel}
          aria-label="בטל עריכה"
          className="flex size-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-muted transition hover:text-text"
        >
          <X className="size-4" strokeWidth={2.5} />
        </button>
      </form>
    </li>
  )
}

function WeightRow({
  entry,
  editing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  entry: WeightEntry
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (patch: WeightPatch) => void
  onDelete: () => void
}) {
  if (editing) return <WeightEditRow entry={entry} onCancel={onCancel} onSave={onSave} />

  return (
    <li className="flex min-h-12 items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm">
      <span className="min-w-0 truncate text-muted">
        {dateLabel(entry)}
        {entry.note ? ` · ${entry.note}` : ''}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <span className="font-display font-bold tabular-nums text-text">
          {formatKg(entry.weightKg)} ק״ג
          {entry.bodyFatPct != null ? (
            <span className="ms-1 text-xs font-medium text-muted">
              · {formatPct(entry.bodyFatPct)}%
            </span>
          ) : null}
        </span>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`עריכת שקילה ${dateLabel(entry)}`}
          className="flex size-9 items-center justify-center rounded-full text-muted transition hover:bg-white hover:text-blue-600"
        >
          <Pencil className="size-3.5" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`מחיקת שקילה ${dateLabel(entry)}`}
          className="flex size-9 items-center justify-center rounded-full text-muted transition hover:bg-rose-50 hover:text-danger"
        >
          <Trash2 className="size-3.5" strokeWidth={2} />
        </button>
      </span>
    </li>
  )
}

export function WeightFatTracker({ entries }: WeightTrackerProps) {
  const { updateWeight, deleteWeight, restoreWeight } = useAppData()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [undo, setUndo] = useState<WeightEntry | null>(null)
  const undoTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (undoTimer.current != null) window.clearTimeout(undoTimer.current)
    }
  }, [])

  const weights = sortWeightEntriesDesc(entries.filter((e) => e.weightKg > 0))
  const recent = weights.slice(0, VISIBLE_COUNT)
  const older = weights.slice(VISIBLE_COUNT)

  function handleDelete(entry: WeightEntry) {
    if (editingId === entry.id) setEditingId(null)
    deleteWeight(entry.id)
    setUndo(entry)
    if (undoTimer.current != null) window.clearTimeout(undoTimer.current)
    undoTimer.current = window.setTimeout(() => setUndo(null), UNDO_MS)
  }

  function handleUndo() {
    if (!undo) return
    restoreWeight(undo)
    setUndo(null)
    if (undoTimer.current != null) window.clearTimeout(undoTimer.current)
  }

  const renderRow = (entry: WeightEntry) => (
    <WeightRow
      key={entry.id}
      entry={entry}
      editing={editingId === entry.id}
      onEdit={() => setEditingId(entry.id)}
      onCancel={() => setEditingId(null)}
      onSave={(patch) => {
        updateWeight(entry.id, patch)
        setEditingId(null)
      }}
      onDelete={() => handleDelete(entry)}
    />
  )

  return (
    <Card title="מעקב משקל">
      {undo ? (
        <div
          role="status"
          className="mb-2 flex items-center justify-between gap-2 rounded-2xl bg-slate-800 px-3 py-2 text-sm text-white"
        >
          <span>
            השקילה מ-{dateLabel(undo)} ({formatKg(undo.weightKg)} ק״ג) נמחקה
          </span>
          <button
            type="button"
            onClick={handleUndo}
            className="inline-flex min-h-9 items-center gap-1 rounded-xl px-2 font-semibold text-sky-300 hover:bg-white/10"
          >
            <Undo2 className="size-3.5" strokeWidth={2} />
            בטל
          </button>
        </div>
      ) : null}
      {weights.length === 0 ? (
        <p className="text-sm text-muted">אין מדידות משקל עדיין.</p>
      ) : (
        <>
          <ul className="space-y-1.5">{recent.map(renderRow)}</ul>
          {older.length > 0 ? (
            <Accordion
              type="single"
              collapsible
              value={historyOpen ? 'history' : ''}
              onValueChange={(v) => setHistoryOpen(v === 'history')}
              className="mt-2"
            >
              <AccordionItem value="history" className="border-0">
                <AccordionContent className="px-0 pt-1.5 pb-0">
                  <ul className="space-y-1.5">{older.map(renderRow)}</ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ) : null}
          {older.length > 0 ? (
            <button
              type="button"
              aria-expanded={historyOpen}
              onClick={() => setHistoryOpen((o) => !o)}
              className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-slate-100 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              {historyOpen
                ? 'הסתר היסטוריית שקילות'
                : `הצג היסטוריית שקילות מלאה (${weights.length} שקילות)`}
            </button>
          ) : null}
        </>
      )}
    </Card>
  )
}
