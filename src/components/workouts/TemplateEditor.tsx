import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Exercise, WorkoutDay, WorkoutTemplate } from '../../lib/types'
import { uid } from '../../lib/types'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { Modal } from '../ui/Modal'

type TemplateEditorProps = {
  open: boolean
  template: WorkoutTemplate | null
  isCreating?: boolean
  seedExercises?: Exercise[]
  workoutDays: WorkoutDay[]
  onClose: () => void
  onSave: (template: {
    id?: string
    name: string
    exercises: Exercise[]
  }) => void
  onDelete?: (id: string) => void
  onApplyToDay: (
    templateId: string,
    dayId: string,
    exercises: Exercise[],
  ) => void
}

const emptyEx = (): Exercise => ({
  id: uid(),
  name: '',
  sets: 3,
  reps: '8–10',
  notes: '',
})

export function TemplateEditor({
  open,
  template,
  isCreating = false,
  seedExercises = [],
  workoutDays,
  onClose,
  onSave,
  onDelete,
  onApplyToDay,
}: TemplateEditorProps) {
  const [name, setName] = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [editingEx, setEditingEx] = useState<Exercise | null>(null)
  const [exForm, setExForm] = useState({
    name: '',
    sets: '3',
    reps: '8–10',
    notes: '',
  })
  const [applyOpen, setApplyOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    if (template) {
      setName(template.name)
      setExercises(structuredClone(template.exercises))
      return
    }
    if (isCreating) {
      setName('')
      setExercises(
        seedExercises.length
          ? structuredClone(seedExercises).map((e) => ({ ...e, id: uid() }))
          : [],
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed only when opening / switching template
  }, [open, template?.id, isCreating])

  function move(index: number, dir: -1 | 1) {
    setExercises((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function saveEx() {
    const payload: Exercise = {
      id: editingEx?.id ?? uid(),
      name: exForm.name.trim(),
      sets: Math.max(1, Number(exForm.sets) || 1),
      reps: exForm.reps.trim() || '8–10',
      notes: exForm.notes.trim() || undefined,
    }
    if (!payload.name) return
    setExercises((prev) => {
      const exists = prev.some((e) => e.id === payload.id)
      return exists
        ? prev.map((e) => (e.id === payload.id ? payload : e))
        : [...prev, payload]
    })
    setEditingEx(null)
    setExForm({ name: '', sets: '3', reps: '8–10', notes: '' })
  }

  return (
    <>
      <Modal
        open={open}
        title={isCreating ? 'תבנית אימון חדשה' : 'עריכת תבנית אימון'}
        onClose={onClose}
        wide
      >
        <div className="space-y-4">
          <label className="block text-xs text-muted">
            שם התבנית
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
              placeholder="למשל דחיפה עליון"
              required
            />
          </label>

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-text">תרגילים</p>
            <IconButton
              label="הוסף תרגיל"
              tone="accent"
              onClick={() => {
                setEditingEx(emptyEx())
                setExForm({ name: '', sets: '3', reps: '8–10', notes: '' })
              }}
            >
              <Plus className="size-4" strokeWidth={1.75} />
            </IconButton>
          </div>

          {exercises.length === 0 ? (
            <p className="text-sm text-muted">אין תרגילים. הוסף תרגיל ראשון.</p>
          ) : (
            <ul className="space-y-2">
              {exercises.map((ex, index) => (
                <li
                  key={ex.id}
                  className="flex items-start gap-1 rounded-xl border border-line bg-surface px-3 py-2"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-right"
                    onClick={() => {
                      setEditingEx(ex)
                      setExForm({
                        name: ex.name,
                        sets: String(ex.sets),
                        reps: ex.reps,
                        notes: ex.notes ?? '',
                      })
                    }}
                  >
                    <p className="font-medium text-text">{ex.name}</p>
                    <p className="text-xs text-muted">
                      {ex.sets} סטים · {ex.reps}
                      {ex.notes ? ` · ${ex.notes}` : ''}
                    </p>
                  </button>
                  <IconButton label="העלה" onClick={() => move(index, -1)}>
                    <ArrowUp className="size-3.5" strokeWidth={1.75} />
                  </IconButton>
                  <IconButton label="הורד" onClick={() => move(index, 1)}>
                    <ArrowDown className="size-3.5" strokeWidth={1.75} />
                  </IconButton>
                  <IconButton
                    label="ערוך"
                    tone="accent"
                    onClick={() => {
                      setEditingEx(ex)
                      setExForm({
                        name: ex.name,
                        sets: String(ex.sets),
                        reps: ex.reps,
                        notes: ex.notes ?? '',
                      })
                    }}
                  >
                    <Pencil className="size-3.5" strokeWidth={1.75} />
                  </IconButton>
                  <IconButton
                    label="מחק"
                    tone="danger"
                    onClick={() =>
                      setExercises((prev) => prev.filter((e) => e.id !== ex.id))
                    }
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.75} />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-2 border-t border-line pt-3">
            <Button
              variant="accent"
              className="w-full"
              onClick={() => {
                if (!name.trim()) return
                onSave({
                  id: template?.id,
                  name: name.trim(),
                  exercises,
                })
              }}
            >
              שמור תבנית
            </Button>
            {template?.id ? (
              <>
                <Button
                  variant="surface"
                  className="w-full"
                  onClick={() => setApplyOpen(true)}
                >
                  החל אימון זה על יום…
                </Button>
                {onDelete ? (
                  <Button
                    variant="ghost"
                    className="w-full text-danger"
                    onClick={() => {
                      onDelete(template.id)
                      onClose()
                    }}
                  >
                    מחק תבנית
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </Modal>

      <Modal
        open={!!editingEx}
        title={exForm.name ? 'עריכת תרגיל' : 'תרגיל חדש'}
        onClose={() => setEditingEx(null)}
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            saveEx()
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
              onChange={(e) => setExForm((p) => ({ ...p, sets: e.target.value }))}
              placeholder="סטים"
              className="rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
            />
            <input
              value={exForm.reps}
              onChange={(e) => setExForm((p) => ({ ...p, reps: e.target.value }))}
              placeholder="חזרות"
              className="rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
            />
          </div>
          <input
            value={exForm.notes}
            onChange={(e) => setExForm((p) => ({ ...p, notes: e.target.value }))}
            placeholder="הערות"
            className="w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
          />
          <Button type="submit" className="w-full" variant="accent">
            שמור תרגיל
          </Button>
        </form>
      </Modal>

      <Modal
        open={applyOpen}
        title="החל אימון זה על יום…"
        onClose={() => setApplyOpen(false)}
      >
        <ul className="space-y-2">
          {workoutDays.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                className="w-full rounded-xl border border-line bg-surface px-3 py-3 text-right transition hover:border-primary"
                onClick={() => {
                  if (!template?.id) return
                  onSave({
                    id: template.id,
                    name: name.trim() || template.name,
                    exercises,
                  })
                  onApplyToDay(template.id, d.id, exercises)
                  setApplyOpen(false)
                  onClose()
                }}
              >
                <p className="font-semibold text-text">
                  יום {d.dayNumber} — {d.title}
                </p>
                <p className="text-xs text-muted">{d.exercises.length} תרגילים כרגע</p>
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  )
}
