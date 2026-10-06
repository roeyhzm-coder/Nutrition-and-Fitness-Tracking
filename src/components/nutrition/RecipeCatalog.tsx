import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Search, UtensilsCrossed, X } from 'lucide-react'
import { MEAL_TYPE_LABELS } from '../../data/recipes'
import { useAppData } from '../../context/AppDataContext'
import { parsePositiveDecimal, roundTo } from '../../lib/numericInput'
import {
  mapSupabaseRecipe,
  recipeMatchesCategoryTag,
  recipePortionUnits,
  recipeServings,
  resolveServingGrams,
  type SupabaseRecipeRow,
} from '../../lib/recipesApi'
import { normalizeSearch } from '../../lib/foodCatalog'
import { supabase } from '../../lib/supabase'
import {
  defaultServingUnit,
  effectiveGrams,
  GRAMS_UNIT_ID,
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
  if (recipeMatchesCategoryTag(recipe, categoryLabel)) return true
  const meal = MEAL_TYPE_LABELS[recipe.mealType]?.toLowerCase() ?? ''
  const q = categoryLabel.trim().toLowerCase()
  return Boolean(q) && (meal === q || meal.includes(q) || q.includes(meal))
}

function recipeMatchesQuery(recipe: Recipe, rawQuery: string) {
  const q = normalizeSearch(rawQuery)
  if (!q) return true
  const haystack = [
    recipe.name,
    ...(recipe.ingredients ?? []),
    ...(recipe.categories ?? []),
    recipe.category ?? '',
    ...(recipe.tags ?? []),
    ...(recipe.equipment ?? []),
    recipe.description ?? '',
  ]
    .join(' ')
    .toLowerCase()
  return normalizeSearch(haystack).includes(q)
}

function recipeTitleScore(recipe: Recipe, rawQuery: string): number {
  const q = normalizeSearch(rawQuery)
  if (!q) return 0
  const name = normalizeSearch(recipe.name)
  if (name.startsWith(q)) return 400 - name.length * 0.01
  if (name.includes(` ${q}`)) return 320 - name.length * 0.01
  if (name.includes(q)) return 260 - name.length * 0.01
  if (recipeMatchesQuery(recipe, rawQuery)) return 80 - name.length * 0.01
  return 0
}

function round1(n: number) {
  if (!Number.isFinite(n)) return 0
  return roundTo(n, 2)
}

function scaleCalories(base: number, factor: number) {
  if (!Number.isFinite(base) || !Number.isFinite(factor) || factor <= 0) return 0
  return roundTo(base * factor, 2)
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
  highlighted,
}: {
  recipe: Recipe
  onLogged: (message: string) => void
  highlighted?: boolean
}) {
  const { addFood } = useAppData()
  const servings = recipeServings(recipe)
  const baseGrams = resolveServingGrams(recipe)
  const units = useMemo(() => recipePortionUnits(recipe), [recipe])
  const [quantity, setQuantity] = useState('1')
  const [unitId, setUnitId] = useState(
    () => defaultServingUnit(units)?.id ?? GRAMS_UNIT_ID,
  )

  useEffect(() => {
    const nextUnits = recipePortionUnits(recipe)
    const preferred = defaultServingUnit(nextUnits)?.id ?? GRAMS_UNIT_ID
    setUnitId((prev) =>
      nextUnits.some((unit) => unit.id === prev) ? prev : preferred,
    )
  }, [recipe])
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
    onLogged(`נוספה מנה מ-${recipe.name} ליומן`)
  }

  return (
    <li
      id={`recipe-card-${recipe.id}`}
      className={[
        'rounded-2xl border bg-slate-50 p-4',
        highlighted ? 'border-orange-400 ring-2 ring-orange-200' : 'border-slate-200',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <RecipeThumb src={recipe.image} alt={recipe.name} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-text">{recipe.name}</p>
          <p className="mt-1 truncate text-xs text-muted">
            מנה 1 מתוך {servings}
            {baseGrams > 0 ? ` · ${baseGrams} גרם למנה` : ''}
            {recipe.description ? ` · ${recipe.description}` : ''}
          </p>
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
    ingestRemoteRecipes,
  } = useAppData()
  const [filter, setFilter] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [buttonSyncing, setButtonSyncing] = useState(false)
  const [toast, setToast] = useState<{
    message: string
    tone: 'ok' | 'error'
  } | null>(null)
  const toastTimer = useRef<number | null>(null)
  const searchBoxRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    return () => {
      if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
    }
  }, [])

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!searchBoxRef.current?.contains(event.target as Node)) {
        setSuggestOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  const suggestions = useMemo(() => {
    const q = query.trim()
    if (!q) return []
    return recipes
      .map((recipe) => ({ recipe, score: recipeTitleScore(recipe, q) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((row) => row.recipe)
  }, [recipes, query])

  const list = useMemo(() => {
    const searched = query.trim()
      ? recipes.filter((recipe) => recipeMatchesQuery(recipe, query))
      : recipes
    if (searched.length && query.trim() && filter == null) return searched
    if (filter == null) return []
    if (filter === 'all') return searched
    const cat = foodCategories.find((c) => c.id === filter)
    if (!cat) return []
    return searched.filter((r) => recipeMatchesCategory(r, cat.label))
  }, [recipes, foodCategories, filter, query])

  function showToast(message: string, tone: 'ok' | 'error' = 'ok') {
    setToast({ message, tone })
    if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3200)
  }

  function toggleFilter(id: string) {
    setFilter((prev) => (prev === id ? null : id))
  }

  function focusRecipe(recipe: Recipe) {
    setQuery(recipe.name)
    setFilter('all')
    setFocusedId(recipe.id)
    setSuggestOpen(false)
    window.requestAnimationFrame(() => {
      document
        .getElementById(`recipe-card-${recipe.id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  function clearQuery() {
    setQuery('')
    setSuggestOpen(false)
    setFocusedId(null)
    inputRef.current?.focus()
  }

  async function handleSync() {
    if (!supabase) {
      const error = 'Supabase אינו מוגדר'
      console.error('[RecipeCatalog] sync failed', error)
      showToast(error, 'error')
      return
    }
    setButtonSyncing(true)
    try {
      const { data, error } = await supabase.from('recipes').select('*')
      if (error) {
        console.error('[RecipeCatalog] sync failed', error)
        showToast(error.message, 'error')
        return
      }
      const mapped = ((data ?? []) as SupabaseRecipeRow[]).map(mapSupabaseRecipe)
      ingestRemoteRecipes(mapped)
      showToast(`סונכרנו ${mapped.length} מתכונים בהצלחה`, 'ok')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'סנכרון המתכונים נכשל'
      console.error('[RecipeCatalog] sync failed', err)
      showToast(message, 'error')
    } finally {
      setButtonSyncing(false)
    }
  }

  const emptyMessage =
    query.trim()
      ? 'אין מתכונים שתואמים לחיפוש'
      : filter == null
        ? 'בחר קטגוריה כדי להציג מתכונים'
        : 'אין מתכונים בקטגוריה זו'

  return (
    <Card
      title="קטלוג מתכונים"
      action={
        <button
          type="button"
          className="min-h-11 text-sm font-medium text-blue-600 disabled:opacity-50"
          disabled={buttonSyncing || recipesSyncStatus === 'loading'}
          onClick={() => void handleSync()}
        >
          {buttonSyncing || recipesSyncStatus === 'loading' ? 'מסנכרן…' : 'סנכרן'}
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
          className={[
            'mb-3 rounded-2xl px-3 py-2 text-sm font-medium',
            toast.tone === 'error'
              ? 'bg-red-50 text-red-800'
              : 'bg-emerald-50 text-emerald-800',
          ].join(' ')}
        >
          {toast.message}
        </p>
      ) : null}

      <div ref={searchBoxRef} className="relative mb-3">
        <Search
          className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          strokeWidth={1.75}
          aria-hidden
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          dir="rtl"
          autoComplete="off"
          spellCheck={false}
          placeholder="חיפוש מתכון או מאכל חופשי (למשל: שניצל, בטטה...)"
          className="field min-h-11 w-full pe-10 ps-9"
          onFocus={() => {
            if (query.trim()) setSuggestOpen(true)
          }}
          onChange={(e) => {
            setQuery(e.target.value)
            setFocusedId(null)
            setSuggestOpen(e.target.value.trim().length > 0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setSuggestOpen(false)
              return
            }
            if (e.key === 'Enter' && suggestions[0]) {
              e.preventDefault()
              focusRecipe(suggestions[0])
            }
          }}
        />
        {query ? (
          <button
            type="button"
            aria-label="נקה חיפוש"
            className="absolute end-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-xl text-muted hover:bg-slate-100 hover:text-text"
            onClick={clearQuery}
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        ) : null}
        {suggestOpen && suggestions.length > 0 ? (
          <ul
            role="listbox"
            className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-2xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-200/80"
          >
            {suggestions.map((recipe) => (
              <li key={recipe.id}>
                <button
                  type="button"
                  role="option"
                  className="flex min-h-11 w-full items-center px-3 text-start text-sm text-text hover:bg-orange-50"
                  onClick={() => focusRecipe(recipe)}
                >
                  {recipe.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

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

      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-muted">
          {emptyMessage}
        </p>
      ) : (
        <ul className="space-y-3">
          {list.map((recipe) => (
            <RecipeFoodCard
              key={recipe.id}
              recipe={recipe}
              highlighted={focusedId === recipe.id}
              onLogged={(message) => showToast(message)}
            />
          ))}
        </ul>
      )}
    </Card>
  )
}

