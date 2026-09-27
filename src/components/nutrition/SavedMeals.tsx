import { useEffect, useRef, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { parseDecimal, parseInteger } from '../../lib/numericInput'
import type { SavedMeal } from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { IconButton } from '../ui/IconButton'
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
      <Card title="ארוחות קבועות">
        <div className="mb-3">
          <Button variant="accent" className="w-full" onClick={openCreate}>
            <Plus className="size-3.5" strokeWidth={1.75} />
            הוסף ארוחה קבועה
          </Button>
        </div>

        {toast ? (
          <p
            role="status"
            className="mb-3 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800"
          >
            {toast}
          </p>
        ) : null}

        <p className="mb-3 text-xs text-muted">
          תבניות קבועות נשמרות באופן קבוע. הוספה ליומן לא משנה את התבנית.
        </p>

        {savedMeals.length === 0 ? (
          <p className="text-sm text-muted">אין ארוחות קבועות עדיין.</p>
        ) : (
          <ul className="space-y-2">
            {savedMeals.map((meal) => (
              <li
                key={meal.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1 text-right">
                    <p className="font-semibold text-text">{meal.name}</p>
                    <p className="mt-1 text-xs text-muted">
                      {meal.calories} קק״ל · ח {meal.protein} · פ {meal.carbs} ·
                      ש {meal.fats}
                    </p>
                    {meal.notes?.trim() ? (
                      <p className="mt-1 text-xs text-muted">{meal.notes}</p>
                    ) : null}
                  </div>
                  <IconButton
                    label="ערוך ארוחה"
                    tone="accent"
                    onClick={() => openEdit(meal)}
                  >
                    <Pencil className="size-3.5" strokeWidth={1.75} />
                  </IconButton>
                  <IconButton
                    label="מחק ארוחה"
                    tone="danger"
                    onClick={() => {
                      if (window.confirm(`למחוק את התבנית "${meal.name}"?`)) {
                        deleteSavedMeal(meal.id)
                      }
                    }}
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.75} />
                  </IconButton>
                </div>
                <Button
                  className="mt-3 w-full"
                  variant="accent"
                  onClick={() => handleLog(meal.id)}
                >
                  <Plus className="size-3.5" strokeWidth={1.75} />
                  הוסף ליומן היום
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={open}
        title={editing ? 'עריכת ארוחה קבועה' : 'ארוחה קבועה חדשה'}
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
            שם הארוחה
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="למשל שייק חלבון ושיבולת שועל"
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
            פריטים / הערות (אופציונלי)
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="למשל: 3 ביצים, טוסט, ירקות"
              className="mt-1 field min-h-20 resize-y"
              rows={3}
            />
          </label>
          <Button type="submit" className="w-full" variant="accent">
            שמור תבנית
          </Button>
        </form>
      </Modal>
    </>
  )
}
