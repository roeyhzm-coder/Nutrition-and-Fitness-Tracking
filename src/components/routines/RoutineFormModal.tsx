import { useEffect, useState } from 'react'
import type { Routine, RoutineTimeOfDay } from '../../lib/types'
import { ROUTINE_TIME_LABELS, ROUTINE_TIMES } from '../../lib/types'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { NumericInput } from '../ui/NumericInput'

const MINUTE_PRESETS = [15, 30, 45, 60]

export type RoutineDraft = {
  title: string
  targetMinutes: number
  weeklyTargetDays: number
  timeOfDay: RoutineTimeOfDay
}

const EMPTY_DRAFT: RoutineDraft = {
  title: '',
  targetMinutes: 30,
  weeklyTargetDays: 4,
  timeOfDay: 'evening',
}

function draftFromRoutine(routine: Routine | null): RoutineDraft {
  if (!routine) return EMPTY_DRAFT
  return {
    title: routine.title,
    targetMinutes: routine.targetMinutes,
    weeklyTargetDays: routine.weeklyTargetDays,
    timeOfDay: routine.timeOfDay,
  }
}

type RoutineFormModalProps = {
  open: boolean
  routine: Routine | null
  onClose: () => void
  onSave: (draft: RoutineDraft) => void
}

export function RoutineFormModal({
  open,
  routine,
  onClose,
  onSave,
}: RoutineFormModalProps) {
  const [draft, setDraft] = useState<RoutineDraft>(EMPTY_DRAFT)

  useEffect(() => {
    if (open) setDraft(draftFromRoutine(routine))
  }, [open, routine])

  return (
    <Modal
      open={open}
      title={routine ? 'עריכת שגרה' : 'שגרה חדשה'}
      onClose={onClose}
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          const title = draft.title.trim()
          if (!title) return
          onSave({ ...draft, title })
        }}
      >
        <label className="block text-xs text-muted">
          שם השגרה
          <input
            value={draft.title}
            onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
            placeholder="למשל: קריאת ספר בערב"
            className="field mt-1"
            required
            autoFocus
          />
        </label>

        <div>
          <p className="text-xs text-muted">משך זמן בדקות</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {MINUTE_PRESETS.map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setDraft((p) => ({ ...p, targetMinutes: mins }))}
                className={[
                  'min-h-11 rounded-2xl px-3.5 text-sm font-semibold transition',
                  draft.targetMinutes === mins
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'border border-slate-200 bg-slate-50 text-text hover:bg-slate-100',
                ].join(' ')}
              >
                {mins} דק׳
              </button>
            ))}
          </div>
          <NumericInput
            decimals={0}
            min={1}
            value={String(draft.targetMinutes)}
            onChange={(raw) => {
              const n = Number(raw)
              if (!raw || !Number.isFinite(n)) return
              setDraft((p) => ({
                ...p,
                targetMinutes: Math.max(1, Math.round(n)),
              }))
            }}
            className="field mt-2"
            aria-label="משך בדקות"
          />
        </div>

        <div>
          <p className="text-xs text-muted">
            יעד שבועי · {draft.weeklyTargetDays} ימים בשבוע
          </p>
          <div className="mt-2 grid grid-cols-7 gap-1.5">
            {Array.from({ length: 7 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setDraft((p) => ({ ...p, weeklyTargetDays: n }))}
                className={[
                  'min-h-11 rounded-2xl text-sm font-bold transition',
                  draft.weeklyTargetDays === n
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                    : 'border border-slate-200 bg-slate-50 text-text hover:bg-slate-100',
                ].join(' ')}
              >
                {n}
              </button>
            ))}
          </div>
          <input
            type="range"
            min={1}
            max={7}
            value={draft.weeklyTargetDays}
            onChange={(e) =>
              setDraft((p) => ({
                ...p,
                weeklyTargetDays: Number(e.target.value),
              }))
            }
            className="mt-3 w-full accent-cyan-600"
            aria-label="יעד ימים בשבוע"
          />
        </div>

        <div>
          <p className="text-xs text-muted">תזמון מועדף</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {ROUTINE_TIMES.map((time) => (
              <button
                key={time}
                type="button"
                onClick={() => setDraft((p) => ({ ...p, timeOfDay: time }))}
                className={[
                  'min-h-11 rounded-2xl px-3 text-sm font-semibold transition',
                  draft.timeOfDay === time
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'border border-slate-200 bg-slate-50 text-text hover:bg-slate-100',
                ].join(' ')}
              >
                {ROUTINE_TIME_LABELS[time]}
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" className="w-full" variant="accent">
          {routine ? 'שמור שינויים' : 'הוסף שגרה'}
        </Button>
      </form>
    </Modal>
  )
}
