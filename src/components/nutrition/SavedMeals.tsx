import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import type { SavedMeal } from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { IconButton } from '../ui/IconButton'
import { Modal } from '../ui/Modal'

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
  const [form, setForm] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fats: '',
  })

  function openCreate() {
    setEditing(null)
    setForm({ name: '', calories: '', protein: '', carbs: '', fats: '' })
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
    })
    setOpen(true)
  }

  return (
    <>
      <Card
        title="ארוחות קבועות"
        action={
          <IconButton label="הוסף ארוחה" tone="accent" onClick={openCreate}>
            <Plus className="size-4" strokeWidth={1.75} />
          </IconButton>
        }
      >
        {savedMeals.length === 0 ? (
          <p className="text-sm text-muted">אין ארוחות קבועות עדיין.</p>
        ) : (
          <ul className="space-y-2">
            {savedMeals.map((meal) => (
              <li
                key={meal.id}
                className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4"
              >
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-right"
                    onClick={() => openEdit(meal)}
                  >
                    <p className="font-semibold text-text">{meal.name}</p>
                    <p className="mt-1 text-xs text-muted">
                      {meal.calories} קק״ל · ח {meal.protein} · פ {meal.carbs} ·
                      ש {meal.fats}
                    </p>
                  </button>
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
                    onClick={() => deleteSavedMeal(meal.id)}
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.75} />
                  </IconButton>
                </div>
                <Button
                  className="mt-3 w-full"
                  variant="accent"
                  onClick={() => logSavedMeal(meal.id)}
                >
                  הוסף בלחיצה אחת
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
              calories: Number(form.calories) || 0,
              protein: Number(form.protein) || 0,
              carbs: Number(form.carbs) || 0,
              fats: Number(form.fats) || 0,
            }
            if (!payload.name) return
            if (editing) updateSavedMeal(editing.id, payload)
            else addSavedMeal(payload)
            setOpen(false)
          }}
        >
          <input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="למשל ארוחת בוקר קבועה"
            className="field"
            required
          />
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
                <input
                  inputMode="decimal"
                  value={form[key]}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, [key]: e.target.value }))
                  }
                  className="mt-1 field"
                />
              </label>
            ))}
          </div>
          <Button type="submit" className="w-full" variant="accent">
            שמור
          </Button>
        </form>
      </Modal>
    </>
  )
}
