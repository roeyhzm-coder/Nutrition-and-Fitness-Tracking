import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, Loader2, Pencil } from 'lucide-react'
import type { ExerciseDefaultsWriteResult } from '../../lib/exerciseDefaultsStore'

type NotesToast = { tone: 'ok' | 'error'; message: string }

type ExerciseNotesAccordionProps = {
  notes?: string
  /** Persists the note by exercise name (active workout, programs, templates, Supabase). */
  onSave: (notes: string) => Promise<ExerciseDefaultsWriteResult>
  className?: string
}

/**
 * Compact, collapsed-by-default notes for an exercise. Closed it shows only a
 * small trigger; the note text renders after the user opens it.
 */
export function ExerciseNotesAccordion({
  notes,
  onSave,
  className = '',
}: ExerciseNotesAccordionProps) {
  const text = notes?.trim() ?? ''
  const hasNotes = text.length > 0
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(text)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<NotesToast | null>(null)
  const toastTimer = useRef<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const panelId = useId()

  useEffect(() => {
    return () => {
      if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
    }
  }, [])

  useEffect(() => {
    if (editing) textareaRef.current?.focus()
  }, [editing])

  function flash(next: NotesToast) {
    if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
    setToast(next)
    toastTimer.current = window.setTimeout(
      () => setToast(null),
      next.tone === 'error' ? 4500 : 2200,
    )
  }

  function startEditing() {
    setDraft(text)
    setEditing(true)
    setIsOpen(true)
  }

  function handleTrigger() {
    if (!hasNotes && !isOpen) {
      startEditing()
      return
    }
    if (isOpen) setEditing(false)
    setIsOpen(!isOpen)
  }

  function cancelEditing() {
    setEditing(false)
    setDraft(text)
    if (!hasNotes) setIsOpen(false)
  }

  async function handleSave() {
    if (saving) return
    const next = draft.trim()
    if (next === text) {
      cancelEditing()
      return
    }
    setSaving(true)
    try {
      const result = await onSave(next)
      if (!result.ok) {
        flash({ tone: 'error', message: result.error || 'שמירת ההערה נכשלה' })
        return
      }
      setEditing(false)
      if (!next) setIsOpen(false)
      flash({ tone: 'ok', message: next ? 'ההערה נשמרה ✓' : 'ההערה נמחקה ✓' })
    } catch (err) {
      console.error('[ExerciseNotesAccordion] save failed', err)
      flash({ tone: 'error', message: 'שגיאת רשת — ההערה לא נשמרה' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={className} dir="rtl">
      <button
        type="button"
        onClick={handleTrigger}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="inline-flex items-center gap-1 py-0.5 text-[11px] text-muted transition hover:text-text"
      >
        {hasNotes ? (
          <>
            דגשים והערות
            <ChevronDown
              className={`size-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              strokeWidth={2}
            />
          </>
        ) : (
          '+ הוסף הערה'
        )}
      </button>

      {isOpen ? (
        <div
          id={panelId}
          className="mt-1.5 rounded-lg border border-slate-200/70 bg-slate-50/80 p-2.5 text-right text-xs leading-relaxed text-slate-700"
        >
          {editing ? (
            <>
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') cancelEditing()
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleSave()
                }}
                rows={3}
                maxLength={2000}
                dir="rtl"
                placeholder="דגשי ביצוע לתרגיל…"
                aria-label="הערות לתרגיל"
                className="field min-h-0 w-full resize-y px-2 py-1.5 text-xs leading-relaxed"
              />
              <div className="mt-1.5 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="inline-flex min-h-8 items-center gap-1 rounded-md bg-blue-600 px-2.5 text-[11px] font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="size-3 animate-spin" strokeWidth={2} /> : null}
                  שמור
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={saving}
                  className="inline-flex min-h-8 items-center rounded-md px-2.5 text-[11px] text-muted transition hover:bg-slate-100 hover:text-text disabled:opacity-60"
                >
                  ביטול
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 whitespace-pre-line">{text}</p>
              <button
                type="button"
                onClick={startEditing}
                aria-label="ערוך הערה"
                title="ערוך"
                className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted transition hover:bg-slate-100 hover:text-text"
              >
                <Pencil className="size-3" strokeWidth={2} />
                ערוך
              </button>
            </div>
          )}
        </div>
      ) : null}

      {toast ? (
        <p
          role={toast.tone === 'error' ? 'alert' : 'status'}
          className={[
            'mt-1 text-[11px] font-medium',
            toast.tone === 'error' ? 'text-danger' : 'text-emerald-700',
          ].join(' ')}
        >
          {toast.message}
        </p>
      ) : null}
    </div>
  )
}
