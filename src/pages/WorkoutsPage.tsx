import { useEffect, useMemo, useState } from 'react'
import { Library, Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { SetLogger } from '../components/workouts/SetLogger'
import { ProgramManager } from '../components/workouts/ProgramManager'
import { WorkoutLibrary } from '../components/workouts/WorkoutLibrary'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { IconButton } from '../components/ui/IconButton'
import { Modal } from '../components/ui/Modal'
import { useAppData } from '../context/AppDataContext'
import type { DaySession, Exercise } from '../lib/types'
import { dayAllExercises } from '../lib/types'

export function WorkoutsPage() {
  const {
    workoutDays,
    activeProgram,
    updateWorkoutDay,
    addExercise,
    updateExercise,
    deleteExercise,
    removeDaySession,
    attachTemplateToDay,
    workoutTemplates,
    addSetLog,
  } = useAppData()

  const [dayId, setDayId] = useState(workoutDays[0]?.id ?? '')
  const day = workoutDays.find((d) => d.id === dayId) ?? workoutDays[0]
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null)
  const [editDayOpen, setEditDayOpen] = useState(false)
  const [editExercise, setEditExercise] = useState<Exercise | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addSessionId, setAddSessionId] = useState<string | null>(null)
  const [pickTemplateOpen, setPickTemplateOpen] = useState(false)

  const [dayTitle, setDayTitle] = useState('')
  const [dayFocus, setDayFocus] = useState('')
  const [exForm, setExForm] = useState({
    name: '',
    sets: '3',
    reps: '8–10',
    notes: '',
  })

  useEffect(() => {
    setDayId(activeProgram?.days[0]?.id ?? '')
    setActiveExerciseId(null)
  }, [activeProgram?.id])

  const allExercises = useMemo(
    () => (day ? dayAllExercises(day) : []),
    [day],
  )

  const activeExercise =
    allExercises.find((e) => e.id === activeExerciseId) ?? null

  function openAddExercise(sessionId?: string | null) {
    setAddSessionId(sessionId ?? null)
    setEditExercise(null)
    setExForm({ name: '', sets: '3', reps: '8–10', notes: '' })
    setAddOpen(true)
  }

  function openEditExercise(ex: Exercise) {
    setEditExercise(ex)
    setAddSessionId(null)
    setExForm({
      name: ex.name,
      sets: String(ex.sets),
      reps: ex.reps,
      notes: ex.notes ?? '',
    })
  }

  function renderExerciseRow(ex: Exercise) {
    return (
      <li key={ex.id} className="rounded-xl border border-line bg-bg/40">
        <div className="flex items-start gap-1 px-3 py-2.5">
          <button
            type="button"
            className="min-w-0 flex-1 text-right"
            onClick={() =>
              setActiveExerciseId(activeExerciseId === ex.id ? null : ex.id)
            }
          >
            <p className="font-semibold text-text">{ex.name}</p>
            <p className="mt-0.5 text-xs text-muted">
              {ex.sets} סטים · {ex.reps}
              {ex.notes ? ` · ${ex.notes}` : ''}
            </p>
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
        className="rounded-xl border border-line bg-surface p-3"
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
          <IconButton
            label="הסר אימון מהיום"
            tone="danger"
            onClick={() => removeDaySession(day!.id, session.id)}
          >
            <Trash2 className="size-3.5" strokeWidth={1.75} />
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
        <div className="px-4 py-4">
          <ProgramManager />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="אימונים"
        subtitle={activeProgram?.name ?? 'תוכניות אימון שמורות'}
        action={
          <IconButton
            label="עריכת יום"
            tone="accent"
            onClick={() => {
              setDayTitle(day.title)
              setDayFocus(day.focus)
              setEditDayOpen(true)
            }}
          >
            <Pencil className="size-4" strokeWidth={1.75} />
          </IconButton>
        }
      />

      <div className="space-y-4 px-4 py-4">
        <ProgramManager />
        <WorkoutLibrary
          currentDayId={day.id}
          currentDayExercises={allExercises}
        />

        <div className="flex gap-2 overflow-x-auto pb-1">
          {workoutDays.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                setDayId(d.id)
                setActiveExerciseId(null)
              }}
              className={[
                'shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition',
                d.id === day.id
                  ? 'bg-primary text-white'
                  : 'border border-line bg-card text-muted',
              ].join(' ')}
            >
              יום {d.dayNumber}
            </button>
          ))}
        </div>

        <Card title={day.title}>
          <button
            type="button"
            className="mb-3 text-sm text-muted hover:text-text"
            onClick={() => {
              setDayTitle(day.title)
              setDayFocus(day.focus)
              setEditDayOpen(true)
            }}
          >
            {day.focus || 'הוסף מיקוד ליום…'}
          </button>

          <div className="mb-3 flex flex-wrap gap-2">
            <Button
              variant="accent"
              onClick={() => setPickTemplateOpen(true)}
            >
              <Library className="size-3.5" strokeWidth={1.75} />
              הוסף אימון מהספרייה
            </Button>
            <Button variant="surface" onClick={() => openAddExercise(null)}>
              <Plus className="size-3.5" strokeWidth={1.75} />
              תרגיל
            </Button>
          </div>

          <div className="space-y-3">
            {day.sessions.map(renderSession)}

            {(day.exercises.length > 0 || day.sessions.length === 0) && (
              <section className="rounded-xl border border-dashed border-line bg-surface/50 p-3">
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
                    אין תרגילים עצמאיים. הוסף אימון מהספרייה או תרגיל בודד.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {day.exercises.map(renderExerciseRow)}
                  </ul>
                )}
              </section>
            )}
          </div>
        </Card>

        {activeExercise ? (
          <SetLogger
            exercise={activeExercise}
            dayId={day.id}
            onLog={addSetLog}
          />
        ) : null}
      </div>

      <Modal
        open={pickTemplateOpen}
        title="הוסף אימון מהספרייה"
        onClose={() => setPickTemplateOpen(false)}
        wide
      >
        {workoutTemplates.length === 0 ? (
          <p className="text-sm text-muted">הספרייה ריקה. צור תבנית קודם.</p>
        ) : (
          <ul className="space-y-2">
            {workoutTemplates.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-3 text-right transition hover:border-primary"
                  onClick={() => {
                    attachTemplateToDay(day.id, t.id)
                    setPickTemplateOpen(false)
                  }}
                >
                  <p className="font-semibold text-text">{t.name}</p>
                  <p className="text-xs text-muted">{t.exercises.length} תרגילים</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal
        open={editDayOpen}
        title="עריכת יום אימון"
        onClose={() => setEditDayOpen(false)}
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            updateWorkoutDay(day.id, {
              title: dayTitle.trim() || day.title,
              focus: dayFocus.trim(),
            })
            setEditDayOpen(false)
          }}
        >
          <label className="block text-xs text-muted">
            כותרת
            <input
              value={dayTitle}
              onChange={(e) => setDayTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
            />
          </label>
          <label className="block text-xs text-muted">
            מיקוד
            <input
              value={dayFocus}
              onChange={(e) => setDayFocus(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
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
            const payload = {
              name: exForm.name.trim(),
              sets: Math.max(1, Number(exForm.sets) || 1),
              reps: exForm.reps.trim() || '8–10',
              notes: exForm.notes.trim() || undefined,
            }
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
          <input
            value={exForm.name}
            onChange={(e) => setExForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="שם התרגיל"
            className="w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              inputMode="numeric"
              value={exForm.sets}
              onChange={(e) =>
                setExForm((p) => ({ ...p, sets: e.target.value }))
              }
              placeholder="סטים"
              className="rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
            />
            <input
              value={exForm.reps}
              onChange={(e) =>
                setExForm((p) => ({ ...p, reps: e.target.value }))
              }
              placeholder="חזרות"
              className="rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
            />
          </div>
          <input
            value={exForm.notes}
            onChange={(e) =>
              setExForm((p) => ({ ...p, notes: e.target.value }))
            }
            placeholder="הערות (אופציונלי)"
            className="w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
          />
          <Button type="submit" className="w-full" variant="accent">
            שמור תרגיל
          </Button>
        </form>
      </Modal>
    </>
  )
}
