import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Pencil, StickyNote } from 'lucide-react'
import {
  WEEK_NOTE_MAX_LENGTH,
  type WeekConsistency,
} from '../../lib/weeklyConsistency'
import { Modal } from '../ui/Modal'

export const WEEKS_PER_PAGE = 10
const COUNT_OPTIONS = [0, 1, 2, 3, 4, 5] as const

export type WeekToneFn = (count: number) => { className: string; onDark: boolean }

/** Strength tracker scale (see weekCountTone): dark backgrounds from 3+. */
export const strengthWeekTone: WeekToneFn = (count) => ({
  className: weekCountTone(count),
  onDark: count >= 3,
})

type EditMode = 'count' | 'note'

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

function WeekNoteEditor({
  week,
  onSave,
  onCancel,
}: {
  week: WeekConsistency
  onSave: (text: string) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState(week.note ?? '')
  const unchanged = draft.trim() === (week.note ?? '')
  const inputId = `week-note-${week.weekKey}`

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onCancel()
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      if (!unchanged) onSave(draft)
    }
  }

  return (
    <form
      className="mt-2 space-y-2 rounded-xl bg-white p-2 text-slate-900 shadow-sm ring-1 ring-black/5"
      onSubmit={(e) => {
        e.preventDefault()
        if (!unchanged) onSave(draft)
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        הערה לשבוע {week.weekNumber}
      </label>
      <textarea
        id={inputId}
        dir="rtl"
        autoFocus
        rows={3}
        maxLength={WEEK_NOTE_MAX_LENGTH}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={`למשל: ${week.completed}/${week.target} בגלל משמרות עבודה עמוסות`}
        className="block w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] tabular-nums text-slate-400">
          {draft.length}/{WEEK_NOTE_MAX_LENGTH}
        </span>
        <div className="flex items-center gap-1.5">
          {week.note ? (
            <button
              type="button"
              onClick={() => onSave('')}
              className="min-h-9 rounded-lg px-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              מחק
            </button>
          ) : null}
          <button
            type="button"
            onClick={onCancel}
            className="min-h-9 rounded-lg px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={unchanged}
            className="min-h-9 rounded-lg bg-blue-600 px-3.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            שמור
          </button>
        </div>
      </div>
    </form>
  )
}

function TrackerRow({
  week,
  editMode,
  onToggleEdit,
  onSetCount,
  onSaveNote,
  tone,
  countOptions,
  showTarget,
}: {
  week: WeekConsistency
  editMode: EditMode | null
  onToggleEdit: (mode: EditMode) => void
  onSetCount: (count: number) => void
  onSaveNote: (text: string) => void
  tone: WeekToneFn
  countOptions: readonly number[]
  showTarget: boolean
}) {
  const { className: toneClass, onDark } = tone(week.completed)
  const muted = onDark ? 'text-white/80' : 'text-current opacity-70'
  const maxOption = countOptions[countOptions.length - 1] ?? 5
  const editingCount = editMode === 'count'
  const editingNote = editMode === 'note'
  const hasNote = !!week.note

  return (
    <li className={`rounded-xl px-3 py-2 transition-colors ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 text-right">
          <p className="text-sm font-semibold">שבוע {week.weekNumber}</p>
          <p className={`truncate text-[11px] ${muted}`}>{rangeLabel(week)}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="min-w-6 text-center text-lg font-extrabold tabular-nums">
            {week.completed}
            {showTarget ? (
              <span className={`text-xs font-semibold ${muted}`}>/{week.target}</span>
            ) : null}
          </span>
          <button
            type="button"
            onClick={() => onToggleEdit('note')}
            aria-expanded={editingNote}
            aria-label={
              hasNote
                ? `עריכת הערה לשבוע ${week.weekNumber}`
                : `הוספת הערה לשבוע ${week.weekNumber}`
            }
            title={hasNote ? week.note : 'הוספת הערה'}
            className={[
              'flex size-8 items-center justify-center rounded-full transition',
              hasNote
                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-blue-200 hover:bg-blue-50'
                : 'bg-black/5 hover:bg-black/10',
              editingNote ? 'ring-2 ring-blue-400' : '',
            ].join(' ')}
          >
            <StickyNote
              className="size-3.5"
              strokeWidth={2}
              fill={hasNote ? 'currentColor' : 'none'}
              fillOpacity={hasNote ? 0.25 : 0}
            />
          </button>
          <button
            type="button"
            onClick={() => onToggleEdit('count')}
            aria-expanded={editingCount}
            aria-label={`עריכת מספר אימונים לשבוע ${week.weekNumber}`}
            className="flex size-8 items-center justify-center rounded-full bg-black/5 transition hover:bg-black/10"
          >
            <Pencil className="size-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>
      {editingCount ? (
        <div
          className="mt-2 grid gap-1"
          style={{ gridTemplateColumns: `repeat(${countOptions.length}, minmax(0, 1fr))` }}
          role="radiogroup"
        >
          {countOptions.map((n) => {
            const active = Math.min(week.completed, maxOption) === n
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
      {editingNote ? (
        <WeekNoteEditor
          week={week}
          onSave={onSaveNote}
          onCancel={() => onToggleEdit('note')}
        />
      ) : null}
    </li>
  )
}

export function AllTimeWeeksTracker({
  open,
  onClose,
  weeks,
  onSetCount,
  onSaveNote,
  title = 'מעקב שבועות מלא',
  description,
  tone = strengthWeekTone,
  countOptions = COUNT_OPTIONS,
  showTarget = false,
}: {
  open: boolean
  onClose: () => void
  /** Any order; displayed ascending from week 1. */
  weeks: WeekConsistency[]
  onSetCount: (week: WeekConsistency, count: number) => void
  onSaveNote: (week: WeekConsistency, text: string) => void
  title?: string
  /** Replaces the default help line (week count + notes summary still shown). */
  description?: ReactNode
  tone?: WeekToneFn
  countOptions?: readonly number[]
  /** Show "/target" next to each week's count. */
  showTarget?: boolean
}) {
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState<{ key: string; mode: EditMode } | null>(
    null,
  )

  const ordered = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber)
  const pageCount = Math.max(1, Math.ceil(ordered.length / WEEKS_PER_PAGE))
  const current = Math.min(page, pageCount - 1)
  const visible = ordered.slice(
    current * WEEKS_PER_PAGE,
    current * WEEKS_PER_PAGE + WEEKS_PER_PAGE,
  )
  const notedCount = ordered.filter((w) => w.note).length

  function goTo(next: number) {
    setEditing(null)
    setPage(Math.max(0, Math.min(pageCount - 1, next)))
  }

  function toggle(weekKey: string, mode: EditMode) {
    setEditing((cur) =>
      cur?.key === weekKey && cur.mode === mode ? null : { key: weekKey, mode },
    )
  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div dir="rtl" className="w-full max-w-md space-y-3">
        <p className="text-xs text-muted">
          {ordered.length} שבועות מהיום הראשון
          {notedCount ? ` · ${notedCount} עם הערה` : ''}.{' '}
          {description ?? 'עיפרון לעדכון ספירה שנשכחה, פתק לתיעוד סיבת חריגה.'}
        </p>
        <ul className="space-y-1.5">
          {visible.map((week) => (
            <TrackerRow
              key={week.weekKey}
              week={week}
              editMode={editing?.key === week.weekKey ? editing.mode : null}
              onToggleEdit={(mode) => toggle(week.weekKey, mode)}
              onSetCount={(n) => onSetCount(week, n)}
              tone={tone}
              countOptions={countOptions}
              showTarget={showTarget}
              onSaveNote={(text) => {
                onSaveNote(week, text)
                setEditing(null)
              }}
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
