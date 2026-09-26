import { useMemo, useState } from 'react'
import { UtensilsCrossed } from 'lucide-react'
import { MEAL_TYPE_LABELS } from '../../data/recipes'
import { useAppData } from '../../context/AppDataContext'
import type { Recipe } from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

function recipeMatchesCategory(recipe: Recipe, categoryLabel: string) {
  const labels = [
    ...(recipe.categories ?? []),
    ...(recipe.tags ?? []),
    MEAL_TYPE_LABELS[recipe.mealType],
  ].map((s) => s.toLowerCase())
  const q = categoryLabel.toLowerCase()
  return labels.some((l) => l.includes(q) || q.includes(l))
}

function RecipeThumb({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div
        className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-muted"
        aria-hidden
      >
        <UtensilsCrossed className="size-6" strokeWidth={1.5} />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      className="size-14 shrink-0 rounded-2xl bg-slate-100 object-cover"
      onError={() => setFailed(true)}
    />
  )
}

export function RecipeCatalog() {
  const {
    recipes,
    foodCategories,
    addFood,
    recipesSyncStatus,
    recipesSyncError,
    syncRecipes,
  } = useAppData()
  const [filter, setFilter] = useState<string>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const list = useMemo(() => {
    if (filter === 'all') return recipes
    const cat = foodCategories.find((c) => c.id === filter)
    if (!cat) return recipes
    return recipes.filter((r) => recipeMatchesCategory(r, cat.label))
  }, [recipes, foodCategories, filter])

  function logRecipe(recipe: Recipe) {
    addFood({
      name: recipe.name,
      grams: 1,
      calories: recipe.calories,
      protein: recipe.proteinG,
      carbs: recipe.carbsG,
      fats: recipe.fatsG,
      source: 'recipe',
    })
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
            ? `מסונכרן · ${recipes.length} מתכונים`
            : recipesSyncStatus === 'error'
              ? `שגיאת סנכרון: ${recipesSyncError ?? 'לא ידוע'}`
              : 'ממתין לסנכרון'}
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
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
            onClick={() => setFilter(c.id)}
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

      <ul className="space-y-3">
        {list.map((recipe) => {
          const open = openId === recipe.id
          return (
            <li
              key={recipe.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <button
                type="button"
                className="w-full text-right"
                onClick={() => setOpenId(open ? null : recipe.id)}
              >
                <div className="flex items-start gap-3">
                  <RecipeThumb src={recipe.image} alt={recipe.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-text">{recipe.name}</p>
                        <p className="mt-1 text-xs text-muted">
                          {MEAL_TYPE_LABELS[recipe.mealType]} ·{' '}
                          {recipe.proteinG}ג׳ חלבון · {recipe.calories} קק״ל
                          {recipe.equipment?.length
                            ? ` · ${recipe.equipment[0]}`
                            : ''}
                        </p>
                      </div>
                      <span className="text-xs text-blue-600">
                        {open ? 'סגור' : 'פרטים'}
                      </span>
                    </div>
                  </div>
                </div>
              </button>

              {open ? (
                <div className="mt-3 space-y-3 border-t border-slate-200 pt-4 text-sm">
                  {recipe.ingredients.length > 0 ? (
                    <div>
                      <p className="mb-1 font-medium text-text">מצרכים</p>
                      <ul className="list-inside list-disc text-muted">
                        {recipe.ingredients.map((ing) => (
                          <li key={ing}>{ing}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {recipe.steps.length > 0 ? (
                    <div>
                      <p className="mb-1 font-medium text-text">שלבים</p>
                      <ol className="list-inside list-decimal text-muted">
                        {recipe.steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                  <Button
                    className="w-full"
                    variant="accent"
                    onClick={() => logRecipe(recipe)}
                  >
                    הוסף ליומן התזונה
                  </Button>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
