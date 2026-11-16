import { useState, type ReactNode } from 'react'
import { BellRing, RotateCcw, Sparkles } from 'lucide-react'
import {
  aiCheckinLabel,
  clampIntervalDays,
  daysBetween,
  daysUntilReview,
} from '../../lib/aiCheckin'
import { parseInteger } from '../../lib/numericInput'
import { useTodayKey } from '../../hooks/useTodayKey'
import { Button } from '../ui/button'
import { Modal } from '../ui/Modal'
import { NumericInput } from '../ui/NumericInput'

export type AiReviewCycle = {
  intervalDays: number
  /** YYYY-MM-DD the current cycle started (last AI update). */
  anchorDate: string
}

function formatDate(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Countdown pill + editor for a recurring "update the plan with AI" cycle.
 * Remaining days are always derived (interval − days since anchor); the anchor
 * only changes through the explicit reset / save actions below.
 */
export function AiReviewBadge({
  title,
  cycle,
  presets,
  onSave,
  hint,
  footer,
}: {
  /** Modal title, e.g. "תזכורת עדכון AI". */
  title: string
  cycle: AiReviewCycle
  presets: readonly number[]
  onSave: (next: AiReviewCycle) => void
  hint?: string
  footer?: ReactNode
}) {
  const today = useTodayKey()
  const remaining = daysUntilReview(cycle.anchorDate, cycle.intervalDays, today)
  const elapsed = Math.max(0, daysBetween(cycle.anchorDate, today))
  const due = remaining <= 0

  const [open, setOpen] = useState(false)
  const [intervalDraft, setIntervalDraft] = useState(String(cycle.intervalDays))
  const [anchorDraft, setAnchorDraft] = useState(cycle.anchorDate)

  function openEditor() {
    setIntervalDraft(String(cycle.intervalDays))
    setAnchorDraft(cycle.anchorDate)
    setOpen(true)
  }

  const draftInterval = clampIntervalDays(
    parseInteger(intervalDraft) ?? cycle.intervalDays,
    cycle.intervalDays,
  )
  const validAnchor = /^\d{4}-\d{2}-\d{2}$/.test(anchorDraft) && anchorDraft <= today
  const draftRemaining = validAnchor
    ? daysUntilReview(anchorDraft, draftInterval, today)
    : null

  function save() {
    if (!validAnchor) return
    onSave({ intervalDays: draftInterval, anchorDate: anchorDraft })
    setOpen(false)
  }

  function resetToday() {
    onSave({ intervalDays: draftInterval, anchorDate: today })
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={openEditor}
        aria-label={`${aiCheckinLabel(remaining)} — עריכת מחזור העדכון`}
        className={[
          'inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] leading-none transition',
          due
            ? 'border-rose-300 bg-rose-600 font-bold text-white shadow-sm shadow-rose-600/25 hover:bg-rose-700'
            : 'border-slate-200 bg-white font-medium text-muted hover:border-slate-300 hover:text-text',
        ].join(' ')}
      >
        {due ? (
          <BellRing className="size-3 shrink-0 motion-safe:animate-pulse" />
        ) : (
          <Sparkles className="size-3 shrink-0" />
        )}
        <span className="truncate">{aiCheckinLabel(remaining)}</span>
      </button>

      <Modal open={open} title={title} onClose={() => setOpen(false)}>
        <div className="space-y-4" dir="rtl">
          <div
            className={[
              'rounded-2xl px-3 py-2.5 text-sm',
              due ? 'bg-rose-50 text-rose-800' : 'bg-blue-50 text-blue-800',
            ].join(' ')}
          >
            <p className="font-semibold">
              {due
                ? 'הגיע הזמן לעדכון AI — העתק את הייצוא, התייעץ, ואז התחל מחזור חדש.'
                : `נותרו ${remaining} ימים מתוך ${cycle.intervalDays}`}
            </p>
            <p className="mt-0.5 text-xs opacity-80">
              עדכון אחרון: {formatDate(cycle.anchorDate)} · עברו {elapsed} ימים
            </p>
          </div>

          <Button className="w-full gap-2" variant="accent" onClick={resetToday}>
            <RotateCcw className="size-4" strokeWidth={2} />
            עדכנתי עם AI היום — התחל מחזור חדש
          </Button>

          <div className="space-y-3 border-t border-slate-100 pt-3">
            <label className="block text-xs text-muted">
              אורך מחזור (ימים)
              <NumericInput
                decimals={0}
                value={intervalDraft}
                onChange={setIntervalDraft}
                className="field mt-1"
              />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setIntervalDraft(String(days))}
                  className={[
                    'min-h-8 rounded-full px-3 text-xs font-semibold tabular-nums transition',
                    draftInterval === days
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-muted hover:bg-slate-200',
                  ].join(' ')}
                >
                  {days}
                </button>
              ))}
            </div>
            <label className="block text-xs text-muted">
              תאריך העדכון האחרון
              <input
                type="date"
                value={anchorDraft}
                max={today}
                onChange={(e) => setAnchorDraft(e.target.value)}
                className="field mt-1"
              />
            </label>
            <p className="text-[11px] text-muted">
              {draftRemaining == null
                ? 'בחר תאריך שאינו בעתיד.'
                : draftRemaining <= 0
                  ? 'לפי הגדרות אלו העדכון כבר מגיע.'
                  : `לפי הגדרות אלו: עוד ${draftRemaining} ימים.`}
              {hint ? ` ${hint}` : ''}
            </p>
            <Button
              className="w-full"
              variant="surface"
              onClick={save}
              disabled={!validAnchor}
            >
              שמור הגדרות
            </Button>
          </div>
          {footer}
        </div>
      </Modal>
    </>
  )
}
