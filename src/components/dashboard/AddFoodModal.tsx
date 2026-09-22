import { useState } from 'react'
import { useAppData } from '../../context/AppDataContext'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

type AddFoodModalProps = {
  open: boolean
  onClose: () => void
}

export function AddFoodModal({ open, onClose }: AddFoodModalProps) {
  const { addFood, savedMeals, logSavedMeal } = useAppData()
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fats, setFats] = useState('')

  function reset() {
    setName('')
    setCalories('')
    setProtein('')
    setCarbs('')
    setFats('')
  }

  return (
    <Modal open={open} title="הוספת מזון / ארוחה" onClose={onClose} wide>
      <div className="space-y-4">
        {savedMeals.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-medium text-muted">ארוחות קבועות</p>
            <div className="flex flex-wrap gap-2">
              {savedMeals.map((m) => (
                <Button
                  key={m.id}
                  variant="surface"
                  onClick={() => {
                    logSavedMeal(m.id)
                    onClose()
                  }}
                >
                  {m.name}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        <form
          className="space-y-3 border-t border-line pt-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) return
            addFood({
              name: name.trim(),
              grams: 1,
              calories: Number(calories) || 0,
              protein: Number(protein) || 0,
              carbs: Number(carbs) || 0,
              fats: Number(fats) || 0,
              source: 'manual',
            })
            reset()
            onClose()
          }}
        >
          <p className="text-xs font-medium text-muted">הוספה ידנית</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="שם המזון / הארוחה"
            className="w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              inputMode="numeric"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="קלוריות"
              className="rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
            />
            <input
              inputMode="decimal"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              placeholder="חלבון"
              className="rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
            />
            <input
              inputMode="decimal"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
              placeholder="פחמימות"
              className="rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
            />
            <input
              inputMode="decimal"
              value={fats}
              onChange={(e) => setFats(e.target.value)}
              placeholder="שומנים"
              className="rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
            />
          </div>
          <Button type="submit" className="w-full" variant="accent">
            הוסף ליומן
          </Button>
        </form>
      </div>
    </Modal>
  )
}
