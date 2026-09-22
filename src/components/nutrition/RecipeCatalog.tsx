import { useState } from 'react'
import {
  APPLIANCE_LABELS,
  RECIPES,
  type Recipe,
  type RecipeAppliance,
} from '../../data/recipes'
import type { FoodLogEntry } from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

type RecipeCatalogProps = {
  onLogRecipe: (entry: Omit<FoodLogEntry, 'id' | 'loggedAt'>) => void
}

const filters: Array<{ id: 'all' | RecipeAppliance; label: string }> = [
  { id: 'all', label: 'הכל' },
  { id: 'ninja-grill', label: APPLIANCE_LABELS['ninja-grill'] },
  { id: 'air-fryer', label: APPLIANCE_LABELS['air-fryer'] },
  { id: 'ninja-creami', label: APPLIANCE_LABELS['ninja-creami'] },
]

export function RecipeCatalog({ onLogRecipe }: RecipeCatalogProps) {
  const [filter, setFilter] = useState<'all' | RecipeAppliance>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const list =
    filter === 'all'
      ? RECIPES
      : RECIPES.filter((r) => r.appliance === filter)

  function logRecipe(recipe: Recipe) {
    onLogRecipe({
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
      title="מתכונים עתירי חלבון"
      action={
        <span className="text-[10px] text-muted">ללא דגים · חרדל · מעובדים</span>
      }
    >
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
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-text">{recipe.name}</p>
                    <p className="mt-1 text-xs text-muted">
                      {APPLIANCE_LABELS[recipe.appliance]} · {recipe.timeMin}{' '}
                      דק׳ · {recipe.proteinG}ג׳ חלבון · {recipe.calories} קק״ל
                    </p>
                  </div>
                  <span className="text-xs text-primary">
                    {open ? 'סגור' : 'פרטים'}
                  </span>
                </div>
              </button>

              {open ? (
                <div className="mt-3 space-y-3 border-t border-line pt-3 text-sm">
                  <div>
                    <p className="mb-1 font-medium text-text">מצרכים</p>
                    <ul className="list-inside list-disc text-muted">
                      {recipe.ingredients.map((ing) => (
                        <li key={ing}>{ing}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-1 font-medium text-text">שלבים</p>
                    <ol className="list-inside list-decimal text-muted">
                      {recipe.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
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
