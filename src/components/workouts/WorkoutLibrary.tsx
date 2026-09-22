import { useState } from 'react'
import { Library, Pencil, Plus, Trash2 } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import type { Exercise, WorkoutTemplate } from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { IconButton } from '../ui/IconButton'
import { Modal } from '../ui/Modal'

type WorkoutLibraryProps = {
  currentDayId: string
  currentDayExercises: Exercise[]
}

export function WorkoutLibrary({
  currentDayId,
  currentDayExercises,
}: WorkoutLibraryProps) {
  const {
    workoutTemplates,
    addWorkoutTemplate,
    updateWorkoutTemplate,
    deleteWorkoutTemplate,
    assignTemplateToDay,
    saveDayAsTemplate,
  } = useAppData()

  const [manageOpen, setManageOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [editing, setEditing] = useState<WorkoutTemplate | null>(null)
  const [name, setName] = useState('')

  return (
    <>
      <Card
        title="ספריית אימונים"
        action={
          <IconButton label="ניהול ספרייה" tone="accent" onClick={() => setManageOpen(true)}>
            <Library className="size-4" strokeWidth={1.75} />
          </IconButton>
        }
      >
        <p className="mb-3 text-xs text-muted">
          שמור תבניות תרגילים והצמד אותן לכל יום בשגרה.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="surface"
            onClick={() => {
              saveDayAsTemplate(currentDayId, `תבנית · ${new Date().toLocaleDateString('he-IL')}`)
            }}
          >
            שמור יום נוכחי כתבנית
          </Button>
          <Button variant="accent" onClick={() => setAssignOpen(true)}>
            הצמד תבנית ליום
          </Button>
        </div>
        {workoutTemplates.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {workoutTemplates.slice(0, 4).map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-sm"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-right"
                  onClick={() => assignTemplateToDay(currentDayId, t.id)}
                >
                  <p className="truncate font-medium text-text">{t.name}</p>
                  <p className="text-xs text-muted">{t.exercises.length} תרגילים</p>
                </button>
                <IconButton
                  label="ערוך תבנית"
                  tone="accent"
                  onClick={() => {
                    setEditing(t)
                    setName(t.name)
                  }}
                >
                  <Pencil className="size-3.5" strokeWidth={1.75} />
                </IconButton>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">אין תבניות עדיין.</p>
        )}
      </Card>

      <Modal open={assignOpen} title="הצמדת תבנית ליום" onClose={() => setAssignOpen(false)}>
        {workoutTemplates.length === 0 ? (
          <p className="text-sm text-muted">צור תבנית קודם (שמור את היום הנוכחי).</p>
        ) : (
          <ul className="space-y-2">
            {workoutTemplates.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-3 text-right transition hover:border-primary"
                  onClick={() => {
                    assignTemplateToDay(currentDayId, t.id)
                    setAssignOpen(false)
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

      <Modal open={manageOpen} title="ניהול ספריית אימונים" onClose={() => setManageOpen(false)} wide>
        <form
          className="mb-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) return
            addWorkoutTemplate({
              name: name.trim(),
              exercises: structuredClone(currentDayExercises).map((ex) => ({
                ...ex,
                id: crypto.randomUUID(),
              })),
            })
            setName('')
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="שם תבנית חדשה מהיום הנוכחי"
            className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
          />
          <IconButton label="הוסף תבנית" tone="accent" type="submit">
            <Plus className="size-4" strokeWidth={1.75} />
          </IconButton>
        </form>

        <ul className="space-y-2">
          {workoutTemplates.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-text">{t.name}</p>
                <p className="text-xs text-muted">{t.exercises.length} תרגילים</p>
              </div>
              <IconButton
                label="ערוך"
                tone="accent"
                onClick={() => {
                  setEditing(t)
                  setName(t.name)
                  setManageOpen(false)
                }}
              >
                <Pencil className="size-3.5" strokeWidth={1.75} />
              </IconButton>
              <IconButton
                label="מחק"
                tone="danger"
                onClick={() => deleteWorkoutTemplate(t.id)}
              >
                <Trash2 className="size-3.5" strokeWidth={1.75} />
              </IconButton>
            </li>
          ))}
        </ul>
      </Modal>

      <Modal
        open={!!editing}
        title="עריכת תבנית"
        onClose={() => setEditing(null)}
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!editing || !name.trim()) return
            updateWorkoutTemplate(editing.id, { name: name.trim() })
            setEditing(null)
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
            required
          />
          <Button type="submit" className="w-full" variant="accent">
            שמור
          </Button>
        </form>
      </Modal>
    </>
  )
}
