import { useState } from 'react'
import { Link } from 'react-router-dom'
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
import { LifestyleCard } from '../components/dashboard/LifestyleCard'
import { FinishPhaseModal } from '../components/dashboard/FinishPhaseModal'
import { PhaseHistoryCard } from '../components/dashboard/PhaseHistoryCard'
import { TodayWorkoutCard } from '../components/dashboard/TodayWorkoutCard'
import { WorkoutHistoryCard } from '../components/workouts/WorkoutHistoryCard'
import { FoodLogList } from '../components/nutrition/FoodLogList'
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
    consistencyDayMarks,
    toggleConsistencyDay,
    setWeekConsistencyCount,
  } = useAppData()

  const [targetsOpen, setTargetsOpen] = useState(false)
  const [foodOpen, setFoodOpen] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)

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
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="surface" onClick={() => setTargetsOpen(true)}>
              עריכת יעדים
            </Button>
            <Button variant="accent" onClick={() => setFoodOpen(true)}>
              הוסף מזון / ארוחה
            </Button>
          </div>
        }
      />

      <div className="space-y-5 px-4 py-5">
        <GoalPhaseCard
          phase={phase}
          onPhaseChange={setPhase}
          goal={goal}
          onSaveGoal={setGoal}
          currentWeight={latest?.weightKg}
          currentBodyFat={latest?.bodyFatPct}
          onFinishPhase={() => setFinishOpen(true)}
        />
        <TodayWorkoutCard />
        <PhaseHistoryCard />

        <WeeklyConsistencyTracker
          setLogs={setLogs}
          phaseStartDate={goal.startDate}
          dayMarks={consistencyDayMarks}
          onToggleDay={toggleConsistencyDay}
          onSetWeekCount={setWeekConsistencyCount}
          targetPerWeek={5}
        />

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
            <div className="rounded-2xl bg-violet-500/10 px-3 py-2.5 text-center">
              <p className="text-[11px] text-violet-300">חלבון</p>
              <p className="mt-0.5 font-display text-sm font-bold tabular-nums text-text">
                {macroTargets.protein}ג׳
              </p>
            </div>
            <div className="rounded-2xl bg-cyan-400/10 px-3 py-2.5 text-center">
              <p className="text-[11px] text-cyan-300">פחמימות</p>
              <p className="mt-0.5 font-display text-sm font-bold tabular-nums text-text">
                {macroTargets.carbs}ג׳
              </p>
            </div>
            <div className="rounded-2xl bg-orange-400/10 px-3 py-2.5 text-center">
              <p className="text-[11px] text-orange-300">שומן</p>
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

        <Card
          title={`יומן מזון היום · ${todayFood.length}`}
          action={
            <Link
              to="/nutrition#food-log"
              className="text-xs font-semibold text-cyan-300 hover:underline"
            >
              ליומן המלא
            </Link>
          }
        >
          <FoodLogList
            entries={[...todayFood].reverse().slice(0, 5)}
            compact
          />
          {todayFood.length > 5 ? (
            <p className="mt-2 text-xs text-muted">
              מוצגות 5 הרשומות האחרונות מתוך {todayFood.length}
            </p>
          ) : null}
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-5 shadow-lg shadow-black/20 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted">משקל עדכני</p>
              <Scale className="size-4 text-emerald-400" strokeWidth={1.75} />
            </div>
            <p className="mt-3 font-display text-3xl font-extrabold tabular-nums text-text">
              {latest ? latest.weightKg : '—'}
            </p>
            <p className="mt-1 text-xs text-muted">
              {latest ? 'ק״ג' : 'אין מדידה'}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-5 shadow-lg shadow-black/20 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted">אחוזי שומן</p>
              <Percent className="size-4 text-violet-400" strokeWidth={1.75} />
            </div>
            <p className="mt-3 font-display text-3xl font-extrabold tabular-nums text-text">
              {latest?.bodyFatPct != null ? latest.bodyFatPct : '—'}
            </p>
            <p className="mt-1 text-xs text-muted">
              {latest?.bodyFatPct != null ? '%' : 'אין מדידה'}
            </p>
          </div>
        </div>

        <WorkoutHistoryCard limit={3} />
        <WeightFatTracker entries={weightLogs} onAdd={addWeight} />
        <LifestyleCard />
      </div>

      <EditTargetsModal
        open={targetsOpen}
        targets={macroTargets}
        onClose={() => setTargetsOpen(false)}
        onSave={setMacroTargets}
        title={`עריכת יעדי ${PHASE_LABELS[phase]}`}
      />
      <AddFoodModal open={foodOpen} onClose={() => setFoodOpen(false)} />
      <FinishPhaseModal
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
      />
    </>
  )
}
