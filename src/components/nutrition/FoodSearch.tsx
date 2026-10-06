import { useEffect, useRef, useState } from 'react'
import { Plus, Star } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { parseDecimal, parsePositiveDecimal, roundTo } from '../../lib/numericInput'
import { gramsPerServing } from '../../lib/foodUnits'
import {
  defaultServingUnit,
  effectiveGrams,
  GRAMS_UNIT_ID,
  resolveServingUnits,
} from '../../lib/servingUnits'
import type { FoodProduct } from '../../lib/openFoodFacts'
import { searchOpenFoodFacts } from '../../lib/openFoodFacts'
import type { FoodLogEntry, SavedMeal } from '../../lib/types'
import { Button } from '../ui/button'
import { Card } from '../ui/Card'
import { IconButton } from '../ui/IconButton'
import { Modal } from '../ui/Modal'
import { NumericInput } from '../ui/NumericInput'
import { UniversalQuantitySelector } from './UniversalQuantitySelector'

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

function productLabel(product: FoodProduct) {
  return product.brand ? `${product.name} (${product.brand})` : product.name
}

function macrosForGrams(product: FoodProduct, grams: number) {
  const factor = grams / 100
  return {
    calories: round2((product.caloriesPer100g ?? 0) * factor),
    protein: round2((product.proteinPer100g ?? 0) * factor),
    carbs: round2((product.carbsPer100g ?? 0) * factor),
    fats: round2((product.fatsPer100g ?? 0) * factor),
  }
}

type QtyDraft = { quantity: string; unitId: string }

export function FoodSearch({ onAdd }: FoodSearchProps) {
  const { addSavedMeal, savedMeals } = useAppData()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, QtyDraft>>({})
  const [customOpen, setCustomOpen] = useState(false)
  const [custom, setCustom] = useState(EMPTY_CUSTOM)
  const [saveCustom, setSaveCustom] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
    }
  }, [])

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      setError(null)
      return
    }

    const controller = new AbortController()
    const handle = window.setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const products = await searchOpenFoodFacts(
          query.trim(),
          controller.signal,
        )
        setResults(products)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError('לא ניתן לחפש כרגע. נסה שוב.')
        }
      } finally {
        setLoading(false)
      }
    }, 400)

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

  function unitsOf(product: FoodProduct) {
    return resolveServingUnits({
      name: product.name,
      brand: product.brand,
      servingGrams: gramsPerServing(product.name, product.brand),
      servingLabel: 'מנה',
    })
  }

  function qtyOf(product: FoodProduct): QtyDraft {
    return (
      qtyDrafts[product.code] ?? {
        quantity: '1',
        unitId: defaultServingUnit(unitsOf(product))?.id ?? GRAMS_UNIT_ID,
      }
    )
  }

  function gramsOf(product: FoodProduct): number | null {
    const draft = qtyOf(product)
    const amount = parsePositiveDecimal(draft.quantity)
    if (amount == null) return null
    return effectiveGrams(amount, draft.unitId, unitsOf(product))
  }

  function isFavorite(name: string) {
    return savedMeals.some((m) => m.name.trim() === name.trim())
  }

  function addProduct(product: FoodProduct) {
    const grams = gramsOf(product)
    if (grams == null) return
    const macros = macrosForGrams(product, grams)
    onAdd({
      name: productLabel(product),
      grams,
      ...macros,
      source: 'openfoodfacts',
    })
    showToast(`נוסף ${product.name} ליומן`)
  }

  function saveProductFavorite(product: FoodProduct) {
    const name = productLabel(product)
    if (isFavorite(name)) {
      showToast('כבר שמור בקבועים שלי')
      return
    }
    const grams = gramsOf(product)
    if (grams == null) return
    const macros = macrosForGrams(product, grams)
    const draft = qtyOf(product)
    const notes = `${draft.quantity} · ${round2(grams)} גרם`
    addSavedMeal({
      name,
      ...macros,
      notes,
      kind: 'item',
      servingGrams: grams,
      serving_units: unitsOf(product),
    })
    showToast('נשמר לקבועים שלי')
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
    <Card title="חיפוש מזון">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="חפש מוצר… למשל לחם מלא, קוטג׳, חלבון מי גבינה"
        className="field"
      />

      <Button
        variant="surface"
        className="mt-3 w-full"
        onClick={() => setCustomOpen(true)}
      >
        <Plus className="size-3.5" strokeWidth={2} />
        פריט מותאם אישית
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

      <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
        {results.map((p) => {
          const grams = gramsOf(p)
          const favorite = isFavorite(productLabel(p))
          const draft = qtyOf(p)
          const servingUnits = unitsOf(p)
          return (
            <li
              key={p.code}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex gap-3">
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt=""
                    className="size-12 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="size-12 rounded-2xl bg-slate-100" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text">
                    {p.name}
                  </p>
                  <p className="text-xs text-muted">
                    {p.brand ?? 'ללא מותג'} ·{' '}
                    {p.caloriesPer100g != null
                      ? `${Math.round(p.caloriesPer100g)} קק״ל/100ג׳`
                      : 'ללא נתונים'}
                  </p>
                  <div className="mt-2">
                    <UniversalQuantitySelector
                      compact
                      units={servingUnits}
                      quantity={draft.quantity}
                      unitId={draft.unitId}
                      onChange={(next) =>
                        setQtyDrafts((prev) => ({
                          ...prev,
                          [p.code]: {
                            quantity: next.quantity,
                            unitId: next.unitId,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <IconButton
                      label={
                        favorite ? 'שמור בקבועים שלי' : 'שמירה לקבועים שלי'
                      }
                      tone={favorite ? 'accentSolid' : 'accent'}
                      onClick={() => saveProductFavorite(p)}
                    >
                      <Star
                        className="size-4"
                        strokeWidth={1.75}
                        fill={favorite ? 'currentColor' : 'none'}
                      />
                    </IconButton>
                    <Button
                      className="ms-auto"
                      variant="accent"
                      onClick={() => addProduct(p)}
                    >
                      הוסף
                    </Button>
                  </div>
                  {grams != null ? (
                    <p className="mt-1 text-[10px] text-muted">
                      סה״כ {round2(grams)} גרם
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

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
