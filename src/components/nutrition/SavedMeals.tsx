import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { parseDecimal, parseInteger } from '../../lib/numericInput'
import type { SavedMeal } from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { NumericInput } from '../ui/NumericInput'

const EMPTY_FORM = {
  name: '',
  calories: '',
  protein: '',
  carbs: '',
  fats: '',
  notes: '',
}

export function SavedMeals() {
  const {
    savedMeals,
    addSavedMeal,
    updateSavedMeal,
    deleteSavedMeal,
    logSavedMeal,
  } = useAppData()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<SavedMeal | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
    }
  }, [])

  function showToast(message: string) {
    setToast(message)
    if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2800)
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setOpen(true)
  }

  function openEdit(meal: SavedMeal) {
    setEditing(meal)
    setForm({
      name: meal.name,
      calories: String(meal.calories),
      protein: String(meal.protein),
      carbs: String(meal.carbs),
      fats: String(meal.fats),
      notes: meal.notes ?? '',
    })
    setOpen(true)
  }

  function handleLog(mealId: string) {
    if (logSavedMeal(mealId)) {
      showToast('נוסף בהצלחה ליומן המזון')
    }
  }

  return (
    <>
      <Card
        title="הקבועים שלי"
        action={
          <Button
            variant="surface"
            className="min-h-9 px-3 py-1.5 text-xs"
            onClick={openCreate}
          >
            <Plus className="size-3.5" strokeWidth={2} />
            פריט קבוע חדש
          </Button>
        }
      >
        {toast ? (
          <p
            role="status"
            className="mb-3 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800"
          >
            {toast}
          </p>
        ) : null}

        {savedMeals.length === 0 ? (
          <p className="text-sm text-muted">
            אין פריטים קבועים עדיין. הוסף מאכל או ארוחה לשימוש מהיר.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {savedMeals.map((meal) => (
              <div
                key={meal.id}
                className="inline-flex max-w-full items-stretch overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
              >
                <button
                  type="button"
                  aria-label={`ערוך ${meal.name}`}
                  className="min-h-9 max-w-[11.5rem] px-2.5 py-1.5 text-right"
                  title="עריכת פריט קבוע"
                  onClick={() => openEdit(meal)}
                >
                  <span className="block truncate text-xs font-semibold text-text">
                    {meal.name}
                  </span>
                  <span className="block truncate text-[10px] text-muted">
                    {meal.calories} קק״ל · ח {meal.protein}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`הוסף ${meal.name} ליומן`}
                  title="הוסף ליומן בלחיצה אחת"
                  className="flex size-9 shrink-0 items-center justify-center border-s border-slate-200 text-cyan-700 transition hover:bg-cyan-600 hover:text-white"
                  onClick={() => handleLog(meal.id)}
                >
                  <Plus className="size-3.5" strokeWidth={2.25} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={open}
        title={editing ? 'עריכת פריט קבוע' : 'פריט קבוע חדש'}
        onClose={() => setOpen(false)}
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            const payload = {
              name: form.name.trim(),
              calories: parseInteger(form.calories) ?? 0,
              protein: parseDecimal(form.protein) ?? 0,
              carbs: parseDecimal(form.carbs) ?? 0,
              fats: parseDecimal(form.fats) ?? 0,
              notes: form.notes.trim() || undefined,
            }
            if (!payload.name) return
            if (editing) updateSavedMeal(editing.id, payload)
            else addSavedMeal(payload)
            setOpen(false)
          }}
        >
          <label className="block text-xs text-muted">
            שם
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder='למשל "2 פרוסות לחם מלא" או "גביע קוטג׳"'
              className="mt-1 field"
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['calories', 'קלוריות'],
                ['protein', 'חלבון'],
                ['carbs', 'פחמימות'],
                ['fats', 'שומנים'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-xs text-muted">
                {label}
                <NumericInput
                  decimals={key === 'calories' ? 0 : 2}
                  value={form[key]}
                  onChange={(next) => setForm((p) => ({ ...p, [key]: next }))}
                />
              </label>
            ))}
          </div>
          <label className="block text-xs text-muted">
            הערות (אופציונלי)
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="למשל: 3 ביצים, טוסט, ירקות"
              className="mt-1 field min-h-20 resize-y"
              rows={3}
            />
          </label>
          <Button type="submit" className="w-full" variant="accent">
            שמור פריט
          </Button>
          {editing ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-danger"
              onClick={() => {
                if (window.confirm(`למחוק את "${editing.name}"?`)) {
                  deleteSavedMeal(editing.id)
                  setOpen(false)
                }
              }}
            >
              <Trash2 className="size-3.5" strokeWidth={1.75} />
              מחק פריט קבוע
            </Button>
          ) : null}
        </form>
      </Modal>
    </>
  )
}
