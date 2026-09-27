import { Flame } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { ProgressBar } from '../components/ui/ProgressBar'
import { DailyWeightCard } from '../components/dashboard/DailyWeightCard'
import { GoalPhaseCard } from '../components/dashboard/GoalPhaseCard'
import { WeightFatTracker } from '../components/dashboard/WeightFatTracker'
import { WeeklyConsistencyTracker } from '../components/dashboard/WeeklyConsistencyTracker'
import { FinishPhaseModal } from '../components/dashboard/FinishPhaseModal'
import { PhaseHistoryCard } from '../components/dashboard/PhaseHistoryCard'
import { TodayWorkoutCard } from '../components/dashboard/TodayWorkoutCard'
import { WorkoutHistoryCard } from '../components/workouts/WorkoutHistoryCard'
import { useAppData } from '../context/AppDataContext'
import { PHASE_LABELS, todayKey } from '../lib/types'
import { useState } from 'react'

export function DashboardPage() {
  const {
    foodLogs,
    weightLogs,
    macroTargets,
    goal,
    setGoal,
    phase,
    stateSyncStatus,
  } = useAppData()

  const [finishOpen, setFinishOpen] = useState(false)

  const today = todayKey()
  const todayFood = foodLogs.filter((f) => f.loggedAt.startsWith(today))
  const calories = todayFood.reduce((s, f) => s + f.calories, 0)
  const latest = weightLogs.at(-1)

  return (
    <>
      <PageHeader title="דשבורד" />

      <div className="space-y-5 px-4 py-5">
        <Card title={`יעדי קלוריות היום · ${PHASE_LABELS[phase]}`}>
          <div className="mb-3 flex items-end justify-between gap-3">
            <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted">
              <Flame className="size-4 text-orange-400" />
              קלוריות
            </span>
            <p className="font-display text-3xl font-extrabold tabular-nums leading-none text-text">
              {Math.round(calories)}
              <span className="ms-1 text-base font-semibold text-muted">
                / {macroTargets.calories}
              </span>
            </p>
          </div>
          <ProgressBar
            value={calories}
            max={macroTargets.calories}
            color="warn"
          />
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-violet-50 px-3 py-2.5 text-center">
              <p className="text-[11px] text-violet-700">חלבון</p>
              <p className="mt-0.5 font-display text-sm font-bold tabular-nums text-text">
                {macroTargets.protein}ג׳
              </p>
            </div>
            <div className="rounded-2xl bg-cyan-50 px-3 py-2.5 text-center">
              <p className="text-[11px] text-blue-600">פחמימות</p>
              <p className="mt-0.5 font-display text-sm font-bold tabular-nums text-text">
                {macroTargets.carbs}ג׳
              </p>
            </div>
            <div className="rounded-2xl bg-orange-50 px-3 py-2.5 text-center">
              <p className="text-[11px] text-orange-700">שומן</p>
              <p className="mt-0.5 font-display text-sm font-bold tabular-nums text-text">
                {macroTargets.fats}ג׳
              </p>
            </div>
          </div>
          <p className="mt-3 text-[10px] text-muted">
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

        <DailyWeightCard />

        <TodayWorkoutCard />

        <WorkoutHistoryCard limit={3} />
        <WeeklyConsistencyTracker />

        <GoalPhaseCard
          phase={phase}
          goal={goal}
          onSaveGoal={setGoal}
          currentWeight={latest?.weightKg}
          onFinishPhase={() => setFinishOpen(true)}
        />
        <PhaseHistoryCard />

        <WeightFatTracker entries={weightLogs} />
      </div>

      <FinishPhaseModal
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
      />
    </>
  )
}
