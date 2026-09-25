import { useEffect, useState } from 'react'
import { Check, ChevronDown, Dumbbell, Plus, Timer, X } from 'lucide-react'
import { useWorkoutSession } from '../../context/WorkoutSessionContext'
import type { LoggedExercise, LoggedSet } from '../../lib/types'
import { WEEKDAYS } from '../../lib/types'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'

const inputClass =
  'w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-center text-sm text-text outline-none focus:border-primary'

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

function toNumber(value: string): number | null {
  if (value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function formatSets(sets: LoggedSet[]) {
  return sets
    .map((s) => `${s.weightKg ?? 0}×${s.reps ?? '?'}`)
    .join(', ')
}

type ExerciseBlockProps = {
  exercise: LoggedExercise
  index: number
}

function ExerciseBlock({ exercise, index }: ExerciseBlockProps) {
  const { updateSet, setExerciseDone, addSet, lastPerformance } = useWorkoutSession()
  const last = lastPerformance(exercise.name)
  const allDone = exercise.sets.length > 0 && exercise.sets.every((s) => s.done)

  return (
    <li
      className={[
        'rounded-xl border p-3 transition',
        allDone ? 'border-accent/60 bg-accent/5' : 'border-line bg-card',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        {exercise.imageUrl ? (
          <img
            src={exercise.imageUrl}
            alt={exercise.name}
            className="size-14 shrink-0 rounded-lg border border-line object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-text">{exercise.name}</p>
          <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
            <span className="rounded-md bg-line/50 px-1.5 py-0.5 text-text">
              {exercise.targetSets} × {exercise.targetReps}
            </span>
            {exercise.rest ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                <Timer className="size-3" strokeWidth={2} />
                מנוחה {exercise.rest}
              </span>
            ) : null}
            {exercise.targetWeight ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-line/50 px-1.5 py-0.5 text-muted">
                <Dumbbell className="size-3" strokeWidth={2} />
                {exercise.targetWeight}
              </span>
            ) : null}
          </div>
          {last ? (
            <p className="mt-1 text-[11px] text-muted">
              פעם קודמת: {formatSets(last)}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setExerciseDone(index, !allDone)}
          className={[
            'shrink-0 rounded-lg px-2 py-1 text-xs font-semibold transition',
            allDone ? 'bg-accent text-bg' : 'bg-surface text-muted hover:text-text',
          ].join(' ')}
        >
          {allDone ? 'בוצע ✓' : 'סמן הכל'}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-[1.5rem_1fr_1fr_2.25rem] items-center gap-2 text-[11px] text-muted">
        <span>#</span>
        <span className="text-center">משקל (ק״ג)</span>
        <span className="text-center">חזרות</span>
        <span className="text-center">בוצע</span>
      </div>
      <ul className="mt-1 space-y-1.5">
        {exercise.sets.map((set, setIndex) => (
          <li
            key={setIndex}
            className="grid grid-cols-[1.5rem_1fr_1fr_2.25rem] items-center gap-2"
          >
            <span className="text-sm font-semibold text-muted">{setIndex + 1}</span>
            <input
              inputMode="decimal"
              value={set.weightKg ?? ''}
              onChange={(e) =>
                updateSet(index, setIndex, { weightKg: toNumber(e.target.value) })
              }
              placeholder="0"
              className={inputClass}
            />
            <input
              inputMode="numeric"
              value={set.reps ?? ''}
              onChange={(e) =>
                updateSet(index, setIndex, { reps: toNumber(e.target.value) })
              }
              placeholder={exercise.targetReps.length <= 8 ? exercise.targetReps : 'חזרות'}
              className={inputClass}
            />
            <button
              type="button"
              aria-label={set.done ? 'בטל סימון סט' : 'סמן סט כבוצע'}
              onClick={() => updateSet(index, setIndex, { done: !set.done })}
              className={[
                'flex size-9 items-center justify-center rounded-lg border transition',
                set.done
                  ? 'border-accent bg-accent text-bg'
                  : 'border-line bg-surface text-muted hover:border-accent',
              ].join(' ')}
            >
              <Check className="size-4" strokeWidth={2.5} />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => addSet(index)}
        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
      >
        <Plus className="size-3" strokeWidth={2} />
        הוסף סט
      </button>
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

  if (!activeWorkout) return null
  return trackerOpen ? (
    <TrackerPanel
      onMinimize={minimizeTracker}
      onFinish={finishWorkout}
      onCancel={cancelWorkout}
    />
  ) : (
    <MinimizedBar onOpen={openTracker} />
  )
}

function MinimizedBar({ onOpen }: { onOpen: () => void }) {
  const { activeWorkout } = useWorkoutSession()
  const elapsed = useElapsed(activeWorkout!.startedAt)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="fixed inset-x-3 bottom-24 z-40 mx-auto flex max-w-3xl items-center justify-between rounded-2xl bg-primary px-4 py-3 text-white shadow-xl"
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
  const { activeWorkout } = useWorkoutSession()
  const workout = activeWorkout!
  const elapsed = useElapsed(workout.startedAt)
  const allSets = workout.exercises.flatMap((e) => e.sets)
  const doneSets = allSets.filter((s) => s.done).length

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg" dir="rtl">
      <div className="mx-auto max-w-3xl pb-28">
        <header className="sticky top-0 z-10 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">
                {workout.programName} · יום {WEEKDAYS[workout.dayNumber - 1]}
              </p>
              <h1 className="truncate font-display text-lg font-bold text-text">
                {workout.workoutName}
              </h1>
            </div>
            <span className="rounded-lg bg-surface px-2 py-1 font-mono text-sm tabular-nums text-text">
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
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${allSets.length ? (doneSets / allSets.length) * 100 : 0}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-muted">
            {doneSets} / {allSets.length} סטים בוצעו
          </p>
        </header>

        <ul className="space-y-3 px-4 py-4">
          {workout.exercises.map((ex, i) => (
            <ExerciseBlock key={`${ex.exerciseId}-${i}`} exercise={ex} index={i} />
          ))}
        </ul>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-3xl">
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
