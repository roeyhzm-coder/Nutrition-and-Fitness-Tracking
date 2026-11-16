import { useState } from 'react'
import { Check, Plus, Settings2, Undo2 } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { useTodayKey } from '../../hooks/useTodayKey'
import {
  completionFor,
  effectiveMorningStart,
  MORNING_ROUTINE_IDS,
  MORNING_ROUTINE_LABELS,
  MORNING_ROUTINE_SUBTITLES,
  suggestedMorningRoutine,
  type MorningExercise,
  type MorningRoutineId,
} from '../../lib/morningRoutine'
import { uid } from '../../lib/types'
import { AiReviewBadge } from '../ai/AiReviewBadge'
import { MorningConsistencyCard } from './MorningConsistency'
import { MorningExerciseCard } from './MorningExerciseCard'
import { MorningExerciseModal, MorningRoutineMetaModal } from './MorningEditModals'

const REVIEW_PRESETS = [30, 60, 90, 120, 180] as const
const MAX_EXERCISES = 12

export function MorningRoutinePanel() {
  const {
    morningRoutine,
    setMorningCompletion,
    updateMorningRoutine,
    resetMorningRoutine,
    setMorningAiReview,
  } = useAppData()
  const today = useTodayKey()
  const [selected, setSelected] = useState<MorningRoutineId>(() =>
    suggestedMorningRoutine(morningRoutine, today),
  )
  const [editing, setEditing] = useState<{ exercise: MorningExercise; isNew: boolean } | null>(null)
  const [metaOpen, setMetaOpen] = useState(false)

  const routine = morningRoutine.routines[selected]
  const todayDone = completionFor(morningRoutine, today)
  const doneSelected = todayDone?.routine === selected
  const doneOther = !!todayDone && !doneSelected

  function saveExercise(draft: Omit<MorningExercise, 'id'>) {
    if (!editing) return
    const id = editing.exercise.id
    const exercises = editing.isNew
      ? [...routine.exercises, { ...draft, id }]
      : routine.exercises.map((row) => (row.id === id ? { ...draft, id } : row))
    updateMorningRoutine(selected, { exercises })
    setEditing(null)
  }

  function deleteExercise() {
    if (!editing) return
    updateMorningRoutine(selected, {
      exercises: routine.exercises.filter((row) => row.id !== editing.exercise.id),
    })
    setEditing(null)
  }

  function addExercise() {
    setEditing({
      isNew: true,
      exercise: {
        id: `${selected.toLowerCase()}-${uid()}`,
        nameHe: '',
        nameEn: '',
        badge: '',
        target: '',
        description: '',
        tip: '',
        illustration: 'vacuum',
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AiReviewBadge
          title="בדיקת AI לשגרת הבוקר"
          cycle={{
            intervalDays: morningRoutine.aiReview.intervalDays,
            anchorDate:
              morningRoutine.aiReview.lastReviewAt ?? effectiveMorningStart(morningRoutine),
          }}
          presets={REVIEW_PRESETS}
          hint="ברירת מחדל: 90 ימים (3 חודשים)."
          onSave={({ intervalDays, anchorDate }) => setMorningAiReview(intervalDays, anchorDate)}
        />
      </div>

      <div
        role="tablist"
        aria-label="בחירת שגרה"
        className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1"
      >
        {MORNING_ROUTINE_IDS.map((id) => {
          const active = id === selected
          const doneToday = todayDone?.routine === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelected(id)}
              className={[
                'flex min-h-12 flex-col items-center justify-center rounded-xl px-2 py-1.5 text-center transition',
                active
                  ? 'bg-white text-blue-700 shadow-sm shadow-slate-300/60'
                  : 'text-muted hover:text-text',
              ].join(' ')}
            >
              <span className="flex items-center gap-1 text-sm font-bold">
                {MORNING_ROUTINE_LABELS[id]}
                {doneToday ? <Check className="size-3.5 text-teal-600" strokeWidth={3} /> : null}
              </span>
              <span className="text-[11px] font-medium opacity-80">
                {MORNING_ROUTINE_SUBTITLES[id]}
              </span>
            </button>
          )
        })}
      </div>

      <section className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-extrabold tracking-tight text-text">
              {routine.title}
            </h2>
            {routine.meta ? <p className="text-xs font-medium text-muted">{routine.meta}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => setMetaOpen(true)}
            aria-label={`עריכת ${MORNING_ROUTINE_LABELS[selected]}`}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-slate-100 hover:text-text"
          >
            <Settings2 className="size-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => setMorningCompletion(today, doneSelected ? null : selected)}
            className={[
              'flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-4 text-base font-bold transition',
              doneSelected
                ? 'bg-teal-50 text-teal-800 ring-1 ring-teal-200 hover:bg-teal-100'
                : 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700',
            ].join(' ')}
          >
            {doneSelected ? (
              <>
                <Check className="size-5" strokeWidth={2.75} />
                {MORNING_ROUTINE_LABELS[selected]} בוצעה היום
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700/80">
                  <Undo2 className="size-3.5" strokeWidth={2} />
                  ביטול
                </span>
              </>
            ) : doneOther && todayDone?.routine ? (
              <>החלף ל{MORNING_ROUTINE_LABELS[selected]} היום ✓</>
            ) : (
              <>סיימתי {MORNING_ROUTINE_LABELS[selected]} היום ✓</>
            )}
          </button>
          {doneOther && todayDone?.routine ? (
            <p className="text-center text-[11px] text-muted">
              היום כבר סומנה {MORNING_ROUTINE_LABELS[todayDone.routine]}. לחיצה תחליף אותה.
            </p>
          ) : (
            <p className="text-center text-[11px] text-muted">
              לתיקון ימים קודמים — לחץ על היום במעקב למטה.
            </p>
          )}
        </div>

        <ol className="space-y-2">
          {routine.exercises.map((exercise, index) => (
            <MorningExerciseCard
              key={exercise.id}
              exercise={exercise}
              index={index}
              onEdit={() => setEditing({ exercise, isNew: false })}
            />
          ))}
        </ol>

        {routine.exercises.length < MAX_EXERCISES ? (
          <button
            type="button"
            onClick={addExercise}
            className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 text-xs font-semibold text-muted transition hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-600"
          >
            <Plus className="size-3.5" strokeWidth={2.25} />
            הוסף תרגיל לשגרה
          </button>
        ) : null}

        {routine.footerNote ? (
          <p className="rounded-xl bg-slate-100 px-3 py-2 text-center text-xs font-medium text-slate-600">
            {routine.footerNote}
          </p>
        ) : null}
      </section>

      <MorningConsistencyCard />

      <MorningExerciseModal
        exercise={editing?.exercise ?? null}
        isNew={editing?.isNew ?? false}
        canDelete={!!editing && !editing.isNew && routine.exercises.length > 1}
        onClose={() => setEditing(null)}
        onSave={saveExercise}
        onDelete={deleteExercise}
      />
      <MorningRoutineMetaModal
        routine={routine}
        open={metaOpen}
        onClose={() => setMetaOpen(false)}
        onSave={(patch) => {
          updateMorningRoutine(selected, patch)
          setMetaOpen(false)
        }}
        onReset={() => {
          resetMorningRoutine(selected)
          setMetaOpen(false)
        }}
      />
    </div>
  )
}
