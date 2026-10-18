import { useState } from 'react'
import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react'
import type { WeekConsistency } from '../../lib/weeklyConsistency'
import { Modal } from '../ui/Modal'

export const WEEKS_PER_PAGE = 10
const COUNT_OPTIONS = [0, 1, 2, 3, 4, 5] as const

/** Blue intensity scale for 0–5 (5+ uses the gradient). */
export function weekCountTone(count: number): string {
  if (count <= 0) return 'bg-white text-slate-600 border border-slate-200'
  if (count === 1) return 'bg-sky-50 text-sky-900 border border-sky-200'
  if (count === 2) return 'bg-sky-200 text-sky-950 border border-sky-300'
  if (count === 3) return 'bg-blue-400 text-white border border-blue-500'
  if (count === 4) return 'bg-blue-600 text-white border border-blue-700'
  return 'bg-gradient-to-l from-blue-950 via-blue-700 to-sky-500 text-white border border-sky-400 shadow-sm font-bold'
}

function rangeLabel(week: WeekConsistency) {
  const fmt = (d: Date) =>
    d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
  return `${fmt(week.start)} – ${fmt(week.end)}`
}

function TrackerRow({
  week,
  editing,
  onToggleEdit,
  onSetCount,
}: {
  week: WeekConsistency
  editing: boolean
  onToggleEdit: () => void
  onSetCount: (count: number) => void
}) {
  const muted = week.completed >= 3 ? 'text-white/80' : 'text-current opacity-70'

  return (
    <li className={`rounded-xl px-3 py-2 transition-colors ${weekCountTone(week.completed)}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 text-right">
          <p className="text-sm font-semibold">שבוע {week.weekNumber}</p>
          <p className={`text-[11px] ${muted}`}>{rangeLabel(week)}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="min-w-6 text-center text-lg font-extrabold tabular-nums">
            {week.completed}
          </span>
          <button
            type="button"
            onClick={onToggleEdit}
            aria-expanded={editing}
            aria-label={`עריכת מספר אימונים לשבוע ${week.weekNumber}`}
            className="flex size-8 items-center justify-center rounded-full bg-black/5 transition hover:bg-black/10"
          >
            <Pencil className="size-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>
      {editing ? (
        <div className="mt-2 grid grid-cols-6 gap-1" role="radiogroup">
          {COUNT_OPTIONS.map((n) => {
            const active = Math.min(week.completed, 5) === n
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onSetCount(n)}
                className={[
                  'min-h-9 rounded-lg text-sm font-bold tabular-nums transition',
                  active
                    ? 'bg-white text-blue-700 ring-2 ring-blue-500'
                    : 'bg-white/70 text-slate-700 hover:bg-white',
                ].join(' ')}
              >
                {n}
              </button>
            )
          })}
        </div>
      ) : null}
    </li>
  )
}

export function AllTimeWeeksTracker({
  open,
  onClose,
  weeks,
  onSetCount,
}: {
  open: boolean
  onClose: () => void
  /** Any order; displayed ascending from week 1. */
  weeks: WeekConsistency[]
  onSetCount: (week: WeekConsistency, count: number) => void
}) {
  const [page, setPage] = useState(0)
  const [editingKey, setEditingKey] = useState<string | null>(null)

  const ordered = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber)
  const pageCount = Math.max(1, Math.ceil(ordered.length / WEEKS_PER_PAGE))
  const current = Math.min(page, pageCount - 1)
  const visible = ordered.slice(
    current * WEEKS_PER_PAGE,
    current * WEEKS_PER_PAGE + WEEKS_PER_PAGE,
  )

  function goTo(next: number) {
    setEditingKey(null)
    setPage(Math.max(0, Math.min(pageCount - 1, next)))
  }

  return (
    <Modal open={open} title="מעקב שבועות מלא" onClose={onClose}>
      <div dir="rtl" className="w-full max-w-md space-y-3">
        <p className="text-xs text-muted">
          {ordered.length} שבועות מהיום הראשון. עיפרון לעדכון ספירה שנשכחה.
        </p>
        <ul className="space-y-1.5">
          {visible.map((week) => (
            <TrackerRow
              key={week.weekKey}
              week={week}
              editing={editingKey === week.weekKey}
              onToggleEdit={() =>
                setEditingKey((k) => (k === week.weekKey ? null : week.weekKey))
              }
              onSetCount={(n) => onSetCount(week, n)}
            />
          ))}
        </ul>
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => goTo(current - 1)}
            disabled={current === 0}
            className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="size-4" strokeWidth={2} />
            הקודם
          </button>
          <span className="text-xs font-medium text-muted tabular-nums">
            עמוד {current + 1} מתוך {pageCount}
          </span>
          <button
            type="button"
            onClick={() => goTo(current + 1)}
            disabled={current >= pageCount - 1}
            className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            הבא
            <ChevronLeft className="size-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </Modal>
  )
}
