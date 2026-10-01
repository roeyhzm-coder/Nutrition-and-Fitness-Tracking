import { useEffect, useState } from 'react'
import { ChevronDown, Library, Pencil, Plus } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import type { Exercise, WorkoutTemplate } from '../../lib/types'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { Modal } from '../ui/Modal'
import { TemplateEditor } from './TemplateEditor'

type WorkoutLibraryProps = {
  currentDayId: string
  currentDayExercises: Exercise[]
  expandSignal?: number
}

export function WorkoutLibrary({
  currentDayId,
  currentDayExercises,
  expandSignal = 0,
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

  const [expanded, setExpanded] = useState(false)
  const [highlight, setHighlight] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [activeTemplate, setActiveTemplate] = useState<WorkoutTemplate | null>(
    null,
  )
  const [toast, setToast] = useState<string | null>(null)

  const currentDay = workoutDays.find((d) => d.id === currentDayId)

  useEffect(() => {
    if (!expandSignal) return
    setExpanded(true)
    setHighlight(true)
    const handle = window.setTimeout(() => setHighlight(false), 1800)
    return () => window.clearTimeout(handle)
  }, [expandSignal])

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

  function replaceOnCurrentDay(t: WorkoutTemplate) {
    assignTemplateToDay(currentDayId, t.id)
    const dayLabel = currentDay?.title ?? ''
    setToast(`הוחלף ל«${t.name}» ביום ${dayLabel}`)
    window.setTimeout(() => setToast(null), 2200)
  }

  function templateRow(t: WorkoutTemplate) {
    return (
      <li
        key={t.id}
        className="flex items-stretch overflow-hidden rounded-2xl bg-slate-50"
      >
        <button
          type="button"
          className="min-h-11 min-w-0 flex-1 px-4 py-3 text-right text-sm transition hover:bg-slate-100"
          onClick={() => replaceOnCurrentDay(t)}
        >
          <p className="truncate font-medium text-text">{t.name}</p>
          <p className="text-xs text-muted">
            {t.exercises.length} תרגילים
            {t.estimatedCalories ? ` · ${t.estimatedCalories} קק״ל` : ''}
            {' · '}
            לחץ להחלפת היום
          </p>
        </button>
        <IconButton
          label={`ערוך ${t.name}`}
          tone="accent"
          onClick={() => openEdit(t)}
        >
          <Pencil className="size-3.5" strokeWidth={1.75} />
        </IconButton>
      </li>
    )
  }

  return (
    <>
      <section
        id="workout-library"
        className={[
          'rounded-2xl border bg-white shadow-sm shadow-slate-200/80 transition',
          highlight
            ? 'border-blue-400 ring-2 ring-blue-500/30'
            : 'border-slate-200',
        ].join(' ')}
      >
        <button
          type="button"
          className="flex w-full min-h-14 items-center justify-between gap-3 px-5 py-4 text-right"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base font-semibold tracking-tight text-slate-900">
              ספריית אימונים
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {workoutTemplates.length} תבניות
              {!expanded ? ' · לחץ לפתיחה' : ''}
            </p>
          </div>
          <ChevronDown
            className={`size-5 shrink-0 text-muted transition-transform duration-200 ${
              expanded ? 'rotate-180' : ''
            }`}
            strokeWidth={1.75}
          />
        </button>

        <div
          className={[
            'grid transition-[grid-template-rows] duration-200 ease-out',
            expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          ].join(' ')}
        >
          <div className="overflow-hidden">
            <div className="space-y-3 border-t border-slate-200 p-5">
              <p className="text-xs text-muted">
                לחיצה על תבנית מחליפה את האימון ביום הנבחר. עיפרון לעריכה.
              </p>
              {toast ? (
                <p
                  role="status"
                  className="rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800"
                >
                  {toast}
                </p>
              ) : null}
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
                <IconButton
                  label="ספרייה מלאה"
                  tone="accent"
                  onClick={() => setListOpen(true)}
                >
                  <Library className="size-4" strokeWidth={1.75} />
                </IconButton>
              </div>
              {workoutTemplates.length > 0 ? (
                <ul className="space-y-2">
                  {workoutTemplates.map(templateRow)}
                </ul>
              ) : (
                <p className="text-sm text-muted">אין תבניות עדיין.</p>
              )}
            </div>
          </div>
        </div>
      </section>

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
          <ul className="space-y-2">{workoutTemplates.map(templateRow)}</ul>
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
        onSave={({ id, name, exercises, estimatedCalories }) => {
          if (id) {
            updateWorkoutTemplate(id, { name, exercises, estimatedCalories })
            setActiveTemplate((prev) =>
              prev && prev.id === id
                ? {
                    ...prev,
                    name,
                    exercises,
                    estimatedCalories,
                    updatedAt: new Date().toISOString(),
                  }
                : prev,
            )
          } else {
            const newId = addWorkoutTemplate({ name, exercises, estimatedCalories })
            setActiveTemplate({
              id: newId,
              name,
              exercises,
              estimatedCalories,
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
