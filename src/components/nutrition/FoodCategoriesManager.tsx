import { useState } from 'react'
import { Pencil, Plus, Trash2, UtensilsCrossed } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import type { FoodCategory } from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { IconButton } from '../ui/IconButton'
import { Modal } from '../ui/Modal'

export function FoodCategoriesManager() {
  const {
    foodCategories,
    addFoodCategory,
    updateFoodCategory,
    deleteFoodCategory,
  } = useAppData()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FoodCategory | null>(null)
  const [label, setLabel] = useState('')

  function startCreate() {
    setEditing(null)
    setLabel('')
    setOpen(true)
  }

  function startEdit(cat: FoodCategory) {
    setEditing(cat)
    setLabel(cat.label)
    setOpen(true)
  }

  return (
    <>
      <Card
        title="קטגוריות מזון"
        action={
          <IconButton label="הוסף קטגוריה" tone="accent" onClick={startCreate}>
            <Plus className="size-4" strokeWidth={1.75} />
          </IconButton>
        }
      >
        <p className="mb-3 text-xs text-muted">
          נהל קטגוריות כמו ארוחת בוקר, צהריים וכו׳ — לסינון מתכונים.
        </p>
        <ul className="space-y-2">
          {foodCategories.map((cat) => (
            <li
              key={cat.id}
              className="flex min-h-14 items-center gap-1 rounded-2xl border border-slate-800/60 bg-slate-950/40 px-3 py-3"
            >
              <UtensilsCrossed
                className="size-4 shrink-0 text-muted"
                strokeWidth={1.75}
              />
              <p className="min-w-0 flex-1 font-medium text-text">{cat.label}</p>
              <IconButton
                label="עריכת קטגוריה"
                tone="accent"
                onClick={() => startEdit(cat)}
              >
                <Pencil className="size-3.5" strokeWidth={1.75} />
              </IconButton>
              <IconButton
                label="מחק קטגוריה"
                tone="danger"
                disabled={foodCategories.length <= 1}
                onClick={() => deleteFoodCategory(cat.id)}
              >
                <Trash2 className="size-3.5" strokeWidth={1.75} />
              </IconButton>
            </li>
          ))}
        </ul>
      </Card>

      <Modal
        open={open}
        title={editing ? 'עריכת קטגוריה' : 'קטגוריה חדשה'}
        onClose={() => setOpen(false)}
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            const trimmed = label.trim()
            if (!trimmed) return
            if (editing) {
              updateFoodCategory(editing.id, trimmed)
            } else {
              addFoodCategory(trimmed)
            }
            setOpen(false)
          }}
        >
          <label className="block text-xs text-muted">
            שם הקטגוריה
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="למשל ארוחת בוקר"
              className="mt-1 field"
              required
            />
          </label>
          <Button type="submit" className="w-full" variant="accent">
            שמור
          </Button>
        </form>
      </Modal>
    </>
  )
}
