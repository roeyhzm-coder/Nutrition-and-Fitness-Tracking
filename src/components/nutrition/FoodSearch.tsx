import { useEffect, useMemo, useRef, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import {
  defaultIsraeliPortion,
  deleteIsraeliFood,
  isCustomIsraeliFood,
  israeliFoodLabel,
  israeliFoodMacros,
  searchIsraeliFoods,
  seedIsraeliFoodsOnce,
  type IsraeliFood,
} from '../../lib/israeliFoods'
import {
  formatNiceNumber,
  parseDecimal,
  parsePositiveDecimal,
  roundTo,
} from '../../lib/numericInput'
import { PORTION_PRESETS } from '../../lib/foodUnits'
import type { FoodLogEntry, SavedMeal } from '../../lib/types'
import { useAppData } from '../../context/AppDataContext'
import { Button } from '../ui/button'
import { Card } from '../ui/Card'
import { IconButton } from '../ui/IconButton'
import { Modal } from '../ui/Modal'
import { NumericInput } from '../ui/NumericInput'
import { AddCustomIsraeliFoodModal } from './AddCustomIsraeliFoodModal'
import { ManageCustomFoodsModal } from './ManageCustomFoodsModal'

type FoodSearchProps = {
  onAdd: (entry: Omit<FoodLogEntry, 'id' | 'loggedAt'>) => void
}

const EMPTY_CUSTOM = {
  name: '',
  calories: '',
  protein: '',
  carbs: '',
  fats: '',
  grams: '',
}

function round2(n: number) {
  return roundTo(n, 2)
}

export function FoodSearch({ onAdd }: FoodSearchProps) {
  const { addSavedMeal, savedMeals } = useAppData()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<IsraeliFood[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<IsraeliFood | null>(null)
  const [portionIndex, setPortionIndex] = useState(0)
  const [quantity, setQuantity] = useState('1')
  const [freeGrams, setFreeGrams] = useState(false)
  const [gramsDraft, setGramsDraft] = useState('100')
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [editingFood, setEditingFood] = useState<IsraeliFood | null>(null)
  const [customOpen, setCustomOpen] = useState(false)
  const [custom, setCustom] = useState(EMPTY_CUSTOM)
  const [saveCustom, setSaveCustom] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  useEffect(() => {
    void seedIsraeliFoodsOnce()
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
    }
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 1) {
      setResults([])
      setError(null)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const handle = window.setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const foods = await searchIsraeliFoods(q, controller.signal)
        setResults(foods)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError('לא ניתן לחפש כרגע. נסה שוב.')
        }
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => {
      controller.abort()
      window.clearTimeout(handle)
    }
  }, [query])

  function showToast(message: string) {
    setToast(message)
    if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2800)
  }

  function openFood(food: IsraeliFood) {
    const def = defaultIsraeliPortion(food)
    const index = Math.max(
      0,
      food.portions.findIndex((p) => p === def),
    )
    setSelected(food)
    setPortionIndex(index)
    setQuantity('1')
    setFreeGrams(false)
    setGramsDraft(String(def?.grams ?? 100))
  }

  const live = useMemo(() => {
    if (!selected) return null
    const portion = selected.portions[portionIndex] ?? selected.portions[0]
    const grams = freeGrams
      ? (parsePositiveDecimal(gramsDraft) ?? 0)
      : (parsePositiveDecimal(quantity) ?? 0) * (portion?.grams ?? 0)
    return { grams, macros: israeliFoodMacros(selected, grams), portion }
  }, [selected, portionIndex, quantity, freeGrams, gramsDraft])

  function addSelected() {
    if (!selected || !live || live.grams <= 0) return
    const name = israeliFoodLabel(selected)
    onAdd({
      name: selected.brand ? `${name} · ${selected.brand}` : name,
      grams: round2(live.grams),
      ...live.macros,
      source: 'israeli-food',
    })
    setSelected(null)
    showToast(`נוסף ${selected.name} ליומן היום`)
  }

  function isFavorite(name: string) {
    return savedMeals.some((m) => m.name.trim() === name.trim())
  }

  function submitCustom() {
    const name = custom.name.trim()
    if (!name) return
    const grams = parsePositiveDecimal(custom.grams) ?? 1
    const payload: Omit<SavedMeal, 'id'> = {
      name,
      calories: parseDecimal(custom.calories) ?? 0,
      protein: parseDecimal(custom.protein) ?? 0,
      carbs: parseDecimal(custom.carbs) ?? 0,
      fats: parseDecimal(custom.fats) ?? 0,
      kind: 'item',
      servingGrams: grams,
    }
    onAdd({ ...payload, grams, source: 'manual' })
    if (saveCustom && !isFavorite(name)) {
      addSavedMeal(payload)
    }
    setCustom(EMPTY_CUSTOM)
    setSaveCustom(false)
    setCustomOpen(false)
    showToast('נוסף ליומן')
  }

  return (
    <Card title="חיפוש מאגר ישראלי">
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חפש מזון… קוטג׳, פיתה, במבה, חזה עוף"
          className="field ps-9"
          autoComplete="off"
        />
      </div>

      <Button
        variant="accent"
        className="mt-3 w-full"
        onClick={() => setCatalogOpen(true)}
      >
        <Plus className="size-3.5" strokeWidth={2} />
        הוסף פריט חדש למאגר
      </Button>
      <Button
        variant="surface"
        className="mt-2 w-full"
        onClick={() => setManageOpen(true)}
      >
        הפריטים שהוספתי למאגר
      </Button>
      <Button
        variant="surface"
        className="mt-2 w-full"
        onClick={() => setCustomOpen(true)}
      >
        <Plus className="size-3.5" strokeWidth={2} />
        הזנה ידנית ליומן
      </Button>

      {toast ? (
        <p
          role="status"
          className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800"
        >
          {toast}
        </p>
      ) : null}
      {loading ? <p className="mt-3 text-sm text-muted">מחפש…</p> : null}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      {!loading && query.trim() && results.length === 0 ? (
        <p className="mt-3 text-sm text-muted">לא נמצאו תוצאות במאגר.</p>
      ) : null}

      <ul className="mt-3 max-h-72 overflow-y-auto">
        {results.map((food) => {
          const custom = isCustomIsraeliFood(food)
          return (
            <li
              key={food.id}
              className="flex min-h-11 items-center gap-0.5 border-b border-slate-100 last:border-b-0"
            >
              <button
                type="button"
                onClick={() => openFood(food)}
                className="flex min-h-11 min-w-0 flex-1 items-center gap-2 px-1 py-1.5 text-right hover:bg-slate-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-text">
                    {food.name}
                    {custom ? (
                      <span className="ms-1 text-[10px] font-medium text-cyan-700">
                        אישי
                      </span>
                    ) : null}
                  </span>
                  <span className="block truncate text-[11px] text-muted">
                    {food.brand ?? food.category} ·{' '}
                    {Math.round(Number(food.calories_per_100g))} קק״ל/100ג׳
                  </span>
                </span>
                <Plus className="size-4 shrink-0 text-accent" strokeWidth={2} />
              </button>
              {custom ? (
                <>
                  <IconButton
                    label="עריכה"
                    className="size-8"
                    onClick={() => {
                      setEditingFood(food)
                      setCatalogOpen(true)
                    }}
                  >
                    <Pencil className="size-3.5" strokeWidth={1.75} />
                  </IconButton>
                  <IconButton
                    label="מחיקה"
                    tone="danger"
                    className="size-8 text-danger"
                    onClick={() => {
                      if (!window.confirm('למחוק את הפריט מהמאגר?')) return
                      void deleteIsraeliFood(food.id).then((result) => {
                        if (result.error) {
                          setError(result.error)
                          return
                        }
                        setResults((prev) => prev.filter((item) => item.id !== food.id))
                        showToast(`נמחק "${food.name}" מהמאגר`)
                      })
                    }}
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.75} />
                  </IconButton>
                </>
              ) : null}
            </li>
          )
        })}
      </ul>

      <Modal
        open={selected != null}
        title={selected?.name ?? 'הוספת מזון'}
        onClose={() => setSelected(null)}
      >
        {selected && live ? (
          <div className="space-y-3">
            <p className="text-xs text-muted">
              {selected.brand ? `${selected.brand} · ` : ''}
              {selected.category}
            </p>

            <label className="flex min-h-11 items-center justify-between gap-3 text-sm text-text">
              <span>משקל חופשי בגרמים</span>
              <input
                type="checkbox"
                checked={freeGrams}
                onChange={(e) => {
                  const next = e.target.checked
                  setFreeGrams(next)
                  if (next) {
                    setGramsDraft(String(round2(live.grams || 100)))
                  }
                }}
                className="size-4 accent-primary"
              />
            </label>

            {freeGrams ? (
              <label className="block text-xs text-muted">
                גרמים
                <NumericInput
                  decimals={2}
                  value={gramsDraft}
                  onChange={setGramsDraft}
                  className="mt-1 field"
                />
              </label>
            ) : (
              <>
                <label className="block text-xs text-muted">
                  מידה
                  <select
                    value={portionIndex}
                    onChange={(e) => setPortionIndex(Number(e.target.value))}
                    className="mt-1 field"
                  >
                    {selected.portions.map((portion, index) => (
                      <option key={`${portion.name}-${index}`} value={index}>
                        {portion.name} ({portion.grams}ג׳)
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs text-muted">
                  כמות יחידות
                  <NumericInput
                    decimals={2}
                    value={quantity}
                    onChange={setQuantity}
                    className="mt-1 field"
                  />
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PORTION_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setQuantity(String(preset))}
                      className={[
                        'min-h-8 rounded-full px-3 text-xs font-semibold tabular-nums',
                        quantity === String(preset) ||
                        Number(quantity) === preset
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-100 text-muted hover:text-text',
                      ].join(' ')}
                    >
                      {formatNiceNumber(preset)}×
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-text">
              <p className="font-semibold tabular-nums">
                {formatNiceNumber(live.macros.calories, 0)} קק״ל · {round2(live.grams)}{' '}
                גרם
              </p>
              <p className="text-xs text-muted">
                ח {formatNiceNumber(live.macros.protein)} · פ{' '}
                {formatNiceNumber(live.macros.carbs)} · ש{' '}
                {formatNiceNumber(live.macros.fats)}
              </p>
            </div>

            <Button
              className="w-full"
              variant="accent"
              disabled={live.grams <= 0}
              onClick={addSelected}
            >
              הוסף ליומן היום
            </Button>
          </div>
        ) : null}
      </Modal>

      <AddCustomIsraeliFoodModal
        open={catalogOpen}
        editing={editingFood}
        onClose={() => {
          setCatalogOpen(false)
          setEditingFood(null)
        }}
        onSaved={(food) => {
          showToast(
            editingFood
              ? `"${food.name}" עודכן במאגר`
              : `"${food.name}" נוסף למאגר`,
          )
          if (query.trim()) {
            void searchIsraeliFoods(query.trim()).then(setResults)
          }
        }}
      />
      <ManageCustomFoodsModal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        onEdit={(food) => {
          setManageOpen(false)
          setEditingFood(food)
          setCatalogOpen(true)
        }}
      />

      <Modal
        open={customOpen}
        title="פריט מותאם אישית"
        onClose={() => setCustomOpen(false)}
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            submitCustom()
          }}
        >
          <label className="block text-xs text-muted">
            שם
            <input
              value={custom.name}
              onChange={(e) =>
                setCustom((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="למשל גביע קוטג׳ 5%"
              className="mt-1 field"
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['calories', 'קלוריות', 2],
                ['protein', 'חלבון', 2],
                ['carbs', 'פחמימות', 2],
                ['fats', 'שומנים', 2],
                ['grams', 'גרם (אופציונלי)', 2],
              ] as const
            ).map(([key, label, decimals]) => (
              <label key={key} className="block text-xs text-muted">
                {label}
                <NumericInput
                  decimals={decimals}
                  value={custom[key]}
                  onChange={(next) =>
                    setCustom((p) => ({ ...p, [key]: next }))
                  }
                />
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={saveCustom}
              onChange={(e) => setSaveCustom(e.target.checked)}
              className="size-4 accent-primary"
            />
            שמור גם לקבועים שלי
          </label>
          <Button type="submit" className="w-full" variant="accent">
            הוסף ליומן
          </Button>
        </form>
      </Modal>
    </Card>
  )
}
