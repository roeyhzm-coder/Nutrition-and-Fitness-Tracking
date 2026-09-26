import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { MacroTargetsView } from '../components/nutrition/MacroTargets'
import { FoodSearch } from '../components/nutrition/FoodSearch'
import { RecipeCatalog } from '../components/nutrition/RecipeCatalog'
import { SavedMeals } from '../components/nutrition/SavedMeals'
import { ImportMealsModal } from '../components/nutrition/ImportMealsModal'
import { FoodCategoriesManager } from '../components/nutrition/FoodCategoriesManager'
import { FoodLogList } from '../components/nutrition/FoodLogList'
import { AddFoodModal } from '../components/dashboard/AddFoodModal'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useAppData } from '../context/AppDataContext'
import {
  PHASE_ACTIVE_CLASS,
  PHASE_LABELS,
  PHASES,
  todayKey,
} from '../lib/types'

export function NutritionPage() {
  const { foodLogs, addFood, macroTargets, phase, setPhase } = useAppData()
  const [foodOpen, setFoodOpen] = useState(false)
  const { hash } = useLocation()
  const today = todayKey()

  useEffect(() => {
    if (!hash) return
    document
      .getElementById(hash.slice(1))
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])

  const todayFood = [...foodLogs]
    .filter((f) => f.loggedAt.startsWith(today))
    .reverse()

  return (
    <>
      <PageHeader
        title="תזונה ומתכונים"
        subtitle={`יעדי ${PHASE_LABELS[phase]} · ארוחות, מתכונים וייבוא`}
        action={
          <Button variant="accent" onClick={() => setFoodOpen(true)}>
            הוסף מזון / ארוחה
          </Button>
        }
      />
      <div className="space-y-5 px-4 py-5">
        <Card title="שלב תזונה">
          <div className="mb-3 grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-50 p-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPhase(p)}
                className={[
                  'min-h-11 rounded-xl px-3 py-2 text-sm font-bold transition',
                  phase === p
                    ? PHASE_ACTIVE_CLASS[p]
                    : 'text-muted hover:bg-slate-100 hover:text-text',
                ].join(' ')}
              >
                {PHASE_LABELS[p]}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">
            מעבר בין מסה, חיטוב ותחזוקה מחליף אוטומטית את יעדי המאקרו השמורים
            לכל שלב. עריכת היעדים נמצאת בלשונית פרופיל ומדדים.
          </p>
        </Card>

        <MacroTargetsView logs={foodLogs} targets={macroTargets} />
        <SavedMeals />
        <FoodSearch onAdd={addFood} />

        <section id="food-log">
          <Card title="יומן מזון להיום">
            <FoodLogList entries={todayFood} />
          </Card>
        </section>

        <ImportMealsModal />
        <FoodCategoriesManager />
        <RecipeCatalog />
      </div>

      <AddFoodModal open={foodOpen} onClose={() => setFoodOpen(false)} />
    </>
  )
}
