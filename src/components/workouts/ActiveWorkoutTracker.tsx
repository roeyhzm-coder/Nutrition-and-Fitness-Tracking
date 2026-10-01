import { useEffect, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  Dumbbell,
  Minus,
  Plus,
  Save,
  Timer,
  Trash2,
  X,
} from 'lucide-react'
import { useWorkoutSession } from '../../context/WorkoutSessionContext'
import {
  defaultsFromExercise,
  setsMatchDefaults,
  setsValuesKey,
} from '../../lib/exerciseDefaults'
import {
  displayDecimal,
  isIncompleteNumericDraft,
  parseDecimal,
  parseInteger,
  syncNumericDraft,
} from '../../lib/numericInput'
import type { LoggedExercise } from '../../lib/types'
import { localDateKey } from '../../lib/types'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { NumericInput } from '../ui/NumericInput'

const inputClass =
  'field px-2 text-center tabular-nums'

function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const s = String(total % 60).padStart(2, '0')
  return h ? `${h}:${m}:${s}` : `${m}:${s}`
}

function useElapsed(startedAt: string) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return formatElapsed(now - new Date(startedAt).getTime())
}

function DraftNumberInput({
  value,
  onCommit,
  decimals = 2,
  placeholder,
  className = inputClass,
}: {
  value: number | null
  onCommit: (next: number | null) => void
  decimals?: number
  placeholder?: string
  className?: string
}) {
  const [draft, setDraft] = useState(() => displayDecimal(value, decimals))
  useEffect(() => {
    setDraft((prev) => syncNumericDraft(prev, value, decimals))
  }, [value, decimals])

  return (
    <NumericInput
      decimals={decimals}
      value={draft}
      onChange={(raw) => {
        setDraft(raw)
        if (raw === '') {
          onCommit(null)
          return
        }
        if (isIncompleteNumericDraft(raw)) return
        const parsed = decimals <= 0 ? parseInteger(raw) : parseDecimal(raw)
        if (parsed != null) onCommit(parsed)
      }}
      placeholder={placeholder}
      className={className}
    />
  )
}

function formatDefaultSummary(exercise: LoggedExercise) {
  const weight =
    exercise.defaultWeightKg != null
      ? `${exercise.defaultWeightKg} ק״ג`
      : exercise.targetWeight || '—'
  const reps =
    exercise.defaultReps != null
      ? String(exercise.defaultReps)
      : exercise.targetReps || '—'
  return `${exercise.targetSets} סטים · ${weight} · ${reps} חזרות`
}

type ExerciseBlockProps = {
  exercise: LoggedExercise
  index: number
}

function ExerciseBlock({ exercise, index }: ExerciseBlockProps) {
  const {
    updateSet,
    setExerciseDone,
    addSet,
    removeSet,
    saveAsDefaults,
  } = useWorkoutSession()
  const [defaultsToast, setDefaultsToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)
  const [savedValuesKey, setSavedValuesKey] = useState<string | null>(null)
  const allDone = exercise.sets.length > 0 && exercise.sets.every((s) => s.done)
  const canRemoveSet = exercise.sets.length > 1
  const defaults = defaultsFromExercise({
    sets: exercise.targetSets,
    reps: exercise.targetReps,
    weight: exercise.targetWeight,
    defaultWeightKg: exercise.defaultWeightKg,
    defaultReps: exercise.defaultReps,
  })
  const currentValuesKey = setsValuesKey(exercise.sets)
  const showSaveDefaults =
    !setsMatchDefaults(exercise.sets, defaults) &&
    currentValuesKey !== savedValuesKey

  useEffect(() => {
    return () => {
      if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
    }
  }, [])

  function flash(message: string) {
    if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
    setDefaultsToast(message)
    toastTimer.current = window.setTimeout(() => setDefaultsToast(null), 2200)
  }

  function handleSaveDefaults() {
    if (!saveAsDefaults(index)) return
    setSavedValuesKey(currentValuesKey)
    flash('ברירת המחדל נשמרה')
  }

  return (
    <li
      className={[
        'rounded-2xl border p-4 transition',
        allDone
          ? 'border-blue-200 bg-blue-50'
          : 'border-slate-200 bg-white',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        {exercise.imageUrl ? (
          <img
            src={exercise.imageUrl}
            alt={exercise.name}
            className="size-14 shrink-0 rounded-2xl border border-slate-200 object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-text">{exercise.name}</p>
          <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
            <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-text">
              {exercise.targetSets} × {exercise.targetReps}
            </span>
            {exercise.rest ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-2 py-0.5 font-medium text-blue-600">
                <Timer className="size-3" strokeWidth={2} />
                מנוחה {exercise.rest}
              </span>
            ) : null}
            {exercise.targetWeight ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-muted">
                <Dumbbell className="size-3" strokeWidth={2} />
                {exercise.targetWeight}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[11px] text-muted">
            ברירת מחדל: {formatDefaultSummary(exercise)}
          </p>
          {defaultsToast ? (
            <p className="mt-1 text-[11px] font-medium text-emerald-700">{defaultsToast}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setExerciseDone(index, !allDone)}
          className={[
            'icon-hit shrink-0 min-h-11 rounded-2xl px-3 text-xs font-semibold transition',
            allDone
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-muted hover:text-text',
          ].join(' ')}
        >
          {allDone ? 'בוצע ✓' : 'סמן הכל'}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-[1.25rem_minmax(0,1fr)_minmax(0,0.9fr)_3rem_2.25rem_2.25rem] items-center gap-2 text-[11px] text-muted">
        <span>#</span>
        <span className="text-center">משקל (ק״ג)</span>
        <span className="text-center">חזרות</span>
        <span className="text-center">RPE</span>
        <span className="text-center">בוצע</span>
        <span className="text-center">הסר</span>
      </div>
      <ul className="mt-1 space-y-1.5">
        {exercise.sets.map((set, setIndex) => (
          <li
            key={setIndex}
            className="grid grid-cols-[1.25rem_minmax(0,1fr)_minmax(0,0.9fr)_3rem_2.25rem_2.25rem] items-center gap-2"
          >
            <span className="text-sm font-semibold text-muted">{setIndex + 1}</span>
            <DraftNumberInput
              value={set.weightKg}
              onCommit={(weightKg) =>
                updateSet(index, setIndex, { weightKg })
              }
              placeholder="0"
            />
            <DraftNumberInput
              value={set.reps}
              onCommit={(reps) => updateSet(index, setIndex, { reps })}
              placeholder={
                exercise.targetReps.length <= 8 ? exercise.targetReps : 'חזרות'
              }
            />
            <DraftNumberInput
              value={set.rpe ?? null}
              onCommit={(rpe) => updateSet(index, setIndex, { rpe })}
              placeholder="7"
            />
            <button
              type="button"
              aria-label={set.done ? 'בטל סימון סט' : 'סמן סט כבוצע'}
              onClick={() => updateSet(index, setIndex, { done: !set.done })}
              className={[
                'flex size-11 items-center justify-center rounded-2xl border transition',
                set.done
                  ? 'border-blue-500 bg-blue-600 text-white'
                  : 'border-slate-200 bg-slate-50 text-muted hover:border-blue-500',
              ].join(' ')}
            >
              <Check className="size-4" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              aria-label={`הסר סט ${setIndex + 1}`}
              title={canRemoveSet ? 'הסר סט' : 'חובה להשאיר לפחות סט אחד'}
              disabled={!canRemoveSet}
              onClick={() => removeSet(index, setIndex)}
              className="flex size-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-muted transition hover:border-rose-300 hover:bg-rose-50 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-slate-50 disabled:hover:text-muted"
            >
              <Trash2 className="size-3.5" strokeWidth={2} />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={() => addSet(index)}
          className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
        >
          <Plus className="size-3" strokeWidth={2} />
          הוסף סט
        </button>
        <button
          type="button"
          disabled={!canRemoveSet}
          title={canRemoveSet ? 'הסר סט אחרון' : 'חובה להשאיר לפחות סט אחד'}
          onClick={() => removeSet(index, exercise.sets.length - 1)}
          className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-muted hover:text-danger hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-muted disabled:hover:no-underline"
        >
          <Minus className="size-3" strokeWidth={2} />
          הסר סט אחרון
        </button>
        {showSaveDefaults ? (
          <button
            type="button"
            title="שמור את הערכים הנוכחיים כברירת מחדל קבועה לתרגיל"
            onClick={handleSaveDefaults}
            className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
          >
            <Save className="size-3" strokeWidth={2} />
            שמור כברירת מחדל
          </button>
        ) : null}
      </div>
    </li>
  )
}

export function ActiveWorkoutTracker() {
  const {
    activeWorkout,
    trackerOpen,
    openTracker,
    minimizeTracker,
    finishWorkout,
    cancelWorkout,
  } = useWorkoutSession()
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
    }
  }, [])

  function handleFinish() {
    const log = finishWorkout()
    if (!log) return
    setToast('🎉 האימון נשמר בהצלחה!')
    if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3500)
  }

  return (
    <>
      {activeWorkout ? (
        trackerOpen ? (
          <TrackerPanel
            onMinimize={minimizeTracker}
            onFinish={handleFinish}
            onCancel={cancelWorkout}
          />
        ) : (
          <MinimizedBar onOpen={openTracker} />
        )
      ) : null}
      {toast ? (
        <div
          role="status"
          className="fixed inset-x-3 bottom-28 z-[60] mx-auto max-w-md rounded-2xl bg-emerald-600 px-4 py-3.5 text-center text-sm font-bold text-white shadow-xl shadow-emerald-600/30"
        >
          {toast}
        </div>
      ) : null}
    </>
  )
}

function MinimizedBar({ onOpen }: { onOpen: () => void }) {
  const { activeWorkout } = useWorkoutSession()
  const elapsed = useElapsed(activeWorkout!.startedAt)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="fixed inset-x-3 bottom-28 z-40 mx-auto flex max-w-3xl min-h-14 items-center justify-between rounded-3xl bg-blue-600 px-5 py-3.5 text-white shadow-xl shadow-blue-600/25"
    >
      <span className="font-semibold">אימון פעיל · {activeWorkout!.workoutName}</span>
      <span className="text-sm tabular-nums">{elapsed} · המשך</span>
    </button>
  )
}

type TrackerPanelProps = {
  onMinimize: () => void
  onFinish: () => unknown
  onCancel: () => void
}

function TrackerPanel({ onMinimize, onFinish, onCancel }: TrackerPanelProps) {
  const { activeWorkout, setPerformedOn, setEstimatedCalories } = useWorkoutSession()
  const workout = activeWorkout!
  const elapsed = useElapsed(workout.startedAt)
  const allSets = workout.exercises.flatMap((e) => e.sets)
  const doneSets = allSets.filter((s) => s.done).length
  const performedOn = workout.performedOn || localDateKey()

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-50" dir="rtl">
      <div className="mx-auto max-w-3xl pb-48">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">{workout.programName}</p>
              <h1 className="truncate font-display text-lg font-bold text-text">
                {workout.workoutName}
              </h1>
            </div>
            <span className="rounded-2xl bg-slate-100 px-3 py-2 font-mono text-sm tabular-nums text-text">
              {elapsed}
            </span>
            <IconButton label="מזער" onClick={onMinimize}>
              <ChevronDown className="size-4" strokeWidth={1.75} />
            </IconButton>
            <IconButton
              label="בטל אימון"
              tone="danger"
              onClick={() => {
                if (window.confirm('לבטל את האימון? הנתונים שהוזנו לא יישמרו.')) onCancel()
              }}
            >
              <X className="size-4" strokeWidth={1.75} />
            </IconButton>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${allSets.length ? (doneSets / allSets.length) * 100 : 0}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-muted">
            {doneSets} / {allSets.length} סטים בוצעו
          </p>
        </header>

        <ul className="space-y-4 px-4 py-5">
          {workout.exercises.map((ex, i) => (
            <ExerciseBlock key={`${ex.exerciseId}-${i}`} exercise={ex} index={i} />
          ))}
        </ul>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto max-w-3xl space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] text-muted">
              עבור איזה יום האימון הזה מבוצע / הושלם?
              <input
                type="date"
                value={performedOn}
                onChange={(e) => {
                  if (e.target.value) setPerformedOn(e.target.value)
                }}
                className="field mt-1"
              />
            </label>
            <label className="block text-[11px] text-muted">
              קלוריות מוערכות
              <DraftNumberInput
                value={workout.estimatedCalories ?? null}
                onCommit={(n) =>
                  setEstimatedCalories(n == null ? null : Math.max(0, n))
                }
                placeholder="0"
                className="field mt-1"
              />
            </label>
          </div>
          <Button
            variant="accent"
            className="w-full py-3"
            disabled={doneSets === 0}
            onClick={onFinish}
          >
            סיים אימון ושמור ({doneSets} סטים)
          </Button>
        </div>
      </div>
    </div>
  )
}
