import { useEffect, useState } from 'react'
import { Plus, Star, Trash2 } from 'lucide-react'
import { ISRAELI_FOOD_CATEGORIES, type FoodPortion } from '../../data/foods'
import {
  insertIsraeliFood,
  updateIsraeliFood,
  type IsraeliFood,
} from '../../lib/israeliFoods'
import { parseDecimal, parsePositiveDecimal } from '../../lib/numericInput'
import { Button } from '../ui/button'
import { Modal } from '../ui/Modal'
import { NumericInput } from '../ui/NumericInput'

type AddCustomIsraeliFoodModalProps = {
  open: boolean
  editing?: IsraeliFood | null
  onClose: () => void
  onSaved: (food: IsraeliFood) => void
}

type PortionDraft = {
  id: string
  name: string
  grams: string
  isDefault: boolean
}

const QUICK_PORTIONS: Array<{ label: string; name: string; grams: string }> = [
  { label: '+ הוסף יחידה (גרמים)', name: 'יחידה', grams: '85' },
  { label: '+ הוסף כף', name: 'כף', grams: '15' },
  { label: '+ הוסף כוס', name: 'כוס', grams: '240' },
]

function newPortion(name: string, grams: string, isDefault = false): PortionDraft {
  return {
    id: crypto.randomUUID(),
    name,
    grams,
    isDefault,
  }
}

export function AddCustomIsraeliFoodModal({
  open,
  editing,
  onClose,
  onSaved,
}: AddCustomIsraeliFoodModalProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>(ISRAELI_FOOD_CATEGORIES[0])
  const [brand, setBrand] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [portions, setPortions] = useState<PortionDraft[]>([
    newPortion('100 גרם', '100', true),
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const categories = editing?.category &&
    !(ISRAELI_FOOD_CATEGORIES as readonly string[]).includes(editing.category)
    ? [...ISRAELI_FOOD_CATEGORIES, editing.category]
    : ISRAELI_FOOD_CATEGORIES

  function reset() {
    setName('')
    setCategory(ISRAELI_FOOD_CATEGORIES[0])
    setBrand('')
    setCalories('')
    setProtein('')
    setCarbs('')
    setFat('')
    setPortions([newPortion('100 גרם', '100', true)])
    setSaving(false)
    setError(null)
  }

  useEffect(() => {
    if (!open) return
    if (!editing) {
      reset()
      return
    }
    setName(editing.name)
    setCategory(editing.category)
    setBrand(editing.brand ?? '')
    setCalories(String(editing.calories_per_100g))
    setProtein(String(editing.protein_per_100g))
    setCarbs(String(editing.carbs_per_100g))
    setFat(String(editing.fat_per_100g))
    setPortions(
      editing.portions.map((portion) =>
        newPortion(portion.name, String(portion.grams), Boolean(portion.isDefault)),
      ),
    )
    setSaving(false)
    setError(null)
  }, [open, editing])

  function close() {
    reset()
    onClose()
  }

  function addPortion(nameValue: string, grams: string) {
    setPortions((prev) => [
      ...prev,
      newPortion(nameValue, grams, prev.length === 0),
    ])
  }

  function updatePortion(id: string, patch: Partial<PortionDraft>) {
    setPortions((prev) =>
      prev.map((portion) =>
        portion.id === id ? { ...portion, ...patch } : portion,
      ),
    )
  }

  function setDefault(id: string) {
    setPortions((prev) =>
      prev.map((portion) => ({ ...portion, isDefault: portion.id === id })),
    )
  }

  function removePortion(id: string) {
    setPortions((prev) => {
      const next = prev.filter((portion) => portion.id !== id)
      if (next.length > 0 && !next.some((portion) => portion.isDefault)) {
        next[0] = { ...next[0], isDefault: true }
      }
      return next
    })
  }

  async function submit() {
    const trimmed = name.trim()
    if (!trimmed) return
    const parsedPortions: FoodPortion[] = []
    for (const portion of portions) {
      const grams = parsePositiveDecimal(portion.grams)
      const label = portion.name.trim()
      if (!label || grams == null) continue
      parsedPortions.push({
        name: label,
        grams,
        isDefault: portion.isDefault,
      })
    }
    if (parsedPortions.length === 0) {
      setError('הוסף לפחות מידה אחת עם משקל בגרמים.')
      return
    }
    if (!parsedPortions.some((portion) => portion.isDefault)) {
      parsedPortions[0] = { ...parsedPortions[0], isDefault: true }
    }
    setSaving(true)
    setError(null)
    const payload = {
      name: trimmed,
      category,
      brand: brand.trim() || null,
      calories_per_100g: parseDecimal(calories) ?? 0,
      protein_per_100g: parseDecimal(protein) ?? 0,
      carbs_per_100g: parseDecimal(carbs) ?? 0,
      fat_per_100g: parseDecimal(fat) ?? 0,
      portions: parsedPortions,
    }
    const result = editing
      ? await updateIsraeliFood({ ...editing, ...payload })
      : await insertIsraeliFood(payload)
    setSaving(false)
    if (result.error && !result.food) {
      setError(result.error)
      return
    }
    onSaved(result.food)
    close()
  }

  return (
    <Modal
      open={open}
      title={editing ? 'עריכת פריט במאגר' : 'הוספת פריט חדש למאגר'}
      onClose={close}
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <label className="block text-xs text-muted">
          שם המוצר
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="למשל אבקת חלבון וניל"
            className="mt-1 field"
            required
          />
        </label>
        <label className="block text-xs text-muted">
          קטגוריה
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 field"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-muted">
          מותג (אופציונלי)
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="למשל B&D"
            className="mt-1 field"
          />
        </label>

        <p className="text-xs font-semibold text-text">ערכים ל-100 גרם</p>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['calories', 'קלוריות', calories, setCalories],
              ['protein', 'חלבון', protein, setProtein],
              ['carbs', 'פחמימות', carbs, setCarbs],
              ['fat', 'שומן', fat, setFat],
            ] as const
          ).map(([key, label, value, setter]) => (
            <label key={key} className="block text-xs text-muted">
              {label}
              <NumericInput
                decimals={2}
                value={value}
                onChange={setter}
                className="mt-1 field"
              />
            </label>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-text">מידות ומנות</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PORTIONS.map((quick) => (
              <button
                key={quick.label}
                type="button"
                onClick={() => addPortion(quick.name, quick.grams)}
                className="min-h-8 rounded-full bg-slate-100 px-3 text-[11px] font-semibold text-text hover:bg-cyan-50"
              >
                {quick.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => addPortion('מידה מותאמת', '')}
              className="min-h-8 rounded-full bg-slate-100 px-3 text-[11px] font-semibold text-text hover:bg-cyan-50"
            >
              + מידה מותאמת אישית
            </button>
          </div>
          <ul className="space-y-1.5">
            {portions.map((portion) => (
              <li
                key={portion.id}
                className="flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1"
              >
                <input
                  value={portion.name}
                  onChange={(e) =>
                    updatePortion(portion.id, { name: e.target.value })
                  }
                  placeholder="שם המידה"
                  className="field min-h-8 flex-1 px-2 py-1 text-xs"
                />
                <NumericInput
                  decimals={2}
                  value={portion.grams}
                  onChange={(next) =>
                    updatePortion(portion.id, { grams: next })
                  }
                  placeholder="גרם"
                  className="field min-h-8 w-16 px-2 py-1 text-center text-xs"
                />
                <button
                  type="button"
                  aria-label="ברירת מחדל"
                  title="מידת ברירת מחדל"
                  onClick={() => setDefault(portion.id)}
                  className={[
                    'inline-flex size-8 items-center justify-center rounded-lg',
                    portion.isDefault
                      ? 'bg-cyan-600 text-white'
                      : 'text-muted hover:bg-white',
                  ].join(' ')}
                >
                  <Star
                    className="size-3.5"
                    strokeWidth={1.75}
                    fill={portion.isDefault ? 'currentColor' : 'none'}
                  />
                </button>
                <button
                  type="button"
                  aria-label="מחק מידה"
                  onClick={() => removePortion(portion.id)}
                  className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-rose-50 hover:text-danger"
                >
                  <Trash2 className="size-3.5" strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {error ? <p className="text-xs text-danger">{error}</p> : null}

        <Button
          type="submit"
          className="w-full"
          variant="accent"
          disabled={saving || !name.trim()}
        >
          <Plus className="size-3.5" strokeWidth={2} />
          {saving ? 'שומר…' : editing ? 'עדכן במאגר' : 'שמור למאגר'}
        </Button>
      </form>
    </Modal>
  )
}
