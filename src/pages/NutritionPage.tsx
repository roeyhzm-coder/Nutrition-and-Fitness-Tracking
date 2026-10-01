import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { MacroTargetsView } from '../components/nutrition/MacroTargets'
import { FoodSearch } from '../components/nutrition/FoodSearch'
import { RecipeCatalog } from '../components/nutrition/RecipeCatalog'
import { SavedMeals } from '../components/nutrition/SavedMeals'
import { ImportMealsModal } from '../components/nutrition/ImportMealsModal'
import { FoodLogList } from '../components/nutrition/FoodLogList'
import { AddFoodModal } from '../components/dashboard/AddFoodModal'
import { Card } from '../components/ui/Card'
import { Accordion } from '../components/ui/Accordion'
import { Button } from '../components/ui/Button'
import { useAppData } from '../context/AppDataContext'
import { todayKey } from '../lib/types'

export function NutritionPage() {
  const { foodLogs, addFood, macroTargets } = useAppData()
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

  const todayTotals = todayFood.reduce(
    (acc, f) => ({
      calories: acc.calories + f.calories,
      protein: acc.protein + f.protein,
    }),
    { calories: 0, protein: 0 },
  )

  return (
    <>
      <PageHeader
        title="תזונה ומתכונים"
        subtitle="יעדי מאקרו, יומן יומי והקבועים שלי"
        action={
          <Button variant="accent" onClick={() => setFoodOpen(true)}>
            הוסף מזון / ארוחה
          </Button>
        }
      />
      <div className="space-y-5 px-4 py-5">
        <MacroTargetsView logs={foodLogs} targets={macroTargets} />

        <section id="food-log">
          <Card
            title="יומן מזון להיום"
            action={
              <span className="font-display text-xs font-bold tabular-nums text-muted">
                {Math.round(todayTotals.calories)} קק״ל · ח{' '}
                {Math.round(todayTotals.protein * 10) / 10}
              </span>
            }
          >
            <FoodLogList entries={todayFood} />
          </Card>
        </section>

        <SavedMeals />
        <FoodSearch onAdd={addFood} />

        <Accordion
          title="מתכונים וייבוא מתקדם"
          subtitle="קטלוג המתכונים המלא וייבוא JSON"
        >
          <RecipeCatalog />
          <ImportMealsModal />
        </Accordion>
      </div>

      <AddFoodModal open={foodOpen} onClose={() => setFoodOpen(false)} />
    </>
  )
}
