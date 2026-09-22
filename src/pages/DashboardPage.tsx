import { useState } from 'react'
import { Flame, Percent, Scale } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ProgressBar } from '../components/ui/ProgressBar'
import { EditTargetsModal } from '../components/dashboard/EditTargetsModal'
import { AddFoodModal } from '../components/dashboard/AddFoodModal'
import { GoalPhaseCard } from '../components/dashboard/GoalPhaseCard'
import { WeightFatTracker } from '../components/dashboard/WeightFatTracker'
import { WeeklyConsistencyTracker } from '../components/dashboard/WeeklyConsistencyTracker'
import { useAppData } from '../context/AppDataContext'
import { PHASE_LABELS, todayKey } from '../lib/types'

export function DashboardPage() {
  const {
    foodLogs,
    weightLogs,
    setLogs,
    macroTargets,
    setMacroTargets,
    goal,
    setGoal,
    phase,
    setPhase,
    stateSyncStatus,
    addWeight,
  } = useAppData()

  const [targetsOpen, setTargetsOpen] = useState(false)
  const [foodOpen, setFoodOpen] = useState(false)

  const today = todayKey()
  const todayFood = foodLogs.filter((f) => f.loggedAt.startsWith(today))
  const calories = todayFood.reduce((s, f) => s + f.calories, 0)
  const latest = weightLogs.at(-1)

  return (
    <>
      <PageHeader
        title="דשבורד"
        subtitle={`שלב ${PHASE_LABELS[phase]} · יעדים, עקביות והתקדמות`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="surface" onClick={() => setTargetsOpen(true)}>
              עריכת יעדים
            </Button>
            <Button variant="accent" onClick={() => setFoodOpen(true)}>
              הוסף מזון / ארוחה
            </Button>
          </div>
        }
      />

      <div className="space-y-4 px-4 py-4">
        <GoalPhaseCard
          phase={phase}
          onPhaseChange={setPhase}
          goal={goal}
          onSaveGoal={setGoal}
          currentWeight={latest?.weightKg}
          currentBodyFat={latest?.bodyFatPct}
        />

        <WeeklyConsistencyTracker setLogs={setLogs} targetPerWeek={5} />

        <Card title={`יעדי קלוריות היום · ${PHASE_LABELS[phase]}`}>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted">
              <Flame className="size-4 text-primary" />
              קלוריות
            </span>
            <span className="font-semibold text-text">
              {Math.round(calories)} / {macroTargets.calories}
            </span>
          </div>
          <ProgressBar
            value={calories}
            max={macroTargets.calories}
            color="primary"
          />
          <p className="mt-2 text-xs text-muted">
            חלבון {macroTargets.protein}ג׳ · פחמימות {macroTargets.carbs}ג׳ ·
            שומן {macroTargets.fats}ג׳
          </p>
          <p className="mt-1 text-[10px] text-muted">
            סנכרון:{' '}
            {stateSyncStatus === 'synced'
              ? 'שמור'
              : stateSyncStatus === 'syncing'
                ? 'שומר…'
                : stateSyncStatus === 'error'
                  ? 'שגיאה'
                  : 'מקומי'}
          </p>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-line bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted">משקל עדכני</p>
              <Scale className="size-4 text-primary" strokeWidth={1.75} />
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-text">
              {latest ? latest.weightKg : '—'}
            </p>
            <p className="mt-1 text-xs text-muted">
              {latest ? 'ק״ג' : 'אין מדידה'}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted">אחוזי שומן</p>
              <Percent className="size-4 text-accent" strokeWidth={1.75} />
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-text">
              {latest?.bodyFatPct != null ? latest.bodyFatPct : '—'}
            </p>
            <p className="mt-1 text-xs text-muted">
              {latest?.bodyFatPct != null ? '%' : 'אין מדידה'}
            </p>
          </div>
        </div>

        <WeightFatTracker entries={weightLogs} onAdd={addWeight} />
      </div>

      <EditTargetsModal
        open={targetsOpen}
        targets={macroTargets}
        onClose={() => setTargetsOpen(false)}
        onSave={setMacroTargets}
        title={`עריכת יעדי ${PHASE_LABELS[phase]}`}
      />
      <AddFoodModal open={foodOpen} onClose={() => setFoodOpen(false)} />
    </>
  )
}
