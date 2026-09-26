import { useState } from 'react'
import { Library, Plus } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import type { Exercise, WorkoutTemplate } from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { IconButton } from '../ui/IconButton'
import { Modal } from '../ui/Modal'
import { TemplateEditor } from './TemplateEditor'

type WorkoutLibraryProps = {
  currentDayId: string
  currentDayExercises: Exercise[]
}

export function WorkoutLibrary({
  currentDayId,
  currentDayExercises,
}: WorkoutLibraryProps) {
  const {
    workoutDays,
    workoutTemplates,
    addWorkoutTemplate,
    updateWorkoutTemplate,
    deleteWorkoutTemplate,
    assignTemplateToDay,
    saveDayAsTemplate,
  } = useAppData()

  const [listOpen, setListOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [activeTemplate, setActiveTemplate] = useState<WorkoutTemplate | null>(
    null,
  )

  function openCreate() {
    setCreating(true)
    setActiveTemplate(null)
    setEditorOpen(true)
    setListOpen(false)
  }

  function openEdit(t: WorkoutTemplate) {
    setCreating(false)
    setActiveTemplate(t)
    setEditorOpen(true)
    setListOpen(false)
  }

  return (
    <>
      <Card
        title="ספריית אימונים"
        action={
          <IconButton
            label="ספרייה"
            tone="accent"
            onClick={() => setListOpen(true)}
          >
            <Library className="size-4" strokeWidth={1.75} />
          </IconButton>
        }
      >
        <p className="mb-3 text-xs text-muted">
          ספרייה מובנית (בלוק 1 ובלוק 2: משיכה, דחיפה, משולב) — ערוך, מחק, או הוסף תבניות
          והצמד כמה אימונים לאותו יום.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="surface"
            onClick={() => {
              saveDayAsTemplate(
                currentDayId,
                `תבנית · ${new Date().toLocaleDateString('he-IL')}`,
              )
            }}
          >
            שמור יום נוכחי כתבנית
          </Button>
          <Button variant="accent" onClick={openCreate}>
            תבנית חדשה
          </Button>
        </div>
        {workoutTemplates.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {workoutTemplates.slice(0, 4).map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className="w-full min-h-11 rounded-2xl bg-slate-50 px-4 py-3 text-right text-sm transition hover:bg-slate-100"
                  onClick={() => openEdit(t)}
                >
                  <p className="truncate font-medium text-text">{t.name}</p>
                  <p className="text-xs text-muted">{t.exercises.length} תרגילים</p>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">אין תבניות עדיין.</p>
        )}
      </Card>

      <Modal
        open={listOpen}
        title="ספריית תבניות"
        onClose={() => setListOpen(false)}
        wide
      >
        <div className="mb-3 flex justify-end">
          <IconButton
            label="תבנית חדשה"
            tone="accent"
            onClick={openCreate}
          >
            <Plus className="size-4" strokeWidth={1.75} />
          </IconButton>
        </div>
        {workoutTemplates.length === 0 ? (
          <p className="text-sm text-muted">אין תבניות. צור תבנית חדשה.</p>
        ) : (
          <ul className="space-y-2">
            {workoutTemplates.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className="w-full min-h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-right transition hover:border-blue-300"
                  onClick={() => openEdit(t)}
                >
                  <p className="font-semibold text-text">{t.name}</p>
                  <p className="text-xs text-muted">{t.exercises.length} תרגילים</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <TemplateEditor
        open={editorOpen}
        template={activeTemplate}
        isCreating={creating && !activeTemplate}
        seedExercises={creating && !activeTemplate ? currentDayExercises : []}
        workoutDays={workoutDays}
        onClose={() => {
          setEditorOpen(false)
          setActiveTemplate(null)
          setCreating(false)
        }}
        onSave={({ id, name, exercises }) => {
          if (id) {
            updateWorkoutTemplate(id, { name, exercises })
            setActiveTemplate((prev) =>
              prev && prev.id === id
                ? { ...prev, name, exercises, updatedAt: new Date().toISOString() }
                : prev,
            )
          } else {
            const newId = addWorkoutTemplate({ name, exercises })
            setActiveTemplate({
              id: newId,
              name,
              exercises,
              updatedAt: new Date().toISOString(),
            })
            setCreating(false)
          }
        }}
        onDelete={deleteWorkoutTemplate}
        onApplyToDay={(templateId, dayId, exercises) => {
          assignTemplateToDay(dayId, templateId, exercises)
        }}
      />
    </>
  )
}
