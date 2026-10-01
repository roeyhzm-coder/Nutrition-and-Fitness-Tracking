import { useEffect, useState } from 'react'
import {
  durationFromRange,
  endsOnFromDuration,
  ROUTINE_DURATION_PRESETS,
  resolveRoutineTimeframe,
} from '../../lib/routines'
import type { Routine, RoutineTimeOfDay, RoutineTimeframe } from '../../lib/types'
import {
  localDateKey,
  ROUTINE_TIME_LABELS,
  ROUTINE_TIMEFRAME_LABELS,
  ROUTINE_TIMEFRAMES,
  ROUTINE_TIMES,
} from '../../lib/types'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { NumericInput } from '../ui/NumericInput'

const MINUTE_PRESETS = [15, 30, 45, 60]

export type RoutineDraft = {
  title: string
  targetMinutes: number
  weeklyTargetDays: number
  timeOfDay: RoutineTimeOfDay
  timeframe: RoutineTimeframe
  startsOn: string
  durationDays: number
  endsOn: string
}

function emptyDraft(today = localDateKey()): RoutineDraft {
  return {
    title: '',
    targetMinutes: 30,
    weeklyTargetDays: 4,
    timeOfDay: 'evening',
    timeframe: 'forever',
    startsOn: today,
    durationDays: 30,
    endsOn: endsOnFromDuration(today, 30),
  }
}

function draftFromRoutine(routine: Routine | null): RoutineDraft {
  const base = emptyDraft()
  if (!routine) return base
  const timeframe = resolveRoutineTimeframe(routine)
  return {
    title: routine.title,
    targetMinutes: routine.targetMinutes,
    weeklyTargetDays: routine.weeklyTargetDays,
    timeOfDay: routine.timeOfDay,
    timeframe: timeframe.timeframe,
    startsOn: timeframe.startsOn,
    durationDays: timeframe.durationDays ?? 30,
    endsOn: timeframe.endsOn ?? endsOnFromDuration(timeframe.startsOn, timeframe.durationDays ?? 30),
  }
}

function applyDuration(draft: RoutineDraft, durationDays: number): RoutineDraft {
  const days = Math.max(1, Math.round(durationDays) || 1)
  return {
    ...draft,
    durationDays: days,
    endsOn: endsOnFromDuration(draft.startsOn, days),
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
  const [draft, setDraft] = useState<RoutineDraft>(emptyDraft)

  useEffect(() => {
    if (open) setDraft(draftFromRoutine(routine))
  }, [open, routine])

  const customWeeks =
    draft.durationDays % 7 === 0 ? String(draft.durationDays / 7) : ''

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

        <div>
          <p className="text-xs text-muted">יעד זמן להרגל</p>
          <div className="mt-2 grid grid-cols-1 gap-2">
            {ROUTINE_TIMEFRAMES.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() =>
                  setDraft((p) => {
                    if (kind === 'forever') return { ...p, timeframe: 'forever' }
                    return applyDuration({ ...p, timeframe: 'period' }, p.durationDays || 30)
                  })
                }
                className={[
                  'min-h-11 rounded-2xl px-3 text-sm font-semibold transition',
                  draft.timeframe === kind
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                    : 'border border-slate-200 bg-slate-50 text-text hover:bg-slate-100',
                ].join(' ')}
              >
                {ROUTINE_TIMEFRAME_LABELS[kind]}
              </button>
            ))}
          </div>
        </div>

        {draft.timeframe === 'period' ? (
          <div className="space-y-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-3">
            <label className="block text-xs text-muted">
              תאריך התחלה
              <input
                type="date"
                value={draft.startsOn}
                onChange={(e) => {
                  const startsOn = e.target.value
                  if (!startsOn) return
                  setDraft((p) =>
                    applyDuration({ ...p, startsOn }, p.durationDays),
                  )
                }}
                className="field mt-1"
                required
              />
            </label>

            <div>
              <p className="text-xs text-muted">משך היעד</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ROUTINE_DURATION_PRESETS.map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setDraft((p) => applyDuration(p, days))}
                    className={[
                      'min-h-11 rounded-2xl px-3 text-sm font-semibold transition',
                      draft.durationDays === days
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                        : 'border border-violet-200 bg-white text-text hover:bg-violet-50',
                    ].join(' ')}
                  >
                    {days} יום
                  </button>
                ))}
              </div>
            </div>

            <label className="block text-xs text-muted">
              מספר שבועות מותאם
              <NumericInput
                decimals={0}
                min={1}
                value={customWeeks}
                onChange={(raw) => {
                  const n = Number(raw)
                  if (!raw || !Number.isFinite(n) || n <= 0) return
                  setDraft((p) => applyDuration(p, Math.round(n) * 7))
                }}
                placeholder="למשל 6"
                className="field mt-1"
              />
            </label>

            <label className="block text-xs text-muted">
              תאריך סיום
              <input
                type="date"
                value={draft.endsOn}
                min={draft.startsOn}
                onChange={(e) => {
                  const endsOn = e.target.value
                  if (!endsOn) return
                  setDraft((p) => {
                    const safeEnd = endsOn < p.startsOn ? p.startsOn : endsOn
                    return {
                      ...p,
                      endsOn: safeEnd,
                      durationDays: durationFromRange(p.startsOn, safeEnd),
                    }
                  })
                }}
                className="field mt-1"
                required
              />
            </label>
            <p className="text-[11px] text-muted">
              {draft.durationDays} ימים · {draft.startsOn} → {draft.endsOn}
            </p>
          </div>
        ) : null}

        <Button type="submit" className="w-full" variant="accent">
          {routine ? 'שמור שינויים' : 'הוסף שגרה'}
        </Button>
      </form>
    </Modal>
  )
}
