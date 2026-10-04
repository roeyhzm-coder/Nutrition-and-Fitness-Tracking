import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, UtensilsCrossed } from 'lucide-react'
import { MEAL_TYPE_LABELS } from '../../data/recipes'
import { useAppData } from '../../context/AppDataContext'
import { parsePositiveDecimal } from '../../lib/numericInput'
import { resolveServingGrams } from '../../lib/recipesApi'
import {
  defaultServingUnit,
  effectiveGrams,
  GRAMS_UNIT_ID,
  resolveServingUnits,
} from '../../lib/servingUnits'
import type { Recipe } from '../../lib/types'
import { Button } from '../ui/button'
import { Card } from '../ui/Card'
import { UniversalQuantitySelector } from './UniversalQuantitySelector'

const MACRO_BADGES = [
  { key: 'calories', label: 'קלוריות', unit: '', chip: 'bg-orange-50 text-orange-700' },
  { key: 'protein', label: 'חלבון', unit: 'ג׳', chip: 'bg-violet-50 text-violet-700' },
  { key: 'carbs', label: 'פחמימות', unit: 'ג׳', chip: 'bg-cyan-50 text-cyan-700' },
  { key: 'fats', label: 'שומן', unit: 'ג׳', chip: 'bg-amber-50 text-amber-700' },
] as const

function recipeMatchesCategory(recipe: Recipe, categoryLabel: string) {
  const labels = [
    ...(recipe.categories ?? []),
    ...(recipe.tags ?? []),
    MEAL_TYPE_LABELS[recipe.mealType],
  ].map((s) => s.toLowerCase())
  const q = categoryLabel.toLowerCase()
  return labels.some((l) => l.includes(q) || q.includes(l))
}

function round1(n: number) {
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 10) / 10
}

function scaleCalories(base: number, factor: number) {
  if (!Number.isFinite(base) || !Number.isFinite(factor) || factor <= 0) return 0
  return Math.round(base * factor)
}

function RecipeThumb({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div
        className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-muted"
        aria-hidden
      >
        <UtensilsCrossed className="size-7" strokeWidth={1.5} />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      className="size-16 shrink-0 rounded-2xl bg-slate-100 object-cover"
      onError={() => setFailed(true)}
    />
  )
}

function RecipeFoodCard({
  recipe,
  onLogged,
}: {
  recipe: Recipe
  onLogged: (message: string) => void
}) {
  const { addFood } = useAppData()
  const baseGrams = resolveServingGrams(recipe)
  const units = resolveServingUnits({
    name: recipe.name,
    servingGrams: baseGrams,
    servingLabel: 'מנה',
    family: 'unit',
  })
  const [quantity, setQuantity] = useState('1')
  const [unitId, setUnitId] = useState(
    () => defaultServingUnit(units)?.id ?? GRAMS_UNIT_ID,
  )
  const [justLogged, setJustLogged] = useState(false)
  const loggedTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (loggedTimer.current != null) window.clearTimeout(loggedTimer.current)
    }
  }, [])

  const parsed = parsePositiveDecimal(quantity)
  const grams = parsed != null ? effectiveGrams(parsed, unitId, units) : null
  const factor = grams != null && baseGrams > 0 ? grams / baseGrams : 0
  const macros = {
    calories: scaleCalories(recipe.calories, factor),
    protein: round1(recipe.proteinG * factor),
    carbs: round1(recipe.carbsG * factor),
    fats: round1(recipe.fatsG * factor),
  }

  function logScaled() {
    if (grams == null) return
    addFood({
      name: recipe.name,
      grams,
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fats: macros.fats,
      source: 'recipe',
    })
    setJustLogged(true)
    if (loggedTimer.current != null) window.clearTimeout(loggedTimer.current)
    loggedTimer.current = window.setTimeout(() => setJustLogged(false), 2200)
    onLogged(`נוספו ${grams} גרם ${recipe.name} ליומן`)
  }

  return (
    <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <RecipeThumb src={recipe.image} alt={recipe.name} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-text">{recipe.name}</p>
          <p className="mt-1 text-xs text-muted">מנת בסיס: {baseGrams} גרם</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {MACRO_BADGES.map((badge) => (
          <div
            key={badge.key}
            className={`rounded-2xl px-2 py-2 text-center ${badge.chip}`}
          >
            <p className="text-[10px] font-semibold">{badge.label}</p>
            <p className="mt-0.5 font-display text-sm font-bold tabular-nums">
              {macros[badge.key]}
              {badge.unit}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <UniversalQuantitySelector
          units={units}
          quantity={quantity}
          unitId={unitId}
          onChange={(next) => {
            setQuantity(next.quantity)
            setUnitId(next.unitId)
          }}
          ariaLabel={`כמות עבור ${recipe.name}`}
        />
      </div>

      <Button
        className="mt-3 w-full"
        variant={justLogged ? 'surface' : 'accent'}
        disabled={grams == null}
        onClick={logScaled}
      >
        {justLogged ? (
          <>
            <Check className="size-4" strokeWidth={2.25} />
            נוסף ליומן
          </>
        ) : (
          'הוסף ליומן התזונה'
        )}
      </Button>
    </li>
  )
}

export function RecipeCatalog() {
  const {
    recipes,
    foodCategories,
    recipesSyncStatus,
    recipesSyncError,
    syncRecipes,
  } = useAppData()
  const [filter, setFilter] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
    }
  }, [])

  const list = useMemo(() => {
    if (filter == null) return []
    if (filter === 'all') return recipes
    const cat = foodCategories.find((c) => c.id === filter)
    if (!cat) return []
    return recipes.filter((r) => recipeMatchesCategory(r, cat.label))
  }, [recipes, foodCategories, filter])

  function showToast(message: string) {
    setToast(message)
    if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2800)
  }

  function toggleFilter(id: string) {
    setFilter((prev) => (prev === id ? null : id))
  }

  return (
    <Card
      title="קטלוג מתכונים"
      action={
        <button
          type="button"
          className="min-h-11 text-sm font-medium text-blue-600 disabled:opacity-50"
          disabled={recipesSyncStatus === 'loading'}
          onClick={() => void syncRecipes()}
        >
          {recipesSyncStatus === 'loading' ? 'מסנכרן…' : 'סנכרן'}
        </button>
      }
    >
      <p className="mb-3 text-xs text-muted">
        {recipesSyncStatus === 'loading'
          ? 'מושך מתכונים וקטגוריות מ-Supabase…'
          : recipesSyncStatus === 'synced'
            ? `מסונכרן · ${recipes.length} מתכונים · בחר קטגוריה להצגה`
            : recipesSyncStatus === 'error'
              ? `שגיאת סנכרון: ${recipesSyncError ?? 'לא ידוע'}`
              : 'ממתין לסנכרון'}
      </p>

      {toast ? (
        <p
          role="status"
          className="mb-3 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800"
        >
          {toast}
        </p>
      ) : null}

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => toggleFilter('all')}
          className={[
            'min-h-11 rounded-2xl px-3 text-xs font-medium transition',
            filter === 'all'
              ? 'bg-orange-500 text-white'
              : 'bg-slate-100 text-muted hover:text-text',
          ].join(' ')}
        >
          הכל
        </button>
        {foodCategories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => toggleFilter(c.id)}
            className={[
              'min-h-11 rounded-2xl px-3 text-xs font-medium transition',
              filter === c.id
                ? 'bg-orange-500 text-white'
                : 'bg-slate-100 text-muted hover:text-text',
            ].join(' ')}
          >
            {c.label}
          </button>
        ))}
      </div>

      {filter == null ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-muted">
          בחר קטגוריה כדי להציג מתכונים
        </p>
      ) : list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-muted">
          אין מתכונים בקטגוריה זו
        </p>
      ) : (
        <ul className="space-y-3">
          {list.map((recipe) => (
            <RecipeFoodCard
              key={recipe.id}
              recipe={recipe}
              onLogged={showToast}
            />
          ))}
        </ul>
      )}
    </Card>
  )
}

