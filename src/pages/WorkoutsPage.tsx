import { useState } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { SetLogger } from '../components/workouts/SetLogger'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { useAppData } from '../context/AppDataContext'
import type { Exercise } from '../lib/types'

export function WorkoutsPage() {
  const {
    workoutDays,
    updateWorkoutDay,
    addExercise,
    updateExercise,
    deleteExercise,
    addSetLog,
  } = useAppData()

  const [dayId, setDayId] = useState(workoutDays[0]?.id ?? '')
  const day = workoutDays.find((d) => d.id === dayId) ?? workoutDays[0]
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null)
  const [editDayOpen, setEditDayOpen] = useState(false)
  const [editExercise, setEditExercise] = useState<Exercise | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const [dayTitle, setDayTitle] = useState('')
  const [dayFocus, setDayFocus] = useState('')
  const [exForm, setExForm] = useState({
    name: '',
    sets: '3',
    reps: '8–10',
    notes: '',
  })

  const activeExercise =
    day?.exercises.find((e) => e.id === activeExerciseId) ?? null

  if (!day) {
    return (
      <>
        <PageHeader title="אימונים" subtitle="אין ימי אימון" />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="אימונים"
        subtitle="שגרת 5 ימים · דחיפה / משיכה — ניתנת להתאמה"
        action={
          <Button
            variant="surface"
            onClick={() => {
              setDayTitle(day.title)
              setDayFocus(day.focus)
              setEditDayOpen(true)
            }}
          >
            ערוך יום
          </Button>
        }
      />

      <div className="space-y-4 px-4 py-4">
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

        <Card
          title={day.title}
          action={
            <button
              type="button"
              className="text-sm font-medium text-accent"
              onClick={() => {
                setExForm({ name: '', sets: '3', reps: '8–10', notes: '' })
                setAddOpen(true)
              }}
            >
              + תרגיל
            </button>
          }
        >
          <p className="mb-3 text-sm text-muted">{day.focus}</p>
          <ul className="space-y-2">
            {day.exercises.map((ex) => (
              <li key={ex.id} className="rounded-xl border border-line bg-surface">
                <div className="flex items-start gap-2 px-3 py-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-right"
                    onClick={() =>
                      setActiveExerciseId(
                        activeExerciseId === ex.id ? null : ex.id,
                      )
                    }
                  >
                    <p className="font-semibold text-text">{ex.name}</p>
                    <p className="mt-1 text-xs text-muted">
                      {ex.sets} סטים · {ex.reps}
                      {ex.notes ? ` · ${ex.notes}` : ''}
                    </p>
                  </button>
                  <button
                    type="button"
                    className="text-xs text-primary"
                    onClick={() => {
                      setEditExercise(ex)
                      setExForm({
                        name: ex.name,
                        sets: String(ex.sets),
                        reps: ex.reps,
                        notes: ex.notes ?? '',
                      })
                    }}
                  >
                    ערוך
                  </button>
                  <button
                    type="button"
                    className="text-xs text-danger"
                    onClick={() => deleteExercise(day.id, ex.id)}
                  >
                    מחק
                  </button>
                </div>
              </li>
            ))}
          </ul>
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
              addExercise(day.id, payload)
            }
            setAddOpen(false)
            setEditExercise(null)
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
