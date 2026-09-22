import { PageHeader } from '../components/layout/PageHeader'
import { MacroTargets } from '../components/nutrition/MacroTargets'
import { WeightLog } from '../components/nutrition/WeightLog'
import { FoodSearch } from '../components/nutrition/FoodSearch'
import { RecipeCatalog } from '../components/nutrition/RecipeCatalog'
import { Card } from '../components/ui/Card'
import { useAppData } from '../context/AppDataContext'
import { todayKey } from '../lib/types'

export function NutritionPage() {
  const { foodLogs, weightLogs, addFood, addWeight } = useAppData()
  const today = todayKey()
  const todayFood = [...foodLogs]
    .filter((f) => f.loggedAt.startsWith(today))
    .reverse()

  return (
    <>
      <PageHeader
        title="תזונה ומתכונים"
        subtitle="מאקרו, שקילה, חיפוש מזון ומתכונים"
      />
      <div className="space-y-4 px-4 py-4">
        <MacroTargets logs={foodLogs} />
        <WeightLog entries={weightLogs} onAdd={addWeight} />
        <FoodSearch onAdd={addFood} />

        <Card title="יומן מזון להיום">
          {todayFood.length === 0 ? (
            <p className="text-sm text-muted">עדיין לא נרשמו מאכלים היום.</p>
          ) : (
            <ul className="space-y-2">
              {todayFood.map((f) => (
                <li
                  key={f.id}
                  className="flex items-start justify-between gap-3 rounded-lg bg-surface px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-text">{f.name}</p>
                    <p className="text-xs text-muted">
                      {f.source === 'recipe'
                        ? 'מתכון'
                        : f.source === 'openfoodfacts'
                          ? 'Open Food Facts'
                          : 'ידני'}
                      {f.source !== 'recipe' ? ` · ${f.grams}ג׳` : ''}
                    </p>
                  </div>
                  <div className="text-left text-xs text-muted">
                    <p className="font-semibold text-text">{f.calories} קק״ל</p>
                    <p>
                      ח {f.protein} · פ {f.carbs} · ש {f.fats}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <RecipeCatalog onLogRecipe={addFood} />
      </div>
    </>
  )
}
