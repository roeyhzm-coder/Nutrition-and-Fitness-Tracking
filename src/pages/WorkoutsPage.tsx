import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Pencil, Plus, Trash2, X } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { SetLogger } from '../components/workouts/SetLogger'
import { ProgramManager } from '../components/workouts/ProgramManager'
import { WorkoutLibrary } from '../components/workouts/WorkoutLibrary'
import { ActivityLogCard } from '../components/workouts/ActivityLogCard'
import {
  ExerciseDetails,
  ExerciseFormFields,
  ExerciseMedia,
} from '../components/workouts/ExerciseFields'
import { Button } from '../components/ui/Button'
import { IconButton } from '../components/ui/IconButton'
import { Modal } from '../components/ui/Modal'
import { useAppData } from '../context/AppDataContext'
import type { DaySession, Exercise, WorkoutDay } from '../lib/types'
import { dayAllExercises, WEEKDAYS, weekdayNumber } from '../lib/types'
import { dayPlanLabel } from '../lib/weekPlan'
import { StartWorkoutButton } from '../components/workouts/WeeklyPlanParts'
import { DayActionsMenu } from '../components/workouts/DayActionsMenu'
import { WorkoutHistoryCard } from '../components/workouts/WorkoutHistoryCard'
import { WorkoutCompletedBadge } from '../components/workouts/WorkoutCompletedBadge'
import { WeeklyPlanEditor } from '../components/workouts/WeeklyPlanEditor'
import { FocusTracksCard } from '../components/workouts/FocusTracksCard'
import type { ExerciseForm } from '../lib/exerciseForm'
import {
  EMPTY_EXERCISE_FORM,
  exerciseToForm,
  formToExercise,
} from '../lib/exerciseForm'

export function WorkoutsPage() {
  const {
    workoutDays,
    activeProgram,
    updateWorkoutDay,
    addExercise,
    updateExercise,
    deleteExercise,
    removeDaySession,
    addSetLog,
    setDayPlan,
    resetDayToOfficialPlan,
  } = useAppData()

  const todayNumber = weekdayNumber()
  const todayDayId = (programDays: WorkoutDay[]) =>
    programDays.find((d) => d.dayNumber === todayNumber)?.id ?? programDays[0]?.id ?? ''
  const [dayId, setDayId] = useState(() => todayDayId(workoutDays))
  const day = workoutDays.find((d) => d.id === dayId) ?? workoutDays[0]
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null)
  const [dayDetailsOpen, setDayDetailsOpen] = useState(false)
  const [editDayOpen, setEditDayOpen] = useState(false)
  const [editExercise, setEditExercise] = useState<Exercise | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addSessionId, setAddSessionId] = useState<string | null>(null)
  const [librarySignal, setLibrarySignal] = useState(0)

  const [dayFocus, setDayFocus] = useState('')
  const [exForm, setExForm] = useState<ExerciseForm>(EMPTY_EXERCISE_FORM)

  useEffect(() => {
    setDayId(todayDayId(activeProgram?.days ?? []))
    setActiveExerciseId(null)
    setDayDetailsOpen(false)
  }, [activeProgram?.id])

  useEffect(() => {
    setDayDetailsOpen(false)
    setActiveExerciseId(null)
  }, [dayId])

  const allExercises = useMemo(
    () => (day ? dayAllExercises(day) : []),
    [day],
  )

  const activeExercise =
    allExercises.find((e) => e.id === activeExerciseId) ?? null

  function openAddExercise(sessionId?: string | null) {
    setAddSessionId(sessionId ?? null)
    setEditExercise(null)
    setExForm(EMPTY_EXERCISE_FORM)
    setAddOpen(true)
  }

  function openEditExercise(ex: Exercise) {
    setEditExercise(ex)
    setAddSessionId(null)
    setExForm(exerciseToForm(ex))
  }

  function renderExerciseRow(ex: Exercise) {
    return (
      <li key={ex.id} className="rounded-2xl border border-slate-200 bg-slate-50">
        <div className="flex items-start gap-2 px-3 py-3">
          <ExerciseMedia exercise={ex} />
          <button
            type="button"
            className="min-h-11 min-w-0 flex-1 text-right"
            onClick={() =>
              setActiveExerciseId(activeExerciseId === ex.id ? null : ex.id)
            }
          >
            <p className="font-semibold text-text">{ex.name}</p>
            <ExerciseDetails exercise={ex} />
          </button>
          <IconButton
            label="עריכת תרגיל"
            tone="accent"
            onClick={() => openEditExercise(ex)}
          >
            <Pencil className="size-3.5" strokeWidth={1.75} />
          </IconButton>
          <IconButton
            label="מחק תרגיל"
            tone="danger"
            onClick={() => deleteExercise(day!.id, ex.id)}
          >
            <Trash2 className="size-3.5" strokeWidth={1.75} />
          </IconButton>
        </div>
      </li>
    )
  }

  function renderSession(session: DaySession) {
    return (
      <section
        key={session.id}
        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
      >
        <div className="mb-2 flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-text">{session.name}</p>
            <p className="text-xs text-muted">
              {session.exercises.length} תרגילים
            </p>
          </div>
          <IconButton
            label="הוסף תרגיל לאימון"
            tone="accent"
            onClick={() => openAddExercise(session.id)}
          >
            <Plus className="size-3.5" strokeWidth={1.75} />
          </IconButton>
        </div>
        {session.exercises.length === 0 ? (
          <p className="text-sm text-muted">אין תרגילים באימון זה.</p>
        ) : (
          <ul className="space-y-2">
            {session.exercises.map(renderExerciseRow)}
          </ul>
        )}
      </section>
    )
  }

  if (!day) {
    return (
      <>
        <PageHeader title="אימונים" subtitle="אין ימי אימון" />
        <div className="space-y-5 px-4 py-5">
          <ProgramManager />
          <FocusTracksCard />
          <ActivityLogCard />
          <WeeklyPlanEditor />
        </div>
      </>
    )
  }

  const dayTitle = `יום ${day.title}${day.dayNumber === todayNumber ? ' · היום' : ''}`
  const daySummary = day.isRest
    ? 'יום מנוחה'
    : `${allExercises.length} תרגילים · ${dayPlanLabel(day)}`

  return (
    <>
      <PageHeader
        title="אימונים"
        action={
          <IconButton
            label="עריכת יום"
            tone="accent"
            onClick={() => {
              setDayFocus(day.focus)
              setEditDayOpen(true)
            }}
          >
            <Pencil className="size-4" strokeWidth={1.75} />
          </IconButton>
        }
      />

      <div className="space-y-5 px-4 py-5">
        <WorkoutCompletedBadge />
        <FocusTracksCard />
        <WorkoutLibrary
          currentDayId={day.id}
          currentDayExercises={allExercises}
          expandSignal={librarySignal}
        />

        <section aria-label="לוח שבועי" className="flex gap-2 overflow-x-auto pb-1">
          {workoutDays.map((d) => {
            const selected = d.id === day.id
            const isToday = d.dayNumber === todayNumber
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setDayId(d.id)
                  setActiveExerciseId(null)
                }}
                aria-pressed={selected}
                className={[
                  'flex min-h-[5rem] min-w-[4.75rem] flex-1 flex-col items-center justify-start gap-1 rounded-2xl px-1.5 py-2.5 text-center transition',
                  selected
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : d.isRest
                      ? 'border border-slate-200 bg-slate-50 text-muted'
                      : 'border border-slate-200 bg-white text-text backdrop-blur-md',
                  isToday && !selected ? 'ring-1 ring-blue-400' : '',
                ].join(' ')}
              >
                <span className="text-sm font-bold">{WEEKDAYS[d.dayNumber - 1]}</span>
                {isToday ? (
                  <span
                    className={[
                      'text-[10px] font-semibold',
                      selected ? 'text-white/80' : 'text-blue-600',
                    ].join(' ')}
                  >
                    היום
                  </span>
                ) : null}
                <span
                  className={[
                    'line-clamp-2 text-[10px] leading-tight',
                    selected ? 'text-white/80' : 'text-muted',
                  ].join(' ')}
                >
                  {dayPlanLabel(d)}
                </span>
              </button>
            )
          })}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/80">
          <div className="flex items-center gap-1 border-b border-slate-200 px-3 py-2">
            <button
              type="button"
              className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-2 py-2 text-right"
              onClick={() => setDayDetailsOpen((v) => !v)}
              aria-expanded={dayDetailsOpen}
            >
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-base font-semibold tracking-tight text-slate-900">
                  {dayTitle}
                </h2>
                <p className="mt-0.5 truncate text-xs text-muted">{daySummary}</p>
              </div>
              <ChevronDown
                className={`size-5 shrink-0 text-muted transition-transform duration-200 ${
                  dayDetailsOpen ? 'rotate-180' : ''
                }`}
                strokeWidth={1.75}
              />
            </button>
            <div className="flex shrink-0 items-center gap-0.5 pe-1">
              <StartWorkoutButton day={day} />
              <DayActionsMenu
                isRest={!!day.isRest}
                onReplace={() => {
                  setLibrarySignal((n) => n + 1)
                  window.requestAnimationFrame(() => {
                    document
                      .getElementById('workout-library')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  })
                }}
                onRest={() => setDayPlan(day.id, { type: 'rest' })}
                onReset={() => resetDayToOfficialPlan(day.id)}
              />
            </div>
          </div>

          {day.sessions.length > 1 ? (
            <div className="flex flex-wrap gap-1.5 border-b border-slate-200 px-4 py-2">
              {day.sessions.map((session) => (
                <span
                  key={session.id}
                  className="inline-flex max-w-full items-center gap-0.5 rounded-full border border-slate-200 bg-slate-50 py-0.5 ps-2.5 pe-0.5 text-[11px] font-medium text-text"
                >
                  <span className="truncate">{session.name}</span>
                  <button
                    type="button"
                    aria-label={`הסר ${session.name}`}
                    title="הסר אימון"
                    className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-slate-200 hover:text-text"
                    onClick={() => removeDaySession(day.id, session.id)}
                  >
                    <X className="size-3" strokeWidth={2.25} />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <div
            className={[
              'grid transition-[grid-template-rows] duration-200 ease-out',
              dayDetailsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
            ].join(' ')}
          >
            <div className="overflow-hidden">
              <div className="space-y-3 p-5">
                {day.isRest ? (
                  <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-muted">
                    יום מנוחה — אין אימון מתוכנן.
                  </p>
                ) : (
                  <>
                    <button
                      type="button"
                      className="min-h-11 text-sm text-muted hover:text-text"
                      onClick={() => {
                        setDayFocus(day.focus)
                        setEditDayOpen(true)
                      }}
                    >
                      {day.focus || 'הוסף מיקוד ליום…'}
                    </button>

                    <Button variant="surface" onClick={() => openAddExercise(null)}>
                      <Plus className="size-3.5" strokeWidth={1.75} />
                      תרגיל
                    </Button>

                    <div className="space-y-3">
                      {day.sessions.map(renderSession)}

                      {(day.exercises.length > 0 || day.sessions.length === 0) && (
                        <section className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-sm font-semibold text-text">
                              תרגילים עצמאיים
                            </p>
                            <IconButton
                              label="הוסף תרגיל"
                              tone="accent"
                              onClick={() => openAddExercise(null)}
                            >
                              <Plus className="size-3.5" strokeWidth={1.75} />
                            </IconButton>
                          </div>
                          {day.exercises.length === 0 ? (
                            <p className="text-sm text-muted">
                              אין תרגילים עצמאיים. בחר אימון מהספרייה או הוסף תרגיל בודד.
                            </p>
                          ) : (
                            <ul className="space-y-2">
                              {day.exercises.map(renderExerciseRow)}
                            </ul>
                          )}
                        </section>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {activeExercise && !day.isRest && dayDetailsOpen ? (
          <SetLogger
            exercise={activeExercise}
            dayId={day.id}
            onLog={addSetLog}
          />
        ) : null}

        <WorkoutHistoryCard limit={10} />
        <ActivityLogCard />
        <WeeklyPlanEditor />
      </div>

      <Modal
        open={editDayOpen}
        title="עריכת יום אימון"
        onClose={() => setEditDayOpen(false)}
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            updateWorkoutDay(day.id, { focus: dayFocus.trim() })
            setEditDayOpen(false)
          }}
        >
          <label className="block text-xs text-muted">
            מיקוד
            <input
              value={dayFocus}
              onChange={(e) => setDayFocus(e.target.value)}
              className="mt-1 field"
            />
          </label>
          <Button type="submit" className="w-full" variant="accent">
            שמור
          </Button>
        </form>
      </Modal>

      <Modal
        open={addOpen || !!editExercise}
        title={editExercise ? 'עריכת תרגיל' : 'הוספת תרגיל'}
        onClose={() => {
          setAddOpen(false)
          setEditExercise(null)
          setAddSessionId(null)
        }}
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            const payload = formToExercise(exForm)
            if (!payload.name) return
            if (editExercise) {
              updateExercise(day.id, editExercise.id, payload)
            } else {
              addExercise(day.id, payload, addSessionId)
            }
            setAddOpen(false)
            setEditExercise(null)
            setAddSessionId(null)
          }}
        >
          <ExerciseFormFields form={exForm} setForm={setExForm} />
          <Button type="submit" className="w-full" variant="accent">
            שמור תרגיל
          </Button>
        </form>
      </Modal>
    </>
  )
}
