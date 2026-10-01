import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { RoutineCard } from '../components/routines/RoutineCard'
import { RoutineFormModal, type RoutineDraft } from '../components/routines/RoutineFormModal'
import { PageHeader } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { useAppData } from '../context/AppDataContext'
import { completedInWeek, currentWeekDates } from '../lib/routines'
import type { Routine } from '../lib/types'

export function RoutinesPage() {
  const {
    routines,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    toggleRoutineDate,
  } = useAppData()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Routine | null>(null)

  const weekDates = useMemo(() => currentWeekDates(), [])
  const summary = useMemo(() => {
    const targetDays = routines.reduce((sum, r) => sum + r.weeklyTargetDays, 0)
    const doneDays = routines.reduce(
      (sum, r) => sum + completedInWeek(r, weekDates),
      0,
    )
    const onTrack = routines.filter(
      (r) => completedInWeek(r, weekDates) >= r.weeklyTargetDays,
    ).length
    return { targetDays, doneDays, onTrack }
  }, [routines, weekDates])

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function handleSave(draft: RoutineDraft) {
    if (editing) {
      updateRoutine(editing.id, draft)
    } else {
      addRoutine(draft)
    }
    setFormOpen(false)
    setEditing(null)
  }

  const pct =
    summary.targetDays <= 0
      ? 0
      : Math.min(100, Math.round((summary.doneDays / summary.targetDays) * 100))

  return (
    <>
      <PageHeader
        title="שגרה"
        subtitle="מעקב הרגלים יומי עם יעד שבועי"
        action={
          <Button variant="accent" className="shrink-0 px-3 text-xs sm:text-sm" onClick={openCreate}>
            <Plus className="size-4" strokeWidth={2.25} />
            הוסף שגרה חדשה +
          </Button>
        }
      />
      <div className="space-y-5 px-4 py-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/80">
          <p className="text-xs font-medium text-muted">סיכום שבועי</p>
          {routines.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              עדיין אין שגרות. הוסף הרגל ראשון כדי להתחיל לעקוב.
            </p>
          ) : (
            <>
              <p className="mt-1 font-display text-lg font-bold text-text">
                {summary.onTrack}/{routines.length} שגרות ביעד · {summary.doneDays}/
                {summary.targetDays} ימי יעד
              </p>
              <div className="mt-3">
                <ProgressBar
                  value={summary.doneDays}
                  max={Math.max(1, summary.targetDays)}
                  color={pct >= 100 ? 'green' : 'accent'}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted">{pct}% מהיעד השבועי הכולל</p>
            </>
          )}
        </section>

        {routines.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
            <p className="font-semibold text-text">אין שגרות עדיין</p>
            <p className="mt-1 text-sm text-muted">
              לדוגמה: קריאת ספר, מדיטציה, הליכה אחרי ארוחה.
            </p>
            <Button className="mt-4" variant="accent" onClick={openCreate}>
              <Plus className="size-4" strokeWidth={2.25} />
              הוסף שגרה חדשה +
            </Button>
          </div>
        ) : (
          <ul className="space-y-4">
            {routines.map((routine) => (
              <li key={routine.id}>
                <RoutineCard
                  routine={routine}
                  onToggleDate={(date) => toggleRoutineDate(routine.id, date)}
                  onEdit={() => {
                    setEditing(routine)
                    setFormOpen(true)
                  }}
                  onDelete={() => {
                    if (window.confirm(`למחוק את השגרה "${routine.title}"?`)) {
                      deleteRoutine(routine.id)
                    }
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <RoutineFormModal
        open={formOpen}
        routine={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSave={handleSave}
      />
    </>
  )
}
