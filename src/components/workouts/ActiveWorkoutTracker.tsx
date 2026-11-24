import { ExerciseStickmanSvg } from '../ExerciseStickmanSvg'
import { useEffect, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  Dumbbell,
  Loader2,
  Minus,
  Plus,
  Save,
  Timer,
  Trash2,
  X,
} from 'lucide-react'
import { useWorkoutSession } from '../../context/WorkoutSessionContext'
import { useAppData } from '../../context/AppDataContext'
import { useSkillStageActions } from '../skills/useSkillTree'
import {
  focusSkillItems,
  SKILL_EXERCISE_PREFIX,
  skillItemForExercise,
  type SkillFocusItem,
} from '../../lib/skillWorkout'
import {
  defaultsFromExercise,
  formatPerSetDefaultSummary,
  METRIC_LABEL,
  resolveExerciseMetric,
  setsMatchDefaults,
  setsValuesKey,
  type ExerciseDefaultValues,
} from '../../lib/exerciseDefaults'
import {
  displayDecimal,
  isIncompleteNumericDraft,
  parseDecimal,
  parseInteger,
  syncNumericDraft,
} from '../../lib/numericInput'
import type { ExerciseMetric, LoggedExercise } from '../../lib/types'
import { Button } from '../ui/button'
import { IconButton } from '../ui/IconButton'
import { NumericInput } from '../ui/NumericInput'
import { ExerciseNotesAccordion } from './ExerciseNotesAccordion'
import { MetricToggle } from './MetricToggle'
import { AntagonistStrip, AntagonistToggle } from './AntagonistPosing'

const inputClass =
  'field px-2 text-center tabular-nums'

type DefaultsToast = { tone: 'ok' | 'error'; message: string }

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
  ariaLabel,
  className = inputClass,
}: {
  value: number | null
  onCommit: (next: number | null) => void
  decimals?: number
  placeholder?: string
  ariaLabel?: string
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
      aria-label={ariaLabel}
      className={className}
    />
  )
}

/** Metric the exercise is currently tracked in (explicit choice, else auto-detected). */
function currentMetric(exercise: LoggedExercise): ExerciseMetric {
  return (
    exercise.metric ??
    resolveExerciseMetric({
      name: exercise.name,
      targetReps: exercise.targetReps,
      metric: exercise.defaultMetric,
    })
  )
}

function savedMetric(exercise: LoggedExercise): ExerciseMetric {
  return (
    exercise.defaultMetric ??
    resolveExerciseMetric({ name: exercise.name, targetReps: exercise.targetReps })
  )
}

function formatDefaultSummary(exercise: LoggedExercise, defaults: ExerciseDefaultValues) {
  return formatPerSetDefaultSummary(defaults, {
    durationSeconds: savedMetric(exercise) === 'seconds',
  })
}

type ExerciseBlockProps = {
  exercise: LoggedExercise
  index: number
  /** Skill Tree stage in focus this exercise belongs to. */
  skill: SkillFocusItem | null
  /** Stage of a skill exercise completed during this workout. */
  completedStage: number | null
  onAdvanceSkill: (item: SkillFocusItem) => void
}

/** "🎯 מיקוד עץ מיומנויות" header: stage, pass criterion and instant promotion. */
function SkillStageBanner({
  item,
  onAdvance,
}: {
  item: SkillFocusItem
  onAdvance: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  return (
    <div className="mb-3 space-y-2 rounded-xl bg-gradient-to-l from-indigo-600 to-blue-600 p-3 text-white shadow-sm shadow-indigo-600/25">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-extrabold">
          🎯 מיקוד עץ מיומנויות • שלב {item.order} מתוך {item.tierCount}
        </span>
        <span className="truncate text-[11px] font-semibold text-indigo-100" dir="auto">
          {item.branchTitle}
        </span>
      </div>
      <p className="rounded-lg bg-white/95 px-2.5 py-2 text-xs leading-snug text-indigo-950" dir="auto">
        <span className="font-extrabold">יעד למעבר שלב: </span>
        {item.target}
      </p>
      {confirming ? (
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => {
              setConfirming(false)
              onAdvance()
            }}
            className="min-h-10 flex-1 rounded-xl bg-amber-300 px-3 text-xs font-extrabold text-amber-950 transition hover:bg-amber-200"
          >
            כן, עבור לשלב {item.order < item.tierCount ? item.order + 1 : 'הסיום'} 🚀
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="min-h-10 rounded-xl bg-white/15 px-3 text-xs font-bold text-white transition hover:bg-white/25"
          >
            ביטול
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="min-h-10 w-full rounded-xl bg-white px-3 text-xs font-extrabold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
        >
          🏆 השגתי את יעד השלב! סמן כהושלם והתקדם לשלב הבא
        </button>
      )}
    </div>
  )
}

function ExerciseBlock({ exercise, index, skill, completedStage, onAdvanceSkill }: ExerciseBlockProps) {
  const {
    updateSet,
    setExerciseDone,
    addSet,
    removeSet,
    setExerciseMetric,
    saveAsDefaults,
    saveExerciseNote,
  } = useWorkoutSession()
  const [defaultsToast, setDefaultsToast] = useState<DefaultsToast | null>(null)
  const toastTimer = useRef<number | null>(null)
  const [savedValuesKey, setSavedValuesKey] = useState<string | null>(null)
  const [savingDefaults, setSavingDefaults] = useState(false)
  const allDone = exercise.sets.length > 0 && exercise.sets.every((s) => s.done)
  const canRemoveSet = exercise.sets.length > 1
  const metric = currentMetric(exercise)
  const durationSeconds = metric === 'seconds'
  const defaults = defaultsFromExercise({
    sets: exercise.targetSets,
    reps: exercise.targetReps,
    weight: exercise.targetWeight,
    defaultWeightKg: exercise.defaultWeightKg,
    defaultReps: exercise.defaultReps,
    defaultSets: exercise.defaultSets,
    metric: exercise.defaultMetric,
  })
  const currentValuesKey = `${metric}|${setsValuesKey(exercise.sets)}`
  const showSaveDefaults =
    (!setsMatchDefaults(exercise.sets, defaults) || metric !== savedMetric(exercise)) &&
    currentValuesKey !== savedValuesKey

  useEffect(() => {
    return () => {
      if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
    }
  }, [])

  function flash(toast: DefaultsToast) {
    if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
    setDefaultsToast(toast)
    toastTimer.current = window.setTimeout(
      () => setDefaultsToast(null),
      toast.tone === 'error' ? 4500 : 2200,
    )
  }

  async function handleMetricChange(next: ExerciseMetric) {
    try {
      const result = await setExerciseMetric(index, next)
      if (!result.ok) {
        flash({ tone: 'error', message: result.error || 'שמירת יחידת המדידה נכשלה' })
        return
      }
      flash({ tone: 'ok', message: `נמדד ב${METRIC_LABEL[next]} — נשמר כברירת מחדל ✓` })
    } catch (err) {
      console.error('[ActiveWorkoutTracker] save metric failed', err)
      flash({ tone: 'error', message: 'שגיאת רשת — יחידת המדידה לא נשמרה' })
    }
  }

  async function handleSaveDefaults() {
    if (savingDefaults) return
    setSavingDefaults(true)
    try {
      const result = await saveAsDefaults(index)
      if (!result.ok) {
        flash({ tone: 'error', message: result.error || 'שמירת ברירת המחדל נכשלה' })
        return
      }
      setSavedValuesKey(currentValuesKey)
      flash({ tone: 'ok', message: 'נשמר כברירת מחדל ✓' })
    } catch (err) {
      console.error('[ActiveWorkoutTracker] save defaults failed', err)
      flash({ tone: 'error', message: 'שגיאת רשת — ברירת המחדל לא נשמרה' })
    } finally {
      setSavingDefaults(false)
    }
  }

  const setGridClass =
    'grid grid-cols-[1.75rem_minmax(0,1.15fr)_minmax(0,1fr)_2.5rem_2.5rem] items-center gap-1.5 sm:gap-2'

  return (
    <li
      className={[
        'rounded-2xl border p-4 transition',
        allDone
          ? 'border-blue-200 bg-blue-50'
          : skill
            ? 'border-indigo-200 bg-white ring-1 ring-indigo-100'
            : 'border-slate-200 bg-white',
      ].join(' ')}
    >
      {skill ? <SkillStageBanner item={skill} onAdvance={() => onAdvanceSkill(skill)} /> : null}
      {!skill && completedStage != null ? (
        <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">
          ✅ שלב {completedStage} בעץ המיומנויות הושלם באימון הזה
        </p>
      ) : null}
      <div className="flex items-start gap-3">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <ExerciseStickmanSvg name={exercise.name} />
          {exercise.mediaUrl || exercise.imageUrl ? (
            <a
              href={exercise.mediaUrl ?? exercise.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-7 items-center rounded-lg bg-blue-50 px-2 text-[10px] font-bold text-blue-700"
            >
              {exercise.mediaUrl ? 'וידאו' : 'תמונה'}
            </a>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1">
            <p className="min-w-0 flex-1 pt-1 font-semibold text-text">{exercise.name}</p>
            <AntagonistToggle name={exercise.name} className="-me-1" />
          </div>
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
          <AntagonistStrip name={exercise.name} className="mt-1.5" />
          <p className="mt-1 text-[11px] text-muted">
            ברירת מחדל: {formatDefaultSummary(exercise, defaults)}
          </p>
          <ExerciseNotesAccordion
            notes={exercise.notes}
            onSave={(notes) => saveExerciseNote(index, notes)}
            className="mt-0.5"
          />
          {defaultsToast ? (
            <p
              role={defaultsToast.tone === 'error' ? 'alert' : 'status'}
              className={[
                'mt-1 text-[11px] font-medium',
                defaultsToast.tone === 'error' ? 'text-danger' : 'text-emerald-700',
              ].join(' ')}
            >
              {defaultsToast.message}
            </p>
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

      <div className={`mt-3 ${setGridClass} text-[11px] text-muted`}>
        <span className="text-center">#</span>
        <span className="text-center">משקל (ק״ג)</span>
        <span className="flex justify-center">
          <MetricToggle
            value={metric}
            onChange={(next) => void handleMetricChange(next)}
          />
        </span>
        <span className="text-center">בוצע</span>
        <span className="text-center">הסר</span>
      </div>
      <ul className="mt-1 space-y-1.5">
        {exercise.sets.map((set, setIndex) => (
          <li key={setIndex} className={`h-11 ${setGridClass}`}>
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
              decimals={0}
              onCommit={(reps) => updateSet(index, setIndex, { reps })}
              placeholder={
                durationSeconds
                  ? 'שנ׳'
                  : metric === savedMetric(exercise) && exercise.targetReps.length <= 8
                    ? exercise.targetReps
                    : 'חזרות'
              }
              ariaLabel={`סט ${setIndex + 1} — ${METRIC_LABEL[metric]}`}
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
        {showSaveDefaults || savingDefaults ? (
          <button
            type="button"
            title="שמור סטים, משקל, חזרות/שניות ויחידת המדידה כברירת מחדל קבועה לתרגיל"
            disabled={savingDefaults}
            aria-busy={savingDefaults}
            onClick={() => void handleSaveDefaults()}
            className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-blue-700 hover:underline disabled:cursor-wait disabled:opacity-60 disabled:hover:no-underline"
          >
            {savingDefaults ? (
              <Loader2 className="size-3 animate-spin" strokeWidth={2} />
            ) : (
              <Save className="size-3" strokeWidth={2} />
            )}
            {savingDefaults ? 'שומר…' : 'שמור כברירת מחדל'}
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
          className="fixed inset-x-3 bottom-[calc(9rem+env(safe-area-inset-bottom,0px))] z-[60] mx-auto max-w-md rounded-2xl bg-emerald-600 px-4 py-3.5 text-center text-sm font-bold text-white shadow-xl shadow-emerald-600/30"
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
      className="fixed inset-x-3 bottom-[calc(9rem+env(safe-area-inset-bottom,0px))] z-40 mx-auto flex max-w-3xl min-h-14 items-center justify-between rounded-3xl bg-blue-600 px-5 py-3.5 text-white shadow-xl shadow-blue-600/25"
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
  const { skillTree } = useAppData()
  const { advanceStage } = useSkillStageActions()
  const workout = activeWorkout!
  const elapsed = useElapsed(workout.startedAt)
  const allSets = workout.exercises.flatMap((e) => e.sets)
  const doneSets = allSets.filter((s) => s.done).length
  const skillItems = focusSkillItems(skillTree)
  const [skillToast, setSkillToast] = useState<string | null>(null)
  const skillToastTimer = useRef<number | null>(null)
  useEffect(
    () => () => {
      if (skillToastTimer.current != null) window.clearTimeout(skillToastTimer.current)
    },
    [],
  )
  function advanceSkill(item: SkillFocusItem) {
    const message = advanceStage(item.nodeId)
    if (!message) return
    setSkillToast(message)
    if (skillToastTimer.current != null) window.clearTimeout(skillToastTimer.current)
    skillToastTimer.current = window.setTimeout(() => setSkillToast(null), 6000)
  }
  function completedStageOf(exerciseId: string): number | null {
    if (!exerciseId.startsWith(SKILL_EXERCISE_PREFIX)) return null
    const node = skillTree.nodes[exerciseId.slice(SKILL_EXERCISE_PREFIX.length)]
    return node?.tierStatus === 'mastered' ? node.order : null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex h-dvh max-h-dvh flex-col overflow-hidden bg-slate-50"
      dir="rtl"
    >
      <div className="mx-auto w-full max-w-3xl shrink-0">
          <header className="shrink-0 border-b border-slate-200 bg-white/95 px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-3 backdrop-blur-md">
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
      </div>

      <main className="no-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
        <ul className="mx-auto max-w-3xl space-y-4 px-4 pt-5 pb-40">
          {workout.exercises.map((ex, i) => (
            <ExerciseBlock
              key={`${ex.exerciseId}-${i}`}
              exercise={ex}
              index={i}
              skill={skillItemForExercise(ex, skillItems)}
              completedStage={completedStageOf(ex.exerciseId)}
              onAdvanceSkill={advanceSkill}
            />
          ))}
        </ul>
      </main>

      {skillToast ? (
        <p
          role="status"
          className="pointer-events-none fixed inset-x-3 bottom-[calc(7.5rem+env(safe-area-inset-bottom,0px))] z-[60] mx-auto max-w-md rounded-2xl bg-emerald-600 px-4 py-3 text-center text-sm font-bold leading-snug text-white shadow-xl shadow-emerald-600/30"
        >
          {skillToast}
        </p>
      ) : null}

      {/* In-flow footer (not fixed): always fully above the screen edge and
          the Android navigation bar, which edge-to-edge PWAs draw over. */}
      <footer className="shrink-0 border-t border-slate-200 bg-white px-4 pt-2.5 pb-[max(2.5rem,calc(env(safe-area-inset-bottom,0px)+1.5rem))] shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.18)]">
        <div className="mx-auto max-w-3xl space-y-2">
          <Button
            variant="accent"
            className="w-full py-3"
            disabled={doneSets === 0}
            onClick={onFinish}
          >
            סיים אימון ושמור ({doneSets} סטים)
          </Button>
        </div>
      </footer>
    </div>
  )
}
