import { useState } from 'react'
import { MEAL_TYPE_LABELS } from '../../data/recipes'
import { useAppData } from '../../context/AppDataContext'
import type { MealType, Recipe } from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

const filters: Array<{ id: 'all' | MealType; label: string }> = [
  { id: 'all', label: 'הכל' },
  { id: 'breakfast', label: MEAL_TYPE_LABELS.breakfast },
  { id: 'lunch', label: MEAL_TYPE_LABELS.lunch },
  { id: 'dinner', label: MEAL_TYPE_LABELS.dinner },
  { id: 'snacks', label: MEAL_TYPE_LABELS.snacks },
]

export function RecipeCatalog() {
  const {
    recipes,
    addFood,
    recipesSyncStatus,
    recipesSyncError,
    syncRecipes,
  } = useAppData()
  const [filter, setFilter] = useState<'all' | MealType>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const list =
    filter === 'all' ? recipes : recipes.filter((r) => r.mealType === filter)

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
          className="text-sm font-medium text-primary"
          onClick={() => void syncRecipes()}
        >
          סנכרון
        </button>
      }
    >
      <p className="mb-3 text-xs text-muted">
        {recipesSyncStatus === 'loading'
          ? 'מסנכרן מתכונים מ-Supabase…'
          : recipesSyncStatus === 'synced'
            ? `מסונכרן · ${recipes.length} מתכונים`
            : recipesSyncStatus === 'error'
              ? `שגיאת סנכרון: ${recipesSyncError ?? 'לא ידוע'}`
              : 'ממתין לסנכרון'}
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={[
              'rounded-lg px-3 py-1.5 text-xs font-medium transition',
              filter === f.id
                ? 'bg-primary text-white'
                : 'bg-surface text-muted hover:text-text',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul className="space-y-3">
        {list.map((recipe) => {
          const open = openId === recipe.id
          return (
            <li
              key={recipe.id}
              className="rounded-xl border border-line bg-surface p-3"
            >
              <button
                type="button"
                className="w-full text-right"
                onClick={() => setOpenId(open ? null : recipe.id)}
              >
                <div className="flex items-start gap-3">
                  {recipe.image ? (
                    <img
                      src={recipe.image}
                      alt=""
                      className="size-14 shrink-0 rounded-lg object-cover bg-card"
                    />
                  ) : null}
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
                      <span className="text-xs text-primary">
                        {open ? 'סגור' : 'פרטים'}
                      </span>
                    </div>
                  </div>
                </div>
              </button>

              {open ? (
                <div className="mt-3 space-y-3 border-t border-line pt-3 text-sm">
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
